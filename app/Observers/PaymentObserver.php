<?php

namespace App\Observers;

use App\Models\Payment;
use App\Models\Booking;
use App\Services\Document\PdfDocumentService;

class PaymentObserver
{
    public $afterCommit = true;

    protected PdfDocumentService $pdfService;

    public function __construct(PdfDocumentService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    /**
     * Handle the Payment "updated" event.
     */
    public function updated(Payment $payment): void
    {
        // Only care about booking payments, not rentals
        if (!$payment->booking_id) {
            return;
        }

        // Check if payment status changed to verified
        // Note: Payment status can be an Enum or String
        $status = $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status;
        $originalStatus = $payment->getOriginal('status');
        $originalStatusStr = $originalStatus instanceof \BackedEnum ? $originalStatus->value : $originalStatus;

        if ($status === 'verified' && $originalStatusStr !== 'verified') {
            if ($payment->payment_type === 'dp') {
                $booking = Booking::find($payment->booking_id);
                if ($booking) {
                    $this->pdfService->generateDocument($booking, 'dp_invoice');
                }
            }
        }
    }
}

