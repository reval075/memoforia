<?php

namespace App\Services\Document;

use App\Models\RentalRequest;
use App\Models\RentalDocument;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PdfRentalDocumentService
{
    /**
     * Generate a PDF document for a rental.
     *
     * @param RentalRequest $rental
     * @param string $type The document type: confirmation, quotation, dp_invoice, final_invoice, service_receipt
     * @return RentalDocument|null
     */
    public function generateDocument(RentalRequest $rental, string $type): ?RentalDocument
    {
        $rental->loadMissing(['items.equipment', 'payments']);

        $viewName = $this->getViewName($type);
        if (!$viewName) {
            return null;
        }

        $documentNumber = $this->generateDocumentNumber($type, $rental->rental_code);
        $fileName = $this->generateFileName($type, $rental->rental_code);
        $folderPath = 'documents/rental/' . str_replace('_', '-', $type);
        $filePath = $folderPath . '/' . $fileName;

        $pdf = Pdf::loadView($viewName, [
            'rental' => $rental,
            'documentNumber' => $documentNumber,
            'date' => now()->format('d F Y'),
        ]);

        // Store file permanently
        Storage::disk('public')->put($filePath, $pdf->output());

        // Create or update record
        return RentalDocument::create([
            'rental_request_id' => $rental->id,
            'document_type' => $type,
            'document_number' => $documentNumber,
            'file_name' => $fileName,
            'file_path' => $filePath,
            'generated_at' => now(),
        ]);
    }

    private function getViewName(string $type): ?string
    {
        return match ($type) {
            'confirmation' => 'pdf.rental-confirmation',
            'quotation' => 'pdf.rental-quotation',
            'dp_invoice' => 'pdf.rental-dp-invoice',
            'final_invoice' => 'pdf.rental-final-invoice',
            'service_receipt' => 'pdf.rental-receipt',
            default => null,
        };
    }

    private function generateDocumentNumber(string $type, string $rentalCode): string
    {
        $prefix = match ($type) {
            'confirmation' => 'CONF',
            'quotation' => 'QUOT',
            'dp_invoice' => 'INV-DP',
            'final_invoice' => 'INV-FN',
            'service_receipt' => 'RCPT',
            default => 'DOC',
        };

        return $prefix . '-RENT-' . $rentalCode . '-' . strtoupper(Str::random(4));
    }

    private function generateFileName(string $type, string $rentalCode): string
    {
        $baseName = match ($type) {
            'confirmation' => 'RENTAL-CONFIRMATION',
            'quotation' => 'QUOTATION',
            'dp_invoice' => 'DP-INVOICE',
            'final_invoice' => 'FINAL-INVOICE',
            'service_receipt' => 'RECEIPT',
            default => strtoupper($type),
        };

        $timestamp = now()->format('YmdHis');
        return "{$baseName}-{$rentalCode}-{$timestamp}.pdf";
    }
}
