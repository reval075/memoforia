<?php

namespace App\Console\Commands;

use App\Models\RentalRequest;
use Illuminate\Console\Command;

class ExpireDpRentals extends Command
{
    protected $signature = 'rentals:expire-dp';

    protected $description = 'Expire waiting_dp rentals that have passed their DP payment deadline';

    public function handle(): int
    {
        $expiredCount = RentalRequest::where('status', 'waiting_dp')
            ->whereNotNull('dp_expired_at')
            ->where('dp_expired_at', '<=', now())
            ->update([
                'status'       => 'expired',
                'cancelled_at' => now(),
                'notes'        => 'Otomatis expired karena batas waktu pembayaran DP telah habis.',
            ]);

        $this->info("✓ {$expiredCount} rental(s) expired due to DP deadline.");

        return self::SUCCESS;
    }
}
