<?php

use Inertia\Inertia;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\ResetPasswordController;

Route::get('/', function () {
    return Inertia::render('Home');
});

Route::get('/booking', function () {
    return Inertia::render('Booking', [
        'initialDate' => request()->query('date'),
    ]);
});

Route::get('/booking-session', function () {
    return Inertia::render('BookingSession');
});

Route::get('/track-booking', function () {
    return Inertia::render('TrackBooking');
});

Route::get('/track-booking/detail', function () {
    return Inertia::render('TrackBookingDetail');
});

Route::get('/rentals', function () {
    return Inertia::render('Rentals');
});

Route::get('/pricelist', function () {
    return Inertia::render('Pricelist', [
        'packages' => \App\Models\ServicePackage::with('packageVariants')
            ->where('is_active', true)
            ->orderBy('category')
            ->get(),
        'boothPackages' => \App\Models\Package::orderBy('price')->get(),
        'addons' => \App\Models\Addon::where('is_active', true)->orderBy('price')->get(),
    ]);
});

Route::redirect('/branches', '/locations', 301);

Route::get('/locations', function () {
    return Inertia::render('Locations', [
        'locations' => \App\Models\Branch::with('booths')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(),
    ]);
})->name('locations.index');

// Authentication Routes
Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [LoginController::class, 'login'])->middleware('throttle:5,1');
    
    Route::get('/forgot-password', [ForgotPasswordController::class, 'showLinkRequestForm'])->name('password.request');
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLinkEmail'])->name('password.email')->middleware('throttle:5,1');
    
    Route::get('/reset-password/{token}', [ResetPasswordController::class, 'showResetForm'])->name('password.reset');
    Route::post('/reset-password', [ResetPasswordController::class, 'reset'])->name('password.update');
});

Route::middleware(['auth', 'admin'])->group(function () {
    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
    Route::get('/admin/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // Admin Booking Management
    Route::get('/admin/api/bookings', [\App\Http\Controllers\BookingController::class, 'adminIndex']);
    Route::post('/admin/api/bookings/{id}/approve', [\App\Http\Controllers\BookingController::class, 'approve']);
    Route::post('/admin/api/bookings/{id}/reject', [\App\Http\Controllers\BookingController::class, 'reject']);
    Route::post('/admin/api/bookings/{id}/status', [\App\Http\Controllers\BookingController::class, 'updateStatus']);
    Route::post('/admin/api/bookings/{id}/complete', [\App\Http\Controllers\BookingController::class, 'complete']);
    Route::post('/admin/api/bookings/{id}/cancel', [\App\Http\Controllers\BookingController::class, 'cancel']);

    // Admin Payment Verification
    Route::post('/admin/api/payments/{id}/verify', [\App\Http\Controllers\BookingController::class, 'verifyPayment']);

    // Admin Service Packages CRUD
    Route::get('/admin/api/service-packages', [\App\Http\Controllers\PackageController::class, 'adminIndex']);
    Route::post('/admin/api/service-packages', [\App\Http\Controllers\PackageController::class, 'store']);
    Route::put('/admin/api/service-packages/{id}', [\App\Http\Controllers\PackageController::class, 'update']);
    Route::delete('/admin/api/service-packages/{id}', [\App\Http\Controllers\PackageController::class, 'destroy']);

    // Admin Package Variants CRUD
    Route::post('/admin/api/package-variants', [\App\Http\Controllers\PackageController::class, 'storeVariant']);
    Route::put('/admin/api/package-variants/{id}', [\App\Http\Controllers\PackageController::class, 'updateVariant']);
    Route::delete('/admin/api/package-variants/{id}', [\App\Http\Controllers\PackageController::class, 'destroyVariant']);

    // Admin Addons CRUD
    Route::get('/admin/api/addons', function () {
        return response()->json(['data' => \App\Models\Addon::latest()->get()]);
    });
    Route::post('/admin/api/addons', function (Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);
        $addon = \App\Models\Addon::create($validated);
        return response()->json(['message' => 'Addon berhasil ditambahkan.', 'data' => $addon], 201);
    });
    Route::put('/admin/api/addons/{id}', function (Request $request, $id) {
        $addon = \App\Models\Addon::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);
        $addon->update($validated);
        return response()->json(['message' => 'Addon berhasil diperbarui.', 'data' => $addon]);
    });
    Route::delete('/admin/api/addons/{id}', function ($id) {
        $addon = \App\Models\Addon::findOrFail($id);
        $addon->delete();
        return response()->json(['message' => 'Addon berhasil dihapus.']);
    });

    // Admin Photo Templates CRUD
    Route::get('/admin/api/photo-templates', function () {
        return response()->json(['data' => \App\Models\PhotoTemplate::latest()->get()]);
    });
    Route::post('/admin/api/photo-templates', function (Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'size' => 'required|string|max:50',
            'frame_type' => 'nullable|string|max:255',
            'layout_type' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);
        $template = \App\Models\PhotoTemplate::create($validated);
        return response()->json(['message' => 'Template berhasil ditambahkan.', 'data' => $template], 201);
    });
    Route::put('/admin/api/photo-templates/{id}', function (Request $request, $id) {
        $template = \App\Models\PhotoTemplate::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'size' => 'required|string|max:50',
            'frame_type' => 'nullable|string|max:255',
            'layout_type' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);
        $template->update($validated);
        return response()->json(['message' => 'Template berhasil diperbarui.', 'data' => $template]);
    });
    Route::delete('/admin/api/photo-templates/{id}', function ($id) {
        $template = \App\Models\PhotoTemplate::findOrFail($id);
        $template->delete();
        return response()->json(['message' => 'Template berhasil dihapus.']);
    });

    // Admin Calendar / Blocked Dates
    Route::get('/admin/api/unavailable-dates', [\App\Http\Controllers\AvailabilityController::class, 'adminUnavailableIndex']);
    Route::post('/admin/api/unavailable-dates', [\App\Http\Controllers\AvailabilityController::class, 'storeUnavailableDate']);
    Route::delete('/admin/api/unavailable-dates/{date}', [\App\Http\Controllers\AvailabilityController::class, 'deleteUnavailableDate']);
});
