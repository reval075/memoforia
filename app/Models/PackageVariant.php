<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PackageVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_package_id',
        'name',
        'duration_hours',
        'print_limit',
        'price',
        'extra_hour_price',
        'extra_print_price',
        'is_unlimited',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'extra_hour_price' => 'decimal:2',
        'extra_print_price' => 'decimal:2',
        'is_unlimited' => 'boolean',
    ];

    public function servicePackage()
    {
        return $this->belongsTo(ServicePackage::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
