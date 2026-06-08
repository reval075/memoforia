@extends('pdf.layout')

@section('title', 'Service Completion Receipt')
@section('status', 'EVENT SELESAI')

@section('content')
<div class="info-grid">
    <table style="margin-bottom: 0;">
        <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Customer</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; font-weight: bold;">{{ $booking->customer_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $booking->customer_email }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $booking->customer_phone }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Informasi Event</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; width: 100px;">Kode Booking</td><td style="padding: 3px 0; font-weight: bold;">: {{ $booking->booking_code }}</td></tr>
                    <tr><td style="padding: 3px 0;">Event Selesai</td><td style="padding: 3px 0;">: {{ $date }}</td></tr>
                    <tr><td style="padding: 3px 0;">Nama Event</td><td style="padding: 3px 0;">: {{ $booking->event_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">Lokasi</td><td style="padding: 3px 0;">: {{ $booking->event_location }}</td></tr>
                </table>
            </td>
        </tr>
    </table>
</div>

<div class="section-title">Layanan yang Diberikan</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th>Deskripsi Layanan</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <strong>Package:</strong> {{ $booking->servicePackage->name ?? 'N/A' }}<br>
                <strong>Variant:</strong> {{ $booking->packageVariant->name ?? 'N/A' }}
            </td>
        </tr>
        
        @if($booking->extra_hours > 0)
        <tr>
            <td>Tambahan Waktu ({{ $booking->extra_hours }} Jam)</td>
        </tr>
        @endif
        
        @if($booking->extra_prints > 0)
        <tr>
            <td>Tambahan Cetak ({{ $booking->extra_prints }} Lbr)</td>
        </tr>
        @endif

        @foreach($booking->addons as $addon)
        <tr>
            <td>Additional: {{ $addon->name }} (x{{ $addon->pivot->quantity }})</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="section-title">Ringkasan Pembayaran</div>
<table class="table-bordered">
    <tr>
        <td class="bg-gray font-bold" style="width: 70%;">Total Pembayaran yang Diterima</td>
        <td class="text-right font-bold">Rp {{ number_format($booking->getPaidAmount(), 0, ',', '.') }}</td>
    </tr>
</table>

<div style="margin-top: 30px; text-align: center; padding: 20px; border: 1px dashed #9ca3af; border-radius: 8px;">
    <h3 style="color: #1e40af; margin-top: 0;">Terima Kasih Telah Memilih MemoForia!</h3>
    <p style="margin-bottom: 0;">Layanan untuk event Anda telah selesai dilaksanakan. Kami harap Anda puas dengan hasil kerja kami. Sampai jumpa di event Anda selanjutnya!</p>
</div>
@endsection
