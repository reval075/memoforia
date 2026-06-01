<?php

return [

    /*
    |--------------------------------------------------------------------------
    | DP Expiration Time (Hours)
    |--------------------------------------------------------------------------
    |
    | The number of hours a customer has to pay the Down Payment after
    | their booking is approved (status = waiting_dp). After this time,
    | the booking will be automatically set to 'expired' by the scheduler.
    |
    | Override via .env: BOOKING_DP_EXPIRATION_HOURS=12
    |
    */
    'dp_expiration_hours' => env('BOOKING_DP_EXPIRATION_HOURS', 12),

    /*
    |--------------------------------------------------------------------------
    | Payment Proof Upload (KB)
    |--------------------------------------------------------------------------
    */
    'payment_proof_max_kb' => env('BOOKING_PAYMENT_PROOF_MAX_KB', 5120),

    /*
    |--------------------------------------------------------------------------
    | Minimum DP (Midtrans) — percent of total_price (primary rule)
    |--------------------------------------------------------------------------
    */
    'min_dp_percent' => (int) env('BOOKING_MIN_DP_PERCENT', 40),

    /** Optional absolute floor in IDR (0 = use percent only) */
    'min_dp_absolute_floor' => (int) env('BOOKING_MIN_DP_ABSOLUTE_FLOOR', 0),

];
