export const getStatusStyle = (status) => {
    switch (status) {
        case 'pending_approval':
            return 'bg-amber-50 text-amber-700 border-amber-100';
        case 'waiting_dp':
            return 'bg-blue-50 text-blue-700 border-blue-100';
        case 'confirmed':
            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'completed':
            return 'bg-slate-100 text-slate-800 border-slate-200';
        case 'expired':
            return 'bg-orange-50 text-orange-700 border-orange-100';
        case 'rejected':
        case 'cancelled':
            return 'bg-red-50 text-red-700 border-red-100';
        default:
            return 'bg-gray-50 text-gray-700 border-gray-100';
    }
};

export const getStatusLabel = (status) => {
    const labels = {
        pending_approval: 'Menunggu Persetujuan',
        waiting_dp: 'Menunggu Pembayaran DP',
        confirmed: 'Terkonfirmasi',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
        expired: 'Kedaluwarsa',
        rejected: 'Ditolak',
    };

    return labels[status] || status?.replace(/_/g, ' ') || '-';
};

export const getPaymentStatusLabel = (status) => {
    const labels = {
        unpaid: 'Belum Dibayar',
        partially_paid: 'DP Terbayar',
        paid: 'Lunas',
    };

    return labels[status] || status?.replace(/_/g, ' ') || '-';
};

export const getPaymentVerificationStyle = (status) => {
    switch (status) {
        case 'verified':
            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'rejected':
            return 'bg-red-50 text-red-700 border-red-100';
        case 'pending':
        default:
            return 'bg-amber-50 text-amber-700 border-amber-100';
    }
};

export const formatCurrency = (amount) => {
    const value = Number(amount) || 0;
    return `Rp ${value.toLocaleString('id-ID')}`;
};

export const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

export const getStatusMessage = (record, type = 'booking') => {
    const isRental = type === 'rental';

    switch (record?.status) {
        case 'pending_approval':
            return isRental
                ? 'Pengajuan sewa Anda sedang ditinjau oleh tim admin.'
                : 'Pengajuan booking Anda sedang ditinjau oleh tim admin.';
        case 'waiting_dp':
            return record.dp_expired_at
                ? `Silakan lakukan pembayaran DP atau lunas sebelum ${formatDateTime(record.dp_expired_at)}.`
                : isRental
                    ? 'Silakan lakukan pembayaran DP atau lunas untuk melanjutkan konfirmasi sewa.'
                    : 'Silakan lakukan pembayaran DP untuk melanjutkan konfirmasi jadwal.';
        case 'confirmed':
            return isRental
                ? 'Sewa Anda telah dikonfirmasi. Silakan lunasi sisa tagihan sebelum batas waktu.'
                : 'Booking Anda telah dikonfirmasi. Jadwal event telah terkunci.';
        case 'completed':
            return isRental
                ? 'Penyewaan selesai. Terima kasih telah menggunakan layanan Memoforia.'
                : 'Event telah selesai. Terima kasih telah menggunakan layanan Memoforia.';
        case 'cancelled':
            return isRental ? 'Sewa ini telah dibatalkan.' : 'Booking ini telah dibatalkan.';
        case 'expired':
            return isRental
                ? 'Batas waktu pembayaran DP telah habis. Sewa tidak lagi aktif.'
                : 'Batas waktu pembayaran DP telah habis. Booking tidak lagi aktif.';
        case 'rejected':
            return isRental
                ? 'Pengajuan sewa ditolak oleh admin.'
                : 'Pengajuan booking ditolak oleh admin.';
        default:
            return null;
    }
};

/**
 * Lightweight countdown for DP deadline display (frontend-only).
 * Updates should run on an interval in the UI layer.
 */
export const getDpCountdown = (dpExpiredAt) => {
    if (!dpExpiredAt) {
        return { isExpired: false, text: null, minutesLeft: null };
    }

    const expiry = new Date(dpExpiredAt);
    if (Number.isNaN(expiry.getTime())) {
        return { isExpired: false, text: null, minutesLeft: null };
    }

    const diffMs = expiry.getTime() - Date.now();
    const minutesLeft = Math.ceil(diffMs / (1000 * 60));

    if (minutesLeft <= 0) {
        return { isExpired: true, text: 'DP Expired', minutesLeft: 0 };
    }

    const hours = Math.floor(minutesLeft / 60);
    const mins = minutesLeft % 60;

    if (hours <= 0) {
        return { isExpired: false, text: `Sisa waktu pembayaran DP: ${mins} menit`, minutesLeft };
    }

    return { isExpired: false, text: `Sisa waktu pembayaran DP: ${hours} jam ${mins} menit`, minutesLeft };
};

/** Minimum DP from total (matches backend DpAmountCalculator). */
export const calculateMinDpAmount = (totalPrice, minDpPercent = 40) => {
    const total = Number(totalPrice) || 0;
    const percent = Number(minDpPercent) || 40;
    if (total <= 0) {
        return 0;
    }
    return Math.ceil(total * (percent / 100));
};

/** Parse IDR input (strips thousand separators). */
export const parsePaymentAmountInput = (value) => {
    if (value === '' || value === null || value === undefined) {
        return NaN;
    }
    const cleaned = String(value).trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
    if (cleaned === '') {
        return NaN;
    }
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : NaN;
};

export const resolveMinDpForTransaction = (transactionData) => {
    const fromApi = Number(transactionData?.min_dp_amount);
    if (Number.isFinite(fromApi) && fromApi > 0) {
        return fromApi;
    }
    const percent = Number(transactionData?.min_dp_percent) || 40;
    return calculateMinDpAmount(transactionData?.total_price, percent);
};
