<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'document_type',
        'document_number',
        'file_name',
        'file_path',
        'generated_at',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
