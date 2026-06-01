<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'city',
        'province',
        'postal_code',
        'phone',
        'email',
        'whatsapp_number',
        'maps_link',
        'image',
        'operating_hours',
        'description',
        'latitude',
        'longitude',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function booths()
    {
        return $this->hasMany(Booth::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
