<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServicePackage extends Model
{
    use HasFactory;

    protected $table = 'service_packages';

    protected $fillable = [
        'name',
        'category',
        'description',
        'is_active',
        'display_order',
        'has_softfile',
        'has_prints',
        'has_qrcode',
        'has_gif',
        'has_custom_template',
        'has_supporting_crew',
        'has_tiket_antrian',
        'printer_type',
        'printer_description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'has_softfile' => 'boolean',
        'has_prints' => 'boolean',
        'has_qrcode' => 'boolean',
        'has_gif' => 'boolean',
        'has_custom_template' => 'boolean',
        'has_supporting_crew' => 'boolean',
        'has_tiket_antrian' => 'boolean',
        'display_order' => 'integer',
    ];

    public function packageVariants()
    {
        return $this->hasMany(PackageVariant::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'service_package_id');
    }
}
