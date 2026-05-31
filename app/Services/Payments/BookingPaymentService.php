<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\MidtransService;

class BookingPaymentService
{
    use PaymentLoggerTrait;

    protected MidtransService $midtransService;

    public function __construct(MidtransService $midtransService)
    {
        $this->midtransService = $midtransService;
    }

    /**
     * Create DP payment
     */
    public function createDpPayment(Booking $booking, array $validated): \Illuminate\Http\JsonResponse
    {
        if ($booking->status !== 'waiting_dp') {
            return response()->json([
                'success' => false,
                'message' => 'Booking bukan dalam status menunggu DP',
                'data'    => null,
            ], 422);
        }

        $dpAmount = (float) $validated['amount'];

        if ($dpAmount < 500000) {
            return response()->json([
                'success' => false,
                'message' => 'Minimal DP adalah Rp500.000',
                'data'    => null,
            ], 422);
        }

        $alreadyPaid     = $booking->payments()->where('status', PaymentStatus::Verified)->sum('amount');
        $remainingAmount = $booking->total_price - $alreadyPaid;

        if ($dpAmount > $remainingAmount) {
            $this->logPaymentWarning('dp_overpayment_blocked', [
                'booking_id'      => $booking->id,
                'booking_code'    => $booking->booking_code,
                'dp_amount'       => $dpAmount,
                'remaining'       => $remainingAmount,
                'total_price'     => $booking->total_price,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Jumlah DP melebihi sisa tagihan yang harus dibayar',
                'data'    => null,
            ], 422);
        }

        $pendingDp = $booking->payments()
            ->where('payment_type', 'dp')
            ->where('status', PaymentStatus::Pending)
            ->first();

        if ($pendingDp) {
            return response()->json([
                'success' => true,
                'message' => 'Transaksi DP sedang menunggu pembayaran',
                'data'    => [
                    'payment_id' => $pendingDp->id,
                    'snap_token' => $pendingDp->snap_token,
                    'order_id'   => $pendingDp->midtrans_order_id,
                    'amount'     => $pendingDp->amount,
                    'expired_at' => $pendingDp->gateway_expired_at,
                ],
            ]);
        }

        try {
            $this->logPayment('dp_payment_creation_started', [
                'booking_id'   => $booking->id,
                'booking_code' => $booking->booking_code,
                'amount'       => $dpAmount,
                'method'       => $validated['payment_method'],
            ]);

            $transaction = $this->midtransService->createDpTransaction(
                $booking,
                $dpAmount,
                $validated['payment_method']
            );

            $this->logPayment('dp_payment_created', [
                'booking_id'        => $booking->id,
                'booking_code'      => $booking->booking_code,
                'payment_reference' => $transaction['order_id'] ?? null,
                'amount'            => $dpAmount,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Transaksi DP berhasil dibuat',
                'data'    => $transaction,
            ], 201);
        } catch (\Exception $e) {
            $this->logPaymentError('dp_payment_creation_failed', [
                'booking_id'   => $booking->id,
                'booking_code' => $booking->booking_code,
                'error'        => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data'    => null,
            ], 400);
        }
    }

    /**
     * Get booking payment tracking with eager loading
     */
    public function getBookingPaymentTracking(string $bookingCode)
    {
        try {
            // ISSUE 5: Eager load payments to avoid N+1
            $booking = Booking::with(['payments' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }])->where('booking_code', $bookingCode)->firstOrFail();

            $totalPaid = $booking->payments
                ->where('status', PaymentStatus::Verified)
                ->sum('amount');
            $remainingAmount = max(0, $booking->total_price - $totalPaid);

            $payments = $booking->payments->map(function ($payment) {
                return [
                    'payment_id' => $payment->id,
                    'type'       => $payment->payment_type,
                    'amount'     => $payment->amount,
                    'status'     => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                    'gateway'    => $payment->gateway,
                    'paid_at'    => $payment->paid_at,
                    'created_at' => $payment->created_at,
                ];
            });

            return response()->json([
                'success' => true,
                'data'    => [
                    'booking_code'      => $booking->booking_code,
                    'booking_status'    => $booking->status,
                    'total_price'       => $booking->total_price,
                    'paid_amount'       => $totalPaid,
                    'remaining_amount'  => $remainingAmount,
                    'settlement_due_at' => $booking->settlement_due_at,
                    'payments'          => $payments,
                    'is_completed'      => $remainingAmount <= 0 && $booking->status === 'completed',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Booking tidak ditemukan',
                'data'    => null,
            ], 404);
        }
    }

