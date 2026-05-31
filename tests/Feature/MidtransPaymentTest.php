<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\ServicePackage;
use App\Models\PackageVariant;
use App\Models\PhotoTemplate;
use App\Services\MidtransService;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Mockery\Mock;

class MidtransPaymentTest extends TestCase
{
    use RefreshDatabase;

    private ServicePackage $servicePackage;
    private PackageVariant $variant;
    private PhotoTemplate $template;
    private Booking $booking;

    public function setUp(): void
    {
        parent::setUp();

        // Create test data
        $this->servicePackage = ServicePackage::factory()->create();
        $this->variant = PackageVariant::factory()
            ->for($this->servicePackage)
            ->create(['price' => 3000000]);
        $this->template = PhotoTemplate::factory()->create();

        $this->booking = Booking::factory()->create([
            'service_package_id' => $this->servicePackage->id,
            'package_variant_id' => $this->variant->id,
            'selected_template_id' => $this->template->id,
            'total_price' => 3000000,
            'status' => 'waiting_dp',
        ]);
    }

    /**
     * Test: DP minimum validation (Rp500.000)
     */
    public function test_dp_minimum_validation()
    {
        $response = $this->postJson('/api/payments/create', [
            'booking_code' => $this->booking->booking_code,
            'contact' => $this->booking->customer_phone,
            'payment_type' => 'dp',
            'amount' => 100000, // Below minimum
            'payment_method' => 'va',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('message', 'Validasi gagal');
        $this->assertArrayHasKey('amount', $response->json('errors'));
    }

    /**
     * Test: DP cannot exceed total price
     */
    public function test_dp_maximum_validation()
    {
        $response = $this->postJson('/api/payments/create', [
            'booking_code' => $this->booking->booking_code,
            'contact' => $this->booking->customer_phone,
            'payment_type' => 'dp',
            'amount' => 5000000, // Exceeds total
            'payment_method' => 'va',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('success', false);
        // Note: amount > total_price is caught in createDpPayment logic, which returns:
        $response->assertJsonPath('message', 'DP tidak boleh melebihi total harga booking');
    }

    /**
     * Test: Create DP transaction successfully
     */
    public function test_create_dp_transaction()
    {
        // Mock Midtrans Snap API via Mockery alias
        \Mockery::mock('alias:' . \Midtrans\Snap::class)
            ->shouldReceive('getSnapToken')
            ->andReturn('fake_snap_token_123');

        $response = $this->postJson('/api/payments/create', [
            'booking_code' => $this->booking->booking_code,
            'contact' => $this->booking->customer_phone,
            'payment_type' => 'dp',
            'amount' => 700000, // Valid DP
            'payment_method' => 'va',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.amount', 700000);
        $response->assertJsonPath('data.snap_token', 'fake_snap_token_123');

        // Verify payment record created
        $this->assertDatabaseHas('payments', [
            'booking_id' => $this->booking->id,
            'amount' => 700000,
            'payment_type' => 'dp',
            'status' => 'pending',
            'payment_source' => 'midtrans',
        ]);
    }

    /**
     * Test: Settlement requires DP to be paid first
     */
    public function test_settlement_requires_dp_payment()
    {
        $this->booking->update(['status' => 'confirmed']);

        $response = $this->postJson('/api/payments/create', [
            'booking_code' => $this->booking->booking_code,
            'contact' => $this->booking->customer_phone,
            'payment_type' => 'settlement',
            'payment_method' => 'va',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'DP belum dibayarkan');
    }

    /**
     * Test: Create settlement transaction
     */
    public function test_create_settlement_transaction()
    {
        // Mark booking as confirmed with DP paid
        $this->booking->update(['status' => 'confirmed']);

        // Create paid DP payment
        Payment::factory()->create([
            'booking_id' => $this->booking->id,
            'amount' => 700000,
            'payment_type' => 'dp',
            'status' => 'verified',
            'payment_source' => 'midtrans',
        ]);

        // Mock Midtrans Snap API via Mockery alias
        \Mockery::mock('alias:' . \Midtrans\Snap::class)
            ->shouldReceive('getSnapToken')
            ->andReturn('fake_snap_token_123');

        $response = $this->postJson('/api/payments/create', [
            'booking_code' => $this->booking->booking_code,
            'contact' => $this->booking->customer_phone,
            'payment_type' => 'settlement',
            'payment_method' => 'va',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);
        // Settlement amount should be: total - dp = 3000000 - 700000 = 2300000
        $response->assertJsonPath('data.amount', 2300000);

        // Verify settlement payment created
        $this->assertDatabaseHas('payments', [
            'booking_id' => $this->booking->id,
            'amount' => 2300000,
            'payment_type' => 'settlement',
            'status' => 'pending',
        ]);
    }

    /**
     * Test: Webhook marks payment as verified
     */
    public function test_webhook_verifies_payment()
    {
        // Create pending payment
        $payment = Payment::factory()->create([
            'booking_id' => $this->booking->id,
            'amount' => 700000,
            'payment_type' => 'dp',
            'status' => 'pending',
            'payment_source' => 'midtrans',
            'midtrans_order_id' => 'MEMO-TEST-123456',
        ]);

        // Prepare webhook payload
        $orderId = 'MEMO-TEST-123456';
        $statusCode = '200';
        $grossAmount = '700000';
        $serverKey = config('midtrans.server_key');
        $signature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);

        \Mockery::mock('alias:' . \Midtrans\Transaction::class)
            ->shouldReceive('status')
            ->with($orderId)
            ->andReturn((object) ['transaction_status' => 'settlement']);

        $webhookData = [
            'order_id' => $orderId,
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'transaction_status' => 'settlement',
            'signature_key' => $signature,
            'reference_id' => 'REF-123',
            'transaction_id' => 'TXN-123',
        ];

        $response = $this->postJson('/api/payments/webhook/midtrans', $webhookData);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        // Verify payment status updated
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'verified',
        ]);
    }

    /**
     * Test: Webhook auto-confirms booking after DP
     */
    public function test_webhook_confirms_booking_after_dp()
    {
        // Create pending DP payment
        $dpPayment = Payment::factory()->create([
            'booking_id' => $this->booking->id,
            'payment_type' => 'dp',
            'status' => 'pending',
            'payment_source' => 'midtrans',
            'midtrans_order_id' => 'MEMO-DP-123456',
        ]);

        $orderId = 'MEMO-DP-123456';
        $statusCode = '200';
        $grossAmount = (string) $dpPayment->amount;
        $serverKey = config('midtrans.server_key');
        $signature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);

        \Mockery::mock('alias:' . \Midtrans\Transaction::class)
            ->shouldReceive('status')
            ->with($orderId)
            ->andReturn((object) ['transaction_status' => 'settlement']);

        $webhookData = [
            'order_id' => $orderId,
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'transaction_status' => 'settlement',
            'signature_key' => $signature,
        ];

        $this->postJson('/api/payments/webhook/midtrans', $webhookData);

        // Verify booking is confirmed
        $this->booking->refresh();
        $this->assertEquals('confirmed', $this->booking->status);
        $this->assertNotNull($this->booking->confirmed_at);
        $this->assertNotNull($this->booking->settlement_due_at);
    }

    /**
     * Test: Webhook auto-completes booking after settlement
     */
    public function test_webhook_completes_booking_after_settlement()
    {
        $this->booking->update(['status' => 'confirmed']);

        // Create paid DP
        Payment::factory()->create([
            'booking_id' => $this->booking->id,
            'payment_type' => 'dp',
            'amount' => 700000,
            'status' => 'verified',
            'payment_source' => 'midtrans',
        ]);

        // Create pending settlement
        $settlementPayment = Payment::factory()->create([
            'booking_id' => $this->booking->id,
            'payment_type' => 'settlement',
            'amount' => 2300000,
            'status' => 'pending',
            'payment_source' => 'midtrans',
            'midtrans_order_id' => 'MEMO-SETTLE-123456',
        ]);

        $orderId = 'MEMO-SETTLE-123456';
        $statusCode = '200';
        $grossAmount = '2300000';
        $serverKey = config('midtrans.server_key');
        $signature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);

        \Mockery::mock('alias:' . \Midtrans\Transaction::class)
            ->shouldReceive('status')
            ->with($orderId)
            ->andReturn((object) ['transaction_status' => 'settlement']);

        $webhookData = [
            'order_id' => $orderId,
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'transaction_status' => 'settlement',
            'signature_key' => $signature,
        ];

        $this->postJson('/api/payments/webhook/midtrans', $webhookData);

        // Verify booking is completed
        $this->booking->refresh();
        $this->assertEquals('completed', $this->booking->status);
        $this->assertNotNull($this->booking->completed_at);
    }

    /**
     * Test: Get payment tracking
     */
    public function test_get_payment_tracking()
    {
        // Create payments
        Payment::factory()->create([
            'booking_id' => $this->booking->id,
            'payment_type' => 'dp',
            'amount' => 700000,
            'status' => 'verified',
            'paid_at' => now(),
        ]);

        $response = $this->getJson("/api/bookings/{$this->booking->booking_code}/payment-tracking");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.total_price', 3000000);
        $response->assertJsonPath('data.paid_amount', 700000);
        $response->assertJsonPath('data.remaining_amount', 2300000);
        $this->assertCount(1, $response->json('data.payments'));
    }

    /**
     * Test: Remaining amount calculation
     */
    public function test_remaining_amount_calculation()
    {
        // DP Rp700.000
        $dpPayment = Payment::factory()->create([
            'booking_id' => $this->booking->id,
            'amount' => 700000,
            'payment_type' => 'dp',
            'status' => 'verified',
        ]);

        $remaining = $this->booking->getRemainingAmount();
        $this->assertEquals(2300000, $remaining);
    }

    /**
     * Test: Regression - old payment proof flow should not break
     */
    public function test_payment_proof_endpoint_backward_compatibility()
    {
        // Old endpoint should still exist (but disabled)
        // This ensures we don't break existing frontend calls
        $response = $this->postJson('/api/bookings/payment-proof', [
            'booking_code' => $this->booking->booking_code,
        ]);

        // Should not error (endpoint exists)
        $this->assertNotEquals(404, $response->status());
    }
}
