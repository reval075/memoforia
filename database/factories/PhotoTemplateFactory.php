<?php

namespace Database\Factories;

use App\Models\PhotoTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PhotoTemplate>
 */
class PhotoTemplateFactory extends Factory
{
    protected $model = PhotoTemplate::class;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word() . ' Template',
            'size' => fake()->randomElement(['4R', '2x6', '6x4']),
            'preview_image' => fake()->imageUrl(),
            'frame_type' => fake()->randomElement(['vintage', 'modern', 'neon', 'classic']),
            'layout_type' => fake()->randomElement(['3-grid', '4-grid', 'single', '2x2']),
            'is_active' => true,
        ];
    }

    /**
     * Create an inactive template.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
