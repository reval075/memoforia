<?php

namespace App\Support;

class DpAmountCalculator
{
    /**
     * Minimum DP = max(optional absolute floor, ceil(total × percent / 100)).
     */
    public static function minDpForTotal(float|int $totalPrice, string $context = 'booking'): int
    {
        $total = (float) $totalPrice;

        if ($total <= 0) {
            return 0;
        }

        $percent = (float) config("{$context}.min_dp_percent", config('booking.min_dp_percent', 40));
        $fromPercent = (int) ceil($total * ($percent / 100));

        $absoluteFloor = (int) config(
            "{$context}.min_dp_absolute_floor",
            config("{$context}.min_dp_amount", 0)
        );

        return max($absoluteFloor, $fromPercent);
    }

    public static function minDpPercent(string $context = 'booking'): int
    {
        return (int) config("{$context}.min_dp_percent", config('booking.min_dp_percent', 40));
    }
}
