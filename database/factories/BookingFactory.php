<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\ServicePackage;
use App\Models\PackageVariant;
use App\Models\PhotoTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Carbon\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Booking>
 */
class BookingFactory extends Factory
{
    protected $model = Booking::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        $servicePackage = ServicePackage::factory();
        $variant = PackageVariant::factory()->for($servicePackage);
        $template = PhotoTemplate::factory();
        $eventDatetime = Carbon::now()->addDays(fake()->numberBetween(1, 30));

        return [
            'booking_code' => 'MEMO-' . $eventDatetime->format('Ymd') . '-' . strtoupper(Str::random(5)),
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'customer_phone' => fake()->e164PhoneNumber(),
            'event_name' => fake()->words(3, true),
            'event_location' => fake()->address(),
            'event_date' => $eventDatetime->toDateString(),
            'event_datetime' => $eventDatetime,
            'service_package_id' => $servicePackage,
            'package_variant_id' => $variant,
            'selected_template_id' => $template,
            'notes' => fake()->sentence(),
            'status' => 'waiting_dp',
            'payment_status' => 'unpaid',
            'total_price' => 3000000,
            'approved_at' => now(),
        ];
    }

    /**
     * Create a confirmed booking.
     */
    public function confirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'settlement_due_at' => now()->addDays(7),
        ]);
    }

    /**
     * Create a completed booking.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'confirmed_at' => now(),
            'payment_status' => 'paid',
        ]);
    }

    /**
     * Create a pending approval booking.
     */
    public function pendingApproval(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending_approval',
            'approved_at' => null,
        ]);
    }
}
