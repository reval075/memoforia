<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'amount' => 700000,
            'payment_type' => 'dp',
            'payment_method' => 'va',
            'status' => 'pending',
            'payment_source' => 'midtrans',
            'gateway' => 'midtrans',
            'gateway_reference' => null,
            'midtrans_order_id' => 'MEMO-' . fake()->unique()->numerify('########'),
            'snap_token' => fake()->unique()->sha256(),
            'gateway_payload' => json_encode([
                'order_id' => 'MEMO-' . fake()->unique()->numerify('########'),
                'gross_amount' => 700000,
                'customer_details' => [
                    'first_name' => fake()->firstName(),
                    'email' => fake()->safeEmail(),
                    'phone' => fake()->e164PhoneNumber(),
                ],
            ]),
            'gateway_expired_at' => now()->addHours(24),
        ];
    }

    /**
     * Create a verified payment.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'verified',
            'verified_at' => now(),
            'paid_at' => now(),
            'gateway_reference' => 'TXN-' . fake()->unique()->numerify('########'),
        ]);
    }

    /**
     * Create a settlement payment.
     */
    public function settlement(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_type' => 'settlement',
            'amount' => 2300000,
            'status' => 'pending',
        ]);
    }

    /**
     * Create an expired payment.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'expired',
            'gateway_expired_at' => now()->subMinutes(1),
        ]);
    }
}
