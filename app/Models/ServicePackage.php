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
        'includes_softfile',
        'includes_prints',
        'includes_qr_code',
        'includes_gif',
        'includes_custom_template',
        'includes_supporting_crew',
        'includes_tiket_antrian',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'includes_softfile' => 'boolean',
        'includes_prints' => 'boolean',
        'includes_qr_code' => 'boolean',
        'includes_gif' => 'boolean',
        'includes_custom_template' => 'boolean',
        'includes_supporting_crew' => 'boolean',
        'includes_tiket_antrian' => 'boolean',
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
