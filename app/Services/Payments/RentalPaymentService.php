<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\RentalRequest;
use App\Services\MidtransService;
use App\Support\DpAmountCalculator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RentalPaymentService
{
    use PaymentLoggerTrait;

    public function __construct(protected MidtransService $midtransService) {}

    // ---------------------------------------------------------------
    // Create DP Payment
    // ---------------------------------------------------------------
    public function createDpPayment(RentalRequest $rental, array $validated): \Illuminate\Http\JsonResponse
    {
        return DB::transaction(function () use ($rental, $validated) {
            $rental = $this->lockAndSyncExpire($rental);

            if ($blocked = $this->blockedPaymentResponse($rental, ['waiting_dp'])) {
                return $blocked;
            }

            $amount = (float) $validated['amount'];
            $minDp  = DpAmountCalculator::minDpForTotal((float) $rental->total_price, 'rental');

            if ($amount < $minDp) {
                $percent = DpAmountCalculator::minDpPercent('rental');

                return response()->json([
                    'success' => false,
                    'message' => "Minimal pembayaran DP adalah Rp".number_format($minDp, 0, ',', '.')." ({$percent}% dari total tagihan)",
                    'data'    => null,
                ], 422);
            }

            $remaining = $rental->getRemainingAmount();
            if ($amount > $remaining) {
                return response()->json([
                    'success' => false,
                    'message' => 'Jumlah DP melebihi sisa tagihan yang harus dibayar',
                    'data'    => null,
                ], 422);
            }

            if ($amount >= $rental->total_price) {
                return response()->json([
                    'success' => false,
                    'message' => 'Untuk pembayaran penuh, silakan gunakan opsi "Bayar Lunas".',
                    'data'    => null,
                ], 422);
            }

            $pending = $rental->payments()
                ->where('payment_type', 'dp')
                ->where('status', PaymentStatus::Pending)
                ->first();

            if ($pending) {
                return $this->pendingTransactionResponse($pending, 'Transaksi DP sedang menunggu pembayaran');
            }

            try {
                $transaction = $this->midtransService->createRentalTransaction(
                    $rental,
                    $amount,
                    'dp',
                    $validated['payment_method']
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Transaksi DP berhasil dibuat',
                    'data'    => $transaction,
                ], 201);
            } catch (\Exception $e) {
                $this->logPaymentError('rental_dp_creation_failed', ['rental_id' => $rental->id, 'error' => $e->getMessage()]);

                return response()->json(['success' => false, 'message' => $e->getMessage(), 'data' => null], 400);
            }
        });
    }

    // ---------------------------------------------------------------
    // Create Full Payment
    // ---------------------------------------------------------------
    public function createFullPayment(RentalRequest $rental, array $validated): \Illuminate\Http\JsonResponse
    {
        return DB::transaction(function () use ($rental, $validated) {
            $rental = $this->lockAndSyncExpire($rental);

            if ($blocked = $this->blockedPaymentResponse($rental, ['waiting_dp'])) {
                return $blocked;
            }

            $pending = $rental->payments()
                ->where('payment_type', 'full_payment')
                ->where('status', PaymentStatus::Pending)
                ->first();

            if ($pending) {
                return $this->pendingTransactionResponse($pending, 'Transaksi lunas sedang menunggu pembayaran');
            }

            try {
                $transaction = $this->midtransService->createRentalTransaction(
                    $rental,
                    (float) $rental->total_price,
                    'full_payment',
                    $validated['payment_method']
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Transaksi pembayaran lunas berhasil dibuat',
                    'data'    => $transaction,
                ], 201);
            } catch (\Exception $e) {
                $this->logPaymentError('rental_full_payment_creation_failed', ['rental_id' => $rental->id, 'error' => $e->getMessage()]);

                return response()->json(['success' => false, 'message' => $e->getMessage(), 'data' => null], 400);
            }
        });
    }

    // ---------------------------------------------------------------
    // Create Settlement Payment
    // ---------------------------------------------------------------
    public function createSettlementPayment(RentalRequest $rental, array $validated): \Illuminate\Http\JsonResponse
    {
        return DB::transaction(function () use ($rental, $validated) {
            $rental = $this->lockAndSyncExpire($rental);

            if ($blocked = $this->blockedPaymentResponse($rental, ['confirmed'])) {
                return $blocked;
            }

            $remaining = $rental->getRemainingAmount();
            if ($remaining <= 0) {
                return response()->json(['success' => false, 'message' => 'Rental sudah lunas.', 'data' => null], 422);
            }

            $pending = $rental->payments()
                ->where('payment_type', 'settlement')
                ->where('status', PaymentStatus::Pending)
                ->first();

            if ($pending) {
                return $this->pendingTransactionResponse($pending, 'Transaksi pelunasan sedang menunggu pembayaran');
            }

            try {
                $transaction = $this->midtransService->createRentalTransaction(
                    $rental,
                    (float) $remaining,
                    'settlement',
                    $validated['payment_method'] ?? 'va'
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Transaksi pelunasan berhasil dibuat',
                    'data'    => $transaction,
                ], 201);
            } catch (\Exception $e) {
                $this->logPaymentError('rental_settlement_creation_failed', ['rental_id' => $rental->id, 'error' => $e->getMessage()]);

                return response()->json(['success' => false, 'message' => $e->getMessage(), 'data' => null], 400);
            }
        });
    }

    // ---------------------------------------------------------------
    // Admin: verify or reject manual payment
    // ---------------------------------------------------------------
    public function verifyManualPayment(int $paymentId, string $status): \Illuminate\Http\JsonResponse
    {
        if ($status === 'rejected') {
            $payment = Payment::where('payment_source', 'manual')
                ->whereNotNull('rental_request_id')
                ->findOrFail($paymentId);

            if ($payment->status !== PaymentStatus::Pending) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pembayaran ini sudah diverifikasi sebelumnya.',
                ], 422);
            }

            $payment->update([
                'status'      => 'rejected',
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil ditolak.',
                'data'    => $payment->fresh(),
            ]);
        }

        try {
            $result = DB::transaction(function () use ($paymentId) {
                $payment = Payment::lockForUpdate()
                    ->where('payment_source', 'manual')
                    ->whereNotNull('rental_request_id')
                    ->findOrFail($paymentId);

                if ($payment->status !== PaymentStatus::Pending) {
                    throw new \Exception('Pembayaran ini sudah diverifikasi sebelumnya.');
                }

                $rental = RentalRequest::lockForUpdate()->findOrFail($payment->rental_request_id);

                if ($rental->markAsExpiredIfDpElapsed()) {
                    $rental->refresh();
                }

                if (in_array($rental->status, ['expired', 'cancelled', 'rejected'])) {
                    return ['error' => 'Sewa sudah ' . $rental->status . ' dan tidak dapat diverifikasi.'];
                }

                if ($payment->payment_type === 'dp' && $rental->status !== 'waiting_dp') {
                    throw new \Exception('Sewa tidak berstatus waiting_dp untuk verifikasi DP.');
                }

                if (in_array($payment->payment_type, ['settlement', 'full_payment'])
                    && ! in_array($rental->status, ['waiting_dp', 'confirmed', 'completed'])) {
                    throw new \Exception('Sewa tidak dalam status valid untuk verifikasi pembayaran ini.');
                }

                $payment->update([
                    'status'      => 'verified',
                    'verified_by' => Auth::id(),
                    'verified_at' => now(),
                    'paid_at'     => now(),
                ]);

                $rental->refresh();

                match ($payment->payment_type) {
                    'dp'           => $this->confirmRentalAfterDp($rental),
                    'full_payment' => $this->completeRentalAfterFullPayment($rental),
                    'settlement'   => $this->completeRentalAfterSettlement($rental),
                    default        => null,
                };

                return $payment->fresh();
            });

            if (is_array($result) && isset($result['error'])) {
                return response()->json(['success' => false, 'message' => $result['error']], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil diverifikasi.',
                'data'    => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ---------------------------------------------------------------
    // State transition after webhook: DP paid
    // ---------------------------------------------------------------
    public function confirmRentalAfterDp(RentalRequest $rental): void
    {
        if ($rental->status !== 'waiting_dp') {
            return;
        }

        $rental->unsetRelation('payments');
        $totalPaid = $rental->payments()->where('status', PaymentStatus::Verified)->sum('amount');
        $dueDate   = \Carbon\Carbon::parse($rental->end_date)->addDays(2)->endOfDay();

        if ($totalPaid >= $rental->total_price) {
            $rental->update([
                'status'            => 'completed',
                'confirmed_at'      => now(),
                'completed_at'      => now(),
                'settlement_due_at' => $dueDate,
                'payment_status'    => 'paid',
            ]);
        } else {
            $rental->update([
                'status'            => 'confirmed',
                'confirmed_at'      => now(),
                'settlement_due_at' => $dueDate,
                'payment_status'    => 'partially_paid',
            ]);
        }
    }

    // ---------------------------------------------------------------
    // State transition after webhook: Settlement paid
    // ---------------------------------------------------------------
    public function completeRentalAfterSettlement(RentalRequest $rental): void
    {
        if ($rental->status === 'completed') {
            return;
        }

        $rental->unsetRelation('payments');
        $totalPaid = $rental->payments()->where('status', PaymentStatus::Verified)->sum('amount');

        if ($totalPaid >= $rental->total_price) {
            $rental->update([
                'status'         => 'completed',
                'confirmed_at'   => $rental->confirmed_at ?? now(),
                'completed_at'   => now(),
                'payment_status' => 'paid',
            ]);
        } elseif ($totalPaid > 0) {
            $rental->update([
                'payment_status' => 'partially_paid',
                'status'         => $rental->status === 'waiting_dp' ? 'confirmed' : $rental->status,
                'confirmed_at'   => $rental->confirmed_at ?? now(),
            ]);
        }
    }

    // ---------------------------------------------------------------
    // State transition after webhook: Full payment
    // ---------------------------------------------------------------
    public function completeRentalAfterFullPayment(RentalRequest $rental): void
    {
        if ($rental->status === 'completed') {
            return;
        }

        $dueDate = \Carbon\Carbon::parse($rental->end_date)->addDays(2)->endOfDay();

        $rental->update([
            'status'            => 'completed',
            'confirmed_at'      => $rental->confirmed_at ?? now(),
            'completed_at'      => now(),
            'settlement_due_at' => $rental->settlement_due_at ?? $dueDate,
            'payment_status'    => 'paid',
        ]);
    }

    // ---------------------------------------------------------------
    // Get tracking payload for frontend
    // ---------------------------------------------------------------
    public function getTrackingPayload(RentalRequest $rental): array
    {
        if ($rental->markAsExpiredIfDpElapsed()) {
            $rental->refresh();
        }

        $rental->load(['items.equipment', 'payments' => fn ($q) => $q->orderByDesc('created_at')]);

        $paidAmount      = $rental->getPaidAmount();
        $remainingAmount = $rental->getRemainingAmount();

        $uploadCapabilities = $this->resolveUploadCapabilities($rental);

        return [
            'id'                    => $rental->id,
            'rental_code'           => $rental->rental_code,
            'customer_name'         => $rental->customer_name,
            'customer_email'        => $rental->customer_email,
            'customer_phone'        => $rental->customer_phone,
            'start_date'            => $rental->start_date?->toDateString(),
            'end_date'              => $rental->end_date?->toDateString(),
            'total_price'           => (float) $rental->total_price,
            'paid_amount'           => $paidAmount,
            'remaining_amount'      => $remainingAmount,
            'notes'                 => $rental->notes,
            'status'                => $rental->status,
            'payment_status'        => $rental->payment_status,
            'created_at'            => $rental->created_at?->toIso8601String(),
            'approved_at'           => $rental->approved_at?->toIso8601String(),
            'dp_expired_at'         => $rental->dp_expired_at?->toIso8601String(),
            'settlement_due_at'     => $rental->settlement_due_at?->toIso8601String(),
            'confirmed_at'          => $rental->confirmed_at?->toIso8601String(),
            'completed_at'          => $rental->completed_at?->toIso8601String(),
            'cancelled_at'          => $rental->cancelled_at?->toIso8601String(),
            'is_dp_expired'         => $rental->status === 'expired',
            'is_settlement_overdue' => $rental->isSettlementOverdue(),
            'can_upload_proof'      => $uploadCapabilities['can_upload_proof'],
            'allowed_payment_types' => $uploadCapabilities['allowed_payment_types'],
            'min_dp_percent'        => DpAmountCalculator::minDpPercent('rental'),
            'min_dp_amount'         => DpAmountCalculator::minDpForTotal((float) $rental->total_price, 'rental'),
            'items'                 => $rental->items->map(fn ($item) => [
                'id'             => $item->id,
                'equipment_id'   => $item->equipment_id,
                'equipment_name' => $item->equipment?->name,
                'qty'            => $item->qty,
                'price'          => (float) $item->price,
            ])->toArray(),
            'payments' => $rental->payments->map(fn ($p) => [
                'id'                  => $p->id,
                'payment_type'        => $p->payment_type,
                'payment_method'      => $p->payment_method,
                'payment_source'      => $p->payment_source,
                'amount'              => (float) $p->amount,
                'status'              => $p->status instanceof \BackedEnum ? $p->status->value : $p->status,
                'snap_token'          => $p->snap_token,
                'midtrans_order_id'   => $p->midtrans_order_id,
                'gateway_expired_at'  => $p->gateway_expired_at?->toIso8601String(),
                'created_at'          => $p->created_at?->toIso8601String(),
                'verified_at'         => $p->verified_at?->toIso8601String(),
            ])->toArray(),
        ];
    }

    /**
     * Guest manual transfer upload (settlement / full payment).
     * DP must use Midtrans gateway.
     */
    public function resolveUploadCapabilities(RentalRequest $rental): array
    {
        if (in_array($rental->status, ['expired', 'cancelled', 'rejected', 'completed'], true)) {
            return [
                'can_upload_proof'      => false,
                'allowed_payment_types' => [],
            ];
        }

        $hasPendingManual = $rental->payments()
            ->where('payment_source', 'manual')
            ->where('status', PaymentStatus::Pending)
            ->exists();

        if ($hasPendingManual) {
            return [
                'can_upload_proof'      => false,
                'allowed_payment_types' => [],
            ];
        }

        if ($rental->status === 'waiting_dp') {
            return [
                'can_upload_proof'      => true,
                'allowed_payment_types' => ['full_payment'],
            ];
        }

        if ($rental->status === 'confirmed' && $rental->payment_status === 'partially_paid') {
            return [
                'can_upload_proof'      => true,
                'allowed_payment_types' => ['settlement'],
            ];
        }

        return [
            'can_upload_proof'      => false,
            'allowed_payment_types' => [],
        ];
    }

    private function lockAndSyncExpire(RentalRequest $rental): RentalRequest
    {
        $rental = RentalRequest::lockForUpdate()->findOrFail($rental->id);

        if ($rental->markAsExpiredIfDpElapsed()) {
            $rental->refresh();
        }

        return $rental;
    }

    private function blockedPaymentResponse(RentalRequest $rental, array $allowedStatuses): ?\Illuminate\Http\JsonResponse
    {
        if (in_array($rental->status, ['expired', 'cancelled', 'rejected'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Sewa tidak aktif (status: ' . $rental->status . ').',
                'data'    => null,
            ], 422);
        }

        if (! in_array($rental->status, $allowedStatuses, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran tidak tersedia untuk status sewa saat ini.',
                'data'    => null,
            ], 422);
        }

        return null;
    }

    private function pendingTransactionResponse(Payment $pending, string $message): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => [
                'payment_id' => $pending->id,
                'snap_token' => $pending->snap_token,
                'order_id'   => $pending->midtrans_order_id,
                'amount'     => $pending->amount,
                'expired_at' => $pending->gateway_expired_at,
            ],
        ]);
    }
}
