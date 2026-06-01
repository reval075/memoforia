<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Services\MidtransService;

class SettlementService
{
    use PaymentLoggerTrait;

    protected MidtransService $midtransService;

    public function __construct(MidtransService $midtransService)
    {
        $this->midtransService = $midtransService;
    }

    /**
     * Create settlement payment
     */
    public function createSettlementPayment(Booking $booking, array $validated): \Illuminate\Http\JsonResponse
    {
        if ($booking->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'message' => 'Booking bukan dalam status confirmed',
                'data'    => null,
            ], 422);
        }

        $alreadyPaid     = $booking->payments()->where('status', PaymentStatus::Verified)->sum('amount');
        $remainingAmount = $booking->total_price - $alreadyPaid;

        if ($remainingAmount <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Booking sudah lunas, tidak perlu pembayaran lagi',
                'data'    => null,
            ], 422);
        }

        $pendingSettlement = $booking->payments()
            ->where('payment_type', 'settlement')
            ->where('status', PaymentStatus::Pending)
            ->first();

        if ($pendingSettlement) {
            return response()->json([
                'success' => true,
                'message' => 'Transaksi pelunasan sedang menunggu pembayaran',
                'data'    => [
                    'payment_id' => $pendingSettlement->id,
                    'snap_token' => $pendingSettlement->snap_token,
                    'order_id'   => $pendingSettlement->midtrans_order_id,
                    'amount'     => $pendingSettlement->amount,
                    'expired_at' => $pendingSettlement->gateway_expired_at,
                ],
            ]);
        }

        try {
            $this->logPayment('settlement_payment_creation_started', [
                'booking_id'       => $booking->id,
                'booking_code'     => $booking->booking_code,
                'remaining_amount' => $remainingAmount,
                'method'           => $validated['payment_method'] ?? 'va',
            ]);

            $transaction = $this->midtransService->createSettlementTransaction(
                $booking,
                $validated['payment_method'] ?? 'va'
            );

            $this->logPayment('settlement_payment_created', [
                'booking_id'        => $booking->id,
                'booking_code'      => $booking->booking_code,
                'payment_reference' => $transaction['order_id'] ?? null,
                'amount'            => $remainingAmount,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Transaksi pelunasan berhasil dibuat',
                'data'    => $transaction,
            ], 201);
        } catch (\Exception $e) {
            $this->logPaymentError('settlement_payment_creation_failed', [
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
}
