import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Sparkles, Package } from 'lucide-react';

const categoryLabels = {
    hemat: 'Package Hemat',
    basic: 'Package Basic',
    premium: 'Package Premium',
    soft_file: 'Soft File Only',
    unlimited_print: 'Unlimited Print',
    limited_print: 'Limited Print',
    event: 'Event & Wedding',
};

const formatIdr = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

function VariantRow({ variant }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-beige last:border-0">
            <div>
                <p className="font-medium text-charcoal text-sm">{variant.name}</p>
                <p className="text-xs text-warm-grey mt-0.5">
                    {variant.duration_hours && `${variant.duration_hours} jam operational`}
                    {variant.print_limit && `${variant.print_limit} lembar cetak`}
                    {variant.is_unlimited && !variant.duration_hours && 'Unlimited cetak'}
                    {variant.extra_hour_price > 0 && variant.duration_hours && (
                        <span> · Extra jam {formatIdr(variant.extra_hour_price)}</span>
                    )}
                </p>
            </div>
            <p className="font-serif text-lg text-primary-dark whitespace-nowrap">{formatIdr(variant.price)}</p>
        </div>
    );
}

export default function Pricelist({ packages = [], boothPackages = [], addons = [] }) {
    const grouped = packages.reduce((acc, pkg) => {
        const key = pkg.category || 'other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(pkg);
        return acc;
    }, {});

    return (
        <GuestLayout>
            <Head title="Packages & Pricing" />

            <section className="py-24 px-6 max-w-7xl mx-auto min-h-[70vh]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <p className="text-primary uppercase tracking-widest text-sm mb-4 flex items-center justify-center">
                        <Sparkles size={14} className="mr-2 text-accent" /> Affordable Luxury
                    </p>
                    <h1 className="text-4xl md:text-6xl font-serif mb-6">Packages & Pricing</h1>
                    <p className="text-slate text-lg font-light max-w-2xl mx-auto">
                        Harga transparan untuk layanan photobooth event & sesi in-studio. Pilih paket yang sesuai kebutuhan acara Anda.
                    </p>
                </motion.div>

                {/* Event / vendor packages */}
                <div className="space-y-10 mb-16">
                    {Object.entries(grouped).map(([category, pkgs], sectionIdx) => (
                        <motion.div
                            key={category}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ delay: sectionIdx * 0.08 }}
                        >
                            <h2 className="text-2xl font-serif text-charcoal mb-6 flex items-center">
                                <Package size={22} className="mr-2 text-primary" />
                                {categoryLabels[category] || category}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pkgs.map((pkg) => (
                                    <div
                                        key={pkg.id}
                                        className="bg-white rounded-3xl border border-primary-50 shadow-lg shadow-primary/5 p-6 md:p-8 hover:border-primary/30 transition-colors"
                                    >
                                        <h3 className="text-xl font-serif text-charcoal mb-2">{pkg.name}</h3>
                                        <p className="text-sm text-slate font-light mb-4 leading-relaxed">{pkg.description}</p>
                                        <div className="flex flex-wrap gap-2 mb-4 text-[11px] uppercase">
                                            {pkg.includes_softfile && <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Softfile</span>}
                                            {pkg.includes_prints && <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Prints</span>}
                                            {pkg.includes_qr_code && <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">QR Code</span>}
                                            {pkg.includes_gif && <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">GIF</span>}
                                            {pkg.includes_custom_template && <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Custom Template</span>}
                                            {pkg.includes_supporting_crew && <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Supporting Crew</span>}
                                            {pkg.includes_tiket_antrian && <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">Tiket Antrian</span>}
                                        </div>
                                        <div className="space-y-0">
                                            {pkg.package_variants?.map((v) => (
                                                <VariantRow key={v.id} variant={v} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* In-studio booth */}
                {boothPackages.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-16"
                    >
                        <h2 className="text-2xl font-serif text-charcoal mb-6">In-Studio Photobooth</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {boothPackages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    className="bg-white rounded-2xl border border-beige p-6 text-center hover:shadow-md hover:border-primary/30 transition-all"
                                >
                                    <p className="font-serif text-lg text-charcoal mb-1">{pkg.name}</p>
                                    <p className="text-xs text-warm-grey uppercase tracking-wider mb-3">{pkg.duration}</p>
                                    <p className="text-2xl font-serif text-primary-dark mb-3">{formatIdr(pkg.price)}</p>
                                    <p className="text-xs text-slate font-light leading-relaxed">{pkg.description}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Addons */}
                {addons.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-16"
                    >
                        <h2 className="text-2xl font-serif text-charcoal mb-6">Addons Opsional</h2>
                        <div className="bg-white rounded-3xl border border-primary-50 divide-y divide-beige overflow-hidden">
                            {addons.map((addon) => (
                                <div key={addon.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-5 md:px-8">
                                    <div className="flex items-start gap-3">
                                        <Check size={16} className="text-primary mt-1 shrink-0" />
                                        <div>
                                            <p className="font-medium text-charcoal text-sm">{addon.name}</p>
                                            <p className="text-xs text-slate font-light mt-1">{addon.description}</p>
                                        </div>
                                    </div>
                                    <p className="font-serif text-primary-dark sm:pl-4">{formatIdr(addon.price)}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center bg-gradient-to-r from-primary to-primary-dark text-white rounded-3xl p-10 md:p-14"
                >
                    <h3 className="text-2xl md:text-3xl font-serif mb-4">Siap booking sesi Anda?</h3>
                    <p className="text-white/80 font-light mb-8 max-w-md mx-auto">
                        Harga dapat disesuaikan untuk event besar. Hubungi kami atau langsung ajukan booking online.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            href="/booking-session"
                            className="inline-flex items-center justify-center gap-2 bg-white text-primary-dark px-8 py-3.5 rounded-full text-sm uppercase tracking-widest font-medium hover:bg-off-white transition-colors"
                        >
                            Book Session <ArrowRight size={16} />
                        </Link>
                        <Link
                            href="/booking"
                            className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white px-8 py-3.5 rounded-full text-sm uppercase tracking-widest font-medium hover:bg-white/10 transition-colors"
                        >
                            Formulir Lengkap
                        </Link>
                    </div>
                </motion.div>
            </section>
        </GuestLayout>
    );
}
