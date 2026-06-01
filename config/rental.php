<?php

return [

    /*
    |--------------------------------------------------------------------------
    | DP Expiration Time (Hours)
    |--------------------------------------------------------------------------
    |
    | Hours after admin approval (status = waiting_dp) before the rental
    | is automatically expired if DP/full payment is not completed.
    |
    | Override via .env: RENTAL_DP_EXPIRATION_HOURS=24
    |
    */
    'dp_expiration_hours' => env('RENTAL_DP_EXPIRATION_HOURS', 24),

    /*
    |--------------------------------------------------------------------------
    | Minimum DP — percent of total_price (primary rule)
    |--------------------------------------------------------------------------
    */
    'min_dp_percent' => (int) env('RENTAL_MIN_DP_PERCENT', 40),

    'min_dp_absolute_floor' => (int) env('RENTAL_MIN_DP_ABSOLUTE_FLOOR', 0),

    /*
    |--------------------------------------------------------------------------
    | Payment Proof Upload (KB)
    |--------------------------------------------------------------------------
    */
    'payment_proof_max_kb' => env('RENTAL_PAYMENT_PROOF_MAX_KB', 5120),

];
