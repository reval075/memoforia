import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CreditCard, AlertCircle, Zap, CheckCircle, Clock } from 'lucide-react';
import {
    formatCurrency,
    resolveMinDpForTransaction,
    parsePaymentAmountInput,
} from '../utils/bookingDisplay';

const PAYMENT_OPTIONS = [
    { label: 'QRIS (Gopay, OVO, Dana, LinkAja)', value: 'qris', method: 'qris' },
    { label: 'Virtual Account BCA', value: 'bca_va', method: 'va' },
    { label: 'Virtual Account BNI', value: 'bni_va', method: 'va' },
    { label: 'Virtual Account BRI', value: 'bri_va', method: 'va' },
    { label: 'Virtual Account Mandiri', value: 'mandiri_va', method: 'va' },
];

const DP_MODES = [
    { key: 'dp', label: 'Bayar DP', desc: 'Bayar sebagian sebagai uang muka' },
    { key: 'full_payment', label: 'Bayar Lunas', desc: 'Langsung lunasi seluruh tagihan' },
];

export default function MidtransPaymentGateway({
    transactionCode,
    contact,
    transactionData,
    transactionType = 'booking', // 'booking' | 'rental'
    onPaymentSuccess,
}) {
    // ── RETURN A: Guard — prop wajib tidak ada ────────────────────────────
    if (!transactionData || !transactionCode || !contact) {
        console.log('[MidtransPaymentGateway] RETURN A — props tidak lengkap', {
            hasTransactionData: !!transactionData,
            hasTransactionCode: !!transactionCode,
            hasContact: !!contact,
        });
        return null;
    }

    return (
        <MidtransPaymentGatewayInner
            transactionCode={transactionCode}
            contact={contact}
            transactionData={transactionData}
            transactionType={transactionType}
            onPaymentSuccess={onPaymentSuccess}
        />
    );
}

/**
 * Inner component — hanya dirender setelah props dijamin valid.
 * Dipisah agar hooks tidak dipanggil sebelum guard di atas.
 */
