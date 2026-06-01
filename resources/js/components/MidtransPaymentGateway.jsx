import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CreditCard, AlertCircle, Zap, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/bookingDisplay';

const PAYMENT_OPTIONS = [
    { label: 'QRIS (Gopay, OVO, Dana, LinkAja)', value: 'qris', method: 'qris' },
    { label: 'Virtual Account BCA', value: 'bca_va', method: 'va' },
    { label: 'Virtual Account BNI', value: 'bni_va', method: 'va' },
    { label: 'Virtual Account BRI', value: 'bri_va', method: 'va' },
    { label: 'Virtual Account Mandiri', value: 'mandiri_va', method: 'va' },
];

// Tab choices saat status waiting_dp
const DP_MODES = [
    { key: 'dp', label: 'Bayar DP', desc: 'Bayar sebagian sebagai uang muka' },
    { key: 'full_payment', label: 'Bayar Lunas', desc: 'Langsung lunasi seluruh tagihan' },
];

export default function MidtransPaymentGateway({ bookingCode, contact, booking, onPaymentSuccess }) {
    const [amount, setAmount] = useState('');
    const [selectedOption, setSelectedOption] = useState('qris');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dpMode, setDpMode] = useState('dp');

    // Setelah Snap ditutup, tunjukkan "sedang diproses" sampai data terbaru diambil
    const [paymentJustSubmitted, setPaymentJustSubmitted] = useState(false);

    const isDpStatus   = booking.status === 'waiting_dp';
    const isSettlement = booking.status === 'confirmed' && booking.remaining_amount > 0;

    const paymentType = isDpStatus ? dpMode : 'settlement';

    const pendingPayment = booking.payments?.find(
        p => p.status === 'pending' && p.payment_source === 'midtrans' && p.payment_type === paymentType
    );
    const hasSnapToken = !!pendingPayment?.snap_token;

    useEffect(() => {
        if (isSettlement && booking.remaining_amount) {
            setAmount(booking.remaining_amount.toString());
        }
    }, [isSettlement, booking.remaining_amount]);

    useEffect(() => {
        if (dpMode === 'dp') setAmount('');
        setError('');
    }, [dpMode]);

    // Reset "sedang diproses" saat data booking berhasil diperbarui
    useEffect(() => {
        setPaymentJustSubmitted(false);
    }, [booking.payment_status, booking.status]);

    const handleCreatePayment = async (e) => {
        e.preventDefault();
        setError('');

        if (paymentType === 'dp') {
            const numAmount = Number(amount);
            if (!numAmount || numAmount < 500000) {
                setError('Minimal pembayaran DP adalah Rp500.000');
                return;
            }
            if (numAmount >= booking.total_price) {
                setError('Untuk pembayaran penuh, silakan pilih tab "Bayar Lunas"');
                return;
            }
        }

        setLoading(true);

        const option = PAYMENT_OPTIONS.find(o => o.value === selectedOption);
        const backendMethod = option ? option.method : 'qris';

        let sendAmount;
        if (paymentType === 'full_payment') sendAmount = booking.total_price;
        else if (paymentType === 'settlement') sendAmount = booking.remaining_amount;
        else sendAmount = amount;

        try {
            const response = await axios.post('/api/payments/create', {
                booking_code:   bookingCode,
                contact:        contact,
                payment_type:   paymentType,
                amount:         sendAmount,
                payment_method: backendMethod,
            });

            if (response.data?.success && response.data?.data?.snap_token) {
                triggerSnap(response.data.data.snap_token);
            } else {
                setError('Gagal membuat pembayaran. Silakan coba lagi.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat memproses pembayaran.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayNow = () => {
        if (pendingPayment?.snap_token) triggerSnap(pendingPayment.snap_token);
    };

    const triggerSnap = (snapToken) => {
        if (!window.snap) {
            setError('Sistem pembayaran belum siap. Silakan refresh halaman.');
            return;
        }

        window.snap.pay(snapToken, {
            onSuccess: async () => {
                setPaymentJustSubmitted(true);
                if (onPaymentSuccess) await onPaymentSuccess();
            },
            onPending: async () => {
                setPaymentJustSubmitted(true);
                if (onPaymentSuccess) await onPaymentSuccess();
            },
            onError: () => {
                setError('Pembayaran gagal. Silakan coba lagi.');
            },
            onClose: async () => {
                // User menutup Snap tanpa tindakan — refresh data saja
                if (onPaymentSuccess) await onPaymentSuccess();
            },
        });
    };

    if (!isDpStatus && !isSettlement) return null;

    // Tampilkan pesan "sedang diproses" setelah pembayaran berhasil/pending dari Snap
    if (paymentJustSubmitted) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 md:p-8 text-center">
                <Clock size={32} className="text-blue-500 mx-auto mb-3 animate-pulse" />
                <h3 className="font-semibold text-blue-800 mb-2">Pembayaran Sedang Diproses</h3>
                <p className="text-sm text-blue-600">
                    Pembayaran Anda sedang diverifikasi. Status booking akan diperbarui otomatis.
                    Klik <strong>Perbarui</strong> di atas untuk memeriksa status terbaru.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-beige p-6 md:p-8 shadow-sm">
            <h3 className="font-serif text-lg text-charcoal mb-5 flex items-center border-b border-beige pb-3">
                <CreditCard size={20} className="mr-2 text-primary shrink-0" />
                {isDpStatus ? 'Pembayaran Uang Muka (DP)' : 'Pelunasan Tagihan'}
            </h3>

            {/* Tab Bayar DP / Bayar Lunas (hanya saat waiting_dp) */}
            {isDpStatus && (
                <div className="flex rounded-xl border border-beige overflow-hidden mb-6">
                    {DP_MODES.map((mode) => (
                        <button
                            key={mode.key}
                            type="button"
                            onClick={() => setDpMode(mode.key)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-all text-left ${
                                dpMode === mode.key
                                    ? 'bg-primary text-white'
                                    : 'bg-off-white text-charcoal hover:bg-beige/60'
                            }`}
                        >
                            <span className="block font-semibold">{mode.label}</span>
                            <span className={`text-xs ${dpMode === mode.key ? 'text-white/80' : 'text-warm-grey'}`}>
                                {mode.desc}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm flex items-start gap-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {hasSnapToken ? (
                <div className="text-center">
                    <p className="text-sm text-slate mb-6">
                        Anda sudah memiliki tagihan pembayaran yang aktif. Silakan lanjutkan pembayaran Anda.
                    </p>
                    <div className="bg-off-white p-4 rounded-xl mb-6 inline-block w-full max-w-sm">
                        <p className="text-xs text-warm-grey uppercase tracking-wider mb-1">Nominal Pembayaran</p>
                        <p className="text-2xl font-bold text-charcoal">{formatCurrency(pendingPayment.amount)}</p>
                    </div>
                    <button
                        onClick={handlePayNow}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 rounded-full hover:bg-primary-dark transition-all mx-auto font-medium"
                    >
                        Bayar Sekarang
                    </button>
                </div>
            ) : (
                <form onSubmit={handleCreatePayment} className="space-y-5">
                    {/* Input nominal DP */}
                    {isDpStatus && dpMode === 'dp' && (
                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                Nominal Pembayaran DP (Rp)
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Min. 500.000"
                                className="w-full px-4 py-3 rounded-xl border border-beige bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                disabled={loading}
                            />
                            <p className="text-xs text-warm-grey mt-2">
                                Minimal DP Rp500.000. Total tagihan: {formatCurrency(booking.total_price)}
                            </p>
                        </div>
                    )}

                    {/* Info bayar lunas */}
                    {isDpStatus && dpMode === 'full_payment' && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={18} className="text-green-600 shrink-0" />
                                <span className="text-sm font-semibold text-green-800">Bayar Lunas Sekarang</span>
                            </div>
                            <p className="text-xs text-green-700 mb-3">
                                Booking Anda akan langsung dikonfirmasi &amp; selesai setelah pembayaran berhasil.
                            </p>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate">Total yang dibayar:</span>
                                <span className="text-lg font-bold text-primary">{formatCurrency(booking.total_price)}</span>
                            </div>
                        </div>
                    )}

                    {/* Settlement info */}
                    {isSettlement && (
                        <div className="mb-4">
                            <div className="flex justify-between items-center py-2 border-b border-beige/50">
                                <span className="text-sm text-slate">Total Biaya</span>
                                <span className="font-medium">{formatCurrency(booking.total_price)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-beige/50">
                                <span className="text-sm text-slate">Sudah Dibayar</span>
                                <span className="font-medium text-green-600">{formatCurrency(booking.paid_amount)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-base font-semibold text-charcoal">Sisa Tagihan</span>
                                <span className="text-lg font-bold text-primary">{formatCurrency(booking.remaining_amount)}</span>
                            </div>
                        </div>
                    )}

                    {/* Pilihan metode pembayaran */}
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Metode Pembayaran</label>
                        <div className="grid grid-cols-1 gap-2">
                            {PAYMENT_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setSelectedOption(opt.value)}
                                    disabled={loading}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-left transition-all ${
                                        selectedOption === opt.value
                                            ? 'border-primary bg-primary/5 text-primary font-medium'
                                            : 'border-beige bg-off-white/50 text-charcoal hover:border-primary/40'
                                    }`}
                                >
                                    <Zap size={16} className={selectedOption === opt.value ? 'text-primary' : 'text-warm-grey'} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (isDpStatus && dpMode === 'dp' && !amount) || !selectedOption}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 rounded-full hover:bg-primary-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed font-medium mt-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <span>
                                {isDpStatus && dpMode === 'dp'          ? 'Buat Pembayaran DP' : null}
                                {isDpStatus && dpMode === 'full_payment' ? 'Lunasi Sekarang'    : null}
                                {isSettlement                            ? 'Lunasi Sekarang'    : null}
                            </span>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
