<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\MidtransService;
use Illuminate\Support\Facades\DB;

class PaymentWebhookService
{
    use PaymentLoggerTrait;

    protected MidtransService $midtransService;
    protected BookingPaymentService $bookingPaymentService;

    public function __construct(MidtransService $midtransService, BookingPaymentService $bookingPaymentService)
    {
        $this->midtransService = $midtransService;
        $this->bookingPaymentService = $bookingPaymentService;
    }

    /**
     * Handle webhook payload
     */
    public function handleWebhook(array $payload, string $ip, ?string $orderId): \Illuminate\Http\JsonResponse
    {
        try {
            $notification = $this->midtransService->verifyNotification($payload);
        } catch (\Exception $e) {
            $message = $e->getMessage();

            if (str_contains($message, 'Signature mismatch') || str_contains($message, 'signature')) {
                $this->logPaymentWarning('webhook_rejected_signature_invalid', [
                    'ip'                => $ip,
                    'payment_reference' => $orderId,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }

            if (str_contains($message, 'Invalid notification') || str_contains($message, 'format')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid payload',
                ], 422);
            }

            if (str_contains($message, 'No query results') || str_contains($message, 'not found')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found',
                ], 404);
            }

            $this->logPaymentError('webhook_verification_error', [
                'error'             => $message,
                'payment_reference' => $orderId,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Verification failed',
            ], 200);
        }

        try {
            $result = DB::transaction(function () use ($notification) {
                // Concurrency Control: Lock Payment and Booking simultaneously
                $payment = Payment::lockForUpdate()->findOrFail($notification['payment_id']);
                $booking = Booking::lockForUpdate()->find($payment->booking_id);

                $this->logPayment('webhook_received', [
                    'payment_id'         => $payment->id,
                    'booking_id'         => $booking->id,
                    'booking_code'       => $booking->booking_code,
                    'transaction_status' => $notification['transaction_status'],
                    'current_status'     => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                ]);

                if (in_array($payment->status, [
                    PaymentStatus::Verified,
                    PaymentStatus::Expired,
                    PaymentStatus::Cancelled,
                    PaymentStatus::Rejected,
                ])) {
                    $this->logPayment('webhook_idempotency_skip', [
                        'payment_id' => $payment->id,
                        'status'     => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                    ]);
                    return ['idempotent' => true, 'payment' => $payment];
                }

                $this->midtransService->updatePaymentStatus($payment, $notification['transaction_status']);
                $payment->refresh();

                if ($payment->status === PaymentStatus::Verified) {
                    if ($payment->payment_type === 'dp') {
                        $this->bookingPaymentService->confirmBookingAfterDp($booking);
                    } elseif ($payment->payment_type === 'settlement') {
                        $this->bookingPaymentService->completeBookingAfterSettlement($booking);
                    }
                }

                $this->logPayment('payment_webhook_processed', [
                    'payment_id' => $payment->id,
                    'booking_id' => $booking->id,
                    'new_status' => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                ]);

                return ['idempotent' => false, 'payment' => $payment];
            });

            $statusValue = $result['payment']->status instanceof \BackedEnum ? $result['payment']->status->value : $result['payment']->status;

            if ($result['idempotent']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Webhook already processed',
                    'data'    => [
                        'payment_id' => $result['payment']->id,
                        'status'     => $statusValue,
                    ],
                ], 200);
            }

            return response()->json([
                'success' => true,
                'message' => 'Webhook processed',
                'data'    => [
                    'payment_id' => $result['payment']->id,
                    'status'     => $statusValue,
                ],
            ], 200);

        } catch (\Exception $e) {
            $this->logPaymentError('webhook_processing_failed', [
                'error'             => $e->getMessage(),
                'payment_reference' => $orderId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Internal processing error',
            ], 500);
        }
    }
}
