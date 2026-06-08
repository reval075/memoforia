<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\AvailabilityController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\RentalEquipmentController;
use App\Http\Controllers\RentalRequestController;
use App\Http\Controllers\PaymentController;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Public Routes for Frontend
Route::get('/branches', [BranchController::class, 'index']);
Route::get('/branches/{id}', [BranchController::class, 'show']);

Route::get('/packages', [PackageController::class, 'index']);
Route::get('/packages/{id}', [PackageController::class, 'show']);

Route::get('/availabilities', [AvailabilityController::class, 'index']); // Get slots

Route::post('/bookings', [BookingController::class, 'store']); // Guest booking
Route::post('/bookings/track', [BookingController::class, 'track'])
    ->middleware('throttle:10,1'); // Guest booking lookup
Route::post('/bookings/payment-proof', [BookingController::class, 'uploadProof']); // Guest uploads payment proof (disabled, kept for backward compat)
Route::get('/bookings/{bookingCode}/payment-tracking', [PaymentController::class, 'getBookingPaymentTracking']);

// Documents
Route::get('/bookings/{bookingCode}/documents', [\App\Http\Controllers\BookingDocumentController::class, 'index']);
Route::get('/bookings/{bookingCode}/documents/download-latest/{type}', [\App\Http\Controllers\BookingDocumentController::class, 'downloadLatest']);
Route::get('/documents/{id}/download', [\App\Http\Controllers\BookingDocumentController::class, 'download']);
Route::post('/bookings/{bookingCode}/documents/regenerate', [\App\Http\Controllers\BookingDocumentController::class, 'regenerate']);

Route::get('/addons', function () {
    return response()->json(['data' => \App\Models\Addon::where('is_active', true)->orderBy('display_order')->get()]);
});

Route::get('/photo-templates', function () {
    return response()->json(['data' => \App\Models\PhotoTemplate::where('is_active', true)->orderBy('display_order')->get()]);
});

Route::get('/rental-equipments', [RentalEquipmentController::class, 'index']);
Route::get('/rental-equipments/{id}', [RentalEquipmentController::class, 'show']);

Route::post('/rental-requests', [RentalRequestController::class, 'store']);           // Guest submit rental
Route::post('/rental-requests/track', [RentalRequestController::class, 'track'])     // Guest lookup rental
    ->middleware('throttle:10,1');
Route::post('/rental-requests/payment-proof', [RentalRequestController::class, 'uploadProof'])
    ->middleware('throttle:10,1');
Route::get('/rentals/{rentalCode}/payment-tracking', [PaymentController::class, 'getRentalPaymentTracking']);

// Payment Routes (Midtrans)
Route::post('/payments/create', [PaymentController::class, 'create']);
Route::get('/payments/{paymentId}', [PaymentController::class, 'getStatus']);
Route::post('/payments/{paymentId}/sync', [PaymentController::class, 'sync']);
Route::post('/payments/webhook/midtrans', [PaymentController::class, 'webhook'])->withoutMiddleware('api');

