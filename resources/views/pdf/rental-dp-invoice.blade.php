@extends('pdf.layout')

@section('title', 'DP Invoice (Rental)')
@section('status', 'DP LUNAS')

@section('content')
<div class="info-grid">
    <table style="margin-bottom: 0;">
        <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Terima Dari</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; font-weight: bold;">{{ $rental->customer_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $rental->customer_email }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $rental->customer_phone }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Detail Pembayaran</div>
                <table style="margin-bottom: 0;">
                    @php
                        $dpPayment = $rental->payments->where('payment_type', 'dp')->where('status', 'verified')->first();
                    @endphp
                    <tr><td style="padding: 3px 0; width: 120px;">Kode Sewa</td><td style="padding: 3px 0; font-weight: bold;">: {{ $rental->rental_code }}</td></tr>
                    <tr><td style="padding: 3px 0;">Waktu Pembayaran</td><td style="padding: 3px 0;">: {{ $dpPayment ? $dpPayment->updated_at->format('d M Y H:i') : '-' }}</td></tr>
                    <tr><td style="padding: 3px 0;">Metode</td><td style="padding: 3px 0; text-transform: uppercase;">: {{ $dpPayment ? $dpPayment->payment_method : '-' }}</td></tr>
                </table>
            </td>
        </tr>
    </table>
</div>

<div class="section-title">Rincian Transaksi</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th>Deskripsi</th>
            <th class="text-right" style="width: 30%;">Nominal</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <strong>Pembayaran Down Payment (DP) Sewa</strong><br>
                Periode: {{ $rental->start_date ? $rental->start_date->format('d M Y') : '-' }} s/d {{ $rental->end_date ? $rental->end_date->format('d M Y') : '-' }}<br>
                Kode: {{ $rental->rental_code }}
            </td>
            <td class="text-right" style="vertical-align: middle;">Rp {{ number_format($dpPayment ? $dpPayment->amount : 0, 0, ',', '.') }}</td>
        </tr>
    </tbody>
    <tfoot>
        <tr class="total-row">
            <td class="text-right">Total Dibayar</td>
            <td class="text-right">Rp {{ number_format($dpPayment ? $dpPayment->amount : 0, 0, ',', '.') }}</td>
        </tr>
    </tfoot>
</table>

<div style="margin-top: 20px; float: right; width: 50%;">
    <table class="table-bordered">
        <tr>
            <td class="bg-gray font-bold">Total Harga Keseluruhan</td>
            <td class="text-right">Rp {{ number_format($rental->total_price, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="bg-gray font-bold">DP Dibayar</td>
            <td class="text-right" style="color: #16a34a;">- Rp {{ number_format($dpPayment ? $dpPayment->amount : 0, 0, ',', '.') }}</td>
        </tr>
        <tr class="total-row">
            <td class="text-right">Sisa Tagihan</td>
            <td class="text-right">Rp {{ number_format($rental->getRemainingAmount(), 0, ',', '.') }}</td>
        </tr>
    </table>
</div>
<div class="clear"></div>

<div style="margin-top: 10px; background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px;">
    <strong>Terima Kasih!</strong> Pembayaran DP Anda telah kami terima dan pesanan sewa telah dikonfirmasi. Harap melunasi sisa tagihan selambat-lambatnya sebelum batas waktu pelunasan.
</div>
@endsection
