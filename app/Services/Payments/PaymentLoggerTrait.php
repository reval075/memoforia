<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

trait PaymentLoggerTrait
{
    /**
     * Log payment event to the payment channel with sanitized context.
     */
    protected function logPayment(string $event, array $context): void
    {
        $sanitized = $this->maskSensitiveData($context);

        // Ensure observability fields exist
        if (!isset($sanitized['request_id'])) {
            $sanitized['request_id'] = request()->attributes->get('request_id') ?? Str::uuid()->toString();
            request()->attributes->set('request_id', $sanitized['request_id']);
        }

        Log::channel('payment')->info($event, $sanitized);
    }

    /**
     * Log payment error.
     */
    protected function logPaymentError(string $event, array $context): void
    {
        $sanitized = $this->maskSensitiveData($context);

        if (!isset($sanitized['request_id'])) {
            $sanitized['request_id'] = request()->attributes->get('request_id') ?? Str::uuid()->toString();
        }

        Log::channel('payment')->error($event, $sanitized);
    }

    /**
     * Log payment warning.
     */
    protected function logPaymentWarning(string $event, array $context): void
    {
        $sanitized = $this->maskSensitiveData($context);

        if (!isset($sanitized['request_id'])) {
            $sanitized['request_id'] = request()->attributes->get('request_id') ?? Str::uuid()->toString();
        }

        Log::channel('payment')->warning($event, $sanitized);
    }

    /**
     * Mask sensitive data before logging.
     */
    private function maskSensitiveData(array $data): array
    {
        $sensitiveKeys = ['signature_key', 'signature', 'token', 'server_key', 'client_key', 'snap_token'];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->maskSensitiveData($value);
            } elseif (is_string($key) && in_array(strtolower($key), $sensitiveKeys)) {
                $data[$key] = '********';
            }
        }
        return $data;
    }
}
