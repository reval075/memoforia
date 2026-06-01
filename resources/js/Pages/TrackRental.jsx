import GuestLayout from '@/Layouts/GuestLayout';
import { Head, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Search, ArrowRight } from 'lucide-react';
import { TRACKING_SESSION_KEY } from '../constants/tracking';
import { art } from '@/design/artDirection';
import EditorialStack from '@/components/art/EditorialStack';
import ChunkyButton from '@/components/art/ChunkyButton';
import LayeredCard from '@/components/art/LayeredCard';
import { motionTokens } from '@/motion';

export default function TrackRental() {
    const [form, setForm] = useState({
        rental_code: '',
        contact: '',
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [codePrefilled, setCodePrefilled] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            setForm((prev) => ({ ...prev, rental_code: code.trim() }));
            setCodePrefilled(true);
        }
    }, []);

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

        if (!form.rental_code.trim()) {
            errors.rental_code = 'Kode sewa wajib diisi.';
        }

        if (!form.contact.trim()) {
            errors.contact = 'Email atau nomor HP wajib diisi.';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        const rentalCode = form.rental_code.trim();
        const contact = form.contact.trim();

        try {
            const response = await axios.post('/api/rental-requests/track', {
                rental_code: rentalCode,
                contact,
            });

            if (response.data?.success && response.data?.data) {
                // Save to tracking session using rental prefix to avoid clashing with booking
                sessionStorage.setItem(
                    TRACKING_SESSION_KEY + '_RENTAL',
                    JSON.stringify({
                        rental_code: rentalCode,
                        contact,
                        data: response.data.data,
                        fetchedAt: Date.now(),
                    })
                );

                router.visit('/track-rental/detail');
                return;
            }

            setError('Kode sewa atau kontak tidak sesuai.');
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const apiErrors = err.response.data.errors;
                setFieldErrors({
                    rental_code: apiErrors.rental_code?.[0] || null,
                    contact: apiErrors.contact?.[0] || null,
                });
            }

            setError(
                err.response?.data?.message ||
                    'Data sewa tidak ditemukan. Periksa kembali kode sewa dan kontak Anda.'
            );
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (hasError) =>
        `w-full px-5 py-4 rounded-xl border-2 bg-white font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
            hasError ? 'border-red-400' : 'border-charcoal/15'
        }`;

    return (
        <GuestLayout>
            <Head title="Lacak Sewa Alat" />

            <section className={`${art.section.pad} min-h-[85vh] flex items-center pt-28 md:pt-36`}>
                <motion.div
                    initial={{ opacity: 0, y: 48 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: motionTokens.duration.cinematic, ease: motionTokens.ease.out }}
                    className="w-full max-w-xl mx-auto"
                >
                    <div className="mb-10 md:mb-14">
                        <p className={`${art.type.label} mb-4`}>guest tracking</p>
                        <EditorialStack lines={['Lacak', 'Sewa']} lineClassName="type-display block" animate={false} />
                        <p className={`${art.type.body} mt-6`}>
                            Masukkan kode sewa dan email atau nomor HP yang digunakan saat pengajuan.
                        </p>
                        {codePrefilled && (
                            <p className="text-sm font-bold text-primary mt-4 uppercase tracking-wide">
                                Kode sewa sudah terisi — lengkapi kontak Anda.
                            </p>
                        )}
                    </div>

                    <LayeredCard className="p-8 md:p-10">
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                            <div>
                                <label htmlFor="rental_code" className={`${art.type.label} block mb-3 text-charcoal`}>
                                    Kode Sewa
                                </label>
                                <input
                                    id="rental_code"
                                    type="text"
                                    value={form.rental_code}
                                    onChange={(e) => updateForm('rental_code', e.target.value)}
                                    placeholder="RENT-20260610-ABC12"
                                    className={inputClass(fieldErrors.rental_code)}
                                    disabled={loading}
                                    autoComplete="off"
                                />
                                {fieldErrors.rental_code && (
                                    <p className="text-red-600 text-xs mt-2 font-medium">{fieldErrors.rental_code}</p>
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
                                        <Search size={20} /> Lacak Sewa <ArrowRight size={20} />
                                    </>
                                )}
                            </ChunkyButton>
                        </form>

                        <p className="text-xs text-warm-grey text-center mt-8 leading-relaxed">
                            Data kontak harus sama persis dengan yang digunakan saat mengajukan sewa.
                        </p>
                    </LayeredCard>
                </motion.div>
            </section>
        </GuestLayout>
    );
}
