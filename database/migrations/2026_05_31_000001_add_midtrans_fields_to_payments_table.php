<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Gateway tracking fields
            $table->string('payment_source')->default('midtrans')->after('payment_type');
            $table->string('gateway')->nullable()->after('payment_source'); // 'midtrans', etc
            $table->string('gateway_reference')->nullable()->after('gateway'); // Midtrans transaction ID
            $table->string('midtrans_order_id')->nullable()->after('gateway_reference'); // Order ID format: MEMO-{booking_code}-{timestamp}

            // Snap integration fields
            $table->text('snap_token')->nullable()->after('midtrans_order_id');
            $table->json('gateway_payload')->nullable()->after('snap_token'); // Full Midtrans response

            // Timestamp fields
            $table->timestamp('paid_at')->nullable()->change(); // Mark as nullable (already exists but making explicit)
            $table->timestamp('gateway_expired_at')->nullable()->after('paid_at'); // Midtrans transaction expiry
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'payment_source',
                'gateway',
                'gateway_reference',
                'midtrans_order_id',
                'snap_token',
                'gateway_payload',
                'gateway_expired_at',
            ]);
        });
    }
};
