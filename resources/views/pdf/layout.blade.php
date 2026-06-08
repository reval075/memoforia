<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>@yield('title')</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.5;
            font-size: 12px;
            margin: 0;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            float: left;
        }
        .doc-info {
            float: right;
            text-align: right;
        }
        .doc-title {
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .clear {
            clear: both;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #1e40af;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
        }
        .table-bordered th, .table-bordered td {
            border: 1px solid #e5e7eb;
        }
        .table-bordered th {
            background-color: #f3f4f6;
            font-weight: bold;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .bg-gray {
            background-color: #f9fafb;
        }
        .font-bold {
            font-weight: bold;
        }
        .total-row td {
            font-size: 14px;
            font-weight: bold;
            background-color: #eff6ff;
            color: #1e40af;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            background-color: #dbeafe;
            color: #1e40af;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 20px;
        }
        .info-col {
            width: 48%;
            display: inline-block;
            vertical-align: top;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">MemoForia</div>
        <div class="doc-info">
            <div class="doc-title">@yield('title')</div>
            <div>No: {{ $documentNumber }}</div>
            <div>Tanggal: {{ $date }}</div>
            <div style="margin-top: 10px;">
                <span class="status-badge">@yield('status')</span>
            </div>
        </div>
        <div class="clear"></div>
    </div>

    @yield('content')

    <div class="footer">
        <p>Dokumen ini dibuat otomatis oleh sistem MemoForia dan sah tanpa tanda tangan.</p>
        <p>&copy; {{ date('Y') }} MemoForia. All rights reserved.</p>
    </div>
</body>
</html>
