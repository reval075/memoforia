<?php

namespace App\Services\Document;

use App\Models\Booking;
use App\Models\BookingDocument;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PdfDocumentService
{
    /**
     * Generate a PDF document for a booking.
     *
     * @param Booking $booking
     * @param string $type The document type: confirmation, quotation, dp_invoice, final_invoice, service_receipt
     * @return BookingDocument|null
     */
    public function generateDocument(Booking $booking, string $type): ?BookingDocument
    {
        $booking->loadMissing(['servicePackage', 'packageVariant', 'selectedTemplate', 'addons', 'payments']);

        $viewName = $this->getViewName($type);
        if (!$viewName) {
            return null;
        }

        $documentNumber = $this->generateDocumentNumber($type, $booking->booking_code);
        $fileName = $this->generateFileName($type, $booking->booking_code);
        $folderPath = 'documents/' . str_replace('_', '-', $type);
        $filePath = $folderPath . '/' . $fileName;

        $pdf = Pdf::loadView($viewName, [
            'booking' => $booking,
            'documentNumber' => $documentNumber,
            'date' => now()->format('d F Y'),
        ]);

        // Store file permanently
        Storage::disk('public')->put($filePath, $pdf->output());

        // Create or update record
        // By user requirement: "Dokumen lama tidak dihapus. Dokumen menjadi histori perjalanan booking customer."
        // We just append a new record each time generated.
        return BookingDocument::create([
            'booking_id' => $booking->id,
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
            'confirmation' => 'pdf.booking-confirmation',
            'quotation' => 'pdf.quotation',
            'dp_invoice' => 'pdf.dp-invoice',
            'final_invoice' => 'pdf.final-invoice',
            'service_receipt' => 'pdf.service-receipt',
            default => null,
        };
    }

    private function generateDocumentNumber(string $type, string $bookingCode): string
    {
        $prefix = match ($type) {
            'confirmation' => 'CONF',
            'quotation' => 'QUOT',
            'dp_invoice' => 'INV-DP',
            'final_invoice' => 'INV-FN',
            'service_receipt' => 'RCPT',
            default => 'DOC',
        };

        // Format: CONF-MEMO20260608XXXXX-RANDOM
        return $prefix . '-' . $bookingCode . '-' . strtoupper(Str::random(4));
    }

    private function generateFileName(string $type, string $bookingCode): string
    {
        $baseName = match ($type) {
            'confirmation' => 'BOOKING-CONFIRMATION',
            'quotation' => 'QUOTATION',
            'dp_invoice' => 'DP-INVOICE',
            'final_invoice' => 'FINAL-INVOICE',
            'service_receipt' => 'SERVICE-RECEIPT',
            default => strtoupper($type),
        };

        $timestamp = now()->format('YmdHis');
        return "{$baseName}-{$bookingCode}-{$timestamp}.pdf";
    }
}
