import GuestLayout from '@/Layouts/GuestLayout';
import { Head, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
    Loader2,
    Calendar,
    MapPin,
    Package,
    CreditCard,
    RefreshCw,
    AlertCircle,
    Clock,
    User,
    FileText,
} from 'lucide-react';
import { RENTAL_TRACKING_SESSION_KEY } from '../constants/tracking';
import MidtransPaymentGateway from '../components/MidtransPaymentGateway';
import PaymentProofUpload from '../components/PaymentProofUpload';
import { art } from '@/design/artDirection';
import EditorialStack from '@/components/art/EditorialStack';
import ChunkyButton from '@/components/art/ChunkyButton';
import LayeredCard from '@/components/art/LayeredCard';
import { motionTokens } from '@/motion';
import { Reveal, RevealItem } from '@/motion/components/Reveal';
import {
    formatCurrency,
    formatDateTime,
    getDpCountdown,
    getPaymentStatusLabel,
    getPaymentVerificationStyle,
    getStatusLabel,
    getStatusMessage,
    getStatusStyle,
} from '../utils/bookingDisplay';

function SectionCard({ title, icon: Icon, children }) {
    return (
        <LayeredCard className="p-6 md:p-8" hover={false}>
            <h3 className="type-shout !text-xl md:!text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal/10 pb-4">
                {Icon && <Icon size={26} className="text-primary shrink-0" />}
                {title}
            </h3>
            {children}
        </LayeredCard>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 py-2 border-b border-beige/50 last:border-0">
            <span className="text-sm text-warm-grey">{label}</span>
            <span className="text-sm text-charcoal font-medium text-left sm:text-right break-words">{value || '-'}</span>
        </div>
    );
}

