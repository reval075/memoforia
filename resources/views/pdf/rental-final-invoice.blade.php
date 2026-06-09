@extends('pdf.layout')

@section('title', 'Final Invoice (Rental)')
@section('status', 'LUNAS')

@section('content')
<div class="info-grid">
    <table style="margin-bottom: 0;">
        <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Ditagihkan Kepada</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; font-weight: bold;">{{ $rental->customer_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $rental->customer_email }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $rental->customer_phone }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Detail Tagihan</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; width: 120px;">Kode Sewa</td><td style="padding: 3px 0; font-weight: bold;">: {{ $rental->rental_code }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tanggal Lunas</td><td style="padding: 3px 0;">: {{ $rental->payments->where('status', 'verified')->max('updated_at') ? $rental->payments->where('status', 'verified')->max('updated_at')->format('d M Y H:i') : '-' }}</td></tr>
                    <tr><td style="padding: 3px 0;">Status</td><td style="padding: 3px 0; font-weight: bold; color: #16a34a;">: LUNAS</td></tr>
                </table>
            </td>
        </tr>
    </table>
</div>

<div class="section-title">Detail Peralatan</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th>Deskripsi Peralatan</th>
            <th class="text-center" style="width: 10%;">Qty</th>
            <th class="text-right" style="width: 25%;">Harga Satuan</th>
            <th class="text-right" style="width: 25%;">Total Harga</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rental->items as $item)
        <tr>
            <td>
                <strong>{{ $item->equipment->name ?? $item->equipment_name }}</strong>
            </td>
            <td class="text-center">{{ $item->qty }}</td>
            <td class="text-right">Rp {{ number_format($item->price, 0, ',', '.') }}</td>
            <td class="text-right">Rp {{ number_format($item->price * $item->qty, 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr class="total-row">
            <td colspan="3" class="text-right">Total Tagihan</td>
            <td class="text-right">Rp {{ number_format($rental->total_price, 0, ',', '.') }}</td>
        </tr>
    </tfoot>
</table>

<div class="section-title">Riwayat Pembayaran</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th style="width: 20%;">Tanggal</th>
            <th style="width: 20%;">Jenis</th>
            <th style="width: 30%;">Metode Pembayaran</th>
            <th class="text-right" style="width: 30%;">Nominal</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rental->payments->where('status', 'verified')->sortBy('updated_at') as $payment)
        <tr>
            <td>{{ $payment->updated_at->format('d M Y') }}</td>
            <td style="text-transform: uppercase;">{{ str_replace('_', ' ', $payment->payment_type) }}</td>
            <td style="text-transform: uppercase;">{{ $payment->payment_method }}</td>
            <td class="text-right">Rp {{ number_format($payment->amount, 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div style="margin-top: 20px; float: right; width: 50%;">
    <table class="table-bordered">
        <tr>
            <td class="bg-gray font-bold">Total Harga Sewa</td>
            <td class="text-right">Rp {{ number_format($rental->total_price, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="bg-gray font-bold">Total Dibayar</td>
            <td class="text-right" style="color: #16a34a;">Rp {{ number_format($rental->getPaidAmount(), 0, ',', '.') }}</td>
        </tr>
        <tr class="total-row">
            <td class="text-right">Sisa Tagihan</td>
            <td class="text-right">Rp {{ number_format($rental->getRemainingAmount(), 0, ',', '.') }}</td>
        </tr>
    </table>
</div>
<div class="clear"></div>

<div style="margin-top: 10px; background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px;">
    <strong>LUNAS!</strong> Transaksi penyewaan ini telah dilunasi sepenuhnya. Terima kasih atas kepercayaan Anda menggunakan layanan kami.
</div>
@endsection
