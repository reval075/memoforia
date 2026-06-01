<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_requests', function (Blueprint $table) {
            // Unique reference code shown to customer (RENT-YYYYMMDD-XXXX)
            $table->string('rental_code')->unique()->nullable()->after('id');

            // Tracking columns
            $table->enum('payment_status', ['unpaid', 'partially_paid', 'paid'])->default('unpaid')->after('status');
            $table->timestamp('approved_at')->nullable()->after('payment_status');
            $table->timestamp('confirmed_at')->nullable()->after('approved_at');
            $table->timestamp('completed_at')->nullable()->after('confirmed_at');
            $table->timestamp('cancelled_at')->nullable()->after('completed_at');
            $table->timestamp('dp_expired_at')->nullable()->after('cancelled_at');
            $table->timestamp('settlement_due_at')->nullable()->after('dp_expired_at');
            $table->unsignedBigInteger('approved_by')->nullable()->after('settlement_due_at');
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();

            // Modify status enum to match booking flow
            $table->dropColumn('status');
        });

        Schema::table('rental_requests', function (Blueprint $table) {
            $table->enum('status', [
                'pending_approval',
                'waiting_dp',
                'confirmed',
                'completed',
                'cancelled',
                'expired',
                'rejected',
            ])->default('pending_approval')->after('settlement_due_at');
        });
    }

    public function down(): void
    {
        Schema::table('rental_requests', function (Blueprint $table) {
            $table->dropColumn([
                'rental_code', 'payment_status', 'approved_at', 'confirmed_at',
                'completed_at', 'cancelled_at', 'dp_expired_at', 'settlement_due_at',
                'status',
            ]);
            if (Schema::hasColumn('rental_requests', 'approved_by')) {
                $table->dropForeign(['approved_by']);
                $table->dropColumn('approved_by');
            }
            $table->enum('status', ['pending', 'approved', 'rejected', 'completed'])->default('pending');
        });
    }
};
