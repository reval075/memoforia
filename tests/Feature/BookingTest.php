<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Booking;
use App\Models\ServicePackage;
use App\Models\PackageVariant;
use App\Models\Addon;
use App\Models\PhotoTemplate;
use App\Models\UnavailableDate;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Helper: create base entities needed for booking tests.
     */
    private function createBaseEntities(): array
    {
        $package = ServicePackage::create([
            'name' => 'Wedding Pack',
            'category' => 'unlimited_print',
        ]);

        $variant = PackageVariant::create([
            'service_package_id' => $package->id,
            'name' => '3 Hours',
            'price' => 3500000,
        ]);

        $template = PhotoTemplate::create([
            'name' => 'Classic Strip',
            'size' => '2x6',
        ]);

        return compact('package', 'variant', 'template');
    }

    /**
     * Helper: create a booking with given status.
     */
    private function createBooking(array $entities, array $overrides = []): Booking
    {
        $defaults = [
            'booking_code' => 'MEMO-20260602-' . strtoupper(\Illuminate\Support\Str::random(5)),
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
            'status' => 'pending_approval',
            'total_price' => 3500000,
        ];

        return Booking::create(array_merge($defaults, $overrides));
    }

    // ================================================================
    // EXISTING TESTS (preserved from previous module)
    // ================================================================

    /**
     * Test guest can retrieve calendar availability data.
     */
    public function test_guest_can_retrieve_calendar_availability(): void
    {
        $blocked = UnavailableDate::create([
            'date' => '2026-06-01',
            'reason' => 'Vendor off day'
        ]);

        $entities = $this->createBaseEntities();

        // Unconfirmed booking -> should NOT lock the calendar
        $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-AAAAA',
            'event_date' => '2026-06-02',
            'event_datetime' => '2026-06-02 18:00:00',
            'status' => 'waiting_dp',
        ]);

        // Confirmed booking -> should lock the calendar
        $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260603-BBBBB',
            'customer_name' => 'Jane Doe',
            'customer_email' => 'jane@example.com',
            'event_name' => 'Birthday Jane',
            'event_date' => '2026-06-03',
            'event_datetime' => '2026-06-03 15:00:00',
            'status' => 'confirmed',
        ]);

        $response = $this->getJson('/api/availabilities?start_date=2026-06-01&end_date=2026-06-05');

        $response->assertStatus(200);
        $response->assertJson([
            'unavailable_dates' => ['2026-06-01'],
            'booked_dates' => ['2026-06-03'], // only locked dates
        ]);
    }

    /**
     * Test guest can submit booking request on available date with variants and addons.
     */
    public function test_guest_can_submit_booking_request_on_available_date(): void
    {
        $entities = $this->createBaseEntities();

        $addon1 = Addon::create([
            'name' => 'Keychain',
            'price' => 10000,
        ]);

        $response = $this->postJson('/api/bookings', [
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
            'customer_phone' => '08123456789',
            'event_name' => 'Wedding John & Jane',
            'event_location' => 'Jakarta',
            'event_datetime' => '2026-06-10 17:30:00',
            'service_package_id' => $entities['package']->id,
            'package_variant_id' => $entities['variant']->id,
            'selected_template_id' => $entities['template']->id,
            'notes' => 'Some special instructions',
            'addons' => [
                ['id' => $addon1->id, 'quantity' => 10] // + 100k
            ]
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'booking_code',
                'status',
                'event_name',
                'total_price',
                'service_package',
                'package_variant',
            ],
            'errors',
        ]);
        $this->assertTrue($response->json('success'));
        $this->assertEquals('pending_approval', $response->json('data.status'));

        $this->assertDatabaseHas('bookings', [
            'customer_name' => 'John Doe',
            'event_date' => '2026-06-10',
            'status' => 'pending_approval',
            'payment_status' => 'unpaid',
            'total_price' => 3600000, // 3.5m + 10k * 10
        ]);

        $booking = Booking::first();
        $this->assertNotNull($booking->booking_code);
        $this->assertEquals($response->json('data.booking_code'), $booking->booking_code);
        $this->assertCount(1, $booking->addons);
        $this->assertEquals(10, $booking->addons->first()->pivot->quantity);
    }

    /**
     * Test guest cannot submit booking on blocked/unavailable date.
     */
    public function test_guest_cannot_submit_booking_on_blocked_date(): void
    {
        $entities = $this->createBaseEntities();

        UnavailableDate::create([
            'date' => '2026-06-01',
            'reason' => 'Off day'
        ]);

        $response = $this->postJson('/api/bookings', [
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
            'customer_phone' => '08123456789',
            'event_name' => 'Wedding John & Jane',
            'event_location' => 'Jakarta',
            'event_datetime' => '2026-06-01 10:00:00',
            'service_package_id' => $entities['package']->id,
            'package_variant_id' => $entities['variant']->id,
            'selected_template_id' => $entities['template']->id,
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test admin verifies DP payment which auto-cancels competing bookings on the same date.
     */
    public function test_admin_verifies_dp_payment_which_locks_date_and_auto_cancels_competing_bookings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $entities = $this->createBaseEntities();

        // Booking A (gets approved and pays DP)
        $bookingA = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-AAAAA',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->addHours(12),
        ]);

        // Booking B (gets approved but loses the race to pay DP)
        $bookingB = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-BBBBB',
            'customer_name' => 'Alice',
            'customer_email' => 'alice@example.com',
            'event_name' => 'Alice Birthday',
            'event_datetime' => '2026-06-02 15:00:00',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->addHours(12),
        ]);

        // Payment proof for Booking A
        $payment = Payment::create([
            'booking_id' => $bookingA->id,
            'amount' => 1000000, // DP amount
            'payment_type' => 'dp',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'dp_proof.png',
            'status' => 'pending',
        ]);

        // Admin verifies Booking A payment
        $response = $this->actingAs($admin)->postJson("/admin/api/payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);

        $response->assertStatus(200);

        // Booking A should be confirmed (Locked calendar!)
        $this->assertEquals('confirmed', $bookingA->fresh()->status);
        $this->assertEquals('partially_paid', $bookingA->fresh()->payment_status);

        // Booking B should be auto-cancelled due to date locked
        $this->assertEquals('cancelled', $bookingB->fresh()->status);
        $this->assertStringContainsString('Otomatis dibatalkan', $bookingB->fresh()->notes);
    }

    // ================================================================
    // MODULE 3 — NEW TESTS: DP Expiration & Transaction Safety
    // ================================================================

    /**
     * Test: dp_expired_at is automatically set when admin approves a booking.
     */
    public function test_dp_expired_at_is_set_on_approval(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $entities = $this->createBaseEntities();

        $booking = $this->createBooking($entities, [
            'status' => 'pending_approval',
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/api/bookings/{$booking->id}/approve");

        $response->assertStatus(200);

        $booking->refresh();
        $this->assertEquals('waiting_dp', $booking->status);
        $this->assertNotNull($booking->dp_expired_at);

        // Verify expiration is approximately +12 hours from now (default config)
        $expectedExpiry = now()->addHours(config('booking.dp_expiration_hours', 12));
        $this->assertTrue(
            abs($booking->dp_expired_at->timestamp - $expectedExpiry->timestamp) < 5, // 5 second tolerance
            'dp_expired_at should be approximately 12 hours from approval time'
        );
    }

    /**
     * Test: bookings:expire-dp command expires waiting_dp bookings past deadline.
     */
    public function test_dp_expiration_command_expires_overdue_bookings(): void
    {
        $entities = $this->createBaseEntities();

        // Booking that should expire (dp_expired_at in the past)
        $expiredBooking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-EXPIR',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->subHours(1), // 1 hour past deadline
        ]);

        // Booking that should NOT expire (dp_expired_at in the future)
        $activeBooking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260603-ACTIV',
            'event_date' => '2026-06-03',
            'event_datetime' => '2026-06-03 18:00:00',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->addHours(6), // 6 hours remaining
        ]);

        Artisan::call('bookings:expire-dp');

        $this->assertEquals('expired', $expiredBooking->fresh()->status);
        $this->assertNotNull($expiredBooking->fresh()->cancelled_at);
        $this->assertStringContainsString('expired', $expiredBooking->fresh()->notes);

        // Active booking should remain waiting_dp
        $this->assertEquals('waiting_dp', $activeBooking->fresh()->status);
    }

    /**
     * Test: expire command only affects waiting_dp bookings, not other statuses.
     */
    public function test_dp_expiration_command_only_expires_waiting_dp(): void
    {
        $entities = $this->createBaseEntities();

        // Various statuses with past dp_expired_at — none should be affected except waiting_dp
        $confirmedBooking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-CONFR',
            'status' => 'confirmed',
            'dp_expired_at' => now()->subHours(1),
        ]);

        $pendingBooking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260603-PENDI',
            'event_date' => '2026-06-03',
            'event_datetime' => '2026-06-03 18:00:00',
            'status' => 'pending_approval',
            'dp_expired_at' => now()->subHours(1),
        ]);

        Artisan::call('bookings:expire-dp');

        // These should remain unchanged
        $this->assertEquals('confirmed', $confirmedBooking->fresh()->status);
        $this->assertEquals('pending_approval', $pendingBooking->fresh()->status);
    }

    /**
     * Test: cannot verify payment for an expired booking.
     */
    public function test_cannot_verify_payment_for_expired_booking(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $entities = $this->createBaseEntities();

        $expiredBooking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-EXPRD',
            'status' => 'expired',
            'dp_expired_at' => now()->subHours(1),
        ]);

        $payment = Payment::create([
            'booking_id' => $expiredBooking->id,
            'amount' => 1000000,
            'payment_type' => 'dp',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'proof.png',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/api/payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['success' => false]);

        // Booking should remain expired
        $this->assertEquals('expired', $expiredBooking->fresh()->status);
        // Payment should remain pending (not verified)
        $this->assertEquals(\App\Enums\PaymentStatus::Pending, $payment->fresh()->status);
    }

    /**
     * Test: cannot verify DP payment when waiting_dp has passed dp_expired_at
     * even before scheduler runs.
     */
    public function test_cannot_verify_dp_payment_when_waiting_dp_has_passed_deadline(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $entities = $this->createBaseEntities();

        $booking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-VDPXP',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->subMinute(),
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'amount' => 1000000,
            'payment_type' => 'dp',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'proof.png',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/api/payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['success' => false]);
        $response->assertJsonFragment(['message' => 'Booking sudah expired dan tidak dapat diverifikasi.']);

        // Scheduler independence: verify flow synchronizes expiration in realtime.
        $booking->refresh();
        $this->assertEquals('expired', $booking->status);
        $this->assertNotNull($booking->cancelled_at);
        $this->assertEquals(\App\Enums\PaymentStatus::Pending, $payment->fresh()->status);
    }

    /**
     * Test: settlement/full payment branch uses same expiration guard.
     */
    public function test_cannot_verify_settlement_payment_when_waiting_dp_has_passed_deadline(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $entities = $this->createBaseEntities();

        $booking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-VSTXP',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->subMinute(),
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'amount' => 2500000,
            'payment_type' => 'settlement',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'proof-settlement.png',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/api/payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['success' => false]);
        $response->assertJsonFragment(['message' => 'Booking sudah expired dan tidak dapat diverifikasi.']);

        $booking->refresh();
        $this->assertEquals('expired', $booking->status);
        $this->assertEquals(\App\Enums\PaymentStatus::Pending, $payment->fresh()->status);
    }

    /**
     * Test: settlement/full payment cannot bypass invalid booking state transitions.
     */
    public function test_cannot_verify_settlement_for_pending_approval_booking(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $entities = $this->createBaseEntities();

        $booking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-STPEN',
            'status' => 'pending_approval',
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'amount' => 2500000,
            'payment_type' => 'settlement',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'proof-settlement.png',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/api/payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['success' => false]);
        $response->assertJsonFragment(['message' => 'Booking tidak dalam status valid untuk verifikasi settlement/full payment.']);

        $this->assertEquals('pending_approval', $booking->fresh()->status);
        $this->assertEquals(\App\Enums\PaymentStatus::Pending, $payment->fresh()->status);
    }

    /**
     * Test: full_payment confirmation keeps competing booking protection consistent.
     */
    public function test_admin_verifies_full_payment_which_confirms_and_cancels_competing_bookings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $entities = $this->createBaseEntities();

        $bookingA = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-FULLA',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->addHours(12),
        ]);

        $bookingB = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-FULLB',
            'customer_name' => 'Competing User',
            'customer_email' => 'competing@example.com',
            'event_name' => 'Competing Event',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->addHours(12),
        ]);

        $payment = Payment::create([
            'booking_id' => $bookingA->id,
            'amount' => 3500000,
            'payment_type' => 'full_payment',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'full-payment.png',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson("/admin/api/payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);

        $response->assertStatus(200);

        $this->assertEquals('completed', $bookingA->fresh()->status);
        $this->assertEquals('paid', $bookingA->fresh()->payment_status);
        $this->assertNotNull($bookingA->fresh()->completed_at);

        $this->assertEquals('cancelled', $bookingB->fresh()->status);
        $this->assertStringContainsString('Otomatis dibatalkan', $bookingB->fresh()->notes);
    }

    /**
     * Test: cannot upload payment proof for expired booking.
     */
    public function test_cannot_upload_proof_for_expired_booking(): void
    {
        $entities = $this->createBaseEntities();

        $expiredBooking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-EXPUP',
            'status' => 'expired',
        ]);

        $response = $this->postJson('/api/bookings/payment-proof', [
            'booking_code' => 'MEMO-20260602-EXPUP',
            'contact' => 'john@example.com',
            'amount' => 1000000,
            'payment_type' => 'dp',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'proof.png',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['success' => false]);
    }

    /**
     * Test: upload proof is rejected when waiting_dp booking has passed dp_expired_at
     * even before scheduler runs.
     */
    public function test_cannot_upload_proof_when_waiting_dp_has_passed_dp_deadline(): void
    {
        $entities = $this->createBaseEntities();

        $booking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-DPEXP',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->subMinute(),
        ]);

        $response = $this->postJson('/api/bookings/payment-proof', [
            'booking_code' => 'MEMO-20260602-DPEXP',
            'contact' => 'john@example.com',
            'amount' => 1000000,
            'payment_type' => 'settlement',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'base64image',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['success' => false]);
        $response->assertJsonFragment(['message' => 'Booking ini sudah expired dan tidak dapat menerima pembayaran.']);

        // Scheduler independence: booking is guarded and synchronized immediately.
        $booking->refresh();
        $this->assertEquals('expired', $booking->status);
        $this->assertNotNull($booking->cancelled_at);
    }

    /**
     * Test: expired bookings do NOT lock calendar dates.
     */
    public function test_expired_booking_does_not_lock_calendar(): void
    {
        $entities = $this->createBaseEntities();

        // Create an expired booking on June 5
        $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260605-EXPRD',
            'event_date' => '2026-06-05',
            'event_datetime' => '2026-06-05 18:00:00',
            'status' => 'expired',
        ]);

        $response = $this->getJson('/api/availabilities?start_date=2026-06-01&end_date=2026-06-10');

        $response->assertStatus(200);
        // June 5 should NOT appear in booked_dates since it's expired
        $bookedDates = $response->json('booked_dates');
        $this->assertNotContains('2026-06-05', $bookedDates);
    }

    /**
     * Test: double verification of the same payment is prevented.
     *
     * Simulates the logical guard that prevents re-verification.
     * Note: actual row-level locking (lockForUpdate) only works on MySQL in production.
     */
    public function test_double_verification_of_same_payment_is_prevented(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $entities = $this->createBaseEntities();

        $booking = $this->createBooking($entities, [
            'booking_code' => 'MEMO-20260602-DBLVR',
            'status' => 'waiting_dp',
            'dp_expired_at' => now()->addHours(12),
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'amount' => 1000000,
            'payment_type' => 'dp',
            'payment_method' => 'Bank Transfer',
            'proof_image' => 'proof.png',
            'status' => 'pending',
        ]);

        // First verification should succeed
        $response1 = $this->actingAs($admin)->postJson("/admin/api/payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);
        $response1->assertStatus(200);
        $this->assertEquals(\App\Enums\PaymentStatus::Verified, $payment->fresh()->status);

        // Second verification should fail (payment already verified)
        $response2 = $this->actingAs($admin)->postJson("/admin/api/payments/{$payment->id}/verify", [
            'status' => 'verified',
        ]);
        $response2->assertStatus(422);
        $response2->assertJsonFragment(['success' => false]);
    }

    /**
     * Test: consistent API response format (success, message, data, errors).
     */
    public function test_api_responses_use_consistent_format(): void
    {
        $entities = $this->createBaseEntities();

        // Successful booking submission
        $response = $this->postJson('/api/bookings', [
            'customer_name' => 'Format Test',
            'customer_email' => 'format@test.com',
            'customer_phone' => '08123456789',
            'event_name' => 'Format Test Event',
            'event_location' => 'Jakarta',
            'event_datetime' => '2026-07-15 17:00:00',
            'service_package_id' => $entities['package']->id,
            'package_variant_id' => $entities['variant']->id,
            'selected_template_id' => $entities['template']->id,
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['success', 'message', 'data', 'errors']);
        $this->assertTrue($response->json('success'));

        // Error response (blocked date)
        UnavailableDate::create(['date' => '2026-07-20', 'reason' => 'Test']);

        $errorResponse = $this->postJson('/api/bookings', [
            'customer_name' => 'Format Test',
            'customer_email' => 'format@test.com',
            'customer_phone' => '08123456789',
            'event_name' => 'Format Test Event',
            'event_location' => 'Jakarta',
            'event_datetime' => '2026-07-20 17:00:00',
            'service_package_id' => $entities['package']->id,
            'package_variant_id' => $entities['variant']->id,
            'selected_template_id' => $entities['template']->id,
        ]);

        $errorResponse->assertStatus(422);
        $errorResponse->assertJsonStructure(['success', 'message', 'data', 'errors']);
        $this->assertFalse($errorResponse->json('success'));
    }
}
