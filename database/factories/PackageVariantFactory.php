<?php

namespace Database\Factories;

use App\Models\PackageVariant;
use App\Models\ServicePackage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PackageVariant>
 */
class PackageVariantFactory extends Factory
{
    protected $model = PackageVariant::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'service_package_id' => ServicePackage::factory(),
            'name' => fake()->randomElement(['1 Jam', '2 Jam', '3 Jam', '4 Jam', '100 Prints', '200 Prints']),
            'duration_hours' => fake()->randomElement([1, 2, 3, 4, null]),
            'print_limit' => fake()->randomElement([100, 200, null]),
            'price' => 3000000,
            'extra_hour_price' => 500000,
            'is_unlimited' => false,
        ];
    }

    /**
     * Create variant with custom price.
     */
    public function withPrice(int $price): static
    {
        return $this->state(fn (array $attributes) => [
            'price' => $price,
        ]);
    }

    /**
     * Create unlimited variant.
     */
    public function unlimited(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_unlimited' => true,
            'duration_hours' => null,
            'print_limit' => null,
        ]);
    }
}
