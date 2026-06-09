@extends('pdf.layout')

@section('title', 'Rental Quotation')
@section('status', 'QUOTATION')

@section('content')
<div class="info-grid">
    <table style="margin-bottom: 0;">
        <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Ditujukan Kepada</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; font-weight: bold;">{{ $rental->customer_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $rental->customer_email }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $rental->customer_phone }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Informasi Sewa</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; width: 100px;">Kode Sewa</td><td style="padding: 3px 0; font-weight: bold;">: {{ $rental->rental_code }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tgl Mulai</td><td style="padding: 3px 0;">: {{ $rental->start_date ? $rental->start_date->format('d M Y') : '-' }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tgl Selesai</td><td style="padding: 3px 0;">: {{ $rental->end_date ? $rental->end_date->format('d M Y') : '-' }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tgl Penawaran</td><td style="padding: 3px 0;">: {{ $rental->created_at->format('d M Y') }}</td></tr>
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
            <td colspan="3" class="text-right">Total Keseluruhan</td>
            <td class="text-right">Rp {{ number_format($rental->total_price, 0, ',', '.') }}</td>
        </tr>
    </tfoot>
</table>

<div style="margin-top: 20px; float: right; width: 50%;">
    <table class="table-bordered">
        <tr>
            <td class="bg-gray font-bold">Down Payment (DP) 50%</td>
            <td class="text-right">Rp {{ number_format($rental->total_price * 0.5, 0, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="bg-gray font-bold">Sisa Pelunasan</td>
            <td class="text-right">Rp {{ number_format($rental->total_price * 0.5, 0, ',', '.') }}</td>
        </tr>
    </table>
</div>
<div class="clear"></div>

<div style="margin-top: 10px; background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px;">
    <strong>Informasi:</strong> Dokumen ini merupakan penawaran harga. Harga dapat berubah sebelum Anda melakukan pembayaran Down Payment (DP).
</div>
@endsection
