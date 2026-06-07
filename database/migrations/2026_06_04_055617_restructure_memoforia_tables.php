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
        Schema::table('service_packages', function (Blueprint $table) {
            $table->integer('display_order')->default(0)->after('is_active');
            $table->boolean('has_softfile')->default(false)->after('display_order');
            $table->boolean('has_prints')->default(false)->after('has_softfile');
            $table->boolean('has_qrcode')->default(false)->after('has_prints');
            $table->boolean('has_gif')->default(false)->after('has_qrcode');
            $table->boolean('has_custom_template')->default(false)->after('has_gif');
            $table->boolean('has_supporting_crew')->default(false)->after('has_custom_template');
            $table->boolean('has_tiket_antrian')->default(false)->after('has_supporting_crew');
            $table->string('printer_type')->nullable()->after('has_tiket_antrian');
            $table->text('printer_description')->nullable()->after('printer_type');
        });

        Schema::table('package_variants', function (Blueprint $table) {
            $table->decimal('extra_print_price', 12, 2)->nullable()->after('extra_hour_price');
        });

        Schema::table('addons', function (Blueprint $table) {
            $table->integer('display_order')->default(0)->after('is_active');
        });

        Schema::table('photo_templates', function (Blueprint $table) {
            $table->text('description')->nullable()->after('layout_type');
            $table->integer('display_order')->default(0)->after('description');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->string('custom_frame_path')->nullable()->after('selected_template_id');
            $table->string('custom_frame_filename')->nullable()->after('custom_frame_path');
            $table->timestamp('custom_frame_uploaded_at')->nullable()->after('custom_frame_filename');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['custom_frame_path', 'custom_frame_filename', 'custom_frame_uploaded_at']);
        });

        Schema::table('photo_templates', function (Blueprint $table) {
            $table->dropColumn(['description', 'display_order']);
        });

        Schema::table('addons', function (Blueprint $table) {
            $table->dropColumn(['display_order']);
        });

        Schema::table('package_variants', function (Blueprint $table) {
            $table->dropColumn(['extra_print_price']);
        });

        Schema::table('service_packages', function (Blueprint $table) {
            $table->dropColumn([
                'display_order',
                'has_softfile',
                'has_prints',
                'has_qrcode',
                'has_gif',
                'has_custom_template',
                'has_supporting_crew',
                'has_tiket_antrian',
                'printer_type',
                'printer_description',
            ]);
        });
    }
};
