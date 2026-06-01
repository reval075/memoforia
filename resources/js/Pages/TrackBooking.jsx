import GuestLayout from '@/Layouts/GuestLayout';
import { Head, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Search, ArrowRight, Calendar, Package } from 'lucide-react';
import {
    TRACKING_SESSION_KEY,
    RENTAL_TRACKING_SESSION_KEY,
    detectTrackingType,
    getTrackingTypeLabel,
} from '../constants/tracking';
import { art } from '@/design/artDirection';
import EditorialStack from '@/components/art/EditorialStack';
import ChunkyButton from '@/components/art/ChunkyButton';
import LayeredCard from '@/components/art/LayeredCard';
import { motionTokens } from '@/motion';

const TYPE_OPTIONS = [
    { key: 'booking', label: 'Booking Booth', icon: Calendar, hint: 'Kode diawali MEMO-' },
    { key: 'rental', label: 'Sewa Peralatan', icon: Package, hint: 'Kode diawali RENT-' },
];

export default function TrackBooking() {
    const [form, setForm] = useState({
        reference_code: '',
        contact: '',
    });
    const [trackingType, setTrackingType] = useState('booking');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [codePrefilled, setCodePrefilled] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const typeParam = params.get('type');

        if (code) {
            const trimmed = code.trim();
            setForm((prev) => ({ ...prev, reference_code: trimmed }));
            setCodePrefilled(true);

            const detected = detectTrackingType(trimmed);
            if (detected) {
                setTrackingType(detected);
            } else if (typeParam === 'rental' || typeParam === 'booking') {
                setTrackingType(typeParam);
            }
        } else if (typeParam === 'rental' || typeParam === 'booking') {
            setTrackingType(typeParam);
        }
    }, []);

    useEffect(() => {
        const detected = detectTrackingType(form.reference_code);
        if (detected) {
            setTrackingType(detected);
        }
    }, [form.reference_code]);

    const updateForm = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (fieldErrors[key]) {
            setFieldErrors((prev) => ({ ...prev, [key]: null }));
        }
        if (error) {
            setError('');
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!form.reference_code.trim()) {
            errors.reference_code = 'Kode booking atau sewa wajib diisi.';
        } else if (!detectTrackingType(form.reference_code) && !trackingType) {
            errors.reference_code = 'Pilih jenis layanan atau gunakan kode MEMO- / RENT-.';
        }

        if (!form.contact.trim()) {
            errors.contact = 'Email atau nomor HP wajib diisi.';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resolveType = () => detectTrackingType(form.reference_code) || trackingType;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        const referenceCode = form.reference_code.trim();
        const contact = form.contact.trim();
        const type = resolveType();

        try {
            if (type === 'rental') {
                const response = await axios.post('/api/rental-requests/track', {
                    rental_code: referenceCode,
                    contact,
                });

                if (response.data?.success && response.data?.data) {
                    sessionStorage.setItem(
                        RENTAL_TRACKING_SESSION_KEY,
                        JSON.stringify({
                            rental_code: referenceCode,
                            contact,
                            data: response.data.data,
                            fetchedAt: Date.now(),
                        })
                    );

                    router.visit('/track-rental/detail');
                    return;
                }

                setError('Kode sewa atau kontak tidak sesuai.');
                return;
            }

            const response = await axios.post('/api/bookings/track', {
                booking_code: referenceCode,
                contact,
            });

            if (response.data?.success && response.data?.data) {
                sessionStorage.setItem(
                    TRACKING_SESSION_KEY,
                    JSON.stringify({
                        booking_code: referenceCode,
                        contact,
                        data: response.data.data,
                        fetchedAt: Date.now(),
                    })
                );

                router.visit('/track-booking/detail');
                return;
            }

            setError('Kode booking atau kontak tidak sesuai.');
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const apiErrors = err.response.data.errors;
                setFieldErrors({
                    reference_code:
                        apiErrors.booking_code?.[0] ||
                        apiErrors.rental_code?.[0] ||
                        apiErrors.reference_code?.[0] ||
                        null,
                    contact: apiErrors.contact?.[0] || null,
                });
            }

            const fallback =
                type === 'rental'
                    ? 'Data sewa tidak ditemukan. Periksa kembali kode sewa dan kontak Anda.'
                    : 'Data booking tidak ditemukan. Periksa kembali kode booking dan kontak Anda.';

            setError(err.response?.data?.message || fallback);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (hasError) =>
        `w-full px-5 py-4 rounded-xl border-2 bg-white font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
            hasError ? 'border-red-400' : 'border-charcoal/15'
        }`;

    const detectedType = detectTrackingType(form.reference_code);
    const activeType = detectedType || trackingType;

    return (
        <GuestLayout>
            <Head title="Lacak Booking & Sewa" />

            <section className={`${art.section.pad} min-h-[85vh] flex items-center pt-28 md:pt-36`}>
                <motion.div
                    initial={{ opacity: 0, y: 48 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: motionTokens.duration.cinematic, ease: motionTokens.ease.out }}
                    className="w-full max-w-xl mx-auto"
                >
                    <div className="mb-10 md:mb-14">
                        <p className={`${art.type.label} mb-4`}>guest tracking</p>
                        <EditorialStack lines={['Lacak', 'Pesanan']} lineClassName="type-display block" animate={false} />
                        <p className={`${art.type.body} mt-6`}>
                            Lacak status <strong>booking booth</strong> atau <strong>sewa peralatan</strong> dengan kode
                            pesanan dan kontak yang sama saat pengajuan.
                        </p>
                        {codePrefilled && (
                            <p className="text-sm font-bold text-primary mt-4 uppercase tracking-wide">
                                Kode sudah terisi — lengkapi kontak Anda.
                            </p>
                        )}
                    </div>

                    <LayeredCard className="p-8 md:p-10">
                        <div className="flex rounded-xl border-2 border-charcoal/10 overflow-hidden mb-6">
                            {TYPE_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const isActive = activeType === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setTrackingType(opt.key)}
                                        disabled={loading || !!detectedType}
                                        className={`flex-1 px-3 py-3 text-left transition-all ${
                                            isActive
                                                ? 'bg-primary text-white'
                                                : 'bg-off-white text-charcoal hover:bg-beige/60'
                                        } ${detectedType ? 'cursor-default' : ''}`}
                                    >
                                        <span className="flex items-center gap-2 text-xs font-semibold uppercase">
                                            <Icon size={14} className="shrink-0" />
                                            {opt.label}
                                        </span>
                                        <span
                                            className={`block text-[10px] mt-1 ${
                                                isActive ? 'text-white/80' : 'text-warm-grey'
                                            }`}
                                        >
                                            {opt.hint}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {detectedType && (
                            <p className="text-xs text-primary font-medium mb-4 -mt-2">
                                Terdeteksi otomatis: {getTrackingTypeLabel(detectedType)}
                            </p>
                        )}

                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                            <div>
                                <label htmlFor="reference_code" className={`${art.type.label} block mb-3 text-charcoal`}>
                                    Kode Booking / Sewa
                                </label>
                                <input
                                    id="reference_code"
                                    type="text"
                                    value={form.reference_code}
                                    onChange={(e) => updateForm('reference_code', e.target.value)}
                                    placeholder={
                                        activeType === 'rental'
                                            ? 'RENT-20260610-ABC12'
                                            : 'MEMO-20260610-ABC12'
                                    }
                                    className={inputClass(fieldErrors.reference_code)}
                                    disabled={loading}
                                    autoComplete="off"
                                />
                                {fieldErrors.reference_code && (
                                    <p className="text-red-600 text-xs mt-2 font-medium">{fieldErrors.reference_code}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="contact" className={`${art.type.label} block mb-3 text-charcoal`}>
                                    Email atau Nomor HP
                                </label>
                                <input
                                    id="contact"
                                    type="text"
                                    value={form.contact}
                                    onChange={(e) => updateForm('contact', e.target.value)}
                                    placeholder="email@example.com atau 0812xxxxxxx"
                                    className={inputClass(fieldErrors.contact)}
                                    disabled={loading}
                                    autoComplete="off"
                                />
                                {fieldErrors.contact && (
                                    <p className="text-red-600 text-xs mt-2 font-medium">{fieldErrors.contact}</p>
                                )}
                            </div>

                            <ChunkyButton type="submit" disabled={loading} className="w-full justify-center">
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" /> Mencari...
                                    </>
                                ) : (
                                    <>
                                        <Search size={20} />
                                        Lacak {activeType === 'rental' ? 'Sewa' : 'Booking'}
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </ChunkyButton>
                        </form>

                        <p className="text-xs text-warm-grey text-center mt-8 leading-relaxed">
                            Data kontak harus sama persis dengan yang digunakan saat mengajukan pesanan.
                        </p>
                    </LayeredCard>
                </motion.div>
            </section>
        </GuestLayout>
    );
}
