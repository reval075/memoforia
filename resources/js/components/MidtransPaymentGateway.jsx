import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/bookingDisplay';

export default function MidtransPaymentGateway({ bookingCode, contact, booking, onPaymentSuccess }) {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('qris');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Determine the active payment intent based on booking state
    const isDp = booking.status === 'waiting_dp';
    const isSettlement = booking.status === 'confirmed' && booking.remaining_amount > 0;
    const paymentType = isDp ? 'dp' : 'settlement';

    // Check for existing pending midtrans payment for the current intent
    const pendingPayment = booking.payments?.find(
        p => p.status === 'pending' && p.payment_source === 'midtrans' && p.payment_type === paymentType
    );
    const hasSnapToken = !!pendingPayment?.snap_token;

    useEffect(() => {
        // Pre-fill amount for settlement
        if (isSettlement && booking.remaining_amount) {
            setAmount(booking.remaining_amount.toString());
        }
    }, [isSettlement, booking.remaining_amount]);

    const handleCreatePayment = async (e) => {
        e.preventDefault();
        setError('');

        if (isDp) {
            const numAmount = Number(amount);
            if (!numAmount || numAmount < 500000) {
                setError('Minimal pembayaran DP adalah Rp500.000');
                return;
            }
            if (numAmount > booking.total_price) {
                setError('Nominal DP tidak boleh melebihi total tagihan');
                return;
            }
        }

        setLoading(true);

        try {
            const response = await axios.post('/api/payments/create', {
                booking_code: bookingCode,
                contact: contact,
                payment_type: paymentType,
                amount: isSettlement ? booking.remaining_amount : amount,
                payment_method: paymentMethod,
            });

            if (response.data?.success && response.data?.data?.snap_token) {
                const snapToken = response.data.data.snap_token;
                triggerSnap(snapToken);
                if (onPaymentSuccess) {
                    onPaymentSuccess();
                }
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
        if (pendingPayment?.snap_token) {
            triggerSnap(pendingPayment.snap_token);
        }
    };

    const triggerSnap = (snapToken) => {
        if (window.snap) {
            window.snap.pay(snapToken, {
                onSuccess: function(result){
                    if(onPaymentSuccess) onPaymentSuccess();
                },
                onPending: function(result){
                    if(onPaymentSuccess) onPaymentSuccess();
                },
                onError: function(result){
                    setError('Pembayaran gagal atau dibatalkan.');
                },
                onClose: function(){
                    if(onPaymentSuccess) onPaymentSuccess();
                }
            });
        } else {
            setError('Sistem pembayaran belum siap. Silakan refresh halaman.');
        }
    };

    if (!isDp && !isSettlement) return null;

    return (
        <div className="bg-white rounded-2xl border border-beige p-6 md:p-8 shadow-sm">
            <h3 className="font-serif text-lg text-charcoal mb-5 flex items-center border-b border-beige pb-3">
                <CreditCard size={20} className="mr-2 text-primary shrink-0" />
                {isDp ? 'Pembayaran Uang Muka (DP)' : 'Pelunasan Tagihan'}
            </h3>

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
                    {isDp && (
                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-2">
                                Nominal Pembayaran (Rp)
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Min. 500000"
                                className="w-full px-4 py-3 rounded-xl border border-beige bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                disabled={loading}
                            />
                            <p className="text-xs text-warm-grey mt-2">
                                Minimal DP adalah Rp500.000. Total tagihan: {formatCurrency(booking.total_price)}
                            </p>
                        </div>
                    )}

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

                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Metode Pembayaran</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-beige bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            disabled={loading}
                        >
                            <option value="qris">QRIS (Gopay, OVO, Dana, LinkAja)</option>
                            <option value="bca_va">BCA Virtual Account</option>
                            <option value="bni_va">BNI Virtual Account</option>
                            <option value="bri_va">BRI Virtual Account</option>
                            <option value="mandiri_va">Mandiri Virtual Account</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (isDp && !amount)}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 rounded-full hover:bg-primary-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <span>{isDp ? 'Buat Pembayaran DP' : 'Lunasi Sekarang'}</span>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
