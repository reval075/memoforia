<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentalDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'rental_request_id',
        'document_type',
        'document_number',
        'file_name',
        'file_path',
        'generated_at',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
    ];

    public function rentalRequest()
    {
        return $this->belongsTo(RentalRequest::class, 'rental_request_id');
    }
}
