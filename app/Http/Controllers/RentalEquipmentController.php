<?php

namespace App\Http\Controllers;

use App\Models\RentalEquipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RentalEquipmentController extends Controller
{
    public function index(Request $request)
    {
        $start = $request->query('start_date');
        $end = $request->query('end_date');

        $query = RentalEquipment::where('status', 'available');

        $equipments = $query->get()->map(function ($eq) use ($start, $end) {
            $reserved = 0;
            if ($start && $end) {
                $startDate    = \Carbon\Carbon::parse($start)->toDateString();
                $endDate      = \Carbon\Carbon::parse($end)->toDateString();

                // Hitung qty yang sudah direservasi pada rentang tanggal yang overlap.
                // Rental dianggap aktif (mengunci stok) bila:
                //   - belum selesai (completed_at IS NULL)
                //   - belum dibatalkan (cancelled_at IS NULL)
                //   - DP-nya belum expired (dp_expired_at IS NULL OR dp_expired_at > NOW())
                //   - status BUKAN rejected
                // Ini mencakup: pending_approval, waiting_dp, confirmed
                $reserved = \DB::table('rental_items')
                    ->join('rental_requests', 'rental_items.rental_request_id', '=', 'rental_requests.id')
                    ->where('rental_items.equipment_id', $eq->id)
                    ->whereNull('rental_requests.completed_at')
                    ->whereNull('rental_requests.cancelled_at')
                    ->where(function ($q) {
                        // Belum expired: dp_expired_at kosong ATAU belum lewat
                        $q->whereNull('rental_requests.dp_expired_at')
                          ->orWhere('rental_requests.dp_expired_at', '>', now());
                    })
                    ->where('rental_requests.status', '!=', 'rejected')
                    // Overlap: existing.start <= requested.end AND existing.end >= requested.start
                    ->where('rental_requests.start_date', '<=', $endDate)
                    ->where('rental_requests.end_date', '>=', $startDate)
                    ->selectRaw('COALESCE(SUM(rental_items.qty), 0) as sum')
                    ->value('sum');
            }

            $available = max(0, $eq->stock - (int) $reserved);

            Log::info('[RentalEquipment] Stock check', [
                'equipment_id'   => $eq->id,
                'equipment_name' => $eq->name,
                'stock'          => $eq->stock,
                'reserved'       => (int) $reserved,
                'available'      => $available,
                'start_date'     => $start,
                'end_date'       => $end,
            ]);

            $eq->available_stock = $available;
            return $eq;
        })->values();

        return response()->json(['data' => $equipments]);
    }

    public function show($id)
    {
        $equipment = RentalEquipment::findOrFail($id);
        return response()->json(['data' => $equipment]);
    }
}
