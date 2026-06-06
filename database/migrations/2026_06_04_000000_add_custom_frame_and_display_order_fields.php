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
        Schema::table('bookings', function (Blueprint $table) {
            $table->boolean('use_custom_frame')->default(false)->after('selected_template_id');
            $table->string('custom_frame_path')->nullable()->after('use_custom_frame');
        });

        Schema::table('service_packages', function (Blueprint $table) {
            $table->boolean('includes_softfile')->default(false)->after('description');
            $table->boolean('includes_prints')->default(false)->after('includes_softfile');
            $table->boolean('includes_qr_code')->default(false)->after('includes_prints');
            $table->boolean('includes_gif')->default(false)->after('includes_qr_code');
            $table->boolean('includes_custom_template')->default(false)->after('includes_gif');
            $table->boolean('includes_supporting_crew')->default(false)->after('includes_custom_template');
            $table->boolean('includes_tiket_antrian')->default(false)->after('includes_supporting_crew');
            $table->unsignedInteger('display_order')->default(0)->after('includes_tiket_antrian');
        });

        Schema::table('addons', function (Blueprint $table) {
            $table->unsignedInteger('display_order')->default(0)->after('is_active');
        });

        Schema::table('photo_templates', function (Blueprint $table) {
            $table->string('frame_image')->nullable()->after('preview_image');
            $table->text('description')->nullable()->after('frame_type');
            $table->unsignedInteger('display_order')->default(0)->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['use_custom_frame', 'custom_frame_path']);
        });

        Schema::table('service_packages', function (Blueprint $table) {
            $table->dropColumn([
                'includes_softfile',
                'includes_prints',
                'includes_qr_code',
                'includes_gif',
                'includes_custom_template',
                'includes_supporting_crew',
                'includes_tiket_antrian',
                'display_order',
            ]);
        });

        Schema::table('addons', function (Blueprint $table) {
            $table->dropColumn('display_order');
        });

        Schema::table('photo_templates', function (Blueprint $table) {
            $table->dropColumn(['frame_image', 'description', 'display_order']);
        });
    }
};
