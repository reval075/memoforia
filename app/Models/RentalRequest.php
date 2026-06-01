<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentalRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'rental_code',
        'customer_name',
        'customer_email',
        'customer_phone',
        'start_date',
        'end_date',
        'total_price',
        'notes',
        'status',
        'payment_status',
        'approved_by',
        'approved_at',
        'confirmed_at',
        'completed_at',
        'cancelled_at',
        'dp_expired_at',
        'settlement_due_at',
    ];

    protected $casts = [
        'start_date'        => 'date',
        'end_date'          => 'date',
        'approved_at'       => 'datetime',
        'confirmed_at'      => 'datetime',
        'completed_at'      => 'datetime',
        'cancelled_at'      => 'datetime',
        'dp_expired_at'     => 'datetime',
        'settlement_due_at' => 'datetime',
    ];

    // ---------------------------------------------------------------
    // Boot: Auto-generate rental_code
    // ---------------------------------------------------------------
    protected static function booted(): void
    {
        static::creating(function (RentalRequest $rental) {
            if (empty($rental->rental_code)) {
                $rental->rental_code = static::generateRentalCode();
            }
        });
    }

    public static function generateRentalCode(): string
    {
        do {
            $suffix = strtoupper(substr(md5(uniqid()), 0, 5));
            $code = 'RENT-' . now()->format('Ymd') . '-' . $suffix;
        } while (static::where('rental_code', $code)->exists());

        return $code;
    }

    // ---------------------------------------------------------------
    // Relationships
    // ---------------------------------------------------------------
    public function items()
    {
        return $this->hasMany(RentalItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'rental_request_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ---------------------------------------------------------------
    // Payment helpers (mirrors Booking model)
    // ---------------------------------------------------------------
    public function getPaidAmount(): int
    {
        return (int) $this->payments()
            ->where('status', 'verified')
            ->sum('amount');
    }

    public function getRemainingAmount(): int
    {
        $remaining = $this->total_price - $this->getPaidAmount();
        return max(0, (int) $remaining);
    }

    public function isFullyPaid(): bool
    {
        return $this->getRemainingAmount() <= 0;
    }

    public function scopeExpiredDp($query)
    {
        return $query->where('status', 'waiting_dp')
            ->whereNotNull('dp_expired_at')
            ->where('dp_expired_at', '<=', now());
    }

    public function isDpExpired(): bool
    {
        return $this->status === 'waiting_dp'
            && $this->dp_expired_at !== null
            && now()->gt($this->dp_expired_at);
    }

    public function markAsExpiredIfDpElapsed(): bool
    {
        if (! $this->isDpExpired()) {
            return false;
        }

        $this->update([
            'status'       => 'expired',
            'cancelled_at' => $this->cancelled_at ?? now(),
            'notes'        => trim(($this->notes ? $this->notes . "\n" : '') . 'Otomatis expired karena batas waktu pembayaran DP telah habis.'),
        ]);

        return true;
    }

    public function isSettlementOverdue(): bool
    {
        if (! $this->settlement_due_at) {
            return false;
        }

        return now()->gt($this->settlement_due_at) && $this->getRemainingAmount() > 0;
    }

    public function getPendingDpPayment(): ?\App\Models\Payment
    {
        return $this->payments()
            ->where('payment_type', 'dp')
            ->where('status', 'pending')
            ->latest()
            ->first();
    }

    public function getPendingSettlementPayment(): ?\App\Models\Payment
    {
        return $this->payments()
            ->where('payment_type', 'settlement')
            ->where('status', 'pending')
            ->latest()
            ->first();
    }

    /**
     * Normalize phone for contact matching.
     */
    public static function normalizePhone(?string $phone): string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);
        if ($digits === '') return '';
        if (str_starts_with($digits, '62')) return $digits;
        if (str_starts_with($digits, '0')) return '62' . substr($digits, 1);
        return $digits;
    }

    public function contactMatches(string $contact): bool
    {
        $contact = trim($contact);
        if ($contact === '') return false;

        if (filter_var($contact, FILTER_VALIDATE_EMAIL)) {
            return strcasecmp((string) $this->customer_email, $contact) === 0;
        }

        $normalizedContact = self::normalizePhone($contact);
        $normalizedRental  = self::normalizePhone($this->customer_phone);

        return $normalizedContact !== '' && $normalizedContact === $normalizedRental;
    }
}
