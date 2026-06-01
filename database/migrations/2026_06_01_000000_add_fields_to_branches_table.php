<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * NOTE: The 'branches' table is used to store partner locations where MemoForia photobox is available.
     * Despite the legacy naming, these are partner venues (like Kalaswara Coffee Shop), not MemoForia-owned locations.
     */
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            // Partner location details
            $table->string('city')->nullable()->after('address');
            $table->string('province')->nullable()->after('city');
            $table->string('postal_code')->nullable()->after('province');

            // Geographic coordinates for map embedding
            $table->decimal('latitude', 10, 8)->nullable()->after('postal_code');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');

            // Partner contact information
            $table->string('email')->nullable()->after('phone');
            $table->string('whatsapp_number')->nullable()->after('email');
            $table->text('description')->nullable()->after('whatsapp_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'city',
                'province',
                'postal_code',
                'latitude',
                'longitude',
                'email',
                'whatsapp_number',
                'description',
            ]);
        });
    }
};
