<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\RentalEquipment;
use App\Models\RentalItem;
use App\Models\RentalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class RentalPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function createRental(array $overrides = []): RentalRequest
    {
        $equipment = RentalEquipment::create([
            'name'           => 'Kamera Test',
            'category'       => 'kamera',
            'stock'          => 5,
            'price_per_day'  => 100000,
            'status'         => 'available',
        ]);

        $rental = RentalRequest::create(array_merge([
            'customer_name'  => 'Test Customer',
            'customer_email' => 'rental@test.com',
            'customer_phone' => '08123456789',
            'start_date'     => now()->addDays(3)->toDateString(),
            'end_date'       => now()->addDays(5)->toDateString(),
            'total_price'    => 300000,
            'status'         => 'pending_approval',
            'payment_status' => 'unpaid',
        ], $overrides));

        RentalItem::create([
            'rental_request_id' => $rental->id,
            'equipment_id'      => $equipment->id,
            'qty'               => 1,
            'price'             => 300000,
        ]);

        return $rental->fresh();
    }

    public function test_rental_approve_sets_waiting_dp_and_dp_expired_at(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $rental = $this->createRental();

        $response = $this->actingAs($admin)->postJson("/admin/api/rentals/{$rental->id}/approve");

        $response->assertStatus(200);
        $rental->refresh();

        $this->assertEquals('waiting_dp', $rental->status);
        $this->assertNotNull($rental->dp_expired_at);
        $this->assertNotEmpty($rental->rental_code);

        $expectedExpiry = now()->addHours(config('rental.dp_expiration_hours', 24));
        $this->assertTrue(abs($rental->dp_expired_at->timestamp - $expectedExpiry->timestamp) < 5);
    }

    public function test_rentals_expire_dp_command_expires_overdue_rentals(): void
    {
        $expired = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->subHour(),
        ]);

        $active = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->addHours(6),
        ]);

        Artisan::call('rentals:expire-dp');

        $this->assertEquals('expired', $expired->fresh()->status);
        $this->assertEquals('waiting_dp', $active->fresh()->status);
    }

    public function test_track_syncs_expired_status_when_dp_deadline_passed(): void
    {
        $rental = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->subHour(),
        ]);

        $response = $this->postJson('/api/rental-requests/track', [
            'rental_code' => $rental->rental_code,
            'contact'     => 'rental@test.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'expired')
            ->assertJsonPath('data.is_dp_expired', true);
    }

    public function test_cannot_create_dp_when_rental_expired(): void
    {
        $rental = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->subHour(),
        ]);

        $response = $this->postJson('/api/payments/create', [
            'rental_code'    => $rental->rental_code,
            'contact'        => 'rental@test.com',
            'payment_type'   => 'dp',
            'amount'         => 500000,
            'payment_method' => 'qris',
        ]);

        $response->assertStatus(422);
        $this->assertEquals('expired', $rental->fresh()->status);
    }

    public function test_dp_amount_cannot_exceed_remaining(): void
    {
        $rental = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->addDay(),
            'total_price'   => 600000,
        ]);

        $response = $this->postJson('/api/payments/create', [
            'rental_code'    => $rental->rental_code,
            'contact'        => 'rental@test.com',
            'payment_type'   => 'dp',
            'amount'         => 700000,
            'payment_method' => 'qris',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['success' => false]);
    }

    public function test_manual_verify_dp_confirms_rental(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $rental = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->addDay(),
        ]);

        $payment = Payment::create([
            'rental_request_id' => $rental->id,
            'booking_id'        => null,
            'amount'            => 500000,
            'payment_type'      => 'dp',
            'payment_method'    => 'transfer',
            'payment_source'    => 'manual',
            'status'            => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/api/rentals-payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);

        $response->assertStatus(200);
        $rental->refresh();

        $this->assertEquals('confirmed', $rental->status);
        $this->assertEquals('partially_paid', $rental->payment_status);
        $this->assertNotNull($rental->confirmed_at);
    }

    public function test_manual_verify_full_payment_completes_rental(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $rental = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->addDay(),
        ]);

        $payment = Payment::create([
            'rental_request_id' => $rental->id,
            'booking_id'        => null,
            'amount'            => 300000,
            'payment_type'      => 'full_payment',
            'payment_method'    => 'transfer',
            'payment_source'    => 'manual',
            'status'            => 'pending',
        ]);

        $this->actingAs($admin)->postJson("/admin/api/rentals-payments/{$payment->id}/verify", [
            'status' => 'verified',
        ])->assertStatus(200);

        $rental->refresh();
        $this->assertEquals('completed', $rental->status);
        $this->assertEquals('paid', $rental->payment_status);
    }

    public function test_track_includes_upload_capabilities_for_waiting_dp(): void
    {
        $rental = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->addDay(),
        ]);

        $response = $this->postJson('/api/rental-requests/track', [
            'rental_code' => $rental->rental_code,
            'contact'     => 'rental@test.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.can_upload_proof', true)
            ->assertJsonPath('data.allowed_payment_types', ['full_payment']);
    }

    public function test_cannot_upload_dp_proof_manually(): void
    {
        $rental = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->addDay(),
        ]);

        $response = $this->postJson('/api/rental-requests/payment-proof', [
            'rental_code'    => $rental->rental_code,
            'contact'        => 'rental@test.com',
            'amount'         => 500000,
            'payment_type'   => 'dp',
            'payment_method' => 'BCA',
            'proof_image'    => 'https://example.com/proof.jpg',
        ]);

        $response->assertStatus(422);
    }

    public function test_guest_can_upload_full_payment_proof(): void
    {
        $rental = $this->createRental([
            'status'        => 'waiting_dp',
            'dp_expired_at' => now()->addDay(),
        ]);

        $response = $this->postJson('/api/rental-requests/payment-proof', [
            'rental_code'    => $rental->rental_code,
            'contact'        => 'rental@test.com',
            'amount'         => 300000,
            'payment_type'   => 'full_payment',
            'payment_method' => 'BCA Transfer',
            'proof_image'    => 'https://example.com/proof.jpg',
        ]);

        $response->assertStatus(201)->assertJsonPath('success', true);

        $this->assertDatabaseHas('payments', [
            'rental_request_id' => $rental->id,
            'payment_type'      => 'full_payment',
            'payment_source'    => 'manual',
            'status'            => 'pending',
        ]);
    }
}
