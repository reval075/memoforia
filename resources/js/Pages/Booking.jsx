import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
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

    const selectedPackage = packages.find(p => p.id == form.service_package_id);
    const selectedVariant = selectedPackage?.package_variants?.find(v => v.id == form.package_variant_id);
    const selectedTemplate = templatesList.find(t => t.id == form.selected_template_id);

    const getTemplateImageUrl = (template) => {
        if (!template) return null;
        if (template.frame_image_url) return template.frame_image_url;
        if (template.frame_image) return `/storage/${template.frame_image}`;
        if (template.preview_image) return `/storage/${template.preview_image}`;
        return null;
    };

    // Calculate dynamic total price on frontend
    const calculateTotalPrice = () => {
        let price = selectedVariant ? Number(selectedVariant.price) : 0;
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
                                className="space-y-8"
                            >
                                <h3 className="type-shout !text-2xl md:!text-3xl mb-2 flex items-center gap-3">
                                    <Package size={28} className="text-primary shrink-0" /> Pilih Paket
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {packages.map(pkg => (
                                        <button key={pkg.id} onClick={() => { updateForm('service_package_id', pkg.id); updateForm('package_variant_id', ''); }}
                                            className={`p-5 rounded-2xl border-2 text-left transition-all shadow-[4px_4px_0_0_rgba(44,62,80,0.08)] ${form.service_package_id == pkg.id ? 'border-primary bg-primary-50/60 -translate-y-1' : 'border-charcoal/10 hover:border-primary bg-white'}`}>
                                            <h4 className="font-serif text-md text-charcoal font-semibold mb-1">{pkg.name}</h4>
                                            <p className="text-xs text-warm-grey capitalize">Kategori: {pkg.category?.replace('_', ' ')}</p>
                                            <p className="text-xs text-slate font-light mt-2 line-clamp-3">{pkg.description}</p>
                                        </button>
                                    ))}
                                </div>

                                {selectedPackage && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-off-white/50 p-6 rounded-2xl border border-beige">
                                        <h4 className="font-serif text-md text-charcoal mb-4">Pilih Varian Durasi / Jumlah Cetakan:</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {selectedPackage.package_variants?.map(variant => (
                                                <button key={variant.id} onClick={() => updateForm('package_variant_id', variant.id)}
                                                    className={`p-5 rounded-xl border-2 text-left transition-all relative overflow-hidden bg-white ${form.package_variant_id == variant.id ? 'border-primary bg-primary-50/20' : 'border-beige hover:border-primary-200'}`}>
                                                    <h5 className="font-medium text-sm text-charcoal mb-1">{variant.name}</h5>
                                                    <p className="text-lg font-serif text-primary mt-1">Rp {Number(variant.price).toLocaleString('id-ID')}</p>
                                                    
                                                    {variant.duration_hours && <span className="text-[10px] text-warm-grey uppercase tracking-wider block mt-2">Operational: {variant.duration_hours} Jam</span>}
                                                    {variant.print_limit && <span className="text-[10px] text-warm-grey uppercase tracking-wider block mt-2">Batas Cetak: {variant.print_limit} Lembar</span>}
                                                    {variant.is_unlimited ? <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider block mt-1">Cetak Unlimited</span> : null}
                                                </button>
                                            ))}
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {addonsList.map(addon => {
                                            const qty = selectedAddons[addon.id] || 0;
                                            return (
                                                <div key={addon.id} className="p-4 rounded-xl border border-beige bg-off-white/40 flex items-center justify-between">
                                                    <div className="max-w-[70%]">
                                                        <h5 className="font-medium text-sm text-charcoal">{addon.name}</h5>
                                                        <p className="text-xs text-slate font-light mt-1 leading-relaxed">{addon.description}</p>
                                                        <p className="text-sm font-serif text-primary mt-1">Rp {Number(addon.price).toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => handleAddonChange(addon.id, 'decrement')} className="w-8 h-8 rounded-full border border-beige hover:bg-beige text-charcoal font-bold flex items-center justify-center">-</button>
                                                        <span className="font-semibold text-sm w-4 text-center">{qty}</span>
                                                        <button onClick={() => handleAddonChange(addon.id, 'increment')} className="w-8 h-8 rounded-full border border-beige hover:bg-beige text-charcoal font-bold flex items-center justify-center">+</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
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
