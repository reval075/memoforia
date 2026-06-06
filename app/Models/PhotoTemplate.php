<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class PhotoTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'size',
        'preview_image',
        'frame_image',
        'description',
        'frame_type',
        'layout_type',
        'is_active',
        'display_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = ['frame_image_url'];

    public function getFrameImageUrlAttribute(): ?string
    {
        if ($this->frame_image) {
            return Storage::disk('public')->url($this->frame_image);
        }

        if ($this->preview_image) {
            return Storage::disk('public')->url($this->preview_image);
        }

        return null;
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'selected_template_id');
    }
}
