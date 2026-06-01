<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\RentalRequest;
use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Transaction;
use Exception;
use Illuminate\Support\Facades\Log;
use App\Support\DpAmountCalculator;

class MidtransService
{
    public function __construct()
    {
        $this->initializeConfig();
    }

    private function initializeConfig(): void
    {
        Config::$serverKey = config('midtrans.server_key');
        Config::$clientKey = config('midtrans.client_key');
        Config::$isProduction = config('midtrans.is_production', false);
        Config::$isSanitized = config('midtrans.is_sanitized', true);
        Config::$is3ds = config('midtrans.is_3ds', true);
    }

    public function assertConfigured(): void
    {
        if (empty(config('midtrans.server_key')) || empty(config('midtrans.client_key'))) {
            throw new Exception('Payment gateway belum dikonfigurasi. Hubungi admin.');
        }
    }

    /**
     * @return array{enabled_payments: string[], bank: ?string}
     */
    public function resolveSnapChannel(string $paymentMethod): array
    {
        $method = strtolower(trim($paymentMethod));

        return match ($method) {
            'qris'         => ['enabled_payments' => ['other_qris'], 'bank' => null],
            'bca_va'       => ['enabled_payments' => ['bca_va'], 'bank' => 'bca'],
            'bni_va'       => ['enabled_payments' => ['bni_va'], 'bank' => 'bni'],
            'bri_va'       => ['enabled_payments' => ['bri_va'], 'bank' => 'bri'],
            'mandiri_va'   => ['enabled_payments' => ['echannel'], 'bank' => 'echannel'],
            'va'           => ['enabled_payments' => ['bca_va'], 'bank' => 'bca'],
            default        => ['enabled_payments' => ['other_qris'], 'bank' => null],
        };
    }

    public function createDpTransaction(Booking $booking, float $dpAmount, string $paymentMethod): array
    {
        $minDp = DpAmountCalculator::minDpForTotal((float) $booking->total_price, 'booking');

        if ($dpAmount < $minDp) {
            throw new Exception('DP minimal Rp'.number_format($minDp, 0, ',', '.'));
        }

        if ($dpAmount > $booking->total_price) {
            throw new Exception('DP tidak boleh melebihi total harga');
        }

        return $this->createBookingSnap($booking, $dpAmount, 'dp', $paymentMethod);
    }

    public function createSettlementTransaction(Booking $booking, string $paymentMethod = 'qris'): array
    {
        $paidAmount = $booking->payments()->where('status', 'verified')->sum('amount');
        $remainingAmount = $booking->total_price - $paidAmount;

        if ($remainingAmount <= 0) {
            throw new Exception('Tidak ada sisa pembayaran');
        }

        return $this->createBookingSnap($booking, (float) $remainingAmount, 'settlement', $paymentMethod);
    }

    public function createFullPaymentTransaction(Booking $booking, float $amount, string $paymentMethod): array
    {
        if ($amount <= 0) {
            throw new Exception('Nominal pembayaran tidak valid');
        }

        return $this->createBookingSnap($booking, $amount, 'full_payment', $paymentMethod);
    }

    public function createRentalTransaction(RentalRequest $rental, float $amount, string $paymentType, string $paymentMethod): array
    {
        if ($amount <= 0) {
            throw new Exception('Nominal pembayaran tidak valid');
        }

        $itemLabel = match ($paymentType) {
            'dp'           => "Uang Muka - Sewa {$rental->rental_code}",
            'full_payment' => "Pembayaran Lunas - Sewa {$rental->rental_code}",
            'settlement'   => "Pelunasan - Sewa {$rental->rental_code}",
            default        => "Pembayaran - Sewa {$rental->rental_code}",
        };

        $orderId = sprintf('RENT-%s-%d', $rental->rental_code, now()->timestamp);

        return $this->createSnapPayment(
            orderId: $orderId,
            amount: $amount,
            paymentType: $paymentType,
            paymentMethod: $paymentMethod,
            customerDetails: [
                'first_name' => $rental->customer_name,
                'email'      => $rental->customer_email ?? '',
                'phone'      => $rental->customer_phone ?? '',
            ],
            itemName: $itemLabel,
            rentalRequestId: $rental->id,
            referenceLabel: $rental->rental_code,
        );
    }