function MidtransPaymentGatewayInner({
    transactionCode,
    contact,
    transactionData,
    transactionType,
    onPaymentSuccess,
}) {
    console.log('[MidtransPaymentGateway] MOUNTED — transactionType:', transactionType);

    const [amount, setAmount] = useState('');
    const [selectedOption, setSelectedOption] = useState('qris');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dpMode, setDpMode] = useState('dp');
    const [paymentJustSubmitted, setPaymentJustSubmitted] = useState(false);

    let isDpStatus   = false;
    let isSettlement = false;
    let minDpAmount  = 0;
    let minDpPercent = 40;
    let totalPrice   = 0;

    try {
        isDpStatus   = transactionData.status === 'waiting_dp';
        isSettlement = transactionData.status === 'confirmed' && Number(transactionData.remaining_amount) > 0;
        minDpAmount  = resolveMinDpForTransaction(transactionData);
        minDpPercent = Number(transactionData.min_dp_percent) || 40;
        totalPrice   = Number(transactionData.total_price) || 0;
    } catch (err) {
        console.error('[MidtransPaymentGateway] Error saat kalkulasi state awal:', err);
    }

    const paymentType = isDpStatus ? dpMode : 'settlement';

    const payments = Array.isArray(transactionData.payments) ? transactionData.payments : [];
    const pendingPayment = payments.find(
        p => p.status === 'pending' && p.payment_source === 'midtrans' && p.payment_type === paymentType
    );
    const hasSnapToken = !!pendingPayment?.snap_token;

    console.log('[MidtransPaymentGateway] State Debug:', {
        transactionType,
        transactionCode,
        status:         transactionData.status,
        isDpStatus,
        isSettlement,
        paymentType,
        dpMode,
        paymentsCount:  payments.length,
        pendingPayment: pendingPayment ?? null,
        hasSnapToken,
        minDpAmount,
        totalPrice,
        windowSnapAvailable: typeof window !== 'undefined' && !!window.snap,
    });

    useEffect(() => {
        if (isSettlement && transactionData.remaining_amount) {
            setAmount(transactionData.remaining_amount.toString());
        }
    }, [isSettlement, transactionData.remaining_amount]);

    useEffect(() => {
        if (dpMode === 'dp') setAmount('');
        setError('');
    }, [dpMode]);

    useEffect(() => {
        setPaymentJustSubmitted(false);
    }, [transactionData.payment_status, transactionData.status]);

    // ── RETURN B: Status tidak memerlukan payment form ────────────────────
    if (!isDpStatus && !isSettlement) {
        console.log('[MidtransPaymentGateway] RETURN B — status tidak memerlukan pembayaran', {
            status: transactionData.status,
            isDpStatus,
            isSettlement,
        });
        return null;
    }

    const handleCreatePayment = async (e) => {
        e.preventDefault();
        setError('');

        if (paymentType === 'dp') {
            const numAmount = parsePaymentAmountInput(amount);
            if (!Number.isFinite(numAmount) || numAmount < minDpAmount) {
                setError(
                    `Minimal pembayaran DP adalah ${formatCurrency(minDpAmount)} (${minDpPercent}% dari total tagihan)`
                );
                return;
            }
            if (numAmount >= totalPrice) {
                setError('Untuk pembayaran penuh, silakan pilih tab "Bayar Lunas"');
                return;
            }
        }

        setLoading(true);

        let sendAmount;
        if (paymentType === 'full_payment') sendAmount = transactionData.total_price;
        else if (paymentType === 'settlement') sendAmount = transactionData.remaining_amount;
        else sendAmount = parsePaymentAmountInput(amount);

        const payload = {
            contact:        contact,
            payment_type:   paymentType,
            amount:         sendAmount,
            payment_method: selectedOption,
        };

        if (transactionType === 'booking') {
            payload.booking_code = transactionCode;
        } else {
            payload.rental_code = transactionCode;
        }

        console.log('[MidtransPaymentGateway] Mengirim payload pembayaran:', payload);

        try {
            const response = await axios.post('/api/payments/create', payload);

            console.log('[MidtransPaymentGateway] Response dari /api/payments/create:', response.data);

            if (response.data?.success && response.data?.data?.snap_token) {
                triggerSnap(response.data.data.snap_token, response.data.data.payment_id);
            } else {
                setError(response.data?.message || 'Gagal membuat pembayaran. Silakan coba lagi.');
            }
        } catch (err) {
            console.error('[MidtransPaymentGateway] Error saat createPayment:', err);
            setError(err.response?.data?.message || 'Terjadi kesalahan saat memproses pembayaran.');
        } finally {
            setLoading(false);
        }
    };

    const handlePayNow = () => {
        if (pendingPayment?.snap_token) {
            triggerSnap(pendingPayment.snap_token, pendingPayment.id);
        }
    };

    const syncPaymentWithGateway = async (paymentId) => {
        if (!paymentId) return;
        try {
            await axios.post(`/api/payments/${paymentId}/sync`);
        } catch (err) {
            console.warn('[MidtransPaymentGateway] Payment sync failed:', err);
        }
    };

    const afterSnapClosed = async (paymentId) => {
        await syncPaymentWithGateway(paymentId);
        if (onPaymentSuccess) {
            await onPaymentSuccess();
        }
    };

    const triggerSnap = (snapToken, paymentId = null) => {
        if (!window.snap) {
            console.error('[MidtransPaymentGateway] window.snap tidak tersedia!');
            setError('Sistem pembayaran belum siap. Silakan refresh halaman.');
            return;
        }

        console.log('[MidtransPaymentGateway] Memicu Snap.pay dengan token:', snapToken?.slice(0, 20) + '...');

        window.snap.pay(snapToken, {
            onSuccess: async () => {
                setPaymentJustSubmitted(true);
                await afterSnapClosed(paymentId);
            },
            onPending: async () => {
                setPaymentJustSubmitted(true);
                await afterSnapClosed(paymentId);
            },
            onError: () => {
                setError('Pembayaran gagal. Silakan coba lagi.');
            },
            onClose: async () => {
                await afterSnapClosed(paymentId);
            },
        });
    };

    // ── RETURN C: Sedang diproses (setelah snap interaksi) ────────────────
    if (paymentJustSubmitted) {
        console.log('[MidtransPaymentGateway] RETURN C — paymentJustSubmitted');
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 md:p-8 text-center">
                <Clock size={32} className="text-blue-500 mx-auto mb-3 animate-pulse" />
                <h3 className="font-semibold text-blue-800 mb-2">Pembayaran Sedang Diproses</h3>
                <p className="text-sm text-blue-600">
                    Pembayaran Anda sedang diverifikasi. Status pesanan akan diperbarui otomatis.
                    Klik <strong>Perbarui</strong> di atas untuk memeriksa status terbaru.
                </p>
            </div>
        );
    }

    // ── RETURN D: Form pembayaran utama ───────────────────────────────────
    console.log('[MidtransPaymentGateway] RETURN D — menampilkan form pembayaran', {
        hasSnapToken,
        isDpStatus,
        isSettlement,
    });

    return (
        <div className="bg-white rounded-2xl border border-beige p-6 md:p-8 shadow-sm">
            <h3 className="font-serif text-lg text-charcoal mb-5 flex items-center border-b border-beige pb-3">
                <CreditCard size={20} className="mr-2 text-primary shrink-0" />
                {isDpStatus ? 'Pembayaran Uang Muka (DP)' : 'Pelunasan Tagihan'}
            </h3>

            {/* Tab DP / Lunas — hanya tampil saat waiting_dp */}
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

            {/* Error message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm flex items-start gap-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Jika sudah ada snap_token aktif — tampilkan tombol lanjutkan */}
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
                /* Form buat pembayaran baru — ditampilkan saat payments=[] maupun ada payment tapi bukan pending midtrans */
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
                                placeholder={`Min. ${minDpAmount.toLocaleString('id-ID')}`}
                                className="w-full px-4 py-3 rounded-xl border border-beige bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                disabled={loading}
                            />
                            <p className="text-xs text-warm-grey mt-2">
                                Minimal DP {formatCurrency(minDpAmount)} ({minDpPercent}% dari total). Total tagihan: {formatCurrency(transactionData.total_price)}
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
                                {transactionType === 'booking' ? 'Booking' : 'Sewa'} Anda akan langsung dikonfirmasi &amp; selesai setelah pembayaran berhasil.
                            </p>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate">Total yang dibayar:</span>
                                <span className="text-lg font-bold text-primary">{formatCurrency(transactionData.total_price)}</span>
                            </div>
                        </div>
                    )}

                    {/* Ringkasan sisa tagihan — hanya saat settlement */}
                    {isSettlement && (
                        <div className="mb-4">
                            <div className="flex justify-between items-center py-2 border-b border-beige/50">
                                <span className="text-sm text-slate">Total Biaya</span>
                                <span className="font-medium">{formatCurrency(transactionData.total_price)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-beige/50">
                                <span className="text-sm text-slate">Sudah Dibayar</span>
                                <span className="font-medium text-green-600">{formatCurrency(transactionData.paid_amount)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-base font-semibold text-charcoal">Sisa Tagihan</span>
                                <span className="text-lg font-bold text-primary">{formatCurrency(transactionData.remaining_amount)}</span>
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

                    {/* Tombol submit */}
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
