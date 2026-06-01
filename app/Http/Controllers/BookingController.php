<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServicePackage;
use App\Models\PackageVariant;
use App\Models\Addon;
use App\Models\PhotoTemplate;
use App\Models\UnavailableDate;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BookingController extends Controller
{
    /**
     * Store a newly created booking (Guest).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'required|string|max:30',
            'event_name' => 'required|string|max:255',
            'event_location' => 'required|string|max:255',
            'event_datetime' => 'required|date|after_or_equal:today',
            'service_package_id' => 'required|exists:service_packages,id',
            'package_variant_id' => 'required|exists:package_variants,id',
            'selected_template_id' => 'required|exists:photo_templates,id',
            'notes' => 'nullable|string',
            'addons' => 'nullable|array', // e.g. [['id' => 1, 'quantity' => 2]]
            'addons.*.id' => 'exists:addons,id',
            'addons.*.quantity' => 'integer|min:1',
        ]);

        $eventDatetime = Carbon::parse($validated['event_datetime']);
        $eventDate = $eventDatetime->toDateString();

        // 1. Check manual blocks
        if (UnavailableDate::where('date', $eventDate)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Tanggal ini tidak tersedia untuk pemesanan.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        // 2. Check if date has been reserved (confirmed/completed bookings)
        $isReserved = Booking::where('event_date', $eventDate)
            ->whereIn('status', ['confirmed', 'completed'])
            ->exists();
        if ($isReserved) {
            return response()->json([
                'success' => false,
                'message' => 'Tanggal ini sudah dipesan (reserved) oleh pelanggan lain.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        // 3. Compute price
        $variant = PackageVariant::findOrFail($validated['package_variant_id']);
        if ($variant->service_package_id != $validated['service_package_id']) {
            return response()->json([
                'success' => false,
                'message' => 'Varian paket tidak cocok dengan paket jasa yang dipilih.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        $totalPrice = $variant->price;
        $addonData = [];

        if (!empty($validated['addons'])) {
            foreach ($validated['addons'] as $item) {
                $addon = Addon::findOrFail($item['id']);
                $quantity = $item['quantity'] ?? 1;
                $price = $addon->price * $quantity;
                $totalPrice += $price;

                $addonData[$addon->id] = [
                    'quantity' => $quantity,
                    'price' => $addon->price,
                ];
            }
        }

        // Generate booking code
        $datePart = $eventDatetime->format('Ymd');
        $randomPart = strtoupper(Str::random(5));
        $bookingCode = "MEMO-{$datePart}-{$randomPart}";

        $booking = DB::transaction(function () use ($validated, $bookingCode, $eventDate, $eventDatetime, $variant, $totalPrice, $addonData) {
            $booking = Booking::create([
                'booking_code' => $bookingCode,
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'customer_phone' => $validated['customer_phone'],
                'event_name' => $validated['event_name'],
                'event_location' => $validated['event_location'],
                'event_date' => $eventDate,
                'event_datetime' => $eventDatetime,
                'service_package_id' => $validated['service_package_id'],
                'package_variant_id' => $validated['package_variant_id'],
                'selected_template_id' => $validated['selected_template_id'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending_approval',
                'payment_status' => 'unpaid',
                'total_price' => $totalPrice,
            ]);

            if (!empty($addonData)) {
                $booking->addons()->sync($addonData);
            }

            return $booking;
        });

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan booking berhasil diajukan! Silakan tunggu approval admin.',
            'data' => $booking->load(['servicePackage', 'packageVariant', 'selectedTemplate', 'addons']),
            'errors' => null,
        ], 201);
    }

    /**
     * List all bookings for admin.
     *
     * Bug fix: Handle 'all', 'semua', or empty status to show all bookings
     * (not treat them as literal status values)
     */
    public function adminIndex(Request $request)
    {
        $query = Booking::with(['servicePackage', 'packageVariant', 'selectedTemplate', 'addons', 'payments']);

        // Filter by status if specified and not "all"/"semua"/empty
        $status = $request->input('status', '');
        if ($status && ! in_array(strtolower($status), ['all', 'semua', ''], true)) {
            $query->where('status', $status);
        }
        // If status is 'all', 'semua', or empty string -> show all (no WHERE clause)

        $bookings = $query->latest()->get();

        return response()->json(['data' => $bookings]);
    }

    /**
     * Approve a booking (Waiting DP).
     *
     * Transaction-safe: uses lockForUpdate to prevent race conditions
     * when two admins approve bookings on the same date simultaneously.
     */
    public function approve(Request $request, $id)
    {
        try {
            $booking = DB::transaction(function () use ($id) {
                // Lock the booking row to prevent concurrent modifications
                $booking = Booking::lockForUpdate()->findOrFail($id);

                if ($booking->status !== 'pending_approval') {
                    throw new \Exception('Booking tidak berstatus pending approval.');
                }

                // Lock and check if date has been reserved/locked in the meantime
                $isReserved = Booking::where('event_date', $booking->event_date)
                    ->where('id', '!=', $booking->id)
                    ->whereIn('status', ['confirmed', 'completed'])
                    ->lockForUpdate()
                    ->exists();

                if ($isReserved) {
                    throw new \Exception('Tanggal ini sudah dipesan/confirmed oleh event lain.');
                }

                // Calculate DP expiration deadline
                $expirationHours = config('booking.dp_expiration_hours', 12);
                $dpExpiredAt = now()->addHours($expirationHours);

                $booking->update([
                    'status' => 'waiting_dp',
                    'approved_by' => Auth::id(),
                    'approved_at' => now(),
                    'dp_expired_at' => $dpExpiredAt,
                ]);

                return $booking->fresh();
            });

            return response()->json([
                'success' => true,
                'message' => 'Booking disetujui! Menunggu pembayaran DP dari pelanggan (batas waktu: ' . $booking->dp_expired_at->format('d M Y H:i') . ').',
                'data' => $booking,
                'errors' => null,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
                'errors' => null,
            ], 422);
        }
    }

    /**
     * Reject a booking.
     */
    public function reject(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->status !== 'pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya booking pending yang dapat ditolak.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        $booking->update([
            'status' => 'rejected',
            'notes' => $request->input('notes') ?? $booking->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Booking berhasil ditolak.',
            'data' => $booking,
            'errors' => null,
        ]);
    }

    /**
     * Guest booking lookup for tracking (booking_code + email or phone).
     */
    public function track(Request $request)
    {
        $validated = $request->validate([
            'booking_code' => 'required|string|max:50',
            'contact' => 'required|string|max:255',
        ]);

        $booking = Booking::with([
            'servicePackage',
            'packageVariant',
            'selectedTemplate',
            'addons',
            'payments' => fn ($query) => $query->latest(),
        ])
            ->where('booking_code', $validated['booking_code'])
            ->first();

        if (! $booking || ! $booking->contactMatches($validated['contact'])) {
            return response()->json([
                'success' => false,
                'message' => 'Booking tidak ditemukan atau data kontak tidak cocok.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        // Realtime expiration sync (same source of truth as payment flows).
        if ($booking->markAsExpiredIfDpElapsed()) {
            $booking->refresh();
            $booking->load([
                'servicePackage',
                'packageVariant',
                'selectedTemplate',
                'addons',
                'payments' => fn ($query) => $query->latest(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Booking ditemukan.',
            'data' => $this->formatTrackingPayload($booking),
            'errors' => null,
        ]);
    }

    /**
     * Admin: manual booking status update.
     *
     * This route exists in routes/web.php, so controller must implement it
     * to prevent production 500 errors.
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending_approval,waiting_dp,confirmed,completed,cancelled,expired,rejected',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $booking = DB::transaction(function () use ($id, $validated) {
                $booking = Booking::lockForUpdate()->findOrFail($id);

                $booking->status = $validated['status'];

                if (in_array($booking->status, ['cancelled', 'expired', 'rejected'], true)) {
                    $booking->cancelled_at = now();
                    if ($booking->status === 'rejected') {
                        $booking->notes = $validated['notes'] ?? $booking->notes;
                    }
                }

                if ($booking->status === 'waiting_dp') {
                    // Ensure deadline exists if admin manually sets waiting_dp.
                    if (! $booking->dp_expired_at) {
                        $expirationHours = config('booking.dp_expiration_hours', 12);
                        $booking->dp_expired_at = now()->addHours($expirationHours);
                    }
                }

                if ($booking->status === 'confirmed') {
                    if (! $booking->confirmed_at) {
                        $booking->confirmed_at = now();
                    }
                    // Set settlement deadline when confirming (event_date + 2 days)
                    if (! $booking->settlement_due_at) {
                        $booking->settlement_due_at = Carbon::parse($booking->event_date)->addDays(2)->endOfDay();
                    }
                }

                if ($booking->status === 'completed') {
                    // Keep confirmed_at if set; no special requirements here.
                }

                $booking->save();

                return $booking->fresh();
            });

            return response()->json([
                'success' => true,
                'message' => 'Status booking berhasil diperbarui.',
                'data' => $booking,
                'errors' => null,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
                'errors' => null,
            ], 422);
        }
    }

    /**
     * Guest uploads a payment proof (DP or Settlement).
     *
     * Guards against expired/cancelled/rejected bookings.
     */
    public function uploadProof(Request $request)
    {
        $maxKb = (int) config('booking.payment_proof_max_kb', 5120);

        $validated = $request->validate([
            'booking_code' => 'required|string|max:50',
            'contact' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'payment_type' => 'required|in:dp,settlement,full_payment',
            'payment_method' => 'required|string|max:255',
            'proof_file' => 'required_without:proof_image|file|image|max:'.$maxKb,
            'proof_image' => 'required_without:proof_file|string',
        ]);

        if ($validated['payment_type'] === 'dp') {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran DP manual tidak lagi didukung. Silakan gunakan gateway pembayaran otomatis.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        $booking = Booking::where('booking_code', $validated['booking_code'])->first();

        if (! $booking || ! $booking->contactMatches($validated['contact'])) {
            return response()->json([
                'success' => false,
                'message' => 'Booking tidak ditemukan atau data kontak tidak cocok.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        // Realtime expiration sync: do not rely only on scheduler.
        if ($booking->markAsExpiredIfDpElapsed()) {
            $booking->refresh();
        }

        // Guard: reject upload for expired/cancelled/rejected bookings
        if (in_array($booking->status, ['expired', 'cancelled', 'rejected', 'completed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Booking ini sudah '.$booking->status.' dan tidak dapat menerima pembayaran.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        $uploadCapabilities = $this->resolveUploadCapabilities($booking);

        if (! $uploadCapabilities['can_upload_proof']) {
            return response()->json([
                'success' => false,
                'message' => 'Booking tidak dalam status yang mengizinkan upload bukti pembayaran.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        if (! in_array($validated['payment_type'], $uploadCapabilities['allowed_payment_types'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis pembayaran tidak valid untuk status booking saat ini.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        $proofImage = $validated['proof_image'] ?? null;

        if ($request->hasFile('proof_file')) {
            $storedPath = $request->file('proof_file')->store('payment-proofs', 'public');
            $proofImage = Storage::disk('public')->url($storedPath);
        }

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'amount' => $validated['amount'],
            'payment_type' => $validated['payment_type'],
            'payment_method' => $validated['payment_method'],
            'proof_image' => $proofImage,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Bukti pembayaran berhasil diunggah dan sedang ditinjau admin.',
            'data' => $payment,
            'errors' => null,
        ], 201);
    }

    /**
     * Verify a payment record (Admin).
     *
     * Transaction-safe with pessimistic locking:
     * - lockForUpdate on payment prevents double verification
     * - lockForUpdate on booking prevents concurrent state changes
     * - lockForUpdate on same-date bookings prevents double confirmation
     */
    public function verifyPayment(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:verified,rejected',
        ]);

        // Handle rejection outside transaction (simpler, no race condition risk)
        if ($validated['status'] === 'rejected') {
            $payment = Payment::findOrFail($id);

            if ($payment->status !== \App\Enums\PaymentStatus::Pending) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pembayaran ini sudah diverifikasi sebelumnya.',
                    'data' => null,
                    'errors' => null,
                ], 422);
            }

            $payment->update([
                'status' => 'rejected',
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil ditolak.',
                'data' => $payment,
                'errors' => null,
            ]);
        }

        // Verification flow with pessimistic locking
        try {
            $result = DB::transaction(function () use ($id) {
                // 1. Lock the payment row — prevents double verification
                $payment = Payment::lockForUpdate()->findOrFail($id);

                if ($payment->status !== \App\Enums\PaymentStatus::Pending) {
                    throw new \Exception('Pembayaran ini sudah diverifikasi sebelumnya.');
                }

                // 2. Lock the booking row — prevents concurrent state changes
                $booking = Booking::lockForUpdate()->findOrFail($payment->booking_id);

                // Realtime expiration sync inside transaction after lock.
                if ($booking->markAsExpiredIfDpElapsed()) {
                    $booking->refresh();
                }

                // Guard: reject verification for expired/cancelled bookings.
                // Use non-exception early return so realtime expiration sync can be committed.
                if (in_array($booking->status, ['expired', 'cancelled', 'rejected'])) {
                    return [
                        'error' => 'Booking sudah ' . $booking->status . ' dan tidak dapat diverifikasi.',
                    ];
                }

                // 3. Verify the payment
                $payment->update([
                    'status' => 'verified',
                    'verified_by' => Auth::id(),
                    'verified_at' => now(),
                    'paid_at' => now(),
                ]);

                // 4. Update booking status based on payment type
                if ($payment->payment_type === 'dp') {
                    // Guard: check for DP payment that booking is still waiting_dp
                    if ($booking->status !== 'waiting_dp') {
                        throw new \Exception('Booking tidak berstatus waiting_dp untuk verifikasi DP.');
                    }

                    // 5. Lock and check no other confirmed booking exists on same date
                    $conflictExists = Booking::where('event_date', $booking->event_date)
                        ->where('id', '!=', $booking->id)
                        ->whereIn('status', ['confirmed', 'completed'])
                        ->lockForUpdate()
                        ->exists();

                    if ($conflictExists) {
                        throw new \Exception('Tanggal ini sudah dikonfirmasi oleh booking lain. Tidak dapat melakukan double confirmation.');
                    }

                    // Flush cached relationship so the just-verified payment is counted
                    $booking->unsetRelation('payments');

                    $totalPaid = $booking->payments()
                        ->where('status', \App\Enums\PaymentStatus::Verified)
                        ->sum('amount');

                    $dueDate = Carbon::parse($booking->event_date)->addDays(2)->endOfDay();

                    if ($totalPaid >= $booking->total_price) {
                        // DP covers full amount — mark as completed directly
                        $booking->update([
                            'status'            => 'completed',
                            'confirmed_at'      => now(),
                            'completed_at'      => now(),
                            'payment_status'    => 'paid',
                            'settlement_due_at' => $dueDate,
                        ]);
                    } else {
                        $booking->update([
                            'status'            => 'confirmed',
                            'confirmed_at'      => now(),
                            'payment_status'    => 'partially_paid',
                            'settlement_due_at' => $dueDate,
                        ]);
                    }

                    // 6. Auto-cancel competing bookings on the same date (inside transaction)
                    Booking::where('event_date', $booking->event_date)
                        ->where('id', '!=', $booking->id)
                        ->whereIn('status', ['pending_approval', 'waiting_dp'])
                        ->update([
                            'status'       => 'cancelled',
                            'cancelled_at' => now(),
                            'notes'        => 'Otomatis dibatalkan karena pelanggan lain telah membayar DP terlebih dahulu pada tanggal ini.'
                        ]);

                } elseif ($payment->payment_type === 'settlement' || $payment->payment_type === 'full_payment') {
                    // Settlement/full payment can only be processed on active booking flows.
                    if (! in_array($booking->status, ['waiting_dp', 'confirmed', 'completed'])) {
                        throw new \Exception('Booking tidak dalam status valid untuk verifikasi settlement/full payment.');
                    }

                    // If this payment would confirm the booking from waiting_dp, enforce date-conflict protection.
                    if (! in_array($booking->status, ['confirmed', 'completed'])) {
                        $conflictExists = Booking::where('event_date', $booking->event_date)
                            ->where('id', '!=', $booking->id)
                            ->whereIn('status', ['confirmed', 'completed'])
                            ->lockForUpdate()
                            ->exists();

                        if ($conflictExists) {
                            throw new \Exception('Tanggal ini sudah dikonfirmasi oleh booking lain. Tidak dapat melakukan konfirmasi.');
                        }
                    }

                    // Flush cached relationship so the just-updated payment is included in sum
                    $booking->unsetRelation('payments');

                    // Verify total amount paid (including the payment we just verified above)
                    $totalPaid = $booking->payments()
                        ->where('status', \App\Enums\PaymentStatus::Verified)
                        ->sum('amount');

                    if ($totalPaid >= $booking->total_price && $booking->status !== 'completed') {
                        $dueDate = Carbon::parse($booking->event_date)->addDays(2)->endOfDay();

                        $booking->update([
                            'status'            => 'completed',
                            'confirmed_at'      => $booking->confirmed_at ?? now(),
                            'completed_at'      => now(),
                            'settlement_due_at' => $booking->settlement_due_at ?? $dueDate,
                            'payment_status'    => 'paid',
                        ]);

                        // Cancel competing bookings on the same date
                        Booking::where('event_date', $booking->event_date)
                            ->where('id', '!=', $booking->id)
                            ->whereIn('status', ['pending_approval', 'waiting_dp'])
                            ->update([
                                'status'       => 'cancelled',
                                'cancelled_at' => now(),
                                'notes'        => 'Otomatis dibatalkan karena pelanggan lain telah menyelesaikan pembayaran terlebih dahulu pada tanggal ini.'
                            ]);
                    } else {
                        // Partial settlement — just update payment_status
                        $booking->update([
                            'payment_status' => $totalPaid > 0 ? 'partially_paid' : $booking->payment_status,
                        ]);
                    }
                }

                return $payment->fresh()->load('booking');
            });

            if (is_array($result) && isset($result['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'],
                    'data' => null,
                    'errors' => null,
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil diverifikasi dan dikonfirmasi!',
                'data' => $result,
                'errors' => null,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
                'errors' => null,
            ], 422);
        }
    }

    /**
     * Mark booking as completed (Admin).
     */
    public function complete($id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya booking terkonfirmasi (confirmed) yang dapat diselesaikan.',
                'data' => null,
                'errors' => null,
            ], 422);
        }

        $booking->update([
            'status' => 'completed',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Event berhasil diselesaikan!',
            'data' => $booking,
            'errors' => null,
        ]);
    }

    /**
     * Cancel a booking.
     */
    public function cancel($id)
    {
        $booking = Booking::findOrFail($id);

        $booking->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Booking berhasil dibatalkan.',
            'data' => $booking,
            'errors' => null,
        ]);
    }

    /**
     * Build a guest-safe tracking payload for public lookup responses.
     *
     * Includes payment summary: total_price, paid_amount, remaining_amount, settlement_due_at, is_overdue
     */
    private function formatTrackingPayload(Booking $booking): array
    {
        $uploadCapabilities = $this->resolveUploadCapabilities($booking);

        // Calculate payment summary
        $paidAmount = $booking->getPaidAmount();
        $remainingAmount = $booking->getRemainingAmount();
        $isOverdue = $booking->isSettlementOverdue();

        return [
            'booking_code' => $booking->booking_code,
            'status' => $booking->status,
            'payment_status' => $booking->payment_status,
            'customer_name' => $booking->customer_name,
            'customer_email' => $booking->customer_email,
            'customer_phone' => $booking->customer_phone,
            'created_at' => $booking->created_at,
            'event_name' => $booking->event_name,
            'event_location' => $booking->event_location,
            'event_date' => $booking->event_date,
            'event_datetime' => $booking->event_datetime,
            'total_price' => $booking->total_price,
            'notes' => $booking->notes,
            'approved_at' => $booking->approved_at,
            'confirmed_at' => $booking->confirmed_at,
            'cancelled_at' => $booking->cancelled_at,
            'dp_expired_at' => $booking->dp_expired_at,
            'is_dp_expired' => $booking->status === 'expired',
            // Payment summary fields (NEW)
            'paid_amount' => $paidAmount,
            'remaining_amount' => $remainingAmount,
            'settlement_due_at' => $booking->settlement_due_at,
            'is_settlement_overdue' => $isOverdue,
            'can_upload_proof' => $uploadCapabilities['can_upload_proof'],
            'allowed_payment_types' => $uploadCapabilities['allowed_payment_types'],
            'service_package' => $booking->servicePackage ? [
                'id' => $booking->servicePackage->id,
                'name' => $booking->servicePackage->name,
                'category' => $booking->servicePackage->category,
            ] : null,
            'package_variant' => $booking->packageVariant ? [
                'id' => $booking->packageVariant->id,
                'name' => $booking->packageVariant->name,
                'price' => $booking->packageVariant->price,
                'duration_hours' => $booking->packageVariant->duration_hours,
                'print_limit' => $booking->packageVariant->print_limit,
                'is_unlimited' => (bool) $booking->packageVariant->is_unlimited,
            ] : null,
            'selected_template' => $booking->selectedTemplate ? [
                'id' => $booking->selectedTemplate->id,
                'name' => $booking->selectedTemplate->name,
                'size' => $booking->selectedTemplate->size,
            ] : null,
            'addons' => $booking->addons->map(fn ($addon) => [
                'id' => $addon->id,
                'name' => $addon->name,
                'quantity' => $addon->pivot->quantity,
                'price' => $addon->pivot->price,
            ])->values(),
            'payments' => $booking->payments->map(fn ($payment) => [
                'id'             => $payment->id,
                'amount'         => $payment->amount,
                'payment_type'   => $payment->payment_type,
                'payment_method' => $payment->payment_method,
                'status'         => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                'payment_source' => $payment->payment_source,   // 'midtrans' | 'manual' | null
                'snap_token'     => $payment->snap_token,        // needed by MidtransPaymentGateway
                'created_at'     => $payment->created_at,
                'verified_at'    => $payment->verified_at,
            ])->values(),
        ];
    }

    /**
     * Determine whether guest can upload payment proof from tracking context.
     *
     * Settlement upload is allowed but customer will see overdue alert in UI.
     * We don't block overdue submissions - admin can still process late payments.
     */
    private function resolveUploadCapabilities(Booking $booking): array
    {
        $canUpload = false;
        $allowedTypes = [];

        if (in_array($booking->status, ['expired', 'cancelled', 'rejected', 'completed'])) {
            return [
                'can_upload_proof' => false,
                'allowed_payment_types' => [],
            ];
        }

        if ($booking->status === 'waiting_dp') {
            $canUpload = true;
            $allowedTypes = ['dp'];
        } elseif ($booking->status === 'confirmed' && $booking->payment_status === 'partially_paid') {
            $canUpload = true;
            // Settlement allowed even if overdue; UI will show alert
            $allowedTypes = ['settlement'];
        } elseif ($booking->status === 'confirmed' && $booking->payment_status === 'unpaid') {
            $canUpload = true;
            $allowedTypes = ['full_payment'];
        }

        return [
            'can_upload_proof' => $canUpload,
            'allowed_payment_types' => $allowedTypes,
        ];
    }
}
