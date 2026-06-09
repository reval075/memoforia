<?php

namespace App\Observers;

use App\Models\Payment;
use App\Models\Booking;
use App\Models\RentalRequest;
use App\Services\Document\PdfDocumentService;
use App\Services\Document\PdfRentalDocumentService;

class PaymentObserver
{
    public $afterCommit = true;

    protected PdfDocumentService $pdfService;
    protected PdfRentalDocumentService $rentalPdfService;

    public function __construct(PdfDocumentService $pdfService, PdfRentalDocumentService $rentalPdfService)
    {
        $this->pdfService = $pdfService;
        $this->rentalPdfService = $rentalPdfService;
    }

    /**
     * Handle the Payment "updated" event.
     */
    public function updated(Payment $payment): void
    {
        // We handle both booking and rental payments
        if (!$payment->booking_id && !$payment->rental_request_id) {
            return;
        }

        // Check if payment status changed to verified
        // Note: Payment status can be an Enum or String
        $status = $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status;
        $originalStatus = $payment->getOriginal('status');
        $originalStatusStr = $originalStatus instanceof \BackedEnum ? $originalStatus->value : $originalStatus;

        if ($status === 'verified' && $originalStatusStr !== 'verified') {
            if ($payment->payment_type === 'dp') {
                if ($payment->booking_id) {
                    $booking = Booking::find($payment->booking_id);
                    if ($booking) {
                        $this->pdfService->generateDocument($booking, 'dp_invoice');
                    }
                } elseif ($payment->rental_request_id) {
                    $rental = RentalRequest::find($payment->rental_request_id);
                    if ($rental) {
                        $this->rentalPdfService->generateDocument($rental, 'dp_invoice');
                    }
                }
            }
        }
    }
}

