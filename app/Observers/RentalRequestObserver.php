<?php

namespace App\Observers;

use App\Models\RentalRequest;
use App\Services\Document\PdfRentalDocumentService;

class RentalRequestObserver
{
    public $afterCommit = true;

    protected PdfRentalDocumentService $pdfService;

    public function __construct(PdfRentalDocumentService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    /**
     * Handle the RentalRequest "created" event.
     */
    public function created(RentalRequest $rental): void
    {
        if ($rental->status === 'pending_approval') {
            $this->pdfService->generateDocument($rental, 'confirmation');
        }
    }

    /**
     * Handle the RentalRequest "updated" event.
     */
    public function updated(RentalRequest $rental): void
    {
        // Check for quotation (status changed to waiting_dp)
        if ($rental->wasChanged('status') && $rental->status === 'waiting_dp') {
            $this->pdfService->generateDocument($rental, 'quotation');
        }

        // Check for service receipt (status changed to completed)
        if ($rental->wasChanged('status') && $rental->status === 'completed') {
            $this->pdfService->generateDocument($rental, 'service_receipt');
        }

        // Check for final invoice (payment_status changed to paid)
        if ($rental->wasChanged('payment_status') && $rental->payment_status === 'paid') {
            $this->pdfService->generateDocument($rental, 'final_invoice');
        }
    }
}
