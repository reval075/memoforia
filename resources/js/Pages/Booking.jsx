import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { ArrowRight, ArrowLeft, CheckCircle, Loader2, Calendar, Package, User, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import BookingSuccess from '../components/BookingSuccess';
import { art } from '@/design/artDirection';
import EditorialStack from '@/components/art/EditorialStack';
import ChunkyButton from '@/components/art/ChunkyButton';
import LayeredCard from '@/components/art/LayeredCard';
import { motionTokens } from '@/motion';

const STEPS = ['Select Date', 'Choose Service', 'Template & Addons', 'Event Details', 'Confirmation'];

function StepIndicator({ current, steps }) {
    return (
        <div className="flex items-center justify-start md:justify-center mb-10 md:mb-14 overflow-x-auto pb-2 gap-1 md:gap-0">
            {steps.map((label, i) => (
                <div key={i} className="flex items-center shrink-0">
                    <motion.div
                        layout
                        className={`flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full text-sm font-bold border-2 transition-colors ${
                            i <= current
                                ? 'bg-primary text-white border-charcoal/20 shadow-[4px_4px_0_0_rgba(44,62,80,0.15)]'
                                : 'bg-white text-warm-grey border-beige'
                        }`}
                    >
                        {i < current ? <CheckCircle size={20} /> : i + 1}
                    </motion.div>
                    <span
                        className={`hidden lg:block ml-2 text-xs font-bold uppercase tracking-widest max-w-[100px] leading-tight ${
                            i <= current ? 'text-charcoal' : 'text-warm-grey'
                        }`}
                    >
                        {label}
                    </span>
                    {i < steps.length - 1 && (
                        <div className={`w-4 md:w-10 h-1 mx-1 md:mx-2 rounded-full ${i < current ? 'bg-primary' : 'bg-beige'}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

export default function Booking({ initialDate = null }) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [submittedBooking, setSubmittedBooking] = useState(null);
    const [error, setError] = useState('');

    // Dynamic Lists
    const [packages, setPackages] = useState([]);
    const [addonsList, setAddonsList] = useState([]);
    const [templatesList, setTemplatesList] = useState([]);
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [bookedDates, setBookedDates] = useState([]);

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    // Form inputs
    const [form, setForm] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        event_name: '',
        event_location: '',
        event_date: '',
        event_time: '18:00', // Time picker
        notes: '',
        service_package_id: '',
        package_variant_id: '',
        selected_template_id: '',
        use_custom_frame: false,
        extra_hours: 0,
        extra_prints: 0,
    });

    // Addons quantities mapping: { addon_id: quantity }
    const [selectedAddons, setSelectedAddons] = useState({});
    const [customFrameFile, setCustomFrameFile] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Fetch calendar availability whenever month/year changes
    useEffect(() => {
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);

        const formatDateStr = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const startStr = formatDateStr(startOfMonth);
        const endStr = formatDateStr(endOfMonth);

        axios.get(`/api/availabilities?start_date=${startStr}&end_date=${endStr}`)
            .then(res => {
                setUnavailableDates(res.data.unavailable_dates || []);
                setBookedDates(res.data.booked_dates || []);
            })
            .catch(() => setError('Gagal memuat jadwal ketersediaan.'));
    }, [year, month]);

    // Pre-select date from booking-session redirect
    useEffect(() => {
        if (!initialDate || typeof initialDate !== 'string') return;
        const parsed = new Date(initialDate + 'T12:00:00');
        if (Number.isNaN(parsed.getTime())) return;
        setSelectedDate(parsed);
        setCurrentDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        updateForm('event_date', initialDate);
        setStep(1);
    }, [initialDate]);

    // Fetch packages, addons, and templates on mount
    useEffect(() => {
        setLoading(true);
        Promise.all([
            axios.get('/api/packages'),
            axios.get('/api/addons'),
            axios.get('/api/photo-templates'),
        ]).then(([packagesRes, addonsRes, templatesRes]) => {
            setPackages(packagesRes.data.data);
            setAddonsList(addonsRes.data.data);
            setTemplatesList(templatesRes.data.data);
        }).catch(() => setError('Gagal memuat data formulir booking.'))
          .finally(() => setLoading(false));
    }, []);

    const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const sortedPackages = useMemo(() => {
        return [...packages].sort((a, b) => {
            const order = ['hemat', 'basic', 'premium'];
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            
            const indexA = order.findIndex(o => nameA.includes(o));
            const indexB = order.findIndex(o => nameB.includes(o));
            
            const valA = indexA === -1 ? 99 : indexA;
            const valB = indexB === -1 ? 99 : indexB;
            
            return valA - valB;
        });
    }, [packages]);

    const selectedPackage = packages.find(p => p.id == form.service_package_id);
    const selectedVariant = selectedPackage?.package_variants?.find(v => v.id == form.package_variant_id);
    const selectedTemplate = templatesList.find(t => t.id == form.selected_template_id);

    const variantSectionRef = useRef(null);

    // UX: tampilkan section variant secara bertahap setelah package dipilih
    const [showVariants, setShowVariants] = useState(form.service_package_id !== '');

    // Infer printer info from DB fields: category and includes_prints
    const getPackagePrinterInfo = (pkg) => {
        if (!pkg) return null;
        const name = (pkg.name || '').toLowerCase();
        const category = (pkg.category || '').toLowerCase();

        if (name.includes('premium') || category.includes('premium')) {
            return {
                label: 'Thermal Printer',
                notes: [
                    'Cetak fisik tersedia',
                    'Cetak sangat cepat',
                    'Hasil lebih tajam',
                    'Lebih tahan lama',
                    'Cocok untuk event besar'
                ],
                icon: '⚡',
                isSoftfileOnly: false,
                isHemat: false,
            };
        }

        if (name.includes('basic') || category.includes('basic')) {
            return {
                label: 'Inkjet Printer',
                notes: [
                    'Cetak fisik tersedia',
                    'Kecepatan cetak standar',
                    'Cocok untuk event kecil hingga menengah'
                ],
                icon: '🖨️',
                isSoftfileOnly: false,
                isHemat: false,
            };
        }

        return {
            label: 'Softfile Only',
            notes: [
                'Tanpa layanan cetak fisik',
                'Semua foto dikirim via link digital',
                'QR Code akses gallery'
            ],
            icon: '📱',
            isSoftfileOnly: true,
            isHemat: true,
        };
    };

    const getPackageBadgeLabel = (pkg) => {
        const category = (pkg?.category || '').toLowerCase();
        const variants = pkg?.package_variants || [];
        const maxPrice = variants.reduce((max, v) => Math.max(max, Number(v.price || 0)), 0);
        if (category === 'event' || maxPrice >= 5000000) return 'Most Recommended';
        return null;
    };

    // Use DB boolean includes_* fields — no hardcoding
    const getIncludeFeatures = (pkg) => {
        if (!pkg) return [];
        const features = [];
        const name = (pkg.name || '').toLowerCase();
        const category = (pkg.category || '').toLowerCase();
        const isHemat = name.includes('hemat') || category.includes('hemat');

        // Softfile feature
        if (pkg.includes_softfile || pkg.has_softfile) {
            features.push(isHemat ? 'Unlimited Softfile' : 'Softfile');
        }

        // Prints feature
        if (pkg.includes_prints || pkg.has_prints) {
            features.push(isHemat ? 'Cetak Foto' : 'Unlimited / Limited Prints');
        }

        // QR Code feature
        if (pkg.includes_qr_code || pkg.has_qrcode) {
            features.push('QR Code Gallery');
        }

        // GIF feature
        if (pkg.includes_gif || pkg.has_gif) {
            features.push('GIF');
        }

        // Custom Template feature
        if (pkg.includes_custom_template || pkg.has_custom_template) {
            features.push('Free Custom Template');
        }

        // Tiket Antrian feature
        if (pkg.includes_tiket_antrian || pkg.has_tiket_antrian) {
            features.push('Tiket Antrian');
        }

        // Supporting Crew feature
        if (pkg.includes_supporting_crew || pkg.has_supporting_crew) {
            features.push('Supporting Crew');
        }

        return features;
    };

    const getAdditionalServicesFromAddons = (pkg) => {
        const keychain = addonsList.find(a => (a?.name || '').toLowerCase().includes('kunci'))
            || addonsList.find(a => (a?.name || '').toLowerCase().includes('keychain'));

        const background = addonsList.find(a => (a?.name || '').toLowerCase().includes('backdrop'))
            || addonsList.find(a => (a?.name || '').toLowerCase().includes('background'))
            || addonsList.find(a => (a?.name || '').toLowerCase().includes('custom'));

        const isHemat = (pkg?.name || '').toLowerCase().includes('hemat');
        const items = [];
        if (!isHemat && keychain) items.push(keychain);
        if (background) items.push(background);

        // Deduplicate by id
        const uniq = [];
        const seen = new Set();
        items.forEach(it => {
            if (!it?.id) return;
            if (seen.has(it.id)) return;
            seen.add(it.id);
            uniq.push(it);
        });
        return uniq.slice(0, 2);
    };

    const getVariantDescription = (variant) => {
        const name = (variant?.name || '').toLowerCase();
        const isUnlimited = !!variant?.is_unlimited;
        const duration = variant?.duration_hours;
        const limit = variant?.print_limit;

        if (isUnlimited) {
            if (duration === 1) return 'Cocok untuk gathering kecil dan acara keluarga.';
            if (duration === 2) return 'Pilihan ideal untuk seminar, wisuda, atau acara kantor.';
            if (duration === 3) return 'Untuk event panjang dengan aktivitas padat dan tamu ramai.';
            return `Layanan cetak unlimited selama ${duration} jam untuk memuaskan semua tamu Anda.`;
        } else {
            if (limit <= 100) return 'Cocok untuk acara komunitas atau gathering kecil dengan budget hemat.';
            if (limit <= 200) return 'Untuk event skala menengah dengan banyak peserta.';
            return `Cetak terbatas hingga ${limit} lembar, pilihan tepat untuk efisiensi budget.`;
        }
    };

    const handleChoosePackage = (pkgId) => {
        setForm(prev => ({
            ...prev,
            service_package_id: pkgId,
            package_variant_id: '',
            extra_hours: 0,
            extra_prints: 0
        }));
        setShowVariants(true);
        setSelectedAddons({});

        setTimeout(() => {
            variantSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    };

    const handleChooseVariant = (variantId) => {
        setForm(prev => ({
            ...prev,
            package_variant_id: variantId,
            extra_hours: 0,
            extra_prints: 0
        }));

        // Scroll to bottom of variants so user sees the "Lanjut" button
        setTimeout(() => {
            variantSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
    };

    const getTemplateImageUrl = (template) => {
        if (!template) return null;
        if (template.frame_image_url) return template.frame_image_url;
        if (template.frame_image) return `/storage/${template.frame_image}`;
        if (template.preview_image) return `/storage/${template.preview_image}`;
        return null;
    };

    // Compute the variant with the highest duration_hours for this package (for Extra Hour eligibility)
    const maxDurationVariant = useMemo(() => {
        if (!selectedPackage) return null;
        const variants = (selectedPackage.package_variants || []).filter(v => v.is_unlimited && v.duration_hours != null);
        if (variants.length === 0) return null;
        return variants.reduce((best, v) =>
            Number(v.duration_hours) > Number(best.duration_hours) ? v : best
        );
    }, [selectedPackage]);

    // Compute the variant with the highest print_limit for limited-print variants (for Extra Prints eligibility)
    const maxPrintLimitVariant = useMemo(() => {
        if (!selectedPackage) return null;
        const limited = (selectedPackage.package_variants || []).filter(v => !v.is_unlimited && v.print_limit != null);
        if (limited.length === 0) return null;
        return limited.reduce((best, v) =>
            Number(v.print_limit) > Number(best.print_limit) ? v : best
        );
    }, [selectedPackage]);

    // Extra Hour is available if the variant is unlimited, has an extra_hour_price set, AND is the max duration variant
    const isExtraHourAvailable = !!(selectedVariant && selectedVariant.is_unlimited && Number(selectedVariant.extra_hour_price) > 0 && maxDurationVariant && selectedVariant.id === maxDurationVariant.id);

    // Extra Print is available if the variant is limited, has an extra_print_price set, AND is the max print limit variant
    const isExtraPrintAvailable = !!(selectedVariant && !selectedVariant.is_unlimited && Number(selectedVariant.extra_print_price) > 0 && maxPrintLimitVariant && selectedVariant.id === maxPrintLimitVariant.id);

    // Calculate dynamic total price on frontend
    const calculateTotalPrice = () => {
        let price = selectedVariant ? Number(selectedVariant.price) : 0;

        // Extra Hours cost (price per hour from selected variant DB field)
        if (form.extra_hours > 0 && selectedVariant?.extra_hour_price && isExtraHourAvailable) {
            price += form.extra_hours * Number(selectedVariant.extra_hour_price);
        }

        // Extra Prints cost (calculated per 50 prints, but price comes from DB extra_print_price per 50 prints)
        if (form.extra_prints > 0 && selectedVariant?.extra_print_price && isExtraPrintAvailable) {
            price += (form.extra_prints / 50) * Number(selectedVariant.extra_print_price);
        }

        Object.entries(selectedAddons).forEach(([addonId, qty]) => {
            const add = addonsList.find(a => a.id == addonId);
            if (add && qty > 0) {
                price += Number(add.price) * qty;
            }
        });
        return price;
    };

    // Helpers to calculate calendar grid
    const getDaysInMonth = () => {
        const firstDayIndex = new Date(year, month, 1).getDay();
        const numDays = new Date(year, month + 1, 0).getDate();
        const days = [];

        // Padding for previous month days
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(null);
        }

        // Days of current month
        for (let i = 1; i <= numDays; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const getDateStatus = (date) => {
        if (!date) return 'empty';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dCopy = new Date(date);
        dCopy.setHours(0, 0, 0, 0);

        if (dCopy < today) {
            return 'unavailable'; // Past dates are unavailable
        }

        const yyyy = dCopy.getFullYear();
        const mm = String(dCopy.getMonth() + 1).padStart(2, '0');
        const dd = String(dCopy.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        if (unavailableDates.includes(dateStr)) return 'unavailable';
        if (bookedDates.includes(dateStr)) return 'booked';

        return 'available';
    };

    const handleDateClick = (date) => {
        const status = getDateStatus(date);
        if (status === 'available') {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            setSelectedDate(date);
            updateForm('event_date', dateStr);
            setStep(1); // Advance to package selection
        }
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const prevMonth = () => {
        const today = new Date();
        if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
            setCurrentDate(new Date(year, month - 1, 1));
        }
    };

    // Toggle Addons quantity
    const handleAddonChange = (addonId, operation) => {
        setSelectedAddons(prev => {
            const currentQty = prev[addonId] || 0;
            let nextQty = currentQty;

            if (operation === 'increment') {
                nextQty = currentQty + 1;
            } else if (operation === 'decrement') {
                nextQty = Math.max(0, currentQty - 1);
            }

            const updated = { ...prev };
            if (nextQty === 0) {
                delete updated[addonId];
            } else {
                updated[addonId] = nextQty;
            }
            return updated;
        });
    };

    const canNext = () => {
        if (step === 0) return form.event_date !== '';
        if (step === 1) return form.service_package_id !== '' && form.package_variant_id !== '';
        if (step === 2) {
            if (form.use_custom_frame) {
                return !!customFrameFile;
            }
            return true;
        }
        if (step === 3) return form.customer_name && form.customer_email && form.customer_phone && form.event_name && form.event_location;
        return true;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');

        // Prepare addon array payload
        const addonsPayload = Object.entries(selectedAddons).map(([addonId, qty]) => ({
            id: Number(addonId),
            quantity: qty,
        }));

        // Combine date + time
        const eventDatetime = `${form.event_date} ${form.event_time}:00`;

        const payload = new FormData();
        payload.append('customer_name', form.customer_name);
        payload.append('customer_email', form.customer_email);
        payload.append('customer_phone', form.customer_phone);
        payload.append('event_name', form.event_name);
        payload.append('event_location', form.event_location);
        payload.append('event_datetime', eventDatetime);
        payload.append('service_package_id', form.service_package_id);
        payload.append('package_variant_id', form.package_variant_id);
        if (form.selected_template_id) {
            payload.append('selected_template_id', form.selected_template_id);
        }
        payload.append('notes', form.notes);
        payload.append('use_custom_frame', form.use_custom_frame ? '1' : '0');
        if (customFrameFile) {
            payload.append('custom_frame', customFrameFile);
        }
        // Extra Hours & Prints — only send if applicable
        payload.append('extra_hours', isMaxDurationSelected ? String(form.extra_hours) : '0');
        payload.append('extra_prints', isMaxPrintLimitSelected ? String(form.extra_prints) : '0');
        addonsPayload.forEach((item, index) => {
            payload.append(`addons[${index}][id]`, item.id);
            payload.append(`addons[${index}][quantity]`, item.quantity);
        });

        try {
            const response = await axios.post('/api/bookings', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSubmittedBooking(response.data?.data || null);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan saat memproses booking.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <GuestLayout>
                <Head title="Book our Photobooth" />
                <div className="min-h-[70vh] flex items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-primary" />
                </div>
            </GuestLayout>
        );
    }

    if (success) {
        return (
            <GuestLayout>
                <Head title="Booking Submitted Successfully" />
                <BookingSuccess
                    booking={submittedBooking}
                    customerName={form.customer_name}
                />
            </GuestLayout>
        );
    }

    return (
        <GuestLayout>
            <Head title="Premium Photobooth Vendor Booking" />
            <section className={`${art.section.pad} max-w-5xl mx-auto min-h-[70vh] pt-28 md:pt-32`}>
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: motionTokens.duration.cinematic, ease: motionTokens.ease.out }}
                    className="mb-10 md:mb-14"
                >
                    <p className={`${art.type.label} mb-4`}>book your session</p>
                    <EditorialStack
                        lines={['Book', 'Memoforia']}
                        lineClassName="type-display block"
                        animate={false}
                    />
                </motion.div>

                <StepIndicator current={step} steps={STEPS} />

                {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8 text-sm font-medium">
                        {error}
                    </div>
                )}

                <LayeredCard className="p-6 md:p-10 lg:p-12">
                    <AnimatePresence mode="wait">
                        {/* Step 0: Availability Calendar */}
                        {step === 0 && (
                            <motion.div
                                key="step0"
                                initial={{ opacity: 0, y: 32 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -24 }}
                                transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.out }}
                            >
                                <h3 className="type-shout !text-2xl md:!text-3xl mb-8 flex items-center gap-3">
                                    <Calendar size={28} className="text-primary shrink-0" /> Pilih Tanggal
                                </h3>

                                <div className="max-w-2xl mx-auto border-2 border-charcoal/10 rounded-2xl p-6 bg-off-white/80 shadow-[6px_6px_0_0_rgba(155,181,211,0.35)]">
                                    <div className="flex items-center justify-between mb-8">
                                        <h4 className="font-serif text-lg text-charcoal">
                                            {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                        </h4>
                                        <div className="flex space-x-2">
                                            <button onClick={prevMonth} className="p-2 rounded-full border border-beige hover:bg-beige text-charcoal transition-colors">
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button onClick={nextMonth} className="p-2 rounded-full border border-beige hover:bg-beige text-charcoal transition-colors">
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Days of week */}
                                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-warm-grey uppercase mb-4">
                                        <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span>
                                    </div>

                                    {/* Days grid */}
                                    <div className="grid grid-cols-7 gap-2">
                                        {getDaysInMonth().map((date, idx) => {
                                            if (!date) return <div key={`empty-${idx}`} />;
                                            const status = getDateStatus(date);
                                            const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();

                                            let btnClasses = "aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ";
                                            if (status === 'unavailable') {
                                                btnClasses += "bg-beige/40 text-warm-grey/50 line-through cursor-not-allowed";
                                            } else if (status === 'booked') {
                                                btnClasses += "bg-red-50 text-red-400 border border-red-100 cursor-not-allowed";
                                            } else {
                                                btnClasses += "bg-white border border-beige text-charcoal hover:border-primary hover:text-primary cursor-pointer ";
                                                if (isSelected) {
                                                    btnClasses += "ring-2 ring-primary bg-primary-50 border-primary text-primary font-semibold";
                                                }
                                            }

                                            return (
                                                <button key={idx} onClick={() => handleDateClick(date)} disabled={status !== 'available'} className={btnClasses}>
                                                    <span>{date.getDate()}</span>
                                                    {status === 'booked' && <span className="text-[9px] uppercase tracking-tighter text-red-500 font-medium scale-90">Reserved</span>}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Legend */}
                                    <div className="flex justify-center space-x-6 mt-8 pt-6 border-t border-beige text-xs">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full border border-beige bg-white"></div>
                                            <span className="text-slate font-light">Available</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-red-50 border border-red-100"></div>
                                            <span className="text-slate font-light">Reserved</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-beige/40"></div>
                                            <span className="text-slate font-light">Unavailable</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 1: Package Selection & Variants */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 32 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -24 }}
                                transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.out }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="type-shout !text-2xl md:!text-3xl mb-1 flex items-center gap-3">
                                        <Package size={28} className="text-primary shrink-0" /> Pilih Paket
                                    </h3>
                                    <p className="text-sm text-warm-grey font-light">Pilih paket yang paling sesuai dengan kebutuhan acara Anda.</p>
                                </div>

                                {/* Stacked full-width package cards */}
                                <div className="flex flex-col gap-5">
                                    {sortedPackages.map(pkg => {
                                        const isSelected = form.service_package_id == pkg.id;
                                        const badge = getPackageBadgeLabel(pkg);
                                        const printerInfo = getPackagePrinterInfo(pkg);
                                        const includeFeatures = getIncludeFeatures(pkg);
                                        const isPremium = (pkg?.name || '').toLowerCase().includes('premium');

                                        // Calculate starting price from cheapest variant
                                        const variantPrices = (pkg.package_variants || []).map(v => Number(v.price)).filter(p => p > 0);
                                        const startingPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : null;

                                        return (
                                            <motion.div
                                                key={pkg.id}
                                                layout
                                                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                                                className={`relative rounded-3xl border-2 transition-all duration-300 overflow-hidden bg-white ${
                                                    isSelected
                                                        ? 'border-primary shadow-[0_8px_40px_0_rgba(155,181,211,0.35)] -translate-y-1'
                                                        : isPremium
                                                            ? 'border-accent/60 shadow-[0_4px_24px_0_rgba(232,196,77,0.15)] hover:border-accent hover:shadow-[0_8px_32px_0_rgba(232,196,77,0.2)]'
                                                            : 'border-charcoal/10 shadow-[0_2px_16px_0_rgba(44,62,80,0.06)] hover:border-primary/50 hover:shadow-[0_4px_24px_0_rgba(155,181,211,0.2)]'
                                                }`}
                                            >
                                                {/* Premium top accent bar */}
                                                {isPremium && (
                                                    <div className="h-1 w-full bg-gradient-to-r from-accent via-accent-light to-accent" />
                                                )}

                                                {/* Selected indicator stripe */}
                                                {isSelected && !isPremium && (
                                                    <div className="h-1 w-full bg-gradient-to-r from-primary to-primary-light" />
                                                )}

                                                <div className="p-7 md:p-9">
                                                    {/* Card Header */}
                                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 flex-wrap mb-2">
                                                                <h4 className="font-serif text-2xl md:text-3xl text-charcoal font-semibold leading-tight">
                                                                    {pkg.name}
                                                                </h4>
                                                                {isSelected && (
                                                                    <motion.span
                                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider border border-primary/20"
                                                                    >
                                                                        <Check size={11} /> Package Terpilih
                                                                    </motion.span>
                                                                )}
                                                            </div>

                                                            {/* Starting Price */}
                                                            {startingPrice !== null && (
                                                                <div className="flex items-baseline gap-2 mt-1">
                                                                    <span className="text-xs text-warm-grey font-light">Mulai dari</span>
                                                                    <span className={`font-serif font-semibold text-2xl md:text-3xl ${isPremium ? 'text-accent' : 'text-primary'}`}>
                                                                        Rp {startingPrice.toLocaleString('id-ID')}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Category tag */}
                                                            {pkg.category && (
                                                                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-beige text-charcoal/70 text-[11px] font-semibold uppercase tracking-wider capitalize">
                                                                    {pkg.category.replace(/_/g, ' ')}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Badge */}
                                                        {badge && (
                                                            <div className="shrink-0">
                                                                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-br from-accent to-accent-light text-charcoal text-[12px] font-bold uppercase tracking-wider shadow-md">
                                                                    ★ {badge}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    <p className="text-sm md:text-base text-slate font-light leading-relaxed mb-7 max-w-3xl">
                                                        {pkg.description}
                                                    </p>

                                                    {/* Features + Printer — two column layout */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                        {/* Include Features */}
                                                        <div>
                                                            <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/60 mb-3">
                                                                Sudah Termasuk
                                                            </p>
                                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                                                                {includeFeatures.map((f, idx) => (
                                                                    <li key={idx} className="flex items-center gap-2 text-sm text-slate">
                                                                        <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                                                                            <Check size={12} />
                                                                        </span>
                                                                        <span className="leading-snug">{f}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        {/* Printer Info */}
                                                        {printerInfo && (
                                                            <div>
                                                                <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/60 mb-3">
                                                                    Layanan Cetak / Device
                                                                </p>
                                                                <div className={`inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm font-medium ${
                                                                    isPremium
                                                                        ? 'bg-amber-50/60 border-amber-200/60 text-amber-800'
                                                                        : printerInfo.isHemat
                                                                            ? 'bg-blue-50/60 border-blue-200/60 text-blue-800'
                                                                            : 'bg-beige/50 border-beige text-slate'
                                                                }`}>
                                                                    <span className="text-lg">{printerInfo.icon}</span>
                                                                    <span>{printerInfo.label}</span>
                                                                    {isPremium && (
                                                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded-full">
                                                                            Pro
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="mt-2 space-y-1">
                                                                    {printerInfo.notes.map((note, idx) => (
                                                                        <p key={idx} className="text-[11px] text-warm-grey leading-relaxed">
                                                                            • {note}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* CTA Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChoosePackage(pkg.id)}
                                                        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 border-2 ${
                                                            isSelected
                                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                                : isPremium
                                                                    ? 'bg-white text-charcoal border-accent/60 hover:bg-accent hover:border-accent hover:text-charcoal hover:shadow-md'
                                                                    : 'bg-white text-charcoal border-charcoal/15 hover:border-primary hover:text-primary hover:shadow-sm'
                                                        }`}
                                                    >
                                                        {isSelected ? (
                                                            <span className="flex items-center justify-center gap-2">
                                                                <Check size={18} /> Package Terpilih
                                                            </span>
                                                        ) : (
                                                            'Pilih Package'
                                                        )}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Variant Section — appears after package is chosen */}
                                <div ref={variantSectionRef} />

                                {showVariants && selectedPackage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                        className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary-50/60 to-white overflow-hidden shadow-[0_4px_32px_0_rgba(155,181,211,0.2)]"
                                    >
                                        {/* Variant section header */}
                                        <div className="px-7 md:px-9 py-6 border-b border-primary/10 bg-primary/5">
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1">Langkah berikutnya</p>
                                            <h4 className="font-serif text-xl md:text-2xl text-charcoal font-semibold">
                                                Varian {selectedPackage.name}
                                            </h4>
                                            <p className="text-sm text-warm-grey font-light mt-1">
                                                Pilih durasi atau jumlah cetakan sesuai kebutuhan acara Anda.
                                            </p>
                                        </div>

                                        <div className="px-7 md:px-9 py-7">
                                            {/* Group variants: unlimited vs limited */}
                                            {(() => {
                                                const variants = selectedPackage.package_variants || [];
                                                const unlimitedVariants = variants.filter(v => v.is_unlimited);
                                                const limitedVariants = variants.filter(v => !v.is_unlimited);

                                                const VariantCard = ({ variant }) => {
                                                    const isSelected = form.package_variant_id == variant.id;
                                                    const desc = getVariantDescription(variant);

                                                    // Extra Hour: only for selected unlimited variant that has an extra_hour_price and is the max duration variant
                                                    const showExtraHour = isSelected &&
                                                        variant.is_unlimited &&
                                                        Number(variant.extra_hour_price) > 0 &&
                                                        maxDurationVariant?.id === variant.id;

                                                    // Extra Prints: only for selected limited variant that has an extra_print_price and is the max print limit variant
                                                    const showExtraPrints = isSelected &&
                                                        !variant.is_unlimited &&
                                                        Number(variant.extra_print_price) > 0 &&
                                                        maxPrintLimitVariant?.id === variant.id;

                                                    return (
                                                        <div
                                                            key={variant.id}
                                                            onClick={() => handleChooseVariant(variant.id)}
                                                            className={`w-full p-6 md:p-8 rounded-3xl border-2 text-left transition-all duration-300 relative overflow-hidden cursor-pointer bg-white ${
                                                                isSelected
                                                                    ? 'border-primary shadow-[0_8px_32px_0_rgba(155,181,211,0.25)]'
                                                                    : 'border-charcoal/10 hover:border-primary/50 hover:shadow-md'
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <span className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                                                    <Check size={11} /> Terpilih
                                                                </span>
                                                            )}

                                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                                                <div className="flex-1">
                                                                    <h5 className={`font-serif text-lg md:text-xl font-semibold leading-tight ${isSelected ? 'text-primary' : 'text-charcoal'}`}>
                                                                        {variant.name}
                                                                    </h5>

                                                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                                                        {!!variant.is_unlimited && (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                                                <Check size={10} strokeWidth={3} /> Unlimited Cetak
                                                                            </span>
                                                                        )}
                                                                        {!!variant.duration_hours && (
                                                                            <span className="text-xs text-warm-grey bg-beige/50 px-2.5 py-0.5 rounded-md">
                                                                                ⏱ {variant.duration_hours} Jam
                                                                            </span>
                                                                        )}
                                                                        {!!variant.print_limit && (
                                                                            <span className="text-xs text-warm-grey bg-beige/50 px-2.5 py-0.5 rounded-md">
                                                                                🖼 {variant.print_limit} Lembar Cetakan
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="text-left md:text-right mt-1 md:mt-0 shrink-0">
                                                                    <p className={`text-2xl font-serif font-semibold ${isSelected ? 'text-primary' : 'text-charcoal'}`}>
                                                                        Rp {Number(variant.price).toLocaleString('id-ID')}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <p className="text-sm text-slate font-light leading-relaxed mb-4 italic">
                                                                "{desc}"
                                                            </p>

                                                            {!variant.is_unlimited && (
                                                                <p className="text-[11px] text-warm-grey/90 italic mb-4 leading-relaxed">
                                                                    *Harga lebih mahal karena durasi penggunaan dapat berlangsung seharian sesuai kebutuhan event.
                                                                </p>
                                                            )}

                                                            {/* Extra Hour Counter — only for max-duration selected variant */}
                                                            {showExtraHour && (
                                                                <div
                                                                    className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/20"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-2">Tambah Durasi Acara</p>
                                                                    <p className="text-xs text-warm-grey mb-3">
                                                                        +Rp {Number(variant.extra_hour_price).toLocaleString('id-ID')} / jam tambahan
                                                                    </p>
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, extra_hours: Math.max(0, prev.extra_hours - 1) })); }}
                                                                            className="w-9 h-9 rounded-full border-2 border-primary/30 bg-white text-primary font-bold text-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                                                                        >−</button>
                                                                        <span className="text-lg font-serif font-semibold text-charcoal w-8 text-center">{form.extra_hours}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, extra_hours: prev.extra_hours + 1 })); }}
                                                                            className="w-9 h-9 rounded-full border-2 border-primary/30 bg-white text-primary font-bold text-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                                                                        >+</button>
                                                                        <span className="text-sm text-slate font-light">
                                                                            {form.extra_hours > 0
                                                                                ? `+${form.extra_hours} jam (+Rp ${(form.extra_hours * Number(variant.extra_hour_price)).toLocaleString('id-ID')})`
                                                                                : 'Tidak ada tambahan durasi'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Extra Prints Counter — only for selected limited variant */}
                                                            {showExtraPrints && (
                                                                <div
                                                                    className="mt-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700/80 mb-2">Tambah Cetakan</p>
                                                                    <p className="text-xs text-warm-grey mb-3">
                                                                        +Rp {Number(variant.extra_print_price).toLocaleString('id-ID')} per 50 lembar cetak tambahan
                                                                    </p>
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, extra_prints: Math.max(0, prev.extra_prints - 50) })); }}
                                                                            className="w-9 h-9 rounded-full border-2 border-amber-300 bg-white text-amber-700 font-bold text-lg flex items-center justify-center hover:bg-amber-100 transition-colors"
                                                                        >−</button>
                                                                        <span className="text-lg font-serif font-semibold text-charcoal w-12 text-center">{form.extra_prints}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, extra_prints: prev.extra_prints + 50 })); }}
                                                                            className="w-9 h-9 rounded-full border-2 border-amber-300 bg-white text-amber-700 font-bold text-lg flex items-center justify-center hover:bg-amber-100 transition-colors"
                                                                        >+</button>
                                                                        <span className="text-sm text-slate font-light">
                                                                            {form.extra_prints > 0
                                                                                ? `+${form.extra_prints} lembar (+Rp ${((form.extra_prints / 50) * Number(variant.extra_print_price)).toLocaleString('id-ID')})`
                                                                                : 'Tidak ada tambahan cetakan'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleChooseVariant(variant.id);
                                                                }}
                                                                className={`w-full mt-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 border-2 ${
                                                                    isSelected
                                                                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/10'
                                                                        : 'bg-white text-charcoal border-charcoal/15 hover:border-primary hover:text-primary'
                                                                }`}
                                                            >
                                                                {isSelected ? 'Variant Terpilih ✓' : 'Pilih Variant ini'}
                                                            </button>
                                                        </div>
                                                    );
                                                };

                                                return (
                                                    <div className="space-y-7">
                                                        {unlimitedVariants.length > 0 && (
                                                            <div>
                                                                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600/80 mb-3 flex items-center gap-2">
                                                                    <span className="w-4 h-0.5 bg-emerald-400 rounded inline-block" />
                                                                    Unlimited Prints
                                                                </p>
                                                                <div className="flex flex-col gap-4">
                                                                    {unlimitedVariants.map(v => <VariantCard key={v.id} variant={v} />)}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {limitedVariants.length > 0 && (
                                                            <div>
                                                                <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/50 mb-3 flex items-center gap-2">
                                                                    <span className="w-4 h-0.5 bg-charcoal/30 rounded inline-block" />
                                                                    Limited Prints
                                                                </p>
                                                                <div className="flex flex-col gap-4">
                                                                    {limitedVariants.map(v => <VariantCard key={v.id} variant={v} />)}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {unlimitedVariants.length === 0 && limitedVariants.length === 0 && (
                                                            <p className="text-sm text-slate/60">Belum ada varian tersedia untuk paket ini.</p>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Price summary shown after variant is selected */}
                                {selectedVariant && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="mt-2 px-1"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/5 rounded-2xl px-6 py-4 border border-primary/15">
                                            <div>
                                                <p className="text-xs text-warm-grey">Estimasi Harga Saat Ini</p>
                                                <p className="text-xl font-serif font-bold text-charcoal mt-0.5">
                                                    Rp {calculateTotalPrice().toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <p className="text-xs text-warm-grey font-light">
                                                Klik <strong>Lanjut</strong> untuk memilih template &amp; layanan tambahan.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 2: Photo Templates & Addons */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, y: 32 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -24 }}
                                transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.out }}
                                className="space-y-8"
                            >
                                <h3 className="type-shout !text-2xl md:!text-3xl mb-2">Frame & Addons</h3>

                                <div>
                                    <h4 className="font-serif text-md text-charcoal mb-4">A. Frame yang Tersedia di MemoForia</h4>
                                    <p className="text-xs text-warm-grey mb-4">Frame bersifat referensi. Anda tidak wajib memilih frame. Jika ingin menggunakan frame custom, pilih opsi di bawah.</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                                        {templatesList.map(template => {
                                            const imageUrl = getTemplateImageUrl(template);
                                            return (
                                                <button
                                                    key={template.id}
                                                    type="button"
                                                    onClick={() => updateForm('selected_template_id', template.id)}
                                                    className={`rounded-2xl border-2 text-left transition-all bg-white relative overflow-hidden flex flex-col ${
                                                        form.selected_template_id == template.id
                                                            ? 'border-primary shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.15)] bg-primary-50/30'
                                                            : 'border-beige hover:border-primary-200'
                                                    }`}
                                                >
                                                    {/* Preview Image */}
                                                    {imageUrl ? (
                                                        <div className="w-full bg-neutral-100 flex items-center justify-center overflow-hidden">
                                                            <img
                                                                src={imageUrl}
                                                                alt={`Preview ${template.name}`}
                                                                className="w-full h-auto object-contain max-h-64"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-full bg-beige/30 flex items-center justify-center" style={{ minHeight: '8rem' }}>
                                                            <span className="text-warm-grey text-xs">Preview tidak tersedia</span>
                                                        </div>
                                                    )}

                                                    {/* Info */}
                                                    <div className="p-3">
                                                        <h5 className="font-semibold text-charcoal text-xs leading-tight">{template.name}</h5>
                                                        <p className="text-[10px] text-warm-grey mt-0.5">{template.size} · {template.layout_type}</p>
                                                        <p className="text-[10px] text-slate font-light">{template.frame_type}</p>
                                                    </div>

                                                    {/* Selected badge */}
                                                    {form.selected_template_id == template.id && (
                                                        <span className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow">
                                                            <Check size={10} />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <h4 className="font-serif text-md text-charcoal mb-4">B. Apakah Anda ingin menggunakan frame custom?</h4>
                                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                                        {['Tidak', 'Ya'].map((option) => (
                                            <button key={option} type="button" onClick={() => {
                                                const useCustom = option === 'Ya';
                                                updateForm('use_custom_frame', useCustom);
                                                if (!useCustom) {
                                                    setCustomFrameFile(null);
                                                }
                                            }}
                                                className={`px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-colors ${form.use_custom_frame === (option === 'Ya') ? 'bg-primary text-white border-primary' : 'bg-white border-beige text-charcoal hover:border-primary'}`}>
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                    {form.use_custom_frame && (
                                        <div className="mb-8">
                                            <label className="block text-xs font-semibold text-charcoal mb-2">Upload Frame Custom</label>
                                            <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={e => setCustomFrameFile(e.target.files?.[0] || null)}
                                                className="w-full text-xs text-slate" />
                                            <p className="mt-2 text-xs text-warm-grey">Frame yang diunggah akan digunakan pada hari acara dan akan direview terlebih dahulu oleh tim MemoForia. Maksimal 10 MB.</p>
                                        </div>
                                    )}
                                    <h4 className="font-serif text-md text-charcoal mb-4">C. Tambahkan Addons Acara (Opsional):</h4>
                                    {selectedPackage ? (
                                        (() => {
                                            const filteredAddons = getAdditionalServicesFromAddons(selectedPackage);
                                            if (filteredAddons.length === 0) {
                                                return <p className="text-sm text-warm-grey">Tidak ada layanan tambahan tersedia untuk paket ini.</p>;
                                            }
                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {filteredAddons.map((s) => {
                                                        const isAddonChecked = (selectedAddons[s.id] || 0) > 0;
                                                        return (
                                                            <label
                                                                key={s.id}
                                                                htmlFor={`addon-step2-${s.id}`}
                                                                className={`flex items-start justify-between gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                                                                    isAddonChecked
                                                                        ? 'border-primary bg-primary/5 shadow-sm'
                                                                        : 'border-beige bg-white hover:border-primary/40 hover:bg-beige/30'
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                    <div className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all mt-0.5 ${
                                                                        isAddonChecked ? 'bg-primary border-primary' : 'border-beige bg-white'
                                                                    }`}>
                                                                        {isAddonChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                                                                    </div>
                                                                    <input
                                                                        id={`addon-step2-${s.id}`}
                                                                        type="checkbox"
                                                                        className="sr-only"
                                                                        checked={isAddonChecked}
                                                                        onChange={(e) => handleAddonChange(s.id, e.target.checked ? 'increment' : 'decrement')}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm text-charcoal font-semibold leading-snug">{s.name}</span>
                                                                        <span className="text-xs text-warm-grey mt-1 font-light leading-normal">{s.description || 'Layanan tambahan untuk melengkapi event Anda.'}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0 mt-0.5">
                                                                    <span className={`text-sm font-serif font-semibold ${
                                                                        isAddonChecked ? 'text-primary' : 'text-charcoal/80'
                                                                    }`}>
                                                                        +Rp {Number(s.price).toLocaleString('id-ID')}
                                                                    </span>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <p className="text-sm text-warm-grey italic">Pilih paket terlebih dahulu di langkah sebelumnya untuk melihat layanan tambahan.</p>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Event Details Form */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, y: 32 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -24 }}
                                transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.out }}
                            >
                                <h3 className="type-shout !text-2xl md:!text-3xl mb-8 flex items-center gap-3">
                                    <User size={28} className="text-primary shrink-0" /> Data Acara
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <h4 className="font-serif text-sm text-primary uppercase tracking-wider border-b border-beige pb-2">Kontak Pelanggan</h4>
                                        <div>
                                            <label className="block text-xs font-semibold text-charcoal mb-2">Nama Lengkap Pemesan *</label>
                                            <input type="text" value={form.customer_name} onChange={e => updateForm('customer_name', e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white text-sm" placeholder="Masukkan nama Anda" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-charcoal mb-2">Email Pemesan *</label>
                                            <input type="email" value={form.customer_email} onChange={e => updateForm('customer_email', e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white text-sm" placeholder="email@contoh.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-charcoal mb-2">Nomor WhatsApp *</label>
                                            <input type="tel" value={form.customer_phone} onChange={e => updateForm('customer_phone', e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white text-sm" placeholder="0812-xxxx-xxxx" />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="font-serif text-sm text-primary uppercase tracking-wider border-b border-beige pb-2">Informasi Event</h4>
                                        <div>
                                            <label className="block text-xs font-semibold text-charcoal mb-2">Nama Event Acara *</label>
                                            <input type="text" value={form.event_name} onChange={e => updateForm('event_name', e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white text-sm" placeholder="Contoh: Pernikahan Budi & Wati" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-2">Tanggal Acara</label>
                                                <input type="text" readOnly value={form.event_date} className="w-full px-4 py-2.5 rounded-xl border-2 border-beige bg-beige/20 text-warm-grey focus:outline-none text-sm cursor-not-allowed" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-2">Jam Acara *</label>
                                                <input type="time" value={form.event_time} onChange={e => updateForm('event_time', e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-charcoal mb-2">Alamat / Lokasi Acara *</label>
                                            <input type="text" value={form.event_location} onChange={e => updateForm('event_location', e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white text-sm" placeholder="Gedung, Hotel, atau Alamat lengkap" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-charcoal mb-2">Catatan Tambahan</label>
                                            <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={2}
                                                className="w-full px-4 py-2.5 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white text-sm resize-none" placeholder="Instruksi tambahan bagi tim vendor..." />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Summary & Confirmation */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, y: 32 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -24 }}
                                transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease.out }}
                            >
                                <h3 className="type-shout !text-2xl md:!text-3xl mb-8 flex items-center gap-3">
                                    <CheckCircle size={28} className="text-primary shrink-0" /> Konfirmasi
                                </h3>

                                <div className="bg-primary-50/80 rounded-2xl p-6 md:p-8 space-y-4 border-2 border-charcoal/10 max-w-2xl mx-auto shadow-[6px_6px_0_0_rgba(155,181,211,0.4)]">
                                    <div className="flex justify-between border-b border-primary-100/50 pb-2.5 text-sm">
                                        <span className="text-slate font-light">Jenis Acara</span>
                                        <span className="font-semibold text-charcoal">{form.event_name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-primary-100/50 pb-2.5 text-sm">
                                        <span className="text-slate font-light">Lokasi Acara</span>
                                        <span className="font-semibold text-charcoal">{form.event_location}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-primary-100/50 pb-2.5 text-sm">
                                        <span className="text-slate font-light">Waktu Acara</span>
                                        <span className="font-semibold text-charcoal">{form.event_date} (Jam {form.event_time})</span>
                                    </div>
                                    <div className="flex justify-between border-b border-primary-100/50 pb-2.5 text-sm">
                                        <span className="text-slate font-light">Paket Layanan</span>
                                        <span className="font-semibold text-charcoal">{selectedPackage?.name} ({selectedVariant?.name})</span>
                                    </div>

                                    {/* Extra Hour row */}
                                    {isExtraHourAvailable && form.extra_hours > 0 && (
                                        <div className="flex justify-between border-b border-primary-100/50 pb-2.5 text-sm">
                                            <span className="text-slate font-light">Tambah Durasi (+{form.extra_hours} jam)</span>
                                            <span className="font-semibold text-charcoal">
                                                +Rp {(form.extra_hours * Number(selectedVariant?.extra_hour_price || 0)).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Extra Prints row */}
                                    {isExtraPrintAvailable && form.extra_prints > 0 && (
                                        <div className="flex justify-between border-b border-primary-100/50 pb-2.5 text-sm">
                                            <span className="text-slate font-light">Tambah Cetakan (+{form.extra_prints} lembar)</span>
                                            <span className="font-semibold text-charcoal">
                                                +Rp {((form.extra_prints / 50) * Number(selectedVariant?.extra_print_price || 0)).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between border-b border-primary-100/50 pb-2.5 text-sm gap-3">
                                        <span className="text-slate font-light shrink-0">Frame Layout</span>
                                        <div className="flex items-center gap-2 justify-end">
                                            {selectedTemplate?.preview_image && (
                                                <img
                                                    src={selectedTemplate.preview_image}
                                                    alt={selectedTemplate.name}
                                                    className="h-12 w-auto object-contain rounded border border-beige"
                                                />
                                            )}
                                            <span className="font-semibold text-charcoal text-right">{selectedTemplate?.name} ({selectedTemplate?.size})</span>
                                        </div>
                                    </div>

                                    {/* Addons summary */}
                                    {Object.keys(selectedAddons).length > 0 && (
                                        <div className="border-b border-primary-100/50 pb-2.5 text-sm">
                                            <span className="text-slate font-light block mb-2">Tambahan Addons:</span>
                                            <div className="space-y-1 pl-4">
                                                {Object.entries(selectedAddons).map(([addonId, qty]) => {
                                                    const add = addonsList.find(a => a.id == addonId);
                                                    return (
                                                        <div key={addonId} className="flex justify-between text-xs font-medium text-slate">
                                                            <span>• {add?.name} (x{qty})</span>
                                                            <span>Rp {(Number(add?.price) * qty).toLocaleString('id-ID')}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between border-b border-primary-100/50 pb-2.5 text-sm">
                                        <span className="text-slate font-light">WhatsApp Pemesan</span>
                                        <span className="font-semibold text-charcoal">{form.customer_phone}</span>
                                    </div>
                                    <div className="flex justify-between pt-2">
                                        <span className="text-charcoal font-semibold text-lg">Total Estimasi Harga</span>
                                        <span className="text-2xl font-serif text-primary font-semibold">Rp {calculateTotalPrice().toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex flex-col sm:flex-row justify-between gap-4 mt-10 pt-8 border-t-2 border-charcoal/10">
                        <ChunkyButton
                            type="button"
                            variant="ghost"
                            onClick={() => setStep((s) => s - 1)}
                            disabled={step === 0}
                            className="!shadow-none"
                        >
                            <ArrowLeft size={18} /> Kembali
                        </ChunkyButton>
                        {step < 4 ? (
                            <ChunkyButton type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                                Lanjut <ArrowRight size={18} />
                            </ChunkyButton>
                        ) : (
                            <ChunkyButton type="button" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" /> Mengirim...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} /> Ajukan Booking
                                    </>
                                )}
                            </ChunkyButton>
                        )}
                    </div>
                </LayeredCard>
            </section>
        </GuestLayout>
    );
}
