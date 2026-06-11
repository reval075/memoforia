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
import { TRACKING_SESSION_KEY } from '../constants/tracking';
import PaymentProofUpload from '../components/PaymentProofUpload';
import MidtransPaymentGateway from '../components/MidtransPaymentGateway';
import ErrorBoundary from '../components/ErrorBoundary';
import { art } from '@/design/artDirection';
import EditorialStack from '@/components/art/EditorialStack';
import ChunkyButton from '@/components/art/ChunkyButton';
import LayeredCard from '@/components/art/LayeredCard';
import { motionTokens } from '@/motion';
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

export default function TrackBookingDetail() {
    const [session, setSession] = useState(null);
    const [checking, setChecking] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [dpCountdown, setDpCountdown] = useState(null);
    const [clientDpExpired, setClientDpExpired] = useState(false);

    const loadSession = useCallback(() => {
        const raw = sessionStorage.getItem(TRACKING_SESSION_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed?.booking_code || !parsed?.data) {
            sessionStorage.removeItem(TRACKING_SESSION_KEY);
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
            setSession(parsed);
        } catch {
            sessionStorage.removeItem(TRACKING_SESSION_KEY);
            router.visit('/track-booking');
        } finally {
            setChecking(false);
        }
    }, [loadSession]);

    const refreshTrackingData = useCallback(async () => {
        if (!session?.booking_code || !session?.contact) {
            return false;
        }

        const response = await axios.post('/api/bookings/track', {
            booking_code: session.booking_code,
            contact: session.contact,
        });

        if (response.data?.success && response.data?.data) {
            const updated = {
                booking_code: session.booking_code,
                contact: session.contact,
                data: response.data.data,
                fetchedAt: Date.now(),
            };
            sessionStorage.setItem(TRACKING_SESSION_KEY, JSON.stringify(updated));
            setSession(updated);
            return true;
        }

        return false;
    }, [session?.booking_code, session?.contact]);

    const handleRefresh = async () => {
        setRefreshing(true);
        setFetchError('');

        try {
            const ok = await refreshTrackingData();
            if (!ok) {
                setFetchError('Gagal memperbarui data booking.');
            }
        } catch {
            setFetchError('Gagal memperbarui data booking. Silakan coba lagi.');
        } finally {
            setRefreshing(false);
        }
    };

    // Frontend-only DP countdown (per-minute). Backend remains source of truth.
    // Hook MUST run on every render (no conditional placement).
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
                <Head title="Memuat Detail Booking" />
                <div className="min-h-[70vh] flex items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-primary" />
                </div>
            </GuestLayout>
        );
    }

    if (!session?.data) {
        return null;
    }

    const booking = session.data;
    const statusMessage = getStatusMessage(booking);
    const addons = booking.addons || [];
    const payments = booking.payments || [];
    const extraHours = Number(booking.extra_hours || 0);
    const extraPrints = Number(booking.extra_prints || 0);
    const extraHourPrice = Number(booking.package_variant?.extra_hour_price || 0);
    const extraPrintPrice = Number(booking.package_variant?.extra_print_price || 50000);
    const extraHourCost = extraHours > 0 && extraHourPrice > 0 ? extraHours * extraHourPrice : 0;
    const extraPrintCost = extraPrints > 0 ? (extraPrints / 50) * extraPrintPrice : 0;

    const addonsTotal = addons.reduce(
        (sum, addon) => sum + Number(addon.price || 0) * Number(addon.quantity || 0),
        0
    );
    // packageSubtotal = total - addons - extras; fallback to variant price
    const packageSubtotal = booking.package_variant?.price
        ? Number(booking.package_variant.price)
        : Math.max(Number(booking.total_price || 0) - addonsTotal - extraHourCost - extraPrintCost, 0);

    const hasPendingMidtransPayment = payments.some(
        (p) => p.status === 'pending' && p.payment_source === 'midtrans'
    );
    const hasPendingManualPayment = payments.some(
        (p) => p.status === 'pending' && p.payment_source === 'manual'
    );

    // canShowMidtransSection: tampilkan gateway Midtrans jika:
    // 1. Booking sudah disetujui dan menunggu DP, atau
    // 2. Booking sudah confirmed tapi belum lunas (settlement)
    // 3. DP belum expired (dari server maupun client countdown)
    const canShowMidtransSection =
        !booking.is_dp_expired &&
        !clientDpExpired &&
        (booking.status === 'waiting_dp' ||
            (booking.status === 'confirmed' && Number(booking.remaining_amount) > 0));

    // Debug logging
    console.log('[TrackBookingDetail] Booking Debug:', {
        booking_code: booking.booking_code,
        status: booking.status,
        payment_status: booking.payment_status,
        is_dp_expired: booking.is_dp_expired,
        clientDpExpired,
        remaining_amount: booking.remaining_amount,
        payments_count: payments.length,
        hasPendingMidtransPayment,
        hasPendingManualPayment,
        canShowMidtransSection,
    });
    console.log('[TrackBookingDetail] Payments:', payments);

    const canShowUploadSection =
        booking.can_upload_proof &&
        !booking.is_dp_expired &&
        !clientDpExpired &&
        !hasPendingManualPayment &&
        !['expired', 'cancelled', 'rejected', 'completed'].includes(booking.status);

    return (
        <GuestLayout>
            <Head title={`Detail Booking ${booking?.booking_code || ''}`} />
            <ErrorBoundary>
                <section className={`${art.section.pad} max-w-4xl mx-auto min-h-[70vh] pt-28 md:pt-36`}>
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: motionTokens.duration.cinematic, ease: motionTokens.ease.out }}
                    >
                        <div className="mb-10 md:mb-12">
                            <p className={`${art.type.label} mb-4`}>detail tracking</p>
                            <EditorialStack lines={['Status', 'Booking']} lineClassName="type-display block" animate={false} />
                            <p className="type-shout !text-2xl text-primary-dark mt-4 tabular-nums">{booking.booking_code}</p>
                        </div>

                        {fetchError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm text-center">
                                {fetchError}
                            </div>
                        )}

                        {/* Status Card */}
                        <LayeredCard className="p-6 md:p-8 mb-8" hover={false}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge
                                        label={getStatusLabel(booking.status)}
                                        styleClass={getStatusStyle(booking.status)}
                                    />
                                    <StatusBadge
                                        label={getPaymentStatusLabel(booking.payment_status)}
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

                            {booking.status === 'waiting_dp' && booking.dp_expired_at && (
                                <div className="mt-3 space-y-1">
                                    <p className={`text-xs font-semibold flex items-center gap-1 ${clientDpExpired ? 'text-orange-600' : 'text-blue-600'}`}>
                                        <Clock size={14} />
                                        Batas pembayaran DP: {formatDateTime(booking.dp_expired_at)}
                                    </p>
                                    {dpCountdown && (
                                        <p className={`text-xs font-semibold ${clientDpExpired ? 'text-orange-600' : 'text-blue-600'}`}>
                                            {dpCountdown}
                                        </p>
                                    )}
                                </div>
                            )}

                            {(booking.status === 'expired' || clientDpExpired) && (
                                <p className="text-xs font-semibold text-orange-600 mt-3 flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    Booking ini telah kedaluwarsa karena batas waktu DP terlewati.
                                </p>
                            )}
                        </LayeredCard>

                        {/* Main content sections - all inside one space-y-6 container */}
                        <div className="space-y-6 md:space-y-8">

                            {/* Informasi Booking */}
                            <div>
                                <SectionCard title="Informasi Booking" icon={User}>
                                    <InfoRow label="Nama Pelanggan" value={booking.customer_name} />
                                    <InfoRow label="Email" value={booking.customer_email} />
                                    <InfoRow label="Nomor HP" value={booking.customer_phone} />
                                    <InfoRow label="Diajukan Pada" value={formatDateTime(booking.created_at)} />
                                    {booking.approved_at && (
                                        <InfoRow label="Disetujui Pada" value={formatDateTime(booking.approved_at)} />
                                    )}
                                    {booking.confirmed_at && (
                                        <InfoRow label="Dikonfirmasi Pada" value={formatDateTime(booking.confirmed_at)} />
                                    )}
                                    {booking.cancelled_at && (
                                        <InfoRow label="Dibatalkan / Expired Pada" value={formatDateTime(booking.cancelled_at)} />
                                    )}
                                </SectionCard>
                            </div>

                            {/* Detail Event */}
                            <div>
                                <SectionCard title="Detail Event" icon={Calendar}>
                                    <InfoRow label="Nama Event" value={booking.event_name} />
                                    <InfoRow label="Lokasi" value={booking.event_location} />
                                    <InfoRow label="Tanggal & Waktu" value={formatDateTime(booking.event_datetime)} />
                                </SectionCard>
                            </div>

                            {/* Paket & Layanan */}
                            <div>
                                <SectionCard title="Paket & Layanan" icon={Package}>
                                    <InfoRow label="Paket Jasa" value={booking.service_package?.name} />
                                    <InfoRow label="Varian" value={booking.package_variant?.name} />
                                    {booking.package_variant?.duration_hours != null && (
                                        <InfoRow
                                            label="Durasi Operasional"
                                            value={`${booking.package_variant.duration_hours} Jam`}
                                        />
                                    )}
                                    {booking.package_variant?.is_unlimited ? (
                                        <InfoRow label="Batas Cetak" value="Unlimited" />
                                    ) : booking.package_variant?.print_limit != null ? (
                                        <InfoRow
                                            label="Batas Cetak"
                                            value={`${booking.package_variant.print_limit} Lembar`}
                                        />
                                    ) : null}

                                    {extraHours > 0 && (
                                        <InfoRow
                                            label={`Tambah Durasi (+${extraHours} jam)`}
                                            value={extraHourCost > 0 ? formatCurrency(extraHourCost) : `+${extraHours} jam`}
                                        />
                                    )}

                                    {extraPrints > 0 && (
                                        <InfoRow
                                            label={`Tambah Cetakan (+${extraPrints} lembar)`}
                                            value={formatCurrency(extraPrintCost)}
                                        />
                                    )}

                                    <InfoRow
                                        label="Template Frame"
                                        value={
                                            booking?.selected_template
                                                ? `${booking.selected_template.name || ''} ${booking.selected_template.size ? `(${booking.selected_template.size})` : ''}`
                                                : '-'
                                        }
                                    />

                                    {addons.length > 0 ? (
                                        <div className="mt-4 bg-off-white rounded-xl p-4 border border-beige/60">
                                            <strong className="block text-primary text-sm mb-3">Addons Terpilih</strong>
                                            <ul className="space-y-2 text-sm text-slate">
                                                {addons.map((addon) => (
                                                    <li
                                                        key={addon.id}
                                                        className="flex flex-col sm:flex-row sm:justify-between gap-1"
                                                    >
                                                        <span>
                                                            {addon?.name || 'Addon'} × {addon?.quantity || 0}
                                                        </span>
                                                        <span className="font-medium text-charcoal">
                                                            {formatCurrency(
                                                                Number(addon?.price || 0) * Number(addon?.quantity || 0)
                                                            )}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-warm-grey mt-4">Tidak ada addon tambahan.</p>
                                    )}
                                </SectionCard>
                            </div>

                            {/* Midtrans Payment Gateway */}
                            {canShowMidtransSection && (
                                <div>
                                    <MidtransPaymentGateway
                                        transactionCode={session.booking_code}
                                        contact={session.contact}
                                        transactionData={booking}
                                        transactionType="booking"
                                        onPaymentSuccess={refreshTrackingData}
                                    />
                                </div>
                            )}

                            {/* Manual Payment Upload */}
                            {canShowUploadSection && (
                                <div>
                                    <PaymentProofUpload
                                        transactionCode={session.booking_code}
                                        contact={session.contact}
                                        transactionData={booking}
                                        transactionType="booking"
                                        onUploadSuccess={refreshTrackingData}
                                    />
                                </div>
                            )}

                            {/* Pending manual payment notice */}
                            {hasPendingManualPayment && (
                                <div>
                                    <div className="bg-blue-50 border border-blue-100 text-blue-700 px-5 py-4 rounded-2xl text-sm">
                                        Bukti pembayaran manual Anda sedang menunggu verifikasi admin.
                                    </div>
                                </div>
                            )}

                            {/* Ringkasan Pembayaran */}
                            <div>
                                <SectionCard title="Ringkasan Pembayaran" icon={CreditCard}>
                                    <InfoRow label="Subtotal Paket" value={formatCurrency(packageSubtotal)} />
                                    {extraHourCost > 0 && (
                                        <InfoRow
                                            label={`Tambah Durasi (+${extraHours} jam)`}
                                            value={formatCurrency(extraHourCost)}
                                        />
                                    )}
                                    {extraPrintCost > 0 && (
                                        <InfoRow
                                            label={`Tambah Cetakan (+${extraPrints} lembar)`}
                                            value={formatCurrency(extraPrintCost)}
                                        />
                                    )}
                                    <InfoRow label="Total Addons" value={formatCurrency(addonsTotal)} />
                                    <InfoRow
                                        label="Total Pembayaran"
                                        value={formatCurrency(booking.total_price)}
                                    />

                                    <div className="mt-6 pt-6 border-t border-beige">
                                        <h4 className="text-sm font-semibold text-charcoal mb-3">Status Pembayaran</h4>
                                        <div className="bg-off-white rounded-xl p-4 border border-beige/60 space-y-3">
                                            <InfoRow
                                                label="Sudah Dibayar"
                                                value={formatCurrency(booking.paid_amount || 0)}
                                            />
                                            <InfoRow
                                                label="Sisa Tagihan"
                                                value={formatCurrency(booking.remaining_amount || 0)}
                                            />
                                            {booking.settlement_due_at && booking.status === 'confirmed' && (
                                                <InfoRow
                                                    label="Batas Pelunasan"
                                                    value={formatDateTime(booking.settlement_due_at)}
                                                />
                                            )}
                                        </div>

                                        {booking.is_settlement_overdue && (
                                            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Pelunasan Terlambat</strong><br />
                                                    Pelunasan telah melewati batas waktu. Silakan lakukan pembayaran secepatnya.
                                                </span>
                                            </div>
                                        )}
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
                                                                {payment?.payment_type?.replace('_', ' ') || '-'}
                                                            </span>
                                                            <StatusBadge
                                                                label={payment?.status}
                                                                styleClass={getPaymentVerificationStyle(payment?.status)}
                                                            />
                                                        </div>
                                                        <p className="text-charcoal font-semibold mb-1">
                                                            {formatCurrency(payment?.amount)}
                                                        </p>
                                                        <p className="text-warm-grey text-xs">
                                                            Metode: {payment?.payment_method || '-'}
                                                        </p>
                                                        <p className="text-warm-grey text-xs mt-1">
                                                            Diajukan: {formatDateTime(payment?.created_at)}
                                                        </p>
                                                        {payment?.verified_at && (
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
                            </div>

                            {/* Dokumen Booking */}
                            {booking.documents && booking.documents.length > 0 && (
                                <div>
                                    <SectionCard title="Dokumen Booking" icon={FileText}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {booking.documents.map(doc => (
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
                                                    <a
                                                        href={`/api/bookings/${booking?.booking_code}/documents/download-latest/${doc?.document_type}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-auto bg-white border border-primary text-primary hover:bg-primary hover:text-white py-2 text-center rounded-lg text-xs font-semibold transition-colors"
                                                    >
                                                        Unduh Dokumen
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </SectionCard>
                                </div>
                            )}

                            {/* Catatan */}
                            {booking.notes && (
                                <div>
                                    <SectionCard title="Catatan" icon={MapPin}>
                                        <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap">
                                            {booking.notes}
                                        </p>
                                    </SectionCard>
                                </div>
                            )}

                        </div>
                        {/* end space-y-6 */}

                        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <ChunkyButton href="/track-booking" className="w-full sm:w-auto justify-center">
                                Lacak Booking Lain
                            </ChunkyButton>
                            <ChunkyButton href="/booking" variant="secondary" className="w-full sm:w-auto justify-center">
                                Buat Booking Baru
                            </ChunkyButton>
                        </div>
                    </motion.div>
                </section>
            </ErrorBoundary>
        </GuestLayout>
    );
}
