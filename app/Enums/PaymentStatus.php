<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Verified = 'verified';
    case Expired = 'expired';
    case Cancelled = 'cancelled';
    case Rejected = 'rejected';
    case Refunded = 'refunded';
}
