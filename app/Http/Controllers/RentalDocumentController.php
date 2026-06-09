<?php

namespace App\Http\Controllers;

use App\Models\RentalRequest;
use App\Models\RentalDocument;
use App\Services\Document\PdfRentalDocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RentalDocumentController extends Controller
{
    protected PdfRentalDocumentService $pdfService;

    public function __construct(PdfRentalDocumentService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    /**
     * Get all documents for a rental (Admin/Customer)
     */
    public function index($rentalCode)
    {
        $rental = RentalRequest::where('rental_code', $rentalCode)->firstOrFail();
        
        $documents = $rental->documents()
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
    public function downloadLatest($rentalCode, $type)
    {
        $rental = RentalRequest::where('rental_code', $rentalCode)->firstOrFail();
        
        $document = $rental->documents()
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
        $document = RentalDocument::findOrFail($id);

        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak ditemukan di server.'
            ], 404);
        }

        return Storage::disk('public')->download($document->file_path, $document->file_name);
    }

    /**
     * Regenerate a specific document type for a rental (Admin)
     */
    public function regenerate(Request $request, $rentalCode)
    {
        $request->validate([
            'type' => 'required|in:confirmation,quotation,dp_invoice,final_invoice,service_receipt'
        ]);

        $rental = RentalRequest::where('rental_code', $rentalCode)->firstOrFail();
        $type = $request->input('type');

        $document = $this->pdfService->generateDocument($rental, $type);

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
