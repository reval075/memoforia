<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Make booking_id nullable so payment can belong to rental_request instead
            $table->unsignedBigInteger('booking_id')->nullable()->change();

            // Link to rental request
            $table->unsignedBigInteger('rental_request_id')->nullable()->after('booking_id');
            $table->foreign('rental_request_id')->references('id')->on('rental_requests')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['rental_request_id']);
            $table->dropColumn('rental_request_id');
            $table->unsignedBigInteger('booking_id')->nullable(false)->change();
        });
    }
};
