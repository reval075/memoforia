<?php

namespace Tests\Unit;

use App\Support\DpAmountCalculator;
use Tests\TestCase;

class DpAmountCalculatorTest extends TestCase
{
    public function test_min_dp_is_forty_percent_of_total(): void
    {
        $this->assertEquals(1600000, DpAmountCalculator::minDpForTotal(4000000, 'booking'));
        $this->assertEquals(1600000, DpAmountCalculator::minDpForTotal(4000000, 'rental'));
    }

    public function test_two_million_dp_passes_for_four_million_total(): void
    {
        $min = DpAmountCalculator::minDpForTotal(4000000, 'rental');
        $this->assertLessThanOrEqual(2000000, $min);
    }

    public function test_absolute_floor_when_higher_than_percent(): void
    {
        config(['booking.min_dp_percent' => 10, 'booking.min_dp_absolute_floor' => 500000]);

        $this->assertEquals(500000, DpAmountCalculator::minDpForTotal(4000000, 'booking'));
    }
}
