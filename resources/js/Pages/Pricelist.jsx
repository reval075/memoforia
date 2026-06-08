import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

const formatIdr = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

export default function Pricelist({ packages = [], addons = [] }) {
    // Find the three main packages in the database dynamically
    const hematPkg = packages.find(p => p.category === 'hemat');
    const basicPkg = packages.find(p => p.category === 'basic');
    const premiumPkg = packages.find(p => p.category === 'premium');

    // Define the custom visual presentation configurations for the cards
    const mainPackages = [
        {
            pkg: hematPkg,
            id: 'hemat',
            title: 'PACKAGE HEMAT',
            desc: 'Paket ekonomis yang sangat cocok untuk dokumentasi digital. Dapatkan akses file foto digital berkualitas tinggi sepuasnya tanpa layanan cetak fisik.',
            features: [
                'Unlimited Softfile',
                'QR Code Gallery',
                'GIF',
                'Free Custom Template',
                'Tiket Antrian',
                'Supporting Crew'
            ],
            printerLabel: 'Output',
            printerValue: 'Softfile Only',
            additional: [
                'Custom Background'
            ],
            badge: 'Dokumentasi Digital',
            cardClass: 'border-2 border-primary-100 hover:border-primary-200 shadow-md shadow-primary/5 bg-white',
            badgeClass: 'bg-primary-50 text-primary-dark',
        },
        {
            pkg: basicPkg,
            id: 'basic',
            title: 'PACKAGE BASIC',
            desc: 'Pilihan ideal untuk event skala kecil hingga menengah. Menggunakan printer inkjet berkualitas tinggi dengan hasil cetak tajam dan warna yang baik.',
            features: [
                'Softfile',
                'Unlimited Prints',
                'Limited Prints',
                'QR Code Gallery',
                'GIF',
                'Free Custom Template',
                'Tiket Antrian',
                'Supporting Crew'
            ],
            printerLabel: 'Printer',
            printerValue: 'Inkjet Printer',
            additional: [
                'Keychain 10 pcs',
                'Custom Background'
            ],
            badge: 'Recommended / Pilihan Utama',
            cardClass: 'border-2 border-primary shadow-xl shadow-primary/10 relative bg-white ring-4 ring-primary-50/50',
            badgeClass: 'bg-primary text-white font-semibold',
        },
        {
            pkg: premiumPkg,
            id: 'premium',
            title: 'PACKAGE PREMIUM',
            desc: 'Layanan photobooth premium untuk event berskala besar. Menggunakan thermal printer profesional dengan proses cetak super cepat, tahan lama, dan kualitas hasil yang konsisten.',
            features: [
                'Softfile',
                'Unlimited Prints',
                'Limited Prints',
                'QR Code Gallery',
                'GIF',
                'Free Custom Template',
                'Tiket Antrian',
                'Supporting Crew'
            ],
            printerLabel: 'Printer',
            printerValue: 'Thermal Printer',
            additional: [
                'Keychain 10 pcs',
                'Custom Background'
            ],
            badge: 'Premium Event Tier',
            cardClass: 'border-2 border-charcoal/20 shadow-lg shadow-charcoal/5 bg-gradient-to-b from-white to-primary-50/10',
            badgeClass: 'bg-charcoal text-white font-semibold',
        }
    ];

    return (
        <GuestLayout>
            <Head title="Packages & Pricing" />

            <section className="py-20 px-6 max-w-5xl mx-auto min-h-[70vh]">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <p className="text-primary uppercase tracking-widest text-xs font-semibold mb-3 flex items-center justify-center gap-1.5">
                        <Sparkles size={12} className="text-accent" /> Affordable Luxury
                    </p>
                    <h1 className="text-4xl md:text-5xl font-serif mb-4">Packages & Pricing</h1>
                    <p className="text-slate text-base font-light max-w-xl mx-auto leading-relaxed">
                        Pilih paket layanan photobooth terbaik untuk melengkapi momen istimewa Anda dengan harga transparan dan hasil berkualitas.
                    </p>
                </motion.div>

                {/* Vertical Package List */}
                <div className="space-y-12 mb-20">
                    {mainPackages.map((pkgConfig, idx) => {
                        const dbPkg = pkgConfig.pkg;
                        if (!dbPkg) return null; // Fallback if data is not loaded yet

                        const unlimitedVariants = dbPkg.package_variants?.filter(v => v.is_unlimited || !v.print_limit) || [];
                        const limitedVariants = dbPkg.package_variants?.filter(v => !v.is_unlimited && v.print_limit > 0) || [];

                        return (
                            <motion.div
                                key={pkgConfig.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.6, delay: idx * 0.1 }}
                                className={`rounded-3xl p-8 md:p-12 transition-all duration-300 ${pkgConfig.cardClass}`}
                            >
                                {/* Badge Info */}
                                {pkgConfig.badge && (
                                    <div className="mb-6 flex">
                                        <span className={`px-4 py-1 rounded-full text-xs uppercase tracking-widest ${pkgConfig.badgeClass}`}>
                                            {pkgConfig.badge}
                                        </span>
                                    </div>
                                )}

                                {/* Card Header Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
                                    {/* Left Side: Title & Description */}
                                    <div className="lg:col-span-7 space-y-4">
                                        <h2 className="text-3xl md:text-4xl font-serif text-charcoal font-bold tracking-tight">
                                            {pkgConfig.title}
                                        </h2>
                                        <p className="text-slate text-sm md:text-base font-light leading-relaxed">
                                            {pkgConfig.desc}
                                        </p>
                                    </div>

                                    {/* Right Side: Specs & Features */}
                                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 bg-primary-50/30 rounded-2xl p-6 border border-primary-50">
                                        {/* Printer / Output */}
                                        <div>
                                            <p className="text-[10px] font-bold text-warm-grey uppercase tracking-wider mb-1">
                                                {pkgConfig.printerLabel}
                                            </p>
                                            <p className="text-sm font-semibold text-charcoal flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-primary" />
                                                {pkgConfig.printerValue}
                                            </p>
                                        </div>

                                        {/* Additional Services */}
                                        <div>
                                            <p className="text-[10px] font-bold text-warm-grey uppercase tracking-wider mb-1.5">
                                                Layanan Tambahan
                                            </p>
                                            <ul className="space-y-1">
                                                {pkgConfig.additional.map((item, i) => (
                                                    <li key={i} className="text-xs text-slate font-medium flex items-center gap-1.5">
                                                        <Check size={12} className="text-primary shrink-0" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Features Checklist */}
                                <div className="mb-8 pt-6 border-t border-beige">
                                    <p className="text-[10px] font-bold text-charcoal uppercase tracking-widest mb-4">
                                        Fitur Utama yang Didapat
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {pkgConfig.features.map((feature, i) => (
                                            <div key={i} className="flex items-center gap-2.5 text-xs md:text-sm text-slate">
                                                <div className="p-1 bg-emerald-50 rounded-full shrink-0">
                                                    <Check size={12} className="text-emerald-600" />
                                                </div>
                                                <span className="font-light">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Variants Section (Daftar Harga) - Tampil Langsung */}
                                <div className="pt-8 border-t border-beige">
                                    <p className="text-xs font-bold text-charcoal uppercase tracking-wider mb-5">
                                        Pilihan Durasi & Harga Sesi
                                    </p>

                                    {pkgConfig.id === 'hemat' ? (
                                        /* Hemat: Single grid of variants */
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {dbPkg.package_variants?.map((v) => (
                                                <div key={v.id} className="bg-white rounded-2xl p-5 border border-primary-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                                                    <div>
                                                        <p className="font-semibold text-charcoal text-sm">{v.name}</p>
                                                        <p className="text-[10px] text-warm-grey mt-1">{v.duration_hours} Jam Operasional</p>
                                                    </div>
                                                    <div className="mt-4 pt-3 border-t border-primary-50 flex justify-between items-baseline">
                                                        <span className="text-[10px] text-warm-grey uppercase tracking-wider">Harga</span>
                                                        <span className="font-serif text-base font-bold text-primary-dark">{formatIdr(v.price)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* Basic & Premium: Side-by-side grids for Unlimited & Limited Prints */
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Unlimited Prints column */}
                                            {unlimitedVariants.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-4 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                        Unlimited Prints
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {unlimitedVariants.map((v) => (
                                                            <div key={v.id} className="bg-white rounded-2xl p-4 border border-primary-100 flex justify-between items-center hover:shadow-sm transition-shadow">
                                                                <div>
                                                                    <p className="font-semibold text-charcoal text-sm">{v.name}</p>
                                                                    <p className="text-[10px] text-warm-grey mt-0.5">{v.duration_hours} Jam Operasional · Cetak Sepuasnya</p>
                                                                </div>
                                                                <span className="font-serif text-sm md:text-base font-bold text-primary-dark shrink-0 pl-3">
                                                                    {formatIdr(v.price)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Limited Prints column */}
                                            {limitedVariants.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-4 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                                        Limited Prints
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {/* Limited prints notice */}
                                                        <p className="text-[10px] italic text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100/50 leading-normal">
                                                            * Harga lebih tinggi karena durasi penggunaan dapat berlangsung seharian.
                                                        </p>
                                                        {limitedVariants.map((v) => (
                                                            <div key={v.id} className="bg-white rounded-2xl p-4 border border-primary-100 flex justify-between items-center hover:shadow-sm transition-shadow">
                                                                <div>
                                                                    <p className="font-semibold text-charcoal text-sm">{v.name}</p>
                                                                    <p className="text-[10px] text-warm-grey mt-0.5">{v.print_limit} Lembar Cetak · Fleksibel Seharian</p>
                                                                </div>
                                                                <span className="font-serif text-sm md:text-base font-bold text-primary-dark shrink-0 pl-3">
                                                                    {formatIdr(v.price)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Addons */}
                {addons.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-20 pt-8 border-t border-beige"
                    >
                        <h2 className="text-2xl font-serif text-charcoal mb-8 text-center font-bold">Addons Opsional</h2>
                        <div className="bg-white rounded-3xl border border-primary-50 divide-y divide-beige overflow-hidden shadow-sm">
                            {addons.map((addon) => (
                                <div key={addon.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-5 md:px-8 hover:bg-primary-50/10 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <Check size={14} className="text-primary mt-1 shrink-0" />
                                        <div>
                                            <p className="font-medium text-charcoal text-sm">{addon.name}</p>
                                            <p className="text-xs text-slate font-light mt-0.5">{addon.description}</p>
                                        </div>
                                    </div>
                                    <p className="font-serif text-sm md:text-base font-bold text-primary-dark sm:pl-4 whitespace-nowrap">
                                        {formatIdr(addon.price)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* CTA Booking */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center bg-gradient-to-r from-primary to-primary-dark text-white rounded-3xl p-10 md:p-14 shadow-lg shadow-primary-900/10"
                >
                    <h3 className="text-2xl md:text-3xl font-serif mb-4 font-bold">Siap booking sesi Anda?</h3>
                    <p className="text-white/80 font-light mb-8 max-w-md mx-auto text-sm leading-relaxed">
                        Harga dapat disesuaikan untuk event besar. Hubungi kami atau langsung ajukan booking online.
                    </p>
                    <div className="flex justify-center">
                        <Link
                            href="/booking-session"
                            className="inline-flex items-center justify-center gap-2 bg-white text-primary-dark px-10 py-4 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-off-white hover:scale-102 active:scale-98 transition-all duration-300 shadow-md"
                        >
                            Book Session <ArrowRight size={14} />
                        </Link>
                    </div>
                </motion.div>
            </section>
        </GuestLayout>
    );
}
