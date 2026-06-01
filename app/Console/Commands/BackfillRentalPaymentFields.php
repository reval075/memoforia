<?php

namespace App\Console\Commands;

use App\Models\RentalRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillRentalPaymentFields extends Command
{
    protected $signature = 'rentals:backfill-payment-fields {--dry-run : Show changes without writing}';

    protected $description = 'Backfill rental_code, payment_status, and normalize legacy rental statuses';

    /** @var array<string, string> */
    private const STATUS_MAP = [
        'pending'  => 'pending_approval',
        'approved' => 'waiting_dp',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->warn('Dry run — no database writes.');
        }

        $codeUpdates = 0;
        $statusUpdates = 0;
        $paymentStatusUpdates = 0;

        RentalRequest::query()
            ->orderBy('id')
            ->chunkById(100, function ($rentals) use ($dryRun, &$codeUpdates, &$statusUpdates, &$paymentStatusUpdates) {
                foreach ($rentals as $rental) {
                    $changes = [];

                    if (empty($rental->rental_code)) {
                        $changes['rental_code'] = RentalRequest::generateRentalCode();
                        $codeUpdates++;
                    }

                    if (isset(self::STATUS_MAP[$rental->status])) {
                        $changes['status'] = self::STATUS_MAP[$rental->status];
                        $statusUpdates++;

                        if ($changes['status'] === 'waiting_dp' && !$rental->approved_at) {
                            $changes['approved_at'] = $rental->updated_at ?? now();
                        }
                    }

                    if ($rental->payment_status === null || $rental->payment_status === '') {
                        $changes['payment_status'] = $this->inferPaymentStatus($rental);
                        $paymentStatusUpdates++;
                    }

                    if ($changes === []) {
                        continue;
                    }

                    $this->line("Rental #{$rental->id}: " . json_encode($changes));

                    if (!$dryRun) {
                        $rental->update($changes);
                    }
                }
            });

        $this->info("Done. rental_code: {$codeUpdates}, status: {$statusUpdates}, payment_status: {$paymentStatusUpdates}");

        return self::SUCCESS;
    }

    private function inferPaymentStatus(RentalRequest $rental): string
    {
        if (!\Illuminate\Support\Facades\Schema::hasColumn('payments', 'rental_request_id')) {
            return 'unpaid';
        }

        $paid = (int) DB::table('payments')
            ->where('rental_request_id', $rental->id)
            ->where('status', 'verified')
            ->sum('amount');

        if ($paid <= 0) {
            return 'unpaid';
        }

        if ($paid >= (int) $rental->total_price) {
            return 'paid';
        }

        return 'partially_paid';
    }
}
