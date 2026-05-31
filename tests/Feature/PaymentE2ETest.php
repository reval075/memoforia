<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\ServicePackage;
use App\Models\PackageVariant;
use App\Models\PhotoTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

class PaymentE2ETest extends TestCase
{
    use RefreshDatabase;

    private ServicePackage $servicePackage;
    private PackageVariant $variant;
    private PhotoTemplate $template;
    private Booking $booking;

    public function setUp(): void
    {
        parent::setUp();
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
            'status' => 'pending_approval',
        ]);
    }

    public function test_full_sandbox_uat_flow()
    {
        // 1. Approve Booking
        $this->booking->update(['status' => 'waiting_dp']);

        // 2. Create DP
        \Mockery::mock('alias:' . \Midtrans\Snap::class)
            ->shouldReceive('getSnapToken')
            ->andReturn('sandbox_snap_dp_123');

        $dpResponse = $this->postJson('/api/payments/create', [
            'booking_code' => $this->booking->booking_code,
            'contact' => $this->booking->customer_phone,
            'payment_type' => 'dp',
            'amount' => 1000000,
            'payment_method' => 'qris',
        ]);

        $dpResponse->assertStatus(201);
        $orderIdDp = $dpResponse->json('data.order_id');

        // Verify Payment Created
        $this->assertDatabaseHas('payments', [
            'booking_id' => $this->booking->id,
            'payment_type' => 'dp',
            'status' => 'pending',
            'midtrans_order_id' => $orderIdDp,
        ]);

        // 3. Webhook DP (Settlement)
        $serverKey = config('midtrans.server_key');
        $signatureDp = hash('sha512', $orderIdDp . '200' . '1000000.00' . $serverKey);
        
        \Mockery::mock('alias:' . \Midtrans\Transaction::class)
            ->shouldReceive('status')
            ->andReturn((object) ['transaction_status' => 'settlement']);

        $webhookDpResponse = $this->postJson('/api/payments/webhook/midtrans', [
            'order_id' => $orderIdDp,
            'status_code' => '200',
            'gross_amount' => '1000000.00',
            'transaction_status' => 'settlement',
            'signature_key' => $signatureDp,
        ]);

        $webhookDpResponse->assertStatus(200);

        // Verify Booking Confirmed
        $this->booking->refresh();
        $this->assertEquals('confirmed', $this->booking->status);
        $this->assertNotNull($this->booking->confirmed_at);
        $this->assertEquals('partially_paid', $this->booking->payment_status);

        // 4. Create Settlement
        $this->travel(1)->second();
        
        \Mockery::mock('alias:' . \Midtrans\Snap::class)
            ->shouldReceive('getSnapToken')
            ->andReturn('sandbox_snap_settlement_123');

        $settlementResponse = $this->postJson('/api/payments/create', [
            'booking_code' => $this->booking->booking_code,
            'contact' => $this->booking->customer_phone,
            'payment_type' => 'settlement',
            'payment_method' => 'va',
        ]);

        $settlementResponse->assertStatus(201);
        $orderIdSettlement = $settlementResponse->json('data.order_id');
        $this->assertEquals(2000000, $settlementResponse->json('data.amount'));

        // 5. Webhook Settlement
        $signatureSettlement = hash('sha512', $orderIdSettlement . '200' . '2000000.00' . $serverKey);
        
        \Mockery::mock('alias:' . \Midtrans\Transaction::class)
            ->shouldReceive('status')
            ->andReturn((object) ['transaction_status' => 'settlement']);

        $webhookSettlementResponse = $this->postJson('/api/payments/webhook/midtrans', [
            'order_id' => $orderIdSettlement,
            'status_code' => '200',
            'gross_amount' => '2000000.00',
            'transaction_status' => 'settlement',
            'signature_key' => $signatureSettlement,
        ]);

        $webhookSettlementResponse->dump()->assertStatus(200);

        // Verify Final State
        $this->booking->refresh();
        $this->assertEquals('completed', $this->booking->status);
        $this->assertNotNull($this->booking->completed_at);
        $this->assertEquals('paid', $this->booking->payment_status);

        // Remaining Amount Verification
        $trackingResponse = $this->getJson("/api/bookings/{$this->booking->booking_code}/payment-tracking");
        $trackingResponse->assertStatus(200);
        $trackingResponse->assertJsonPath('data.remaining_amount', 0);
        $trackingResponse->assertJsonPath('data.is_completed', true);
        $trackingResponse->assertJsonPath('data.paid_amount', 3000000);
    }
}
