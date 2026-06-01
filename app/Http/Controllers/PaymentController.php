<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Services\Payments\BookingPaymentService;
use App\Services\Payments\PaymentWebhookService;
use App\Services\Payments\SettlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    protected BookingPaymentService $bookingPaymentService;
    protected SettlementService $settlementService;
    protected PaymentWebhookService $paymentWebhookService;

    public function __construct(
        BookingPaymentService $bookingPaymentService,
        SettlementService $settlementService,
        PaymentWebhookService $paymentWebhookService
    ) {
        $this->bookingPaymentService = $bookingPaymentService;
        $this->settlementService = $settlementService;
        $this->paymentWebhookService = $paymentWebhookService;
    }

    /**
     * Create payment transaction
     * POST /api/payments/create
     */
    public function create(Request $request)
    {
        try {
            $validated = $request->validate([
                'booking_code'   => 'required|string|exists:bookings,booking_code',
                'contact'        => 'required|string',
                'payment_type'   => 'required|in:dp,settlement,full_payment',
                'amount'         => 'nullable|numeric|min:1',
                'payment_method' => 'required|in:va,qris',
            ]);

            $booking = Booking::where('booking_code', $validated['booking_code'])->firstOrFail();

            if (!$booking->contactMatches($validated['contact'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor kontak tidak sesuai dengan booking',
                    'data'    => null,
                ], 422);
            }

            if ($validated['payment_type'] === 'dp') {
                return $this->bookingPaymentService->createDpPayment($booking, $validated);
            } elseif ($validated['payment_type'] === 'full_payment') {
                return $this->bookingPaymentService->createFullPayment($booking, $validated);
            } else {
                return $this->settlementService->createSettlementPayment($booking, $validated);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'data'    => null,
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::channel('payment')->error('payment_creation_failed', [
                'error'        => $e->getMessage(),
                'booking_code' => $request->input('booking_code'),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data'    => null,
            ], 400);
        }
    }

    /**
     * Get payment status
     * GET /api/payments/{paymentId}
     */
    public function getStatus($paymentId)
    {
        return $this->bookingPaymentService->getStatus($paymentId);
    }

    /**
     * Webhook endpoint
     * POST /api/payments/webhook/midtrans
     */
    public function webhook(Request $request)
    {
        return $this->paymentWebhookService->handleWebhook(
            $request->all(),
            $request->ip(),
            $request->input('order_id')
        );
    }

    /**
     * Get booking payment tracking
     * GET /api/bookings/{bookingCode}/payment-tracking
     */
    public function getBookingPaymentTracking($bookingCode)
    {
        return $this->bookingPaymentService->getBookingPaymentTracking($bookingCode);
    }
}
