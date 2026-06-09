@extends('pdf.layout')

@section('title', 'Service Receipt (Rental)')
@section('status', 'SELESAI')

@section('content')
<div class="info-grid">
    <table style="margin-bottom: 0;">
        <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Penyewa</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; font-weight: bold;">{{ $rental->customer_name }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $rental->customer_email }}</td></tr>
                    <tr><td style="padding: 3px 0;">{{ $rental->customer_phone }}</td></tr>
                </table>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
                <div class="section-title" style="margin-top: 0;">Detail Sewa</div>
                <table style="margin-bottom: 0;">
                    <tr><td style="padding: 3px 0; width: 120px;">Kode Sewa</td><td style="padding: 3px 0; font-weight: bold;">: {{ $rental->rental_code }}</td></tr>
                    <tr><td style="padding: 3px 0;">Tgl Selesai</td><td style="padding: 3px 0;">: {{ $rental->completed_at ? $rental->completed_at->format('d M Y H:i') : ($rental->end_date ? $rental->end_date->format('d M Y') : '-') }}</td></tr>
                    <tr><td style="padding: 3px 0;">Status</td><td style="padding: 3px 0; font-weight: bold; color: #16a34a;">: COMPLETED</td></tr>
                </table>
            </td>
        </tr>
    </table>
</div>

<div style="text-align: center; margin: 40px 0; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
    <h3 style="margin: 0 0 10px 0; color: #334155;">BUKTI PENYELESAIAN SEWA PERALATAN</h3>
    <p style="margin: 0; color: #64748b; font-size: 13px;">Dokumen ini menyatakan bahwa layanan sewa peralatan telah selesai dan seluruh peralatan telah dikembalikan dalam kondisi baik.</p>
</div>

<div class="section-title">Ringkasan Layanan</div>
<table class="table-bordered">
    <thead>
        <tr>
            <th>Deskripsi Peralatan</th>
            <th class="text-center" style="width: 15%;">Qty</th>
            <th class="text-right" style="width: 30%;">Total Harga</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rental->items as $item)
        <tr>
            <td>
                <strong>{{ $item->equipment->name ?? $item->equipment_name }}</strong>
            </td>
            <td class="text-center">{{ $item->qty }}</td>
            <td class="text-right">Rp {{ number_format($item->price * $item->qty, 0, ',', '.') }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr class="total-row">
            <td colspan="2" class="text-right">Total Keseluruhan</td>
            <td class="text-right">Rp {{ number_format($rental->total_price, 0, ',', '.') }}</td>
        </tr>
    </tfoot>
</table>

<table style="width: 100%; margin-top: 50px;">
    <tr>
        <td style="width: 50%; text-align: center;">
            <p style="margin-bottom: 60px;">Penyewa,</p>
            <p style="font-weight: bold; text-decoration: underline;">{{ $rental->customer_name }}</p>
        </td>
        <td style="width: 50%; text-align: center;">
            <p style="margin-bottom: 60px;">Memoforia,</p>
            <p style="font-weight: bold; text-decoration: underline;">Admin</p>
        </td>
    </tr>
</table>

<div style="margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
    Terima kasih telah menggunakan jasa sewa Memoforia. Kami menantikan kerja sama dengan Anda di acara selanjutnya!
</div>
@endsection
