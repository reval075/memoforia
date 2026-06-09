<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\RentalRequest;
use App\Services\MidtransService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentWebhookService
{
    use PaymentLoggerTrait;

    protected MidtransService $midtransService;
    protected BookingPaymentService $bookingPaymentService;
    protected RentalPaymentService $rentalPaymentService;

    public function __construct(
        MidtransService $midtransService,
        BookingPaymentService $bookingPaymentService,
        RentalPaymentService $rentalPaymentService
    ) {
        $this->midtransService       = $midtransService;
        $this->bookingPaymentService = $bookingPaymentService;
        $this->rentalPaymentService  = $rentalPaymentService;
    }

    /**
     * Handle webhook payload
     */
    public function handleWebhook(array $payload, string $ip, ?string $orderId): \Illuminate\Http\JsonResponse
    {
        Log::info('MIDTRANS RENTAL CALLBACK', [
            'ip'         => $ip,
            'order_id'   => $orderId,
            'payload'    => $payload,
        ]);

        try {
            $notification = $this->midtransService->verifyNotification($payload);
        } catch (\Exception $e) {
            $message = $e->getMessage();

            if (str_contains($message, 'Signature mismatch') || str_contains($message, 'signature')) {
                $this->logPaymentWarning('webhook_rejected_signature_invalid', [
                    'ip'                => $ip,
                    'payment_reference' => $orderId,
                ]);
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }

            if (str_contains($message, 'Invalid notification') || str_contains($message, 'format')) {
                return response()->json(['success' => false, 'message' => 'Invalid payload'], 422);
            }

            if (str_contains($message, 'No query results') || str_contains($message, 'not found')) {
                return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
            }

            $this->logPaymentError('webhook_verification_error', [
                'error'             => $message,
                'payment_reference' => $orderId,
            ]);
            return response()->json(['success' => false, 'message' => 'Verification failed'], 200);
        }

        // Route to correct handler based on order_id prefix
        $isRental = str_starts_with($notification['order_id'] ?? '', 'RENT-');

        Log::info('MIDTRANS WEBHOOK ROUTING', [
            'order_id'    => $notification['order_id'] ?? null,
            'is_rental'   => $isRental,
            'payment_id'  => $notification['payment_id'] ?? null,
            'tx_status'   => $notification['transaction_status'] ?? null,
        ]);

        try {
            if ($isRental) {
                $result = $this->handleRentalWebhook($notification);
            } else {
                $result = $this->handleBookingWebhook($notification);
            }
        } catch (\Exception $e) {
            $this->logPaymentError('webhook_processing_error', [
                'error'    => $e->getMessage(),
                'order_id' => $notification['order_id'] ?? null,
            ]);
            return response()->json(['success' => false, 'message' => 'Processing failed'], 200);
        }

        if (is_array($result) && isset($result['idempotent']) && $result['idempotent']) {
            return response()->json(['success' => true, 'message' => 'Already processed']);
        }

        return response()->json(['success' => true, 'message' => 'Webhook processed']);
    }

    /**
     * Poll Midtrans and apply the same state transitions as the webhook (for Snap callback / refresh).
     */
    public function syncPaymentFromGateway(int $paymentId): array
    {
        return DB::transaction(function () use ($paymentId) {
            $payment = Payment::lockForUpdate()->findOrFail($paymentId);

            Log::info('MIDTRANS SYNC PAYMENT START', [
                'payment_id'        => $payment->id,
                'rental_request_id' => $payment->rental_request_id,
                'booking_id'        => $payment->booking_id,
                'midtrans_order_id' => $payment->midtrans_order_id,
                'current_status'    => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                'payment_source'    => $payment->payment_source,
            ]);

            if ($payment->payment_source !== 'midtrans' || empty($payment->midtrans_order_id)) {
                throw new \Exception('Pembayaran ini bukan transaksi Midtrans.');
            }

            if ($payment->status === PaymentStatus::Verified) {
                Log::info('MIDTRANS SYNC PAYMENT SKIP (already verified)', ['payment_id' => $payment->id]);
                return ['payment' => $payment, 'already_verified' => true];
            }

            $tx = $this->midtransService->getTransactionStatus($payment->midtrans_order_id);
            $transactionStatus = $tx['status'] ?? 'pending';

            Log::info('MIDTRANS SYNC PAYMENT STATUS FROM GATEWAY', [
                'payment_id'         => $payment->id,
                'midtrans_order_id'  => $payment->midtrans_order_id,
                'gateway_status'     => $transactionStatus,
                'is_rental'          => $payment->rental_request_id !== null,
            ]);

            $notification = [
                'payment_id'         => $payment->id,
                'order_id'           => $payment->midtrans_order_id,
                'transaction_status' => $transactionStatus,
            ];

            $isRental = $payment->rental_request_id !== null
                || str_starts_with($payment->midtrans_order_id, 'RENT-');

            if ($isRental) {
                return $this->handleRentalWebhook($notification);
            }

            return $this->handleBookingWebhook($notification);
        });
    }

    // ---------------------------------------------------------------
    // Booking webhook handler
    // ---------------------------------------------------------------
    private function handleBookingWebhook(array $notification): array
    {
        return DB::transaction(function () use ($notification) {
            $payment = Payment::lockForUpdate()->findOrFail($notification['payment_id']);
            $booking = Booking::lockForUpdate()->find($payment->booking_id);

            $this->logPayment('webhook_received', [
                'payment_id'         => $payment->id,
                'booking_id'         => $booking?->id,
                'booking_code'       => $booking?->booking_code,
                'transaction_status' => $notification['transaction_status'],
                'current_status'     => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
            ]);

            // Idempotency guard
            if ($payment->status === PaymentStatus::Verified) {
                $this->logPayment('webhook_idempotent_skip', ['payment_id' => $payment->id]);
                return ['idempotent' => true, 'payment' => $payment];
            }

            if (in_array($booking?->status, ['expired', 'cancelled', 'rejected'])) {
                $this->logPaymentWarning('webhook_booking_invalid_status', [
                    'payment_id'     => $payment->id,
                    'booking_status' => $booking?->status,
                ]);
                return ['idempotent' => false, 'payment' => $payment];
            }

            $this->midtransService->updatePaymentStatus($payment, $notification['transaction_status']);
            $payment->refresh();

            if ($payment->status === PaymentStatus::Verified) {
                if ($payment->payment_type === 'dp') {
                    $this->bookingPaymentService->confirmBookingAfterDp($booking);
                } elseif ($payment->payment_type === 'settlement') {
                    $this->bookingPaymentService->completeBookingAfterSettlement($booking);
                } elseif ($payment->payment_type === 'full_payment') {
                    $this->bookingPaymentService->completeBookingAfterFullPayment($booking);
                }
            }

            $this->logPayment('payment_webhook_processed', [
                'payment_id' => $payment->id,
                'booking_id' => $booking?->id,
                'new_status' => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
            ]);

            return ['idempotent' => false, 'payment' => $payment];
        });
    }

    // ---------------------------------------------------------------
    // Rental webhook handler
    // ---------------------------------------------------------------
    private function handleRentalWebhook(array $notification): array
    {
        return DB::transaction(function () use ($notification) {
            $payment = Payment::lockForUpdate()->findOrFail($notification['payment_id']);
            $rental  = RentalRequest::lockForUpdate()->find($payment->rental_request_id);

            Log::info('MIDTRANS RENTAL WEBHOOK HANDLER', [
                'payment_id'         => $payment->id,
                'rental_id'          => $rental?->id,
                'rental_code'        => $rental?->rental_code,
                'rental_status'      => $rental?->status,
                'payment_type'       => $payment->payment_type,
                'transaction_status' => $notification['transaction_status'],
                'current_payment_status' => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
            ]);

            $this->logPayment('rental_webhook_received', [
                'payment_id'         => $payment->id,
                'rental_id'          => $rental?->id,
                'rental_code'        => $rental?->rental_code,
                'transaction_status' => $notification['transaction_status'],
                'current_status'     => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
            ]);

            // Idempotency guard
            if ($payment->status === PaymentStatus::Verified) {
                $this->logPayment('rental_webhook_idempotent_skip', ['payment_id' => $payment->id]);
                return ['idempotent' => true, 'payment' => $payment];
            }

            if (in_array($rental?->status, ['cancelled', 'rejected', 'expired'])) {
                $this->logPaymentWarning('rental_webhook_invalid_status', [
                    'payment_id'    => $payment->id,
                    'rental_status' => $rental?->status,
                ]);
                return ['idempotent' => false, 'payment' => $payment];
            }

            $this->midtransService->updatePaymentStatus($payment, $notification['transaction_status']);
            $payment->refresh();

            $newStatus = $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status;

            Log::info('MIDTRANS RENTAL PAYMENT AFTER UPDATE', [
                'payment_id'      => $payment->id,
                'rental_id'       => $rental?->id,
                'new_status'      => $newStatus,
                'is_verified'     => $newStatus === 'verified',
                'payment_type'    => $payment->payment_type,
                'rental_status'   => $rental?->status,
            ]);

            if ($payment->status === PaymentStatus::Verified) {
                if ($payment->payment_type === 'dp') {
                    $this->rentalPaymentService->confirmRentalAfterDp($rental);
                } elseif ($payment->payment_type === 'settlement') {
                    $this->rentalPaymentService->completeRentalAfterSettlement($rental);
                } elseif ($payment->payment_type === 'full_payment') {
                    $this->rentalPaymentService->completeRentalAfterFullPayment($rental);
                }

                $rental?->refresh();

                Log::info('MIDTRANS RENTAL STATUS AFTER TRANSITION', [
                    'payment_id'     => $payment->id,
                    'rental_id'      => $rental?->id,
                    'rental_status'  => $rental?->status,
                    'payment_status' => $rental?->payment_status,
                ]);
            }

            $this->logPayment('rental_webhook_processed', [
                'payment_id' => $payment->id,
                'rental_id'  => $rental?->id,
                'new_status' => $newStatus,
            ]);

            return ['idempotent' => false, 'payment' => $payment];
        });
    }
}