    private function createBookingSnap(Booking $booking, float $amount, string $paymentType, string $paymentMethod): array
    {
        $itemName = match ($paymentType) {
            'dp'           => "Uang Muka - {$booking->event_name}",
            'full_payment' => "Pembayaran Lunas - {$booking->event_name}",
            'settlement'   => "Pelunasan - {$booking->event_name}",
            default        => "Pembayaran - {$booking->event_name}",
        };

        $orderId = sprintf('MEMO-%s-%d', $booking->booking_code, now()->timestamp);

        return $this->createSnapPayment(
            orderId: $orderId,
            amount: $amount,
            paymentType: $paymentType,
            paymentMethod: $paymentMethod,
            customerDetails: [
                'first_name' => $booking->customer_name,
                'email'      => $booking->customer_email ?? '',
                'phone'      => $booking->customer_phone ?? '',
            ],
            itemName: $itemName,
            bookingId: $booking->id,
            referenceLabel: $booking->booking_code,
        );
    }

    /**
     * Create Snap token + pending payment record (booking & rental).
     */
    private function createSnapPayment(
        string $orderId,
        float $amount,
        string $paymentType,
        string $paymentMethod,
        array $customerDetails,
        string $itemName,
        ?int $bookingId = null,
        ?int $rentalRequestId = null,
        ?string $referenceLabel = null,
    ): array {
        $this->assertConfigured();

        try {
            $channel = $this->resolveSnapChannel($paymentMethod);

            $transactionParams = [
                'transaction_details' => [
                    'order_id'     => $orderId,
                    'gross_amount' => (int) $amount,
                ],
                'customer_details'    => $customerDetails,
                'item_details'        => [
                    [
                        'id'       => (string) ($bookingId ?? $rentalRequestId ?? 0),
                        'price'    => (int) $amount,
                        'quantity' => 1,
                        'name'     => mb_substr($itemName, 0, 50),
                    ],
                ],
                'enabled_payments' => $channel['enabled_payments'],
                'expiry'           => [
                    'unit'     => 'hours',
                    'duration' => (int) config('midtrans.snap_expiry_hours', 24),
                ],
            ];

            if ($channel['bank'] === 'echannel') {
                $transactionParams['echannel'] = [
                    'bill_info1' => 'Pembayaran:',
                    'bill_info2' => $referenceLabel ?? $orderId,
                ];
            } elseif ($channel['bank']) {
                $transactionParams['bank_transfer'] = [
                    'bank' => $channel['bank'],
                    'free_text' => [
                        'inquiry' => ['id' => "Pembayaran {$paymentType}"],
                        'payment' => ['id' => $referenceLabel ?? $orderId],
                    ],
                ];
            }

            $snapToken = Snap::getSnapToken($transactionParams);

            $payment = Payment::create([
                'booking_id'         => $bookingId,
                'rental_request_id'  => $rentalRequestId,
                'amount'             => $amount,
                'payment_type'       => $paymentType,
                'payment_method'     => $paymentMethod,
                'status'             => 'pending',
                'payment_source'     => 'midtrans',
                'gateway'            => 'midtrans',
                'midtrans_order_id'  => $orderId,
                'snap_token'         => $snapToken,
                'gateway_payload'    => json_encode($transactionParams),
                'gateway_expired_at' => now()->addHours((int) config('midtrans.snap_expiry_hours', 24)),
            ]);

            return [
                'success'    => true,
                'payment_id' => $payment->id,
                'snap_token' => $snapToken,
                'order_id'   => $orderId,
                'amount'     => $amount,
                'expired_at' => $payment->gateway_expired_at,
            ];
        } catch (Exception $e) {
            Log::error('Midtrans snap creation failed', [
                'order_id' => $orderId,
                'error'    => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function verifyNotification(array $notification): array
    {
        try {
            $signature = $notification['signature_key'] ?? null;
            $orderId = $notification['order_id'] ?? null;
            $statusCode = $notification['status_code'] ?? null;
            $grossAmount = $notification['gross_amount'] ?? null;

            if (! $signature || ! $orderId) {
                throw new Exception('Invalid notification format');
            }

            $expectedSignature = hash('sha512', $orderId.$statusCode.$grossAmount.config('midtrans.server_key'));

            if ($signature !== $expectedSignature) {
                Log::warning('Midtrans signature verification failed', [
                    'order_id' => $orderId,
                ]);
                throw new Exception('Signature mismatch');
            }

            $payment = Payment::where('midtrans_order_id', $orderId)->firstOrFail();

            return [
                'success'              => true,
                'payment_id'           => $payment->id,
                'booking_id'           => $payment->booking_id,
                'rental_request_id'    => $payment->rental_request_id,
                'order_id'             => $orderId,
                'payment_status'       => $this->mapTransactionStatus($notification['transaction_status'] ?? 'unknown'),
                'transaction_status'   => $notification['transaction_status'] ?? null,
                'reference_id'         => $notification['reference_id'] ?? null,
                'full_response'        => $notification,
            ];
        } catch (Exception $e) {
            Log::error('Webhook verification failed', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function updatePaymentStatus(Payment $payment, string $transactionStatus): bool
    {
        $statusValue = $this->mapTransactionStatus($transactionStatus);

        $updateData = [
            'status'            => $statusValue,
            'gateway_reference' => $transactionStatus,
        ];

        if ($statusValue === \App\Enums\PaymentStatus::Verified->value) {
            $updateData['verified_at'] = $payment->verified_at ?? now();
            $updateData['paid_at'] = $payment->paid_at ?? now();
        }

        $payment->update($updateData);

        return true;
    }

    public function getTransactionStatus(string $orderId): array
    {
        $this->assertConfigured();

        try {
            $response = Transaction::status($orderId);

            return [
                'success' => true,
                'status'  => $response->transaction_status ?? null,
                'response'=> $response,
            ];
        } catch (Exception $e) {
            Log::error('Failed to get transaction status', [
                'order_id' => $orderId,
                'error'    => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function mapTransactionStatus(string $transactionStatus): string
    {
        return match ($transactionStatus) {
            'capture'        => \App\Enums\PaymentStatus::Verified->value,
            'settlement'     => \App\Enums\PaymentStatus::Verified->value,
            'pending'        => \App\Enums\PaymentStatus::Pending->value,
            'deny'           => \App\Enums\PaymentStatus::Rejected->value,
            'cancel'         => \App\Enums\PaymentStatus::Cancelled->value,
            'expire'         => \App\Enums\PaymentStatus::Expired->value,
            'refund'         => \App\Enums\PaymentStatus::Refunded->value,
            'partial_refund' => \App\Enums\PaymentStatus::Refunded->value,
            default          => throw new \InvalidArgumentException("Unmapped Midtrans status: {$transactionStatus}"),
        };
    }

    public function cancelTransaction(string $orderId): array
    {
        try {
            $response = Transaction::cancel($orderId);

            return ['success' => true, 'response' => $response];
        } catch (Exception $e) {
            Log::error('Transaction cancellation failed', ['order_id' => $orderId, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    public function refundTransaction(string $orderId, ?float $amount = null): array
    {
        try {
            $params = [];
            if ($amount) {
                $params['refund_key'] = time();
                $params['amount'] = (int) $amount;
            }

            $response = Transaction::refund($orderId, $params);

            return ['success' => true, 'response' => $response];
        } catch (Exception $e) {
            Log::error('Transaction refund failed', ['order_id' => $orderId, 'error' => $e->getMessage()]);
            throw $e;
        }
    }
}
