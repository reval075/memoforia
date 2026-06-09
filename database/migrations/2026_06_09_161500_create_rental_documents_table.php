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
        Schema::create('rental_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_request_id')->constrained('rental_requests')->onDelete('cascade');
            $table->string('document_type'); // confirmation, quotation, dp_invoice, final_invoice, service_receipt
            $table->string('document_number');
            $table->string('file_name');
            $table->string('file_path');
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rental_documents');
    }
};
