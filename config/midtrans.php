<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Midtrans Merchant Configuration
    |--------------------------------------------------------------------------
    |
    | Configure your Midtrans Merchant settings here. 
    | You can find these keys in your Midtrans Dashboard.
    |
    */

    'server_key' => env('MIDTRANS_SERVER_KEY', ''),
    'client_key' => env('MIDTRANS_CLIENT_KEY', ''),
    'merchant_id' => env('MIDTRANS_MERCHANT_ID', ''),
    'is_production' => env('MIDTRANS_IS_PRODUCTION', false),
    'is_sanitized' => env('MIDTRANS_IS_SANITIZED', true),
    'is_3ds' => env('MIDTRANS_IS_3DS', true),

    /*
    |--------------------------------------------------------------------------
    | Snap transaction expiry (hours)
    |--------------------------------------------------------------------------
    */
    'snap_expiry_hours' => env('MIDTRANS_SNAP_EXPIRY_HOURS', 24),
];
