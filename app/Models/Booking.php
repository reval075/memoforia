<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_code',
        'customer_name',
        'customer_email',
        'customer_phone',
        'event_name',
        'event_location',
        'event_date',
        'event_datetime',
        'service_package_id',
        'package_variant_id',
        'selected_template_id',
        'use_custom_frame',
        'notes',
        'status',
        'approved_by',
        'approved_at',
        'confirmed_at',
        'dp_expired_at',
        'settlement_due_at',
        'payment_status',
        'cancelled_at',
        'total_price',
        'package_id',
        'branch_id',
        'availability_id',
        'completed_at',
        'custom_frame_path',
        'custom_frame_original_name',
        'custom_frame_uploaded_at',
    ];

    protected $casts = [
        'event_datetime' => 'datetime',
        'approved_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'dp_expired_at' => 'datetime',
        'settlement_due_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
        'custom_frame_uploaded_at' => 'datetime',
    ];

    /**
     * Scope: bookings that have passed their DP payment deadline.
     */
    public function scopeExpiredDp($query)
    {
        return $query->where('status', 'waiting_dp')
                     ->whereNotNull('dp_expired_at')
                     ->where('dp_expired_at', '<=', now());
    }

    /**
     * Source of truth: a booking is DP-expired when it is still waiting_dp
     * and the deadline has passed.
     */
    public function isDpExpired(): bool
    {
        return $this->status === 'waiting_dp'
            && $this->dp_expired_at !== null
            && now()->gt($this->dp_expired_at);
    }

    /**
     * Synchronize status when a booking is already expired by time.
     * Returns true when status is changed in this call.
     */
    public function markAsExpiredIfDpElapsed(): bool
    {
        if (! $this->isDpExpired()) {
            return false;
        }

        $this->update([
            'status' => 'expired',
            'cancelled_at' => $this->cancelled_at ?? now(),
            'notes' => 'Otomatis expired karena batas waktu pembayaran DP telah habis.',
        ]);

        return true;
    }

    /**
     * Normalize phone numbers for consistent comparison (e.g. 08xx vs 628xx).
     */
    public static function normalizePhone(?string $phone): string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '62')) {
            return $digits;
        }

        if (str_starts_with($digits, '0')) {
            return '62'.substr($digits, 1);
        }

        return $digits;
    }

    /**
     * Verify guest contact matches booking email or phone.
     */
    public function contactMatches(string $contact): bool
    {
        $contact = trim($contact);

        if ($contact === '') {
            return false;
        }

        if (filter_var($contact, FILTER_VALIDATE_EMAIL)) {
            return strcasecmp((string) $this->customer_email, $contact) === 0;
        }

        $normalizedContact = self::normalizePhone($contact);
        $normalizedBooking = self::normalizePhone($this->customer_phone);

        return $normalizedContact !== '' && $normalizedContact === $normalizedBooking;
    }

    public function servicePackage()
    {
        return $this->belongsTo(ServicePackage::class, 'service_package_id');
    }

    public function packageVariant()
    {
        return $this->belongsTo(PackageVariant::class, 'package_variant_id');
    }

    public function selectedTemplate()
    {
        return $this->belongsTo(PhotoTemplate::class, 'selected_template_id');
    }

    public function addons()
    {
        return $this->belongsToMany(Addon::class, 'booking_addons')
            ->withPivot('quantity', 'price')
            ->withTimestamps();
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function package()
    {
        return $this->belongsTo(Package::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function availability()
    {
        return $this->belongsTo(Availability::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Calculate total amount already paid (verified payments only).
     *
     * Business rule:
     * - Only payments with status='verified' count
     * - Fallback to 0 if no verified payments exist
     */
    public function getPaidAmount(): int
    {
        return (int) $this->payments()
            ->where('status', 'verified')
            ->sum('amount');
    }

    /**
     * Calculate remaining amount to be paid.
     *
     * Business rule:
     * - remaining = total_price - paid_amount
     * - If result < 0, use 0 (overpaid scenario)
     */
    public function getRemainingAmount(): int
    {
        $remaining = $this->total_price - $this->getPaidAmount();
        return max(0, $remaining);
    }

    /**
     * Determine if settlement payment is overdue.
     *
     * Business rule:
     * - Overdue when: now() > settlement_due_at AND remaining_amount > 0
     * - Only applicable for confirmed bookings with settlement deadline
     */
    public function isSettlementOverdue(): bool
    {
        if (! $this->settlement_due_at) {
            return false;
        }

        return now()->gt($this->settlement_due_at) && $this->getRemainingAmount() > 0;
    }

    /**
     * Check if DP is already paid (verified)
     */
    public function isDpPaid(): bool
    {
        return $this->payments()
            ->where('payment_type', 'dp')
            ->where('status', 'verified')
            ->exists();
    }

    /**
     * Check if settlement is already paid (verified)
     */
    public function isSettlementPaid(): bool
    {
        return $this->payments()
            ->where('payment_type', 'settlement')
            ->where('status', 'verified')
            ->exists();
    }

    /**
     * Check if booking is fully paid
     */
    public function isFullyPaid(): bool
    {
        return $this->getRemainingAmount() <= 0;
    }
    public function getCustomFrameUrlAttribute(): ?string
    {
        if (! $this->custom_frame_path) {
            return null;
        }

        return Storage::disk('public')->url($this->custom_frame_path);
    }
    /**
     * Get DP payment amount (verified only)
     */
    public function getDpAmount(): int
    {
        return (int) $this->payments()
            ->where('payment_type', 'dp')
            ->where('status', 'verified')
            ->sum('amount');
    }

    /**
     * Get settlement payment amount (verified only)
     */
    public function getSettlementAmount(): int
    {
        return (int) $this->payments()
            ->where('payment_type', 'settlement')
            ->where('status', 'verified')
            ->sum('amount');
    }

    /**
     * Get pending DP payment if exists
     */
    public function getPendingDpPayment(): ?Payment
    {
        return $this->payments()
            ->where('payment_type', 'dp')
            ->where('status', 'pending')
            ->latest()
            ->first();
    }

    /**
     * Get pending settlement payment if exists
     */
    public function getPendingSettlementPayment(): ?Payment
    {
        return $this->payments()
            ->where('payment_type', 'settlement')
            ->where('status', 'pending')
            ->latest()
            ->first();
    }
}

