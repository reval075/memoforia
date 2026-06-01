<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'rental_request_id',
        'amount',
        'payment_type',
        'payment_method',
        'proof_image',
        'status',
        'verified_by',
        'verified_at',
        'paid_at',
        // Midtrans gateway fields
        'payment_source',
        'gateway',
        'gateway_reference',
        'midtrans_order_id',
        'snap_token',
        'gateway_payload',
        'gateway_expired_at',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'paid_at' => 'datetime',
        'gateway_expired_at' => 'datetime',
        'gateway_payload' => 'json',
        'status' => \App\Enums\PaymentStatus::class,
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function rentalRequest()
    {
        return $this->belongsTo(RentalRequest::class, 'rental_request_id');
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Scope: Get verified/paid DP payments
     */
    public function scopePaidDp($query)
    {
        return $query->where('payment_type', 'dp')
                     ->where('status', 'verified');
    }

    /**
     * Scope: Get verified/paid settlement payments
     */
    public function scopePaidSettlement($query)
    {
        return $query->where('payment_type', 'settlement')
                     ->where('status', 'verified');
    }

    /**
     * Scope: Get Midtrans payments
     */
    public function scopeMidtrans($query)
    {
        return $query->where('payment_source', 'midtrans');
    }
}

