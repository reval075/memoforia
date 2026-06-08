import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, Mail, MessageSquare, ArrowRight, Sparkles, Navigation } from 'lucide-react';
import ChunkyButton from '@/components/art/ChunkyButton';
import LayeredCard from '@/components/art/LayeredCard';
import { branchConfig, openWhatsApp, openGoogleMaps, sendEmail } from '@/config/branchData';
import { motionTokens } from '@/motion';

function InfoSection({ icon: Icon, label, value, action, actionLabel }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            className="flex items-start gap-4 group"
        >
            <div className="p-3 bg-primary-50 rounded-xl shrink-0">
                <Icon size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest text-warm-grey mb-1">{label}</p>
                <p className="text-sm md:text-base text-charcoal font-medium break-words">{value}</p>
                {action && (
                    <button
                        onClick={action}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors font-semibold uppercase tracking-widest"
                    >
                        {actionLabel} <ArrowRight size={12} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

export default function Locations({ locations = [] }) {
    // Use first active branch or config data
    const branch = locations.find(b => b.is_active) || {
        name: branchConfig.name,
        address: branchConfig.address,
        city: branchConfig.city,
        province: branchConfig.province,
        postal_code: branchConfig.postalCode,
        phone: branchConfig.phone,
        email: branchConfig.email,
        whatsapp_number: branchConfig.whatsapp,
        operating_hours: branchConfig.operatingHours,
        description: branchConfig.description,
        image: branchConfig.image,
        maps_link: branchConfig.mapsLink,
        latitude: branchConfig.latitude,
        longitude: branchConfig.longitude,
    };

    return (
        <GuestLayout>
            <Head title="Photobox MemoForia di Kalaswara" />

            {/* ═══ SECTION 1: HERO ═══ */}
            <section className="relative pt-32 pb-16 md:pb-24 px-6 overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-off-white to-primary-100/30" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative max-w-6xl mx-auto"
                >
                    <motion.div className="flex items-center justify-center gap-3 mb-6">
                        <Sparkles size={18} className="text-accent" />
                        <p className="text-primary uppercase tracking-widest text-sm font-semibold">Partner Lokasi</p>
                        <Sparkles size={18} className="text-accent" />
                    </motion.div>

                    <h1 className="text-center text-4xl md:text-6xl lg:text-7xl font-serif text-charcoal mb-6 leading-tight">
                        Photobox <span className="text-primary">MemoForia</span>
                    </h1>

                    <p className="text-center text-base md:text-lg text-slate font-light max-w-2xl mx-auto leading-relaxed">
                        Nikmati pengalaman photobox premium MemoForia di Kalaswara, coffee shop favorit di Bandung. Lokasi nyaman dengan berbagai pilihan backdrop dan properti profesional.
                    </p>
                </motion.div>
            </section>

            {/* ═══ SECTION 2: BRANCH HEADER WITH IMAGE ═══ */}
            <section className="px-6 max-w-6xl mx-auto mb-12 md:mb-16">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.8 }}
                >
                    <LayeredCard className="overflow-hidden" hover={false}>
                        {/* Image Hero */}
                        <div className="relative h-72 md:h-96 overflow-hidden bg-gradient-to-br from-primary-100 to-primary-50">
                            {branch.image ? (
                                <img
                                    src={branch.image}
                                    alt={branch.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <MapPin size={48} className="text-primary/40 mx-auto mb-4" />
                                        <p className="text-warm-grey text-sm">Belum ada foto lokasi</p>
                                    </div>
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/20 to-transparent" />

                            {/* Title overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                                <h2 className="text-white text-3xl md:text-4xl font-serif mb-2">{branch.name}</h2>
                                <p className="text-white/80 text-sm md:text-base">
                                    {branch.city}, {branch.province}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        {branch.description && (
                            <div className="p-6 md:p-8 border-t-2 border-beige/50 bg-off-white">
                                <p className="text-slate text-base font-light leading-relaxed">
                                    {branch.description}
                                </p>
                            </div>
                        )}
                    </LayeredCard>
                </motion.div>
            </section>

            {/* ═══ SECTION 3: BRANCH INFORMATION ═══ */}
            <section className="px-6 max-w-6xl mx-auto mb-16 md:mb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LEFT: Address & Operating Hours */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="space-y-8">
                            <h3 className="text-3xl md:text-4xl font-serif text-charcoal">
                                Informasi Lokasi
                            </h3>

                            <div className="space-y-6">
                                {/* Address */}
                                <InfoSection
                                    icon={MapPin}
                                    label="Alamat Lengkap"
                                    value={`${branch.address}, ${branch.city}, ${branch.province} ${branch.postal_code || ''}`}
                                    action={openGoogleMaps}
                                    actionLabel="Buka di Maps"
                                />

                                {/* Operating Hours */}
                                <InfoSection
                                    icon={Clock}
                                    label="Jam Operasional"
                                    value={branch.operating_hours}
                                />

                                {/* Phone */}
                                {branch.phone && (
                                    <InfoSection
                                        icon={Phone}
                                        label="Telepon"
                                        value={branch.phone}
                                        action={() => window.location.href = `tel:${branch.phone.replace(/\D/g, '')}`}
                                        actionLabel="Hubungi"
                                    />
                                )}

                                {/* Email */}
                                {branch.email && (
                                    <InfoSection
                                        icon={Mail}
                                        label="Email"
                                        value={branch.email}
                                        action={() => sendEmail('Inquiry - MemoForia')}
                                        actionLabel="Kirim Email"
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT: Map */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <LayeredCard className="overflow-hidden h-full" hover={false}>
                            <div className="p-6 md:p-8 h-full flex flex-col">
                                <h3 className="text-2xl font-serif text-charcoal mb-4">
                                    Lokasi di Peta
                                </h3>

                                {/* Embedded Google Maps */}
                                <div className="flex-1 rounded-xl overflow-hidden border-2 border-beige/30">
                                    <iframe
                                        src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.8328405!2d${branch.longitude}!3d${branch.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68e90053cb8f2b%3A0xe078050100cefef6!2sKalaswara!5e0!3m2!1sid!2sid!4v1717158000000`}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen=""
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        className="w-full h-full"
                                    />
                                </div>
                            </div>
                        </LayeredCard>
                    </motion.div>
                </div>
            </section>

            {/* ═══ SECTION 4: ACTION BUTTONS ═══ */}
            <section className="px-6 max-w-6xl mx-auto mb-20 md:mb-24">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <h3 className="text-3xl md:text-4xl font-serif text-charcoal mb-8">
                        Hubungi Kami
                    </h3>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
                        {/* Google Maps Button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={openGoogleMaps}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-primary text-primary rounded-full hover:bg-primary hover:text-white transition-all font-semibold uppercase tracking-widest text-sm shadow-lg shadow-primary/10"
                        >
                            <Navigation size={18} />
                            Lihat di Google Maps
                        </motion.button>

                        {/* WhatsApp Button */}
                        {branch.whatsapp_number && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() =>
                                    openWhatsApp(
                                        'Halo Kalaswara, saya tertarik untuk booking photobox MemoForia. Berapa harga dan waktu ketersediaan yang tersedia?'
                                    )
                                }
                                className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all font-semibold uppercase tracking-widest text-sm shadow-lg shadow-green-500/25"
                            >
                                <MessageSquare size={18} />
                                WhatsApp
                            </motion.button>
                        )}

                        {/* Email Button */}
                        {branch.email && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => sendEmail('Booking Photobox - Kalaswara')}
                                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all font-semibold uppercase tracking-widest text-sm shadow-lg shadow-blue-500/25"
                            >
                                <Mail size={18} />
                                Kirim Email
                            </motion.button>
                        )}
                    </div>

                    <p className="text-slate text-sm font-light mt-6 max-w-md mx-auto leading-relaxed">
                        Hubungi Kalaswara Coffee Shop untuk booking photobox MemoForia dan informasi lebih lanjut tentang paket yang tersedia.
                    </p>
                </motion.div>
            </section>

            {/* ═══ SECTION 6: CTA ═══ */}
            <section className="px-6 py-20 md:py-28 bg-gradient-to-br from-primary/90 to-primary-dark text-white">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <h2 className="text-3xl md:text-5xl font-serif mb-6">Siap untuk Momen Spesial?</h2>
                    <p className="text-white/80 text-base md:text-lg font-light mb-10">
                        Booking sekarang dan dapatkan pengalaman photobooth terbaik bersama MemoForia.
                    </p>
                    <div className="flex justify-center">
                        <Link
                            href="/booking"
                            className="inline-flex items-center justify-center gap-2 bg-white text-[#243B53] hover:bg-[#243B53] hover:text-white border-2 border-transparent hover:border-white/20 px-8 py-3.5 rounded-full text-sm uppercase tracking-widest font-bold transition-all duration-300 shadow-md"
                        >
                            BOOK SESSION <ArrowRight size={16} />
                        </Link>
                    </div>
                </motion.div>
            </section>
        </GuestLayout>
    );
}

