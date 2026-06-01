<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\RentalRequest;
use App\Services\Payments\BookingPaymentService;
use App\Services\Payments\RentalPaymentService;
use App\Services\Payments\SettlementService;
use App\Services\Payments\PaymentWebhookService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    protected BookingPaymentService $bookingPaymentService;
    protected RentalPaymentService  $rentalPaymentService;
    protected SettlementService     $settlementService;
    protected PaymentWebhookService $paymentWebhookService;

    public function __construct(
        BookingPaymentService $bookingPaymentService,
        RentalPaymentService  $rentalPaymentService,
        SettlementService     $settlementService,
        PaymentWebhookService $paymentWebhookService
    ) {
        $this->bookingPaymentService = $bookingPaymentService;
        $this->rentalPaymentService  = $rentalPaymentService;
        $this->settlementService     = $settlementService;
        $this->paymentWebhookService = $paymentWebhookService;
    }

    /**
     * Create payment transaction (supports booking & rental)
     * POST /api/payments/create
     */
    public function create(Request $request)
    {
        try {
            $validated = $request->validate([
                'booking_code'      => 'nullable|string|exists:bookings,booking_code',
                'rental_code'       => 'nullable|string|exists:rental_requests,rental_code',
                'contact'           => 'required|string',
                'payment_type'      => 'required|in:dp,settlement,full_payment',
                'amount'            => 'nullable|numeric|min:1',
                'payment_method'    => 'required|string|in:qris,va,bca_va,bni_va,bri_va,mandiri_va',
            ]);

            // Must provide exactly one of booking_code or rental_code
            if (empty($validated['booking_code']) && empty($validated['rental_code'])) {
                return response()->json(['success' => false, 'message' => 'Harap sertakan booking_code atau rental_code.', 'data' => null], 422);
            }

            // ── RENTAL PATH ──────────────────────────────────────────────
            if (!empty($validated['rental_code'])) {
                $rental = RentalRequest::where('rental_code', $validated['rental_code'])->firstOrFail();

                if (!$rental->contactMatches($validated['contact'])) {
                    return response()->json(['success' => false, 'message' => 'Nomor kontak tidak sesuai dengan data sewa.', 'data' => null], 422);
                }

                return match ($validated['payment_type']) {
                    'dp'           => $this->rentalPaymentService->createDpPayment($rental, $validated),
                    'full_payment' => $this->rentalPaymentService->createFullPayment($rental, $validated),
                    'settlement'   => $this->rentalPaymentService->createSettlementPayment($rental, $validated),
                };
            }

            // ── BOOKING PATH ─────────────────────────────────────────────
            $booking = Booking::where('booking_code', $validated['booking_code'])->firstOrFail();

            if (!$booking->contactMatches($validated['contact'])) {
                return response()->json(['success' => false, 'message' => 'Nomor kontak tidak sesuai dengan booking.', 'data' => null], 422);
            }

            return match ($validated['payment_type']) {
                'dp'           => $this->bookingPaymentService->createDpPayment($booking, $validated),
                'full_payment' => $this->bookingPaymentService->createFullPayment($booking, $validated),
                'settlement'   => $this->settlementService->createSettlementPayment($booking, $validated),
            };

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validasi gagal', 'errors' => $e->errors(), 'data' => null], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage(), 'data' => null], 500);
        }
    }

    /**
     * Get booking payment tracking
     * GET /api/bookings/{bookingCode}/payment-tracking
     */
    public function getBookingPaymentTracking(string $bookingCode)
    {
        try {
            return $this->bookingPaymentService->getBookingPaymentTracking($bookingCode);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    /**
     * Get rental payment tracking
     * GET /api/rentals/{rentalCode}/payment-tracking
     */
    public function getRentalPaymentTracking(string $rentalCode)
    {
        try {
            $rental = RentalRequest::where('rental_code', $rentalCode)->firstOrFail();
            return response()->json([
                'success' => true,
                'data'    => $this->rentalPaymentService->getTrackingPayload($rental),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    /**
     * Get payment status
     * GET /api/payments/{paymentId}
     */
    public function getStatus(string $paymentId)
    {
        try {
            $payment = \App\Models\Payment::findOrFail($paymentId);

            return response()->json([
                'success' => true,
                'data'    => [
                    'id'                => $payment->id,
                    'status'            => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                    'amount'            => $payment->amount,
                    'payment_type'      => $payment->payment_type,
                    'snap_token'        => $payment->snap_token,
                    'midtrans_order_id' => $payment->midtrans_order_id,
                    'expired_at'        => $payment->gateway_expired_at,
                    'rental_request_id' => $payment->rental_request_id,
                    'booking_id'        => $payment->booking_id,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    /**
     * Sync payment status from Midtrans API (after Snap close / manual refresh).
     * POST /api/payments/{paymentId}/sync
     */
    public function sync(string $paymentId)
    {
        try {
            $result = $this->paymentWebhookService->syncPaymentFromGateway((int) $paymentId);
            $payment = $result['payment'] ?? null;

            return response()->json([
                'success' => true,
                'message' => 'Status pembayaran diperbarui.',
                'data'    => [
                    'payment_id' => $payment?->id,
                    'status'     => $payment && $payment->status instanceof \BackedEnum
                        ? $payment->status->value
                        : $payment?->status,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Handle Midtrans webhook
     * POST /api/payments/webhook/midtrans
     */
    public function webhook(Request $request)
    {
        $payload = $request->all();
        $ip      = $request->ip();
        $orderId = $payload['order_id'] ?? null;

        return $this->paymentWebhookService->handleWebhook($payload, $ip, $orderId);
    }
}
