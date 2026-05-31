<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\PackageVariant;
use App\Models\Payment;
use App\Models\PhotoTemplate;
use App\Models\ServicePackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BookingTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function createBaseEntities(): array
    {
        $package = ServicePackage::create([
            'name' => 'Wedding Pack',
            'category' => 'unlimited_print',
        ]);

        $variant = PackageVariant::create([
            'service_package_id' => $package->id,
            'name' => '3 Hours',
            'duration_hours' => 3,
            'print_limit' => 100,
            'price' => 3500000,
            'is_unlimited' => false,
        ]);

        $template = PhotoTemplate::create([
            'name' => 'Classic Strip',
            'size' => '2x6',
        ]);

        return compact('package', 'variant', 'template');
    }

    private function createBooking(array $entities, array $overrides = []): Booking
    {
        $defaults = [
            'booking_code' => 'MEMO-20260602-TRACK1',
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
            'customer_phone' => '08123456789',
            'event_name' => 'Wedding John & Jane',
            'event_location' => 'Jakarta',
            'event_date' => '2026-06-02',
            'event_datetime' => '2026-06-02 18:00:00',
            'service_package_id' => $entities['package']->id,
            'package_variant_id' => $entities['variant']->id,
            'selected_template_id' => $entities['template']->id,
            'status' => 'waiting_dp',
            'payment_status' => 'unpaid',
            'total_price' => 3500000,
            'dp_expired_at' => now()->addHours(12),
        ];

        return Booking::create(array_merge($defaults, $overrides));
    }

    public function test_track_booking_success_with_email(): void
    {
        $entities = $this->createBaseEntities();
        $booking = $this->createBooking($entities);

        $addon = Addon::create(['name' => 'Keychain', 'price' => 10000]);
        $booking->addons()->attach($addon->id, ['quantity' => 2, 'price' => 10000]);

        Payment::create([
            'booking_id' => $booking->id,
            'amount' => 1000000,
            'payment_type' => 'dp',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'proof.png',
            'status' => 'pending',
        ]);

        $response = $this->postJson('/api/bookings/track', [
            'booking_code' => 'MEMO-20260602-TRACK1',
            'contact' => 'john@example.com',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'Booking ditemukan.',
        ]);
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'booking_code',
                'status',
                'payment_status',
                'customer_name',
                'customer_email',
                'customer_phone',
                'created_at',
                'can_upload_proof',
                'allowed_payment_types',
                'service_package',
                'package_variant' => [
                    'id',
                    'name',
                    'price',
                    'duration_hours',
                    'print_limit',
                    'is_unlimited',
                ],
                'selected_template',
                'addons',
                'payments',
            ],
            'errors',
        ]);

        $this->assertEquals('waiting_dp', $response->json('data.status'));
        $this->assertTrue($response->json('data.can_upload_proof'));
        $this->assertEquals(['dp'], $response->json('data.allowed_payment_types'));
    }

    public function test_track_booking_success_with_normalized_phone(): void
    {
        $entities = $this->createBaseEntities();
        $this->createBooking($entities);

        $response = $this->postJson('/api/bookings/track', [
            'booking_code' => 'MEMO-20260602-TRACK1',
            'contact' => '628123456789',
        ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
    }

    public function test_track_booking_fails_with_wrong_contact(): void
    {
        $entities = $this->createBaseEntities();
        $this->createBooking($entities);

        $response = $this->postJson('/api/bookings/track', [
            'booking_code' => 'MEMO-20260602-TRACK1',
            'contact' => 'wrong@example.com',
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'message' => 'Booking tidak ditemukan atau data kontak tidak cocok.',
            'data' => null,
        ]);
    }

    public function test_track_booking_syncs_expired_status_when_dp_deadline_passed(): void
    {
        $entities = $this->createBaseEntities();
        $this->createBooking($entities, [
            'dp_expired_at' => now()->subMinute(),
        ]);

        $response = $this->postJson('/api/bookings/track', [
            'booking_code' => 'MEMO-20260602-TRACK1',
            'contact' => 'john@example.com',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('expired', $response->json('data.status'));
        $this->assertTrue($response->json('data.is_dp_expired'));
    }

    public function test_guest_can_upload_payment_proof_with_file_and_contact(): void
    {
        Storage::fake('public');

        $entities = $this->createBaseEntities();
        $booking = $this->createBooking($entities, [
            'status' => 'confirmed',
            'payment_status' => 'partially_paid',
            'dp_expired_at' => null,
            'settlement_due_at' => now()->addDays(2),
        ]);

        $file = UploadedFile::fake()->image('proof.jpg', 800, 600);

        $response = $this->post('/api/bookings/payment-proof', [
            'booking_code' => $booking->booking_code,
            'contact' => 'john@example.com',
            'amount' => 1000000,
            'payment_type' => 'settlement',
            'payment_method' => 'Bank Transfer',
            'proof_file' => $file,
        ]);

        $response->dump();
        $response->assertStatus(201);
        $response->assertJsonFragment(['success' => true]);

        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'status' => 'pending',
            'payment_type' => 'settlement',
        ]);

        Storage::disk('public')->assertExists('payment-proofs/'.$file->hashName());
    }
}

