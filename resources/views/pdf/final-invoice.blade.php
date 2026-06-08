@extends('pdf.layout')

@section('title', 'Final Invoice (Receipt)')
@section('status', 'LUNAS')

@section('content')
<div class="info-grid">
    <table style="margin-bottom: 0;">
        <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Terima Dari</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; font-weight: bold;">{{ $booking->customer_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $booking->customer_email }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $booking->customer_phone }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Informasi Event & Invoice</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; width: 100px;">Kode Booking</td><td style="padding: 3px 0; font-weight: bold;">: {{ $booking->booking_code }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tgl Pelunasan</td><td style="padding: 3px 0;">: {{ $booking->completed_at ? $booking->completed_at->format('d M Y H:i') : now()->format('d M Y H:i') }}</td></tr>
                    <tr><td style="padding: 3px 0;">Event</td><td style="padding: 3px 0;">: {{ $booking->event_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tanggal Event</td><td style="padding: 3px 0;">: {{ $booking->event_datetime ? $booking->event_datetime->format('d M Y H:i') : $booking->event_date }}</td></tr>
                </table>
            </td>
        </tr>
    </table>
</div>

<div class="section-title">Breakdown Layanan & Biaya</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th>Deskripsi Layanan</th>
            <th class="text-right" style="width: 30%;">Total</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <strong>{{ $booking->servicePackage->name ?? 'N/A' }}</strong> - Variant: {{ $booking->packageVariant->name ?? 'N/A' }}
            </td>
            <td class="text-right">Rp {{ number_format($booking->packageVariant->price ?? 0, 0, ',', '.') }}</td>
        </tr>
        
        @if($booking->extra_hours > 0)
        <tr>
            <td>Tambahan Waktu ({{ $booking->extra_hours }} Jam)</td>
            <td class="text-right">Rp {{ number_format($booking->extra_hours * ($booking->packageVariant->extra_hour_price ?? 0), 0, ',', '.') }}</td>
        </tr>
        @endif
        
        @if($booking->extra_prints > 0)
        <tr>
            <td>Tambahan Cetak ({{ $booking->extra_prints }} Lbr)</td>
            <td class="text-right">Rp {{ number_format(($booking->extra_prints / 50) * 500000, 0, ',', '.') }}</td>
        </tr>
        @endif

        @foreach($booking->addons as $addon)
        <tr>
            <td>Additional: {{ $addon->name }} (x{{ $addon->pivot->quantity }})</td>
            <td class="text-right">Rp {{ number_format($addon->pivot->price * $addon->pivot->quantity, 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr class="total-row">
            <td class="text-right">Total Harga Layanan</td>
            <td class="text-right">Rp {{ number_format($booking->total_price, 0, ',', '.') }}</td>
        </tr>
    </tfoot>
</table>

<div class="section-title">Riwayat Pembayaran</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th>Waktu</th>
            <th>Tipe Pembayaran</th>
            <th>Metode</th>
            <th class="text-right">Nominal</th>
        </tr>
    </thead>
    <tbody>
        @foreach($booking->payments->where('status', 'verified')->sortBy('paid_at') as $payment)
        <tr>
            <td>{{ $payment->paid_at ? $payment->paid_at->format('d M Y H:i') : '-' }}</td>
            <td style="text-transform: uppercase;">{{ str_replace('_', ' ', $payment->payment_type) }}</td>
            <td style="text-transform: uppercase;">{{ $payment->payment_method }}</td>
            <td class="text-right text-green-600 font-bold">+ Rp {{ number_format($payment->amount, 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr class="total-row">
            <td colspan="3" class="text-right">Total Telah Dibayar</td>
            <td class="text-right">Rp {{ number_format($booking->getPaidAmount(), 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td colspan="3" class="text-right bg-gray font-bold">Sisa Tagihan</td>
            <td class="text-right font-bold" style="color: #ea580c;">Rp {{ number_format($booking->getRemainingAmount(), 0, ',', '.') }}</td>
        </tr>
    </tfoot>
</table>

<div style="margin-top: 10px; background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px;">
    <strong>LUNAS!</strong> Terima kasih atas pembayaran Anda. Seluruh layanan untuk event Anda telah terbayar penuh. Kami siap memberikan layanan terbaik kami di hari acara Anda.
</div>
@endsection
