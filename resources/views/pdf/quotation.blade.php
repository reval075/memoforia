@extends('pdf.layout')

@section('title', 'Quotation')
@section('status', 'BOOKING DISETUJUI')

@section('content')
<div class="info-grid">
    <table style="margin-bottom: 0;">
        <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Ditujukan Kepada</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; font-weight: bold;">{{ $booking->customer_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $booking->customer_email }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $booking->customer_phone }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Informasi Event & Approval</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; width: 100px;">Kode Booking</td><td style="padding: 3px 0; font-weight: bold;">: {{ $booking->booking_code }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tgl Approval</td><td style="padding: 3px 0;">: {{ $booking->approved_at ? $booking->approved_at->format('d M Y H:i') : '-' }}</td></tr>
                    <tr><td style="padding: 3px 0;">Event</td><td style="padding: 3px 0;">: {{ $booking->event_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tanggal Event</td><td style="padding: 3px 0;">: {{ $booking->event_datetime ? $booking->event_datetime->format('d M Y H:i') : $booking->event_date }}</td></tr>
                </table>
            </td>
        </tr>
    </table>
</div>

<div class="section-title">Breakdown Harga Layanan</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th>Item Layanan</th>
            <th class="text-center" style="width: 15%;">Qty</th>
            <th class="text-right" style="width: 30%;">Total</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <strong>{{ $booking->servicePackage->name ?? 'N/A' }}</strong><br>
                Variant: {{ $booking->packageVariant->name ?? 'N/A' }}
            </td>
            <td class="text-center">1</td>
            <td class="text-right">Rp {{ number_format($booking->packageVariant->price ?? 0, 0, ',', '.') }}</td>
        </tr>
        
        @if($booking->extra_hours > 0)
        <tr>
            <td>Tambahan Waktu</td>
            <td class="text-center">{{ $booking->extra_hours }} Jam</td>
            <td class="text-right">Rp {{ number_format($booking->extra_hours * ($booking->packageVariant->extra_hour_price ?? 0), 0, ',', '.') }}</td>
        </tr>
        @endif
        
        @if($booking->extra_prints > 0)
        <tr>
            <td>Tambahan Cetak</td>
            <td class="text-center">{{ $booking->extra_prints }} Lbr</td>
            <td class="text-right">Rp {{ number_format(($booking->extra_prints / 50) * 500000, 0, ',', '.') }}</td>
        </tr>
        @endif

        @foreach($booking->addons as $addon)
        <tr>
            <td>Additional: {{ $addon->name }}</td>
            <td class="text-center">{{ $addon->pivot->quantity }}</td>
            <td class="text-right">Rp {{ number_format($addon->pivot->price * $addon->pivot->quantity, 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr class="total-row">
            <td colspan="2" class="text-right">Total Harga</td>
            <td class="text-right">Rp {{ number_format($booking->total_price, 0, ',', '.') }}</td>
        </tr>
    </tfoot>
</table>

<div style="margin-top: 20px; float: right; width: 40%;">
    <table class="table-bordered">
        @php
            $minDp = \App\Support\DpAmountCalculator::minDpForTotal((float) $booking->total_price, 'booking');
        @endphp
        <tr>
            <td class="bg-gray font-bold">Nominal DP Minimum</td>
            <td class="text-right font-bold" style="color: #ea580c;">Rp {{ number_format($minDp, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="bg-gray font-bold">Sisa Tagihan Maksimal</td>
            <td class="text-right font-bold">Rp {{ number_format($booking->total_price - $minDp, 0, ',', '.') }}</td>
        </tr>
    </table>
</div>
<div class="clear"></div>

<div style="margin-top: 10px; background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px;">
    <strong>Booking Disetujui!</strong> Silakan lanjutkan ke pembayaran Down Payment (DP) untuk mengunci jadwal Anda. Booking akan otomatis dibatalkan jika DP tidak dibayarkan sebelum batas waktu yang tertera pada sistem.
</div>
@endsection
