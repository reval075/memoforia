<?php

namespace App\Http\Controllers;

use App\Models\RentalEquipment;
use Illuminate\Http\Request;

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
                $startDate = \Carbon\Carbon::parse($start)->toDateString();
                $endDatePlus2 = \Carbon\Carbon::parse($end)->addDays(2)->toDateString();

                $reserved = \DB::table('rental_items')
                    ->join('rental_requests', 'rental_items.rental_request_id', '=', 'rental_requests.id')
                    ->where('rental_items.equipment_id', $eq->id)
                    ->whereIn('rental_requests.status', ['waiting_dp', 'confirmed'])
                    ->whereRaw('rental_requests.start_date <= ?', [$endDatePlus2])
                    ->whereRaw('DATE_ADD(rental_requests.end_date, INTERVAL 2 DAY) >= ?', [$startDate])
                    ->selectRaw('COALESCE(SUM(rental_items.qty),0) as sum')
                    ->value('sum');
            }

            $eq->available_stock = max(0, $eq->stock - (int) $reserved);
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
