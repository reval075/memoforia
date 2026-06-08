@extends('pdf.layout')

@section('title', 'Booking Confirmation')
@section('status', 'MENUNGGU APPROVAL')

@section('content')
<div class="info-grid">
    <table style="margin-bottom: 0;">
        <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Informasi Customer</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; width: 100px;">Nama</td><td style="padding: 3px 0;">: {{ $booking->customer_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">Email</td><td style="padding: 3px 0;">: {{ $booking->customer_email }}</td></tr>
                    <tr><td style="padding: 3px 0;">WhatsApp</td><td style="padding: 3px 0;">: {{ $booking->customer_phone }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Informasi Event</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; width: 100px;">Kode Booking</td><td style="padding: 3px 0; font-weight: bold;">: {{ $booking->booking_code }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tanggal Event</td><td style="padding: 3px 0;">: {{ $booking->event_datetime ? $booking->event_datetime->format('d M Y H:i') : $booking->event_date }}</td></tr>
                    <tr><td style="padding: 3px 0;">Lokasi</td><td style="padding: 3px 0;">: {{ $booking->event_location }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tgl Booking</td><td style="padding: 3px 0;">: {{ $booking->created_at->format('d M Y H:i') }}</td></tr>
                </table>
            </td>
        </tr>
    </table>
</div>

<div class="section-title">Detail Pesanan</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th>Deskripsi Layanan</th>
            <th class="text-right" style="width: 30%;">Harga</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <strong>Package:</strong> {{ $booking->servicePackage->name ?? 'N/A' }}<br>
                <strong>Variant:</strong> {{ $booking->packageVariant->name ?? 'N/A' }}
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
            <td class="text-right">Total Estimasi Harga</td>
            <td class="text-right">Rp {{ number_format($booking->total_price, 0, ',', '.') }}</td>
        </tr>
    </tfoot>
</table>

<div style="margin-top: 30px; background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px;">
    <strong>Catatan:</strong> Dokumen ini merupakan bukti bahwa pengajuan booking Anda telah kami terima dan saat ini sedang menunggu persetujuan (approval) dari tim kami. Kami akan segera menghubungi Anda untuk proses selanjutnya.
</div>
@endsection
