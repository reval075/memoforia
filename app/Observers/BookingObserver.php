<?php

namespace App\Observers;

use App\Models\Booking;
use App\Services\Document\PdfDocumentService;

class BookingObserver
{
    public $afterCommit = true;

    protected PdfDocumentService $pdfService;

    public function __construct(PdfDocumentService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    /**
     * Handle the Booking "created" event.
     */
    public function created(Booking $booking): void
    {
        if ($booking->status === 'pending_approval') {
            $this->pdfService->generateDocument($booking, 'confirmation');
        }
    }

    /**
     * Handle the Booking "updated" event.
     */
    public function updated(Booking $booking): void
    {
        // Check for quotation (status changed to waiting_dp)
        if ($booking->wasChanged('status') && $booking->status === 'waiting_dp') {
            $this->pdfService->generateDocument($booking, 'quotation');
        }

        // Check for service receipt (status changed to completed)
        if ($booking->wasChanged('status') && $booking->status === 'completed') {
            $this->pdfService->generateDocument($booking, 'service_receipt');
        }

        // Check for final invoice (payment_status changed to paid)
        if ($booking->wasChanged('payment_status') && $booking->payment_status === 'paid') {
            $this->pdfService->generateDocument($booking, 'final_invoice');
        }
    }
}

