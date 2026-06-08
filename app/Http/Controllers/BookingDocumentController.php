<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingDocument;
use App\Services\Document\PdfDocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BookingDocumentController extends Controller
{
    protected PdfDocumentService $pdfService;

    public function __construct(PdfDocumentService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    /**
     * Get all documents for a booking (Admin/Customer)
     */
    public function index($bookingCode)
    {
        $booking = Booking::where('booking_code', $bookingCode)->firstOrFail();
        
        $documents = $booking->documents()
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => $documents
        ]);
    }

    /**
     * Get the latest document of a specific type (Customer Track)
     */
    public function downloadLatest($bookingCode, $type)
    {
        $booking = Booking::where('booking_code', $bookingCode)->firstOrFail();
        
        $document = $booking->documents()
            ->where('document_type', $type)
            ->latest()
            ->first();

        if (!$document || !Storage::disk('public')->exists($document->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Dokumen belum tersedia atau tidak ditemukan.'
            ], 404);
        }

        return Storage::disk('public')->download($document->file_path, $document->file_name);
    }

    /**
     * Download a specific document by ID (Admin)
     */
    public function download($id)
    {
        $document = BookingDocument::findOrFail($id);

        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak ditemukan di server.'
            ], 404);
        }

        return Storage::disk('public')->download($document->file_path, $document->file_name);
    }

    /**
     * Regenerate a specific document type for a booking (Admin)
     */
    public function regenerate(Request $request, $bookingCode)
    {
        $request->validate([
            'type' => 'required|in:confirmation,quotation,dp_invoice,final_invoice,service_receipt'
        ]);

        $booking = Booking::where('booking_code', $bookingCode)->firstOrFail();
        $type = $request->input('type');

        // Allow regenerating only if the status roughly matches, or force regenerate
        // Actually, since it's an admin feature, we just generate it based on current data.
        $document = $this->pdfService->generateDocument($booking, $type);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat dokumen PDF.'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Dokumen berhasil dibuat ulang.',
            'data' => $document
        ]);
    }
}