    /**
     * Get payment status
     */
    public function getStatus($paymentId)
    {
        try {
            $payment = Payment::with('booking')->findOrFail($paymentId);

            $remainingAmount = null;
            if ($payment->booking) {
                $paidAmount = $payment->booking->payments()
                    ->where('status', PaymentStatus::Verified)
                    ->sum('amount');
                $remainingAmount = max(0, $payment->booking->total_price - $paidAmount);
            }

            return response()->json([
                'success' => true,
                'data'    => [
                    'payment_id'       => $payment->id,
                    'booking_code'     => $payment->booking->booking_code,
                    'amount'           => $payment->amount,
                    'payment_type'     => $payment->payment_type,
                    'status'           => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                    'gateway'          => $payment->gateway,
                    'gateway_reference'=> $payment->gateway_reference,
                    'created_at'       => $payment->created_at,
                    'verified_at'      => $payment->verified_at,
                    'expired_at'       => $payment->gateway_expired_at,
                    'remaining_amount' => $remainingAmount,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran tidak ditemukan',
                'data'    => null,
            ], 404);
        }
    }

    /**
     * Mutate booking state after DP
     * Assumes running inside a DB::transaction
     */
    public function confirmBookingAfterDp(Booking $booking): void
    {
        if ($booking->status !== 'waiting_dp') {
            return;
        }

        $eventDate = \Carbon\Carbon::parse($booking->event_date);
        $dueDate   = $eventDate->copy()->addDays(2)->endOfDay();

        $booking->update([
            'status'            => 'confirmed',
            'confirmed_at'      => now(),
            'settlement_due_at' => $dueDate,
            'payment_status'    => 'partially_paid',
        ]);

        Booking::where('event_date', $booking->event_date)
            ->where('id', '!=', $booking->id)
            ->where('status', 'waiting_dp')
            ->update([
                'status'       => 'cancelled',
                'cancelled_at' => now(),
                'notes'        => 'Otomatis dibatalkan karena tanggal telah dikonfirmasi oleh customer lain.',
            ]);

        $this->logPayment('booking_confirmed', [
            'booking_id'        => $booking->id,
            'booking_code'      => $booking->booking_code,
            'settlement_due_at' => $dueDate->toDateTimeString(),
        ]);
    }

    /**
     * Mutate booking state after Settlement
     * Assumes running inside a DB::transaction
     */
    public function completeBookingAfterSettlement(Booking $booking): void
    {
        if ($booking->status === 'completed') {
            return;
        }

        $totalPaid = $booking->payments()
            ->where('status', PaymentStatus::Verified)
            ->sum('amount');

        if ($totalPaid > $booking->total_price) {
            $this->logPaymentWarning('settlement_overpayment_detected', [
                'booking_id'   => $booking->id,
                'booking_code' => $booking->booking_code,
                'total_price'  => $booking->total_price,
                'total_paid'   => $totalPaid,
                'overpaid_by'  => $totalPaid - $booking->total_price,
            ]);
        }

        if ($totalPaid >= $booking->total_price) {
            $booking->update([
                'status'         => 'completed',
                'completed_at'   => now(),
                'payment_status' => 'paid',
            ]);

            $this->logPayment('settlement_completed', [
                'booking_id'   => $booking->id,
                'booking_code' => $booking->booking_code,
                'total_paid'   => $totalPaid,
                'total_price'  => $booking->total_price,
            ]);
        }
    }
}
