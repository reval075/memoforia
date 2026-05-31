<?php

namespace Database\Factories;

use App\Models\ServicePackage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ServicePackage>
 */
class ServicePackageFactory extends Factory
{
    protected $model = ServicePackage::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word() . ' Package',
            'category' => fake()->randomElement(['photobooth', 'rental', 'printing']),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }

    /**
     * Create an inactive service package.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
