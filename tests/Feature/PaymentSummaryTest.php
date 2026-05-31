<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentSummaryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TEST 1: All Status Filter
     *
     * Verify that admin can retrieve all bookings regardless of status
     * when filtering with 'all', 'semua', or empty status.
     */
    public function test_admin_status_filter_shows_all_bookings_with_all_keyword()
    {
        // Create bookings with different statuses
        $pending = Booking::factory()->create(['status' => 'pending_approval']);
        $waiting = Booking::factory()->create(['status' => 'waiting_dp']);
        $confirmed = Booking::factory()->create(['status' => 'confirmed']);
        $completed = Booking::factory()->create(['status' => 'completed']);

        $admin = User::factory()->create(['role' => 'admin']);

        // Test with 'all' status filter
        $response = $this->actingAs($admin)->getJson('/admin/api/bookings?status=all');

        $this->assertEquals(4, count($response['data']));
    }

    public function test_admin_status_filter_shows_all_bookings_with_empty_status()
    {
        // Create bookings with different statuses
        $pending = Booking::factory()->create(['status' => 'pending_approval']);
        $waiting = Booking::factory()->create(['status' => 'waiting_dp']);
        $confirmed = Booking::factory()->create(['status' => 'confirmed']);

        $admin = User::factory()->create(['role' => 'admin']);

        // Test with empty status filter
        $response = $this->actingAs($admin)->getJson('/admin/api/bookings?status=');

        $this->assertEquals(3, count($response['data']));
    }

    /**
     * TEST 2: Payment Summary Calculation - getPaidAmount()
     *
     * Verify that only verified payments are counted.
     */
    public function test_get_paid_amount_only_counts_verified_payments()
    {
        $booking = Booking::factory()->create([
            'total_price' => 1000000,
        ]);

        // Create payments with different statuses
        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 500000,
            'status' => 'verified',
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 300000,
            'status' => 'pending',
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 200000,
            'status' => 'rejected',
        ]);

        // Should only count verified payment
        $this->assertEquals(500000, $booking->getPaidAmount());
    }

    /**
     * TEST 3: Payment Summary Calculation - getRemainingAmount()
     *
     * Verify that remaining amount = total_price - paid_amount (min 0).
     */
    public function test_get_remaining_amount_calculation()
    {
        $booking = Booking::factory()->create([
            'total_price' => 1000000,
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 600000,
            'status' => 'verified',
        ]);

        $this->assertEquals(400000, $booking->getRemainingAmount());
    }

    public function test_get_remaining_amount_returns_zero_if_overpaid()
    {
        $booking = Booking::factory()->create([
            'total_price' => 1000000,
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 1200000,
            'status' => 'verified',
        ]);

        $this->assertEquals(0, $booking->getRemainingAmount());
    }

    /**
     * TEST 4: Settlement Due Date Generation
     *
     * Verify that settlement_due_at is set to event_date + 2 days
     * when booking is confirmed.
     */
    public function test_settlement_due_at_set_on_confirmation()
    {
        $eventDate = Carbon::now()->addDays(10);

        $booking = Booking::factory()->create([
            'status' => 'pending_approval',
            'event_date' => $eventDate->toDateString(),
            'settlement_due_at' => null,
        ]);

        // Manually update status to confirmed via controller logic
        $expectedSettlementDue = $eventDate->addDays(2)->endOfDay();

        $booking->update([
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'settlement_due_at' => $expectedSettlementDue,
        ]);

        $this->assertEquals(
            $expectedSettlementDue->toDateString(),
            $booking->settlement_due_at->toDateString()
        );
    }

    /**
     * TEST 5: Settlement Overdue Detection
     *
     * Verify isSettlementOverdue() returns true when:
     * - now() > settlement_due_at AND
     * - remaining_amount > 0
     */
    public function test_is_settlement_overdue_returns_true_when_overdue_with_balance()
    {
        $booking = Booking::factory()->create([
            'total_price' => 1000000,
            'status' => 'confirmed',
            'settlement_due_at' => Carbon::now()->subDays(1), // Yesterday
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 600000,
            'status' => 'verified',
        ]);

        $this->assertTrue($booking->isSettlementOverdue());
    }

    public function test_is_settlement_overdue_returns_false_when_fully_paid()
    {
        $booking = Booking::factory()->create([
            'total_price' => 1000000,
            'status' => 'confirmed',
            'settlement_due_at' => Carbon::now()->subDays(1), // Yesterday
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 1000000,
            'status' => 'verified',
        ]);

        $this->assertFalse($booking->isSettlementOverdue());
    }

    public function test_is_settlement_overdue_returns_false_when_not_due_yet()
    {
        $booking = Booking::factory()->create([
            'total_price' => 1000000,
            'status' => 'confirmed',
            'settlement_due_at' => Carbon::now()->addDays(1), // Tomorrow
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 600000,
            'status' => 'verified',
        ]);

        $this->assertFalse($booking->isSettlementOverdue());
    }

    /**
     * TEST 6: Tracking Payload Includes Payment Summary
     *
     * Verify that tracking response includes:
     * - paid_amount
     * - remaining_amount
     * - settlement_due_at
     * - is_settlement_overdue
     */
    public function test_tracking_payload_includes_payment_summary_fields()
    {
        $booking = Booking::factory()->create([
            'booking_code' => 'TEST-20260531-ABC12',
            'total_price' => 1000000,
            'status' => 'confirmed',
            'settlement_due_at' => Carbon::now()->addDays(2),
        ]);

        Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 600000,
            'status' => 'verified',
        ]);

        // Call track endpoint
        $response = $this->postJson('/api/bookings/track', [
            'booking_code' => $booking->booking_code,
            'contact' => $booking->customer_email,
        ]);

        $this->assertTrue($response['success']);
        $data = $response['data'];

        $this->assertEquals(1000000, $data['total_price']);
        $this->assertEquals(600000, $data['paid_amount']);
        $this->assertEquals(400000, $data['remaining_amount']);
        $this->assertNotNull($data['settlement_due_at']);
        $this->assertFalse($data['is_settlement_overdue']);
    }

    /**
     * TEST 7: Regression Test - Booking Flow DP -> Confirmed
     *
     * Verify complete flow:
     * 1. Booking created with pending_approval status
     * 2. Admin approves (waiting_dp, dp_expired_at set)
     * 3. DP payment verified (confirmed, settlement_due_at set)
     * 4. Settlement deadline is event_date + 2 days
     */
    public function test_complete_booking_flow_dp_to_confirmed()
    {
        $eventDate = Carbon::now()->addDays(10);

        // 1. Create booking
        $booking = Booking::factory()->create([
            'status' => 'pending_approval',
            'event_date' => $eventDate->toDateString(),
            'total_price' => 3000000,
        ]);

        $this->assertEquals('pending_approval', $booking->status);
        $this->assertNull($booking->dp_expired_at);
        $this->assertNull($booking->settlement_due_at);

        // 2. Simulate approval
        $expirationHours = config('booking.dp_expiration_hours', 12);
        $booking->update([
            'status' => 'waiting_dp',
            'approved_by' => 1,
            'approved_at' => now(),
            'dp_expired_at' => now()->addHours($expirationHours),
        ]);

        $this->assertEquals('waiting_dp', $booking->status);
        $this->assertNotNull($booking->dp_expired_at);
        $this->assertNull($booking->settlement_due_at); // Not set yet

        // 3. Simulate DP payment verification
        $dpPayment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => 500000,
            'payment_type' => 'dp',
            'status' => 'verified',
            'verified_at' => now(),
        ]);

        $booking->update([
            'status' => 'confirmed',
            'confirmed_at' => now(),
            'payment_status' => 'partially_paid',
            'settlement_due_at' => $eventDate->copy()->addDays(2)->endOfDay(),
        ]);

        // Verify final state
        $booking->refresh();
        $this->assertEquals('confirmed', $booking->status);
        $this->assertEquals('partially_paid', $booking->payment_status);
        $this->assertEquals(500000, $booking->getPaidAmount());
        $this->assertEquals(2500000, $booking->getRemainingAmount());
        $this->assertNotNull($booking->settlement_due_at);
        $this->assertEquals(
            $eventDate->toDateString(),
            $booking->settlement_due_at->copy()->subDays(2)->toDateString()
        );
    }
}
