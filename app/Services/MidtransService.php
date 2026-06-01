<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Transaction;
use Exception;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class MidtransService
{
    public function __construct()
    {
        $this->initializeConfig();
    }

    /**
     * Initialize Midtrans configuration
     */
    private function initializeConfig(): void
    {
        Config::$serverKey = config('midtrans.server_key');
        Config::$clientKey = config('midtrans.client_key');
        Config::$isProduction = config('midtrans.is_production', false);
        Config::$isSanitized = config('midtrans.is_sanitized', true);
        Config::$is3ds = config('midtrans.is_3ds', true);

        // Debug logging for Midtrans Config
        Log::info('Midtrans Config Initialized', [
            'is_production' => Config::$isProduction,
            'merchant_id_set' => !empty(config('midtrans.merchant_id')),
            'server_key_set' => !empty(Config::$serverKey),
            'client_key_set' => !empty(Config::$clientKey),
        ]);
    }

    /**
     * Create DP transaction
     *
     * @param Booking $booking
     * @param float $dpAmount
     * @param string $paymentMethod (va, qris)
     * @return array
     */
    public function createDpTransaction(Booking $booking, float $dpAmount, string $paymentMethod): array
    {
        // Validate DP amount
        if ($dpAmount < 500000) {
            throw new Exception('DP minimal Rp500.000');
        }

        if ($dpAmount > $booking->total_price) {
            throw new Exception('DP tidak boleh melebihi total harga');
        }

        // Create Snap transaction
        $transaction = $this->createSnapTransaction(
            booking: $booking,
            amount: $dpAmount,
            paymentType: 'dp',
            paymentMethod: $paymentMethod
        );

        return $transaction;
    }

    /**
     * Create settlement transaction
     *
     * @param Booking $booking
     * @return array
     */
    public function createSettlementTransaction(Booking $booking): array
    {
        // Calculate remaining amount
        $paidAmount = $booking->payments()
            ->where('status', 'verified')
            ->where('payment_type', 'dp')
            ->sum('amount');

        $remainingAmount = $booking->total_price - $paidAmount;

        if ($remainingAmount <= 0) {
            throw new Exception('Tidak ada sisa pembayaran');
        }

        // Settlement always uses VA (no method choice)
        $transaction = $this->createSnapTransaction(
            booking: $booking,
            amount: $remainingAmount,
            paymentType: 'settlement',
            paymentMethod: 'va'
        );

        return $transaction;
    }

    /**
     * Create Snap transaction (internal helper)
     *
     * @param Booking $booking
     * @param float $amount
     * @param string $paymentType (dp, settlement)
     * @param string $paymentMethod (va, qris)
     * @return array
     */
    private function createSnapTransaction(
        Booking $booking,
        float $amount,
        string $paymentType,
        string $paymentMethod
    ): array {
        try {
            // Generate order ID: MEMO-{booking_code}-{timestamp}
            $orderId = sprintf('MEMO-%s-%d', $booking->booking_code, now()->timestamp);

            // Payment method enabled list
            $enabledPayments = match ($paymentMethod) {
                'va' => ['bank_transfer'],
                'qris' => ['qris'],
                default => ['bank_transfer'],
            };

            // Build transaction parameter
            $transactionParams = [
                'transaction_details' => [
                    'order_id' => $orderId,
                    'gross_amount' => (int) $amount,
                ],
                'customer_details' => [
                    'first_name' => $booking->customer_name,
                    'email' => $booking->customer_email,
                    'phone' => $booking->customer_phone,
                ],
                'item_details' => [
                    [
                        'id' => $booking->id,
                        'price' => (int) $amount,
                        'quantity' => 1,
                        'name' => $paymentType === 'dp'
                            ? "Uang Muka - {$booking->event_name}"
                            : "Pelunasan - {$booking->event_name}",
                    ],
                ],
                'payment_type' => $paymentMethod === 'va' ? 'bank_transfer' : 'qris',
                'expiry' => [
                    'unit' => 'hours',
                    'duration' => 24, // 24 hours expiry
                ],
            ];

            // Add payment method specific config
            if ($paymentMethod === 'va') {
                $transactionParams['bank_transfer'] = [
                    'bank' => 'bca',
                    'free_text' => [
                        'inquiry' => [
                            'id' => "Pembayaran {$paymentType} booking {$booking->booking_code}",
                        ],
                        'payment' => [
                            'id' => "Pembayaran {$paymentType} booking {$booking->booking_code}",
                        ],
                    ],
                ];
            }

            // Get Snap token
            $snapToken = Snap::getSnapToken($transactionParams);

            // Store payment record
            $payment = Payment::create([
                'booking_id' => $booking->id,
                'amount' => $amount,
                'payment_type' => $paymentType,
                'payment_method' => $paymentMethod,
                'status' => 'pending',
                'payment_source' => 'midtrans',
                'gateway' => 'midtrans',
                'midtrans_order_id' => $orderId,
                'snap_token' => $snapToken,
                'gateway_payload' => json_encode($transactionParams),
                'gateway_expired_at' => now()->addHours(24),
            ]);

            return [
                'success' => true,
                'payment_id' => $payment->id,
                'snap_token' => $snapToken,
                'order_id' => $orderId,
                'amount' => $amount,
                'expired_at' => $payment->gateway_expired_at,
            ];
        } catch (Exception $e) {
            Log::error('Midtrans transaction creation failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Verify webhook notification from Midtrans
     *
     * @param array $notification
     * @return array
     */
    public function verifyNotification(array $notification): array
    {
        try {
            // Validate signature
            $signature = $notification['signature_key'] ?? null;
            $orderId = $notification['order_id'] ?? null;
            $statusCode = $notification['status_code'] ?? null;
            $grossAmount = $notification['gross_amount'] ?? null;

            if (!$signature || !$orderId) {
                throw new Exception('Invalid notification format');
            }

            // Verify signature: sha512(order_id + status_code + gross_amount + server_key)
            $expectedSignature = hash('sha512', $orderId . $statusCode . $grossAmount . config('midtrans.server_key'));

            if ($signature !== $expectedSignature) {
                Log::warning('Midtrans signature verification failed', [
                    'order_id' => $orderId,
                    'expected' => $expectedSignature,
                    'received' => $signature,
                ]);
                throw new Exception('Signature mismatch');
            }

            // Map Midtrans status to payment status
            $paymentStatus = $this->mapTransactionStatus($notification['transaction_status'] ?? 'unknown');

            // Find payment by order_id
            $payment = Payment::where('midtrans_order_id', $orderId)->firstOrFail();

            // Get transaction status from Midtrans API
            $transactionStatus = Transaction::status($orderId);

            return [
                'success' => true,
                'payment_id' => $payment->id,
                'booking_id' => $payment->booking_id,
                'order_id' => $orderId,
                'payment_status' => $paymentStatus,
                'transaction_status' => $notification['transaction_status'] ?? null,
                'reference_id' => $notification['reference_id'] ?? null,
                'full_response' => $notification,
            ];
        } catch (Exception $e) {
            Log::error('Webhook verification failed', [
                'error' => $e->getMessage(),
                'notification' => $notification,
            ]);
            throw $e;
        }
    }

    /**
     * Update payment status based on webhook notification
     *
     * @param Payment $payment
     * @param string $transactionStatus
     * @return bool
     */
    public function updatePaymentStatus(Payment $payment, string $transactionStatus): bool
    {
        $statusValue = $this->mapTransactionStatus($transactionStatus);

        $updateData = [
            'status' => $statusValue,
            'gateway_reference' => $transactionStatus,
        ];

        // Only update timestamps if we are transitioning to verified
        if ($statusValue === \App\Enums\PaymentStatus::Verified->value) {
            $updateData['verified_at'] = $payment->verified_at ?? now();
            $updateData['paid_at'] = $payment->paid_at ?? now();
        }

        $payment->update($updateData);

        return true;
    }

    /**
     * Map Midtrans transaction status to PaymentStatus enum value
     *
     * ISSUE 4: Explicit mapping — no default fallback
     *
     * @param string $transactionStatus
     * @return string
     * @throws \InvalidArgumentException when unmapped status received
     */
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

    /**
     * Cancel transaction
     *
     * @param string $orderId
     * @return array
     */
    public function cancelTransaction(string $orderId): array
    {
        try {
            $response = Transaction::cancel($orderId);
            return [
                'success' => true,
                'response' => $response,
            ];
        } catch (Exception $e) {
            Log::error('Transaction cancellation failed', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Refund transaction
     *
     * @param string $orderId
     * @param float|null $amount
     * @return array
     */
    public function refundTransaction(string $orderId, ?float $amount = null): array
    {
        try {
            $params = [];
            if ($amount) {
                $params['refund_key'] = time();
                $params['amount'] = (int) $amount;
            }

            $response = Transaction::refund($orderId, $params);
            return [
                'success' => true,
                'response' => $response,
            ];
        } catch (Exception $e) {
            Log::error('Transaction refund failed', [
                'order_id' => $orderId,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get transaction status from Midtrans
     *
     * @param string $orderId
     * @return array
     */
    public function getTransactionStatus(string $orderId): array
    {
        try {
            $response = Transaction::status($orderId);
            return [
                'success' => true,
                'status' => $response->transaction_status ?? null,
                'response' => $response,
            ];
        } catch (Exception $e) {
            Log::error('Failed to get transaction status', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
