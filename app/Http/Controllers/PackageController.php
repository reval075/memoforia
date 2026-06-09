<?php

namespace App\Http\Controllers;

use App\Models\ServicePackage;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    /**
     * Display a listing of the resource (Public).
     */
    public function index()
    {
        $packages = ServicePackage::with('packageVariants')
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();
        return response()->json(['data' => $packages]);
    }

    /**
     * Display the specified resource (Public).
     */
    public function show($id)
    {
        $package = ServicePackage::with('packageVariants')->findOrFail($id);
        return response()->json(['data' => $package]);
    }

    /**
     * Display a listing of the resource for Admin.
     */
    public function adminIndex()
    {
        $packages = ServicePackage::with('packageVariants')
            ->orderBy('display_order')
            ->latest()
            ->get();
        return response()->json(['data' => $packages]);
    }

    /**
     * Store a newly created resource in storage (Admin).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
            'includes_softfile' => 'nullable|boolean',
            'includes_prints' => 'nullable|boolean',
            'includes_qr_code' => 'nullable|boolean',
            'includes_gif' => 'nullable|boolean',
            'includes_custom_template' => 'nullable|boolean',
            'includes_supporting_crew' => 'nullable|boolean',
            'includes_tiket_antrian' => 'nullable|boolean',
        ]);

        $package = ServicePackage::create($validated);

        return response()->json([
            'message' => 'Paket jasa berhasil dibuat.',
            'data' => $package
        ], 201);
    }

    /**
     * Update the specified resource in storage (Admin).
     */
    public function update(Request $request, $id)
    {
        $package = ServicePackage::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
            'includes_softfile' => 'nullable|boolean',
            'includes_prints' => 'nullable|boolean',
            'includes_qr_code' => 'nullable|boolean',
            'includes_gif' => 'nullable|boolean',
            'includes_custom_template' => 'nullable|boolean',
            'includes_supporting_crew' => 'nullable|boolean',
            'includes_tiket_antrian' => 'nullable|boolean',
        ]);

        $package->update($validated);

        return response()->json([
            'message' => 'Paket jasa berhasil diperbarui.',
            'data' => $package
        ]);
    }

    /**
     * Remove the specified resource from storage (Admin).
     */
    public function destroy($id)
    {
        $package = ServicePackage::findOrFail($id);
        $package->delete();

        return response()->json([
            'message' => 'Paket jasa berhasil dihapus.'
        ]);
    }

    /**
     * Store a new package variant (Admin).
     */
    public function storeVariant(Request $request)
    {
        $validated = $request->validate([
            'service_package_id' => 'required|exists:service_packages,id',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'duration_hours' => 'nullable|integer|min:1',
            'print_limit' => 'nullable|integer|min:1',
            'extra_hour_price' => 'nullable|numeric|min:0',
            'extra_print_price' => 'nullable|numeric|min:0',
            'is_unlimited' => 'nullable|boolean',
        ]);

        $variant = \App\Models\PackageVariant::create($validated);

        return response()->json([
            'message' => 'Varian paket berhasil dibuat.',
            'data' => $variant
        ], 201);
    }

    /**
     * Update a package variant (Admin).
     */
    public function updateVariant(Request $request, $id)
    {
        $variant = \App\Models\PackageVariant::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'duration_hours' => 'nullable|integer|min:1',
            'print_limit' => 'nullable|integer|min:1',
            'extra_hour_price' => 'nullable|numeric|min:0',
            'extra_print_price' => 'nullable|numeric|min:0',
            'is_unlimited' => 'nullable|boolean',
        ]);

        $variant->update($validated);

        return response()->json([
            'message' => 'Varian paket berhasil diperbarui.',
            'data' => $variant
        ]);
    }

    /**
     * Destroy a package variant (Admin).
     */
    public function destroyVariant($id)
    {
        $variant = \App\Models\PackageVariant::findOrFail($id);
        $variant->delete();

        return response()->json([
            'message' => 'Varian paket berhasil dihapus.'
        ]);
    }
}
