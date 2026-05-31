<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Services\MidtransService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    protected MidtransService $midtransService;

    public function __construct(MidtransService $midtransService)
    {
        $this->midtransService = $midtransService;
    }

    /**
     * Create payment transaction
     * POST /api/payments/create
     *
     * Request:
     * {
     *   "booking_code": "MEMO-20260531-XXXXX",
     *   "contact": "+628123456789",
     *   "payment_type": "dp|settlement",
     *   "amount": 500000,
     *   "payment_method": "va|qris"
     * }
     */
    public function create(Request $request)
    {
        try {
            $validated = $request->validate([
                'booking_code' => 'required|string|exists:bookings,booking_code',
                'contact' => 'required|string',
                'payment_type' => 'required|in:dp,settlement',
                'amount' => 'required_if:payment_type,dp|numeric|min:500000',
                'payment_method' => 'required|in:va,qris',
            ]);

            // Find booking
            $booking = Booking::where('booking_code', $validated['booking_code'])->firstOrFail();

            // Verify contact matches
            $normalizedContact = preg_replace('/\D+/', '', $validated['contact']);
            $normalizedPhone = preg_replace('/\D+/', '', $booking->customer_phone);

            if ($normalizedContact !== $normalizedPhone) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor kontak tidak sesuai dengan booking',
                    'data' => null,
                ], 422);
            }

            // Handle different payment types
            if ($validated['payment_type'] === 'dp') {
                return $this->createDpPayment($booking, $validated);
            } else {
                return $this->createSettlementPayment($booking, $validated);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'data' => null,
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Payment creation failed', [
                'error' => $e->getMessage(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
            ], 400);
        }
    }

    /**
     * Create DP payment
     */
    private function createDpPayment(Booking $booking, array $validated): \Illuminate\Http\JsonResponse
    {
        // Validate booking status
        if ($booking->status !== 'waiting_dp') {
            return response()->json([
                'success' => false,
                'message' => 'Booking bukan dalam status menunggu DP',
                'data' => null,
            ], 422);
        }

        // Validate DP amount
        $dpAmount = (float) $validated['amount'];

        if ($dpAmount < 500000) {
            return response()->json([
                'success' => false,
                'message' => 'Minimal DP adalah Rp500.000',
                'data' => null,
            ], 422);
        }

        if ($dpAmount > $booking->total_price) {
            return response()->json([
                'success' => false,
                'message' => 'DP tidak boleh melebihi total harga booking',
                'data' => null,
            ], 422);
        }

        // Check for pending DP payment
        $pendingDp = $booking->payments()
            ->where('payment_type', 'dp')
            ->where('status', 'pending')
            ->first();

        if ($pendingDp) {
            // Return existing pending payment
            return response()->json([
                'success' => true,
                'message' => 'Transaksi DP sedang menunggu pembayaran',
                'data' => [
                    'payment_id' => $pendingDp->id,
                    'snap_token' => $pendingDp->snap_token,
                    'order_id' => $pendingDp->midtrans_order_id,
                    'amount' => $pendingDp->amount,
                    'expired_at' => $pendingDp->gateway_expired_at,
                ],
            ]);
        }

        try {
            $transaction = $this->midtransService->createDpTransaction(
                $booking,
                $dpAmount,
                $validated['payment_method']
            );

            return response()->json([
                'success' => true,
                'message' => 'Transaksi DP berhasil dibuat',
                'data' => $transaction,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
            ], 400);
        }
    }

    /**
     * Create settlement payment
     */
    private function createSettlementPayment(Booking $booking, array $validated): \Illuminate\Http\JsonResponse
    {
        // Validate booking status
        if ($booking->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'message' => 'Booking bukan dalam status confirmed',
                'data' => null,
            ], 422);
        }

        // Check if DP already paid
        $dpPaid = $booking->payments()
            ->where('payment_type', 'dp')
            ->where('status', 'verified')
            ->exists();

        if (!$dpPaid) {
            return response()->json([
                'success' => false,
                'message' => 'DP belum dibayarkan',
                'data' => null,
            ], 422);
        }

        // Check for pending settlement
        $pendingSettlement = $booking->payments()
            ->where('payment_type', 'settlement')
            ->where('status', 'pending')
            ->first();

        if ($pendingSettlement) {
            return response()->json([
                'success' => true,
                'message' => 'Transaksi pelunasan sedang menunggu pembayaran',
                'data' => [
                    'payment_id' => $pendingSettlement->id,
                    'snap_token' => $pendingSettlement->snap_token,
                    'order_id' => $pendingSettlement->midtrans_order_id,
                    'amount' => $pendingSettlement->amount,
                    'expired_at' => $pendingSettlement->gateway_expired_at,
                ],
            ]);
        }

        try {
            $transaction = $this->midtransService->createSettlementTransaction($booking);

            return response()->json([
                'success' => true,
                'message' => 'Transaksi pelunasan berhasil dibuat',
                'data' => $transaction,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
            ], 400);
        }
    }

    /**
     * Get payment status
     * GET /api/payments/{paymentId}
     */
    public function getStatus($paymentId)
    {
        try {
            $payment = Payment::findOrFail($paymentId);

            $remainingAmount = null;
            if ($payment->booking) {
                $paidAmount = $payment->booking->payments()
                    ->where('status', 'verified')
                    ->sum('amount');
                $remainingAmount = $payment->booking->total_price - $paidAmount;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_id' => $payment->id,
                    'booking_code' => $payment->booking->booking_code,
                    'amount' => $payment->amount,
                    'payment_type' => $payment->payment_type,
                    'status' => $payment->status,
                    'gateway' => $payment->gateway,
                    'gateway_reference' => $payment->gateway_reference,
                    'created_at' => $payment->created_at,
                    'verified_at' => $payment->verified_at,
                    'expired_at' => $payment->gateway_expired_at,
                    'remaining_amount' => $remainingAmount,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }

    /**
     * Webhook endpoint
     * POST /api/payments/webhook/midtrans
     */
    public function webhook(Request $request)
    {
        try {
            // Verify notification from Midtrans
            $notification = $this->midtransService->verifyNotification($request->all());

            // Get payment
            $payment = Payment::findOrFail($notification['payment_id']);
            $booking = $payment->booking;

            // Idempotency guard: ignore if already processed (final states)
            if (in_array($payment->status, [\App\Enums\PaymentStatus::Verified, \App\Enums\PaymentStatus::Expired, \App\Enums\PaymentStatus::Cancelled, \App\Enums\PaymentStatus::Rejected])) {
                Log::info('Webhook idempotency: payment already in final state', ['payment_id' => $payment->id, 'status' => $payment->status->value]);
                return response()->json([
                    'success' => true,
                    'message' => 'Webhook already processed',
                    'data' => [
                        'payment_id' => $payment->id,
                        'status' => $payment->status,
                    ],
                ]);
            }

            // Update payment status
            $this->midtransService->updatePaymentStatus($payment, $notification['transaction_status']);

            // Handle booking status update
            if ($payment->status === \App\Enums\PaymentStatus::Verified) {
                if ($payment->payment_type === 'dp') {
                    // DP verified - move to confirmed
                    $this->confirmBookingAfterDp($booking);
                } elseif ($payment->payment_type === 'settlement') {
                    // Settlement verified - mark as completed
                    $this->completeBookingAfterSettlement($booking);
                }
            }

            Log::info('Payment webhook processed', [
                'payment_id' => $payment->id,
                'booking_id' => $booking->id,
                'status' => $payment->status,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Webhook processed',
                'data' => [
                    'payment_id' => $payment->id,
                    'status' => $payment->status,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Webhook processing failed', [
                'error' => $e->getMessage(),
                'request' => $request->all(),
            ]);

            // Return 200 to prevent Midtrans retry
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 200);
        }
    }

    /**
     * Confirm booking after DP verified
     */
    private function confirmBookingAfterDp(Booking $booking): void
    {
        if ($booking->status === 'waiting_dp') {
            DB::transaction(function () use ($booking) {
                // Pessimistic locking on the booking row
                $booking = Booking::where('id', $booking->id)->lockForUpdate()->first();

                if ($booking->status !== 'waiting_dp') {
                    return; // Safety guard
                }

                // Settlement deadline is event_date + 2 days
                $eventDate = \Carbon\Carbon::parse($booking->event_date);
                $dueDate = $eventDate->copy()->addDays(2)->endOfDay();

                $booking->update([
                    'status' => 'confirmed',
                    'confirmed_at' => now(),
                    'settlement_due_at' => $dueDate,
                    'payment_status' => 'partially_paid',
                ]);

                // Auto-cancel competing bookings on the same date
                Booking::where('event_date', $booking->event_date)
                    ->where('id', '!=', $booking->id)
                    ->where('status', 'waiting_dp')
                    ->update([
                        'status' => 'cancelled',
                        'cancelled_at' => now(),
                        'notes' => 'Otomatis dibatalkan karena tanggal telah dikonfirmasi oleh customer lain.',
                    ]);

                Log::info('Booking confirmed after DP payment', [
                    'booking_id' => $booking->id,
                    'booking_code' => $booking->booking_code,
                ]);
            });
        }
    }

    /**
     * Complete booking after settlement verified
     */
    private function completeBookingAfterSettlement(Booking $booking): void
    {
        DB::transaction(function () use ($booking) {
            // Pessimistic locking
            $booking = Booking::where('id', $booking->id)->lockForUpdate()->first();
            
            // Verify all payments are complete
            $totalPaid = $booking->payments()
                ->where('status', 'verified')
                ->sum('amount');

            if ($totalPaid >= $booking->total_price && $booking->status !== 'completed') {
                $booking->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'payment_status' => 'paid',
                ]);

                Log::info('Booking completed after settlement payment', [
                    'booking_id' => $booking->id,
                    'booking_code' => $booking->booking_code,
                ]);
            }
        });
    }

    /**
     * Get booking payment tracking
     * GET /api/bookings/{bookingCode}/payment-tracking
     */
    public function getBookingPaymentTracking($bookingCode)
    {
        try {
            $booking = Booking::where('booking_code', $bookingCode)->firstOrFail();

            $totalPaid = $booking->payments()
                ->where('status', 'verified')
                ->sum('amount');

            $remainingAmount = $booking->total_price - $totalPaid;

            // Get payment history
            $payments = $booking->payments()
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($payment) {
                    return [
                        'payment_id' => $payment->id,
                        'type' => $payment->payment_type,
                        'amount' => $payment->amount,
                        'status' => $payment->status,
                        'gateway' => $payment->gateway,
                        'paid_at' => $payment->paid_at,
                        'created_at' => $payment->created_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'booking_code' => $booking->booking_code,
                    'booking_status' => $booking->status,
                    'total_price' => $booking->total_price,
                    'paid_amount' => $totalPaid,
                    'remaining_amount' => $remainingAmount,
                    'settlement_due_at' => $booking->settlement_due_at,
                    'payments' => $payments,
                    'is_completed' => $remainingAmount <= 0 && $booking->status === 'completed',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Booking tidak ditemukan',
                'data' => null,
            ], 404);
        }
    }
}
