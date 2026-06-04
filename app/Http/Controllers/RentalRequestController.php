<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\RentalRequest;
use App\Models\RentalItem;
use App\Models\RentalEquipment;
use App\Services\Payments\RentalPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class RentalRequestController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name'        => 'required|string|max:255',
            'customer_email'       => 'nullable|email|max:255',
            'customer_phone'       => 'nullable|string|max:20',
            'start_date'           => 'required|date|after_or_equal:today',
            'end_date'             => 'required|date|after_or_equal:start_date',
            'notes'                => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.equipment_id' => 'required|exists:rental_equipments,id',
            'items.*.qty'          => 'required|integer|min:1',
        ]);

        $startDate = Carbon::parse($validated['start_date']);
        $endDate   = Carbon::parse($validated['end_date']);
        $days      = $startDate->diffInDays($endDate) + 1;

        DB::beginTransaction();
        try {
            $totalPrice = 0;

            $rentalRequest = RentalRequest::create([
                'customer_name'  => $validated['customer_name'],
                'customer_email' => $validated['customer_email'] ?? null,
                'customer_phone' => $validated['customer_phone'] ?? null,
                'start_date'     => $validated['start_date'],
                'end_date'       => $validated['end_date'],
                'notes'          => $validated['notes'] ?? null,
                'status'         => 'pending_approval',
                'payment_status' => 'unpaid',
                'total_price'    => 0,
            ]);

            foreach ($validated['items'] as $item) {
                $equipment = RentalEquipment::findOrFail($item['equipment_id']);

                // Determine requested range and blocking window (end_date + 2 days)
                $requestedStart = $startDate->toDateString();
                $requestedEndPlus2 = $endDate->copy()->addDays(2)->toDateString();

                // Sum quantities already reserved on overlapping rentals
                $reservedQty = \DB::table('rental_items')
                    ->join('rental_requests', 'rental_items.rental_request_id', '=', 'rental_requests.id')
                    ->where('rental_items.equipment_id', $equipment->id)
                    ->whereIn('rental_requests.status', ['waiting_dp', 'confirmed'])
                    ->where(function ($q) use ($requestedStart, $requestedEndPlus2) {
                        // overlap where existing.start_date <= requestedEndPlus2 AND existing.end_date +2 >= requestedStart
                        $q->whereRaw("rental_requests.start_date <= ?", [$requestedEndPlus2])
                          ->whereRaw("DATE_ADD(rental_requests.end_date, INTERVAL 2 DAY) >= ?", [$requestedStart]);
                    })
                    ->selectRaw('COALESCE(SUM(rental_items.qty),0) as sum')
                    ->value('sum');

                $available = max(0, $equipment->stock - (int) $reservedQty);

                if ($available < $item['qty']) {
                    throw new \Exception("Stok untuk {$equipment->name} tidak mencukupi pada rentang tanggal yang dipilih. Tersedia: {$available}");
                }

                $itemTotal  = $equipment->price_per_day * $item['qty'] * $days;
                $totalPrice += $itemTotal;

                RentalItem::create([
                    'rental_request_id' => $rentalRequest->id,
                    'equipment_id'      => $equipment->id,
                    'qty'               => $item['qty'],
                    'price'             => $itemTotal,
                ]);
            }

            $rentalRequest->update(['total_price' => $totalPrice]);

            DB::commit();

            return response()->json([
                'success'     => true,
                'message'     => 'Pengajuan sewa berhasil dikirim. Admin akan segera menghubungi Anda.',
                'rental_code' => $rentalRequest->rental_code,
                'data'        => $rentalRequest->load('items.equipment'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Track rental by rental_code + contact
     * POST /api/rentals/track
     */
    public function track(Request $request)
    {
        $validated = $request->validate([
            'rental_code' => 'required|string',
            'contact'     => 'required|string',
        ]);

        $rental = RentalRequest::where('rental_code', $validated['rental_code'])->first();

        if (!$rental || !$rental->contactMatches($validated['contact'])) {
            return response()->json([
                'success' => false,
                'message' => 'Kode sewa atau kontak tidak ditemukan.',
            ], 404);
        }

        $payload = app(\App\Services\Payments\RentalPaymentService::class)->getTrackingPayload($rental);

        return response()->json([
            'success' => true,
            'data'    => $payload,
        ]);
    }

    /**
     * Guest uploads manual payment proof (full payment or settlement).
     */
    public function uploadProof(Request $request, RentalPaymentService $rentalPaymentService)
    {
        $maxKb = (int) config('rental.payment_proof_max_kb', 5120);

        $validated = $request->validate([
            'rental_code'    => 'required|string|max:50',
            'contact'        => 'required|string|max:255',
            'amount'         => 'required|numeric|min:1',
            'payment_type'   => 'required|in:dp,settlement,full_payment',
            'payment_method' => 'required|string|max:255',
            'proof_file'     => 'required_without:proof_image|file|image|max:'.$maxKb,
            'proof_image'    => 'required_without:proof_file|string',
        ]);

        if ($validated['payment_type'] === 'dp') {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran DP harus melalui gateway pembayaran (Midtrans).',
            ], 422);
        }

        $rental = RentalRequest::where('rental_code', $validated['rental_code'])->first();

        if (! $rental || ! $rental->contactMatches($validated['contact'])) {
            return response()->json([
                'success' => false,
                'message' => 'Kode sewa tidak ditemukan atau data kontak tidak cocok.',
            ], 422);
        }

        if ($rental->markAsExpiredIfDpElapsed()) {
            $rental->refresh();
        }

        if (in_array($rental->status, ['expired', 'cancelled', 'rejected', 'completed'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Sewa ini sudah '.$rental->status.' dan tidak dapat menerima pembayaran.',
            ], 422);
        }

        $capabilities = $rentalPaymentService->resolveUploadCapabilities($rental);

        if (! $capabilities['can_upload_proof']) {
            return response()->json([
                'success' => false,
                'message' => 'Sewa tidak dalam status yang mengizinkan upload bukti pembayaran.',
            ], 422);
        }

        if (! in_array($validated['payment_type'], $capabilities['allowed_payment_types'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis pembayaran tidak valid untuk status sewa saat ini.',
            ], 422);
        }

        $amount = (float) $validated['amount'];
        $remaining = $rental->getRemainingAmount();

        if ($validated['payment_type'] === 'full_payment') {
            if ($amount > $rental->total_price) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nominal melebihi total tagihan sewa.',
                ], 422);
            }
        }

        if ($validated['payment_type'] === 'settlement') {
            if ($amount > $remaining) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nominal pelunasan melebihi sisa tagihan.',
                ], 422);
            }
        }

        $proofImage = $validated['proof_image'] ?? null;

        if ($request->hasFile('proof_file')) {
            $storedPath = $request->file('proof_file')->store('payment-proofs', 'public');
            $proofImage = Storage::disk('public')->url($storedPath);
        }

        $payment = Payment::create([
            'rental_request_id' => $rental->id,
            'booking_id'        => null,
            'amount'            => $amount,
            'payment_type'      => $validated['payment_type'],
            'payment_method'    => $validated['payment_method'],
            'proof_image'       => $proofImage,
            'payment_source'    => 'manual',
            'status'            => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Bukti pembayaran berhasil diunggah dan sedang ditinjau admin.',
            'data'    => $payment,
        ], 201);
    }

    /**
     * Admin: Get all rentals
     */
    public function adminIndex(Request $request)
    {
        $query = RentalRequest::with(['items.equipment', 'payments']);

        $status = $request->input('status', '');
        if ($status && ! in_array(strtolower($status), ['all', 'semua', ''], true)) {
            $query->where('status', $status);
        }

        $rentals = $query->latest()->get();

        return response()->json(['data' => $rentals]);
    }

    /**
     * Admin: Approve a rental (Set to waiting_dp)
     */
    public function approve(Request $request, $id)
    {
        try {
            $rental = DB::transaction(function () use ($id) {
                $rental = RentalRequest::lockForUpdate()->findOrFail($id);

                if ($rental->status !== 'pending_approval') {
                    throw new \Exception('Rental tidak berstatus pending approval.');
                }

                $expirationHours = (int) config('rental.dp_expiration_hours', 24);
                $dpExpiredAt = now()->addHours($expirationHours);

                $rental->update([
                    'status' => 'waiting_dp',
                    'payment_status' => 'unpaid',
                    'approved_by' => \Illuminate\Support\Facades\Auth::id(),
                    'approved_at' => now(),
                    'dp_expired_at' => $dpExpiredAt,
                ]);

                return $rental->fresh();
            });

            return response()->json([
                'success' => true,
                'message' => 'Sewa disetujui! Menunggu pembayaran DP dari pelanggan (batas waktu: ' . $rental->dp_expired_at->format('d M Y H:i') . ').',
                'data' => $rental,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Admin: Reject a rental
     */
    public function reject(Request $request, $id)
    {
        $rental = RentalRequest::findOrFail($id);

        if ($rental->status !== 'pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya sewa pending yang dapat ditolak.',
            ], 422);
        }

        $rental->update([
            'status' => 'rejected',
            'notes' => $request->input('notes') ?? $rental->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sewa berhasil ditolak.',
            'data' => $rental,
        ]);
    }

    /**
     * Admin: Complete a rental
     */
    public function complete(Request $request, $id)
    {
        $rental = RentalRequest::findOrFail($id);

        if ($rental->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya sewa confirmed yang dapat diselesaikan.',
            ], 422);
        }

        $rental->update([
            'status' => 'completed',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Penyewaan selesai.',
            'data' => $rental,
        ]);
    }

    /**
     * Admin: Cancel a rental
     */
    public function cancel(Request $request, $id)
    {
        $rental = RentalRequest::findOrFail($id);

        if (!in_array($rental->status, ['pending_approval', 'waiting_dp', 'confirmed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Sewa ini tidak dapat dibatalkan.',
            ], 422);
        }

        $rental->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sewa berhasil dibatalkan.',
            'data' => $rental,
        ]);
    }

    /**
     * Admin: Update status directly (optional fallback)
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending_approval,waiting_dp,confirmed,completed,expired,cancelled,rejected',
        ]);

        $rental = RentalRequest::findOrFail($id);
        $rental->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Status sewa berhasil diperbarui.',
            'data' => $rental,
        ]);
    }

    /**
     * Admin: Verify Manual Payment
     */
    public function verifyPayment(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:verified,rejected',
        ]);

        $payment = \App\Models\Payment::where('payment_source', 'manual')
            ->whereNotNull('rental_request_id')
            ->find($id);

        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Pembayaran sewa tidak ditemukan.'], 404);
        }

        return app(\App\Services\Payments\RentalPaymentService::class)
            ->verifyManualPayment((int) $id, $validated['status']);
    }
}