function StatusBadge({ label, styleClass }) {
    return (
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase border ${styleClass}`}>
            {label}
        </span>
    );
}

export default function TrackRentalDetail() {
    const [session, setSession] = useState(null);
    const [checking, setChecking] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [dpCountdown, setDpCountdown] = useState(null);
    const [clientDpExpired, setClientDpExpired] = useState(false);

    const loadSession = useCallback(() => {
        const raw = sessionStorage.getItem(RENTAL_TRACKING_SESSION_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed?.rental_code || !parsed?.data) {
            sessionStorage.removeItem(RENTAL_TRACKING_SESSION_KEY);
            return null;
        }

        return parsed;
    }, []);

    useEffect(() => {
        try {
            const parsed = loadSession();
            if (!parsed) {
                router.visit('/track-booking');
                return;
            }

            // Tampilkan data sessionStorage dulu supaya halaman langsung terlihat
            setSession(parsed);

            // Auto-refresh: fetch data terbaru dari API secara silent pada saat mount.
            // Ini krusial supaya status 'waiting_dp' (setelah admin approve) langsung
            // terbaca meskipun sessionStorage masih menyimpan status lama.
            axios
                .post('/api/rental-requests/track', {
                    rental_code: parsed.rental_code,
                    contact: parsed.contact,
                })
                .then((res) => {
                    if (res.data?.success && res.data?.data) {
                        const updated = {
                            rental_code: parsed.rental_code,
                            contact: parsed.contact,
                            data: res.data.data,
                            fetchedAt: Date.now(),
                        };
                        sessionStorage.setItem(
                            RENTAL_TRACKING_SESSION_KEY,
                            JSON.stringify(updated)
                        );
                        setSession(updated);
                    }
                })
                .catch(() => {
                    // Silent fail — halaman tetap menampilkan data dari sessionStorage
                    console.warn('[TrackRentalDetail] Auto-refresh gagal, menggunakan data cache.');
                });
        } catch {
            sessionStorage.removeItem(RENTAL_TRACKING_SESSION_KEY);
            router.visit('/track-booking');
        } finally {
            setChecking(false);
        }
    }, [loadSession]);

    const refreshTrackingData = useCallback(async () => {
        if (!session?.rental_code || !session?.contact) {
            return false;
        }

        const response = await axios.post('/api/rental-requests/track', {
            rental_code: session.rental_code,
            contact: session.contact,
        });

        if (response.data?.success && response.data?.data) {
            const updated = {
                rental_code: session.rental_code,
                contact: session.contact,
                data: response.data.data,
                fetchedAt: Date.now(),
            };
            sessionStorage.setItem(RENTAL_TRACKING_SESSION_KEY, JSON.stringify(updated));
            setSession(updated);
            return true;
        }

        return false;
    }, [session?.rental_code, session?.contact]);

    const handleRefresh = async () => {
        setRefreshing(true);
        setFetchError('');

        try {
            const ok = await refreshTrackingData();
            if (!ok) {
                setFetchError('Gagal memperbarui data sewa.');
            }
        } catch {
            setFetchError('Gagal memperbarui data sewa. Silakan coba lagi.');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const status = session?.data?.status;
        const dpExpiredAt = session?.data?.dp_expired_at;

        if (status !== 'waiting_dp' || !dpExpiredAt) {
            setDpCountdown(null);
            setClientDpExpired(false);
            return;
        }

        const update = () => {
            const result = getDpCountdown(dpExpiredAt);
            setDpCountdown(result.text);
            setClientDpExpired(result.isExpired);
        };

        update();
        const intervalId = window.setInterval(update, 60 * 1000);

        return () => window.clearInterval(intervalId);
    }, [session?.data?.status, session?.data?.dp_expired_at]);

    if (checking) {
        return (
            <GuestLayout>
                <Head title="Memuat Detail Sewa" />
                <div className="min-h-[70vh] flex items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-primary" />
                </div>
            </GuestLayout>
        );
    }

    if (!session?.data) {
        return null;
    }

    const rental = session.data;
    const statusMessage = getStatusMessage(rental, 'rental');
    const items = rental.items || [];
    const payments = rental.payments || [];

    const hasPendingManualPayment = payments.some((p) => p.status === 'pending' && p.payment_source === 'manual');

    const canShowMidtransSection =
        !rental.is_dp_expired &&
        !clientDpExpired &&
        (rental.status === 'waiting_dp' || (rental.status === 'confirmed' && rental.remaining_amount > 0)) &&
        !hasPendingManualPayment;

    const canShowUploadSection =
        rental.can_upload_proof &&
        !rental.is_dp_expired &&
        !clientDpExpired &&
        !hasPendingManualPayment &&
        !['expired', 'cancelled', 'rejected', 'completed'].includes(rental.status);

    // ── Debug logging (hapus saat production) ────────────────────────
    console.log('[TrackRentalDetail] Rental data:', rental);
    console.log('[TrackRentalDetail] canShowMidtransSection:', canShowMidtransSection, {
        is_dp_expired: rental.is_dp_expired,
        clientDpExpired,
        status: rental.status,
        remaining_amount: rental.remaining_amount,
        hasPendingManualPayment,
    });
    console.log('[TrackRentalDetail] hasPendingManualPayment:', hasPendingManualPayment);
    // ─────────────────────────────────────────────────────────────────

    return (
        <GuestLayout>
            <Head title={`Detail Sewa ${rental.rental_code}`} />

            <section className={`${art.section.pad} max-w-4xl mx-auto min-h-[70vh] pt-28 md:pt-36`}>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: motionTokens.duration.cinematic, ease: motionTokens.ease.out }}
                >
                    <div className="mb-10 md:mb-12">
                        <p className={`${art.type.label} mb-4`}>detail tracking</p>
                        <EditorialStack lines={['Status', 'Sewa']} lineClassName="type-display block" animate={false} />
                        <p className="type-shout !text-2xl text-primary-dark mt-4 tabular-nums">{rental.rental_code}</p>
                    </div>

                    {fetchError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm text-center">
                            {fetchError}
                        </div>
                    )}

                    <LayeredCard className="p-6 md:p-8 mb-8" hover={false}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge
                                    label={getStatusLabel(rental.status)}
                                    styleClass={getStatusStyle(rental.status)}
                                />
                                <StatusBadge
                                    label={getPaymentStatusLabel(rental.payment_status)}
                                    styleClass="bg-off-white text-charcoal border-beige"
                                />
                            </div>
                            <ChunkyButton type="button" variant="ghost" onClick={handleRefresh} disabled={refreshing} className="!py-2 !px-5 !text-xs">
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                {refreshing ? 'Memperbarui...' : 'Perbarui'}
                            </ChunkyButton>
                        </div>

                        {statusMessage && (
                            <p className="text-sm text-slate font-light leading-relaxed border-t border-beige pt-4">
                                {statusMessage}
                            </p>
                        )}

                        {rental.status === 'waiting_dp' && rental.dp_expired_at && (
                            <div className="mt-3 space-y-1">
                                <p className={`text-xs font-semibold flex items-center gap-1 ${clientDpExpired ? 'text-orange-600' : 'text-blue-600'}`}>
                                    <Clock size={14} />
                                    Batas pembayaran DP: {formatDateTime(rental.dp_expired_at)}
                                </p>
                                {dpCountdown && (
                                    <p className={`text-xs font-semibold ${clientDpExpired ? 'text-orange-600' : 'text-blue-600'}`}>
                                        {dpCountdown}
                                    </p>
                                )}
                            </div>
                        )}

                        {(rental.status === 'expired' || clientDpExpired) && (
                            <p className="text-xs font-semibold text-orange-600 mt-3 flex items-center gap-1">
                                <AlertCircle size={14} />
                                Sewa ini telah kedaluwarsa karena batas waktu DP terlewati.
                            </p>
                        )}
                    </LayeredCard>

                    <div className="space-y-6 md:space-y-8" stagger staggerChildren={0.08}>
                        <RevealItem>
                            <SectionCard title="Informasi Penyewa" icon={User}>
                                <InfoRow label="Nama" value={rental.customer_name} />
                                <InfoRow label="Email" value={rental.customer_email} />
                                <InfoRow label="Nomor HP" value={rental.customer_phone} />
                                {rental.approved_at && (
                                    <InfoRow label="Disetujui Pada" value={formatDateTime(rental.approved_at)} />
                                )}
                                {rental.confirmed_at && (
                                    <InfoRow label="Dikonfirmasi Pada" value={formatDateTime(rental.confirmed_at)} />
                                )}
                            </SectionCard>
                        </RevealItem>

                        <RevealItem>
                            <SectionCard title="Jadwal Sewa" icon={Calendar}>
                                <InfoRow label="Mulai Tanggal" value={rental.start_date} />
                                <InfoRow label="Sampai Tanggal" value={rental.end_date} />
                            </SectionCard>
                        </RevealItem>

                        <RevealItem>
                            <SectionCard title="Peralatan Disewa" icon={Package}>
                                <ul className="space-y-3">
                                    {items.map((item) => (
                                        <li key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-beige/50 last:border-0">
                                            <div>
                                                <span className="font-medium text-charcoal">{item.equipment_name}</span>
                                                <span className="text-sm text-warm-grey block">Qty: {item.qty}</span>
                                            </div>
                                            <span className="font-medium text-charcoal mt-1 sm:mt-0">
                                                {formatCurrency(item.price)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        </RevealItem>

                        {canShowMidtransSection && (
                            <div>
                                <MidtransPaymentGateway
                                    transactionCode={session.rental_code}
                                    contact={session.contact}
                                    transactionData={rental}
                                    transactionType="rental"
                                    onPaymentSuccess={refreshTrackingData}
                                />
                            </div>
                        )}

                        {canShowUploadSection && (
                            <div>
                                <PaymentProofUpload
                                    transactionCode={session.rental_code}
                                    contact={session.contact}
                                    transactionData={rental}
                                    transactionType="rental"
                                    onUploadSuccess={refreshTrackingData}
                                />
                            </div>
                        )}

                        {rental.is_settlement_overdue && rental.status === 'confirmed' && (
                            <RevealItem>
                                <div className="bg-orange-50 border border-orange-200 text-orange-800 px-5 py-4 rounded-2xl text-sm">
                                    <strong>Batas pelunasan terlewati.</strong> Segera lunasi sisa tagihan atau hubungi admin.
                                </div>
                            </RevealItem>
                        )}

                        <RevealItem>
                            <SectionCard title="Ringkasan Pembayaran" icon={CreditCard}>
                                <InfoRow
                                    label="Total Biaya Sewa"
                                    value={formatCurrency(rental.total_price)}
                                />

                                <div className="mt-6 pt-6 border-t border-beige">
                                    <h4 className="text-sm font-semibold text-charcoal mb-3">Status Pembayaran</h4>
                                    <div className="bg-off-white rounded-xl p-4 border border-beige/60 space-y-3">
                                        <InfoRow
                                            label="Sudah Dibayar"
                                            value={formatCurrency(rental.paid_amount || 0)}
                                        />
                                        <InfoRow
                                            label="Sisa Tagihan"
                                            value={formatCurrency(rental.remaining_amount || 0)}
                                        />

                                        {rental.settlement_due_at && rental.status === 'confirmed' && (
                                            <InfoRow
                                                label="Batas Pelunasan"
                                                value={formatDateTime(rental.settlement_due_at)}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <h4 className="text-sm font-semibold text-charcoal mb-3">Riwayat Pembayaran</h4>
                                    {payments.length === 0 ? (
                                        <p className="text-sm text-warm-grey bg-off-white rounded-xl p-4 border border-beige/60">
                                            Belum ada riwayat pembayaran.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {payments.map((payment) => (
                                                <div
                                                    key={payment.id}
                                                    className="bg-off-white rounded-xl p-4 border border-beige/60 text-sm"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                        <span className="font-medium text-charcoal uppercase text-xs">
                                                            {payment.payment_type?.replace('_', ' ')}
                                                        </span>
                                                        <StatusBadge
                                                            label={payment.status}
                                                            styleClass={getPaymentVerificationStyle(payment.status)}
                                                        />
                                                    </div>
                                                    <p className="text-charcoal font-semibold mb-1">
                                                        {formatCurrency(payment.amount)}
                                                    </p>
                                                    <p className="text-warm-grey text-xs">
                                                        Metode: {payment.payment_method || '-'}
                                                    </p>
                                                    <p className="text-warm-grey text-xs mt-1">
                                                        Diajukan: {formatDateTime(payment.created_at)}
                                                    </p>
                                                    {payment.verified_at && (
                                                        <p className="text-warm-grey text-xs">
                                                            Diverifikasi: {formatDateTime(payment.verified_at)}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </SectionCard>
                        </RevealItem>

                        {rental.documents && rental.documents.length > 0 && (
                            <RevealItem>
                                <SectionCard title="Dokumen Sewa" icon={FileText}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {rental.documents.map(doc => (
                                            <div key={doc.id} className="bg-off-white border border-beige/60 rounded-xl p-4 flex flex-col hover:border-primary transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="font-bold text-primary uppercase text-sm block">{doc?.document_type?.replace('_', ' ') || '-'}</span>
                                                        <span className="text-xs text-warm-grey font-mono mt-1 block">{doc?.document_number || '-'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-[11px] text-warm-grey mb-4">
                                                    Dibuat: {doc?.generated_at ? new Date(doc.generated_at).toLocaleString('id-ID') : '-'}
                                                </div>
                                                <a href={`/api/rentals/${rental?.rental_code}/documents/download-latest/${doc?.document_type}`} target="_blank" rel="noopener noreferrer" className="mt-auto bg-white border border-primary text-primary hover:bg-primary hover:text-white py-2 text-center rounded-lg text-xs font-semibold transition-colors">
                                                    Unduh Dokumen
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>
                            </RevealItem>
                        )}

                        {rental.notes && (
                            <RevealItem>
                                <SectionCard title="Catatan" icon={MapPin}>
                                    <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap">
                                        {rental.notes}
                                    </p>
                                </SectionCard>
                            </RevealItem>
                        )}
                    </div>

                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <ChunkyButton href="/track-booking" className="w-full sm:w-auto justify-center">
                            Lacak Pesanan Lain
                        </ChunkyButton>
                        <ChunkyButton href="/rentals" variant="secondary" className="w-full sm:w-auto justify-center">
                            Sewa Peralatan Baru
                        </ChunkyButton>
                    </div>
                </motion.div>
            </section>
        </GuestLayout>
    );
}
