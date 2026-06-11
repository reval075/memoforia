import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import InteractiveHangingCamera from '@/components/booking-session/InteractiveHangingCamera';
import { homeImages, galleryPhotos } from '@/constants/homeAssets';
import { art } from '@/design/artDirection';
import ChunkyButton from '@/components/art/ChunkyButton';
import MarqueeBand, { MarqueeBandReveal } from '@/components/art/MarqueeBand';
import StripCluster from '@/components/home/StripCluster';
import KineticWordStorm from '@/components/home/KineticWordStorm';
import ScatteredPills from '@/components/home/ScatteredPills';
import ChaosGallery from '@/components/home/ChaosGallery';
import { motionTokens } from '@/motion';
import usePrefersReducedMotion from '@/motion/hooks/usePrefersReducedMotion';

const KINETIC_WORDS = [
    { text: 'Capture' },
    { text: 'Every', indent: 1 },
    { text: 'Laugh', indent: 2 },
    { text: 'Faster', indent: -1 },
    { text: 'Than', indent: 1 },
    { text: 'Your', indent: 2 },
    { text: 'Phone', indent: 1 },
    { text: 'Can', indent: 2 },
    { text: 'Save', indent: 1, accent: true },
    { text: 'Storage', indent: 2, accent: true },
];

const SCATTERED_LABELS = [
    { text: 'book a session', top: '8%', left: '4%', rotate: -8 },
    { text: 'print photostrips', top: '22%', left: '58%', rotate: 6 },
    { text: 'rent equipment', top: '48%', left: '12%', rotate: 4 },
    { text: 'track booking', top: '55%', left: '62%', rotate: -5 },
    { text: 'find a branch', top: '72%', left: '28%', rotate: -3 },
    { text: 'view pricelist', top: '78%', left: '68%', rotate: 7 },
];

const MISSION_LINES = [
    { text: 'Our studio', indent: 0 },
    { text: 'is on', indent: 1 },
    { text: 'a mission', indent: 0 },
    { text: 'to help you', indent: 2 },
    { text: 'keep every', indent: 1 },
    { text: 'fleeting', indent: 0, italic: true },
    { text: 'moment.', indent: 2, accent: true },
];

function SectionBlock({ children, className = '', id }) {
    return (
        <section id={id} className={`relative w-full border-b-2 border-charcoal/10 ${className}`}>
            {children}
        </section>
    );
}

export default function Home() {
    const reduced = usePrefersReducedMotion();

    return (
        <GuestLayout>
            <Head title="Premium Photo Studio & Booth" />

            {/* ═══ 1. HERO — fullscreen, strips dominate, ultra type ═══ */}
            <SectionBlock className="min-h-[100svh] flex flex-col bg-off-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/35 via-primary-50/80 to-off-white pointer-events-none" />

                <div className="relative z-20 flex-1 flex flex-col px-5 sm:px-8 md:px-12 lg:px-16 pt-28 md:pt-32 pb-6 max-w-[1500px] mx-auto w-full">
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: motionTokens.ease.out }}
                        className={`${art.type.label} mb-4 md:mb-6`}
                    >
                        meet memoforia
                    </motion.p>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-0 items-stretch min-h-0">
                        <div className="lg:col-span-5 flex flex-col justify-center z-30 order-2 lg:order-1">
                            <motion.h1
                                initial={{ opacity: 0, y: 64 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 1.2, ease: motionTokens.ease.out }}
                                className="type-ultra font-serif text-charcoal leading-[0.85] mb-6 md:mb-8"
                            >
                                Your pocket guide to capturing memories, one photostrip at a time.
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0, y: 32 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.45, duration: 0.9, ease: motionTokens.ease.out }}
                                className="flex flex-col sm:flex-row gap-4"
                            >
                                <ChunkyButton href="/booking-session" className="!text-base">
                                    Book Now <ArrowRight size={22} />
                                </ChunkyButton>
                                <ChunkyButton href="/pricelist" variant="secondary">
                                    Pricelist
                                </ChunkyButton>
                            </motion.div>
                        </div>

                        <div className="lg:col-span-7 relative order-1 lg:order-2 min-h-[340px] sm:min-h-[420px] lg:min-h-0">
                            <StripCluster className="lg:absolute lg:inset-0" />
                        </div>
                    </div>
                </div>
            </SectionBlock>

            {/* ═══ 2. KINETIC WORD STORM — pure Maggie ═══ */}
            <SectionBlock className="bg-beige py-16 md:py-24 lg:py-32 px-5 sm:px-8 md:px-12 lg:px-16 overflow-x-clip overflow-y-visible">
                <div className="max-w-[1500px] mx-auto">
                    <KineticWordStorm words={KINETIC_WORDS} />
                    <motion.p
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5, duration: 0.8, ease: motionTokens.ease.out }}
                        className="type-display font-serif italic text-primary-dark mt-10 md:mt-16 ml-[4%]"
                    >
                        You&apos;re welcome!
                    </motion.p>
                </div>
            </SectionBlock>

            <MarqueeBandReveal
                phrases={['BOOK · CAPTURE · PRINT · KEEP · MEMOFORIA ·']}
                variant="primary"
            />

            {/* ═══ 3. WITH MEMOFORIA YOU CAN + scattered pills ═══ */}
            <SectionBlock className={`${art.section.pad} bg-off-white`}>
                <div className="max-w-[1500px] mx-auto">
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className={`${art.type.label} mb-6 md:mb-10`}
                    >
                        with memoforia you can
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: motionTokens.duration.section, ease: motionTokens.ease.out }}
                        className="type-ultra font-serif text-charcoal leading-[0.88] max-w-[14ch] mb-4"
                    >
                        Find your perfect booth moment.
                    </motion.h2>
                    <ScatteredPills labels={SCATTERED_LABELS} className="mt-8 md:mt-4" />
                </div>
            </SectionBlock>

            {/* ═══ 4. MISSION STACK ═══ */}
            <SectionBlock className="bg-primary py-20 md:py-32 lg:py-40 px-5 sm:px-8 md:px-12 lg:px-16 text-white overflow-hidden">
                {!reduced && (
                    <motion.div
                        className="absolute top-0 right-0 w-[50vw] h-[50vw] rounded-full bg-accent/25 blur-3xl pointer-events-none"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.55, 0.3] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}
                <div className="max-w-[1500px] mx-auto relative z-10">
                    <KineticWordStorm
                        words={MISSION_LINES}
                        className="[&_.type-kinetic]:!text-white [&_.type-display]:!text-accent"
                    />
                    <motion.p
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-lg md:text-2xl font-light text-white/80 max-w-2xl mt-12 md:mt-20 ml-[4%] leading-relaxed"
                    >
                        Because making memories shouldn&apos;t be another thing on your to-do list.
                    </motion.p>
                </div>
            </SectionBlock>

            {/* ═══ 5. STORY — Maggie "parenting should feel" ═══ */}
            <SectionBlock className={`${art.section.pad} bg-off-white`}>
                <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                    <div className="min-w-0">
                        <p className={`${art.type.label} mb-8`}>our story</p>
                        <KineticWordStorm
                            words={[
                                { text: 'Memoforia', italic: true },
                                { text: 'started with', indent: 1 },
                                { text: 'one big idea:', indent: 2 },
                                { text: 'photography', indent: 0 },
                                { text: 'should feel', indent: 1 },
                                { text: 'unforgettable.', indent: 2, accent: true },
                            ]}
                            className="[&_.type-kinetic]:!text-[clamp(1.5rem,4vw,3.5rem)] [&_.type-kinetic]:!leading-[0.95]"
                        />
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className={`${art.type.body} mt-10 max-w-lg`}
                        >
                            Memoforia is for everyone who wants premium photobooth experiences, real prints, and
                            moments that last longer than a camera roll.
                        </motion.p>
                        <div className="mt-10">
                            <ChunkyButton href="/locations" variant="ghost">
                                View Locations <ArrowRight size={18} />
                            </ChunkyButton>
                        </div>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: 60, rotate: 4 }}
                        whileInView={{ opacity: 1, x: 0, rotate: -2 }}
                        viewport={{ once: true }}
                        transition={{ duration: motionTokens.duration.section, ease: motionTokens.ease.out }}
                        className="relative lg:-mt-16"
                    >
                        <div className="absolute -inset-4 bg-accent/30 rounded-3xl rotate-3 -z-10" />
                        <img
                            src={homeImages.philosophy}
                            alt="Memoforia studio"
                            className="w-full aspect-[4/5] object-cover rounded-2xl border-[3px] border-charcoal/15 shadow-[14px_18px_0_0_rgba(44,62,80,0.18)]"
                            loading="lazy"
                        />
                    </motion.div>
                </div>
            </SectionBlock>

            {/* ═══ 6. STATS — Maggie "More than 0" vertical stack ═══ */}
            <SectionBlock className="bg-charcoal text-white py-20 md:py-28 px-5 sm:px-8 md:px-12">
                <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-12">
                    <div>
                        <motion.span
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="type-kinetic text-white/90 block"
                        >
                            More
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.08 }}
                            className="type-kinetic text-white/90 block ml-[10vw]"
                        >
                            than
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.16 }}
                            className="type-ultra font-serif text-accent block -ml-[2vw] mt-2"
                        >
                            500+
                        </motion.span>
                    </div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="md:text-right"
                    >
                        <p className="text-xl md:text-2xl font-light text-white/70 max-w-md">
                            Happy clients across photobooth sessions, studio rentals, and events.
                        </p>
                        <div className="flex flex-wrap gap-8 mt-10 md:justify-end">
                            {[
                                { n: '1', l: 'Locations' },
                                { n: '10+', l: 'Packages' },
                                { n: '4.9', l: 'Rating', star: true },
                            ].map((s) => (
                                <div key={s.l}>
                                    <p className="type-display font-serif text-white tabular-nums">
                                        {s.n}
                                        {s.star && (
                                            <Star className="inline w-[0.35em] h-[0.35em] ml-1 text-accent fill-accent" />
                                        )}
                                    </p>
                                    <p className="type-label text-white/50 mt-2">{s.l}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </SectionBlock>

            <MarqueeBand phrases={['PHOTOBOOTH', 'STUDIO', 'RENTALS', 'MEMOFORIA', 'CAPTURE']} variant="accent" />

            {/* ═══ 7. SERVICES — asymmetric overlap ═══ */}
            <SectionBlock className={`${art.section.pad} bg-primary-50/90`}>
                <div className="max-w-[1500px] mx-auto">
                    <p className={`${art.type.label} mb-6`}>what we offer</p>
                    <h2 className="type-ultra font-serif text-charcoal leading-[0.88] mb-14 md:mb-20 max-w-[10ch]">
                        Our Services
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0">
                        <motion.div
                            whileInView={{ opacity: 1, y: 0 }}
                            initial={{ opacity: 0, y: 60 }}
                            viewport={{ once: true }}
                            className="md:pr-4 md:translate-y-12"
                        >
                            <ServiceCard
                                href="/booking-session"
                                title="Photobooth"
                                sub="Book a session"
                                img={homeImages.photobooth}
                            />
                        </motion.div>
                        <motion.div
                            whileInView={{ opacity: 1, y: 0 }}
                            initial={{ opacity: 0, y: 60 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.12 }}
                            className="md:pl-4 md:-translate-y-8"
                        >
                            <ServiceCard
                                href="/rentals"
                                title="Equipment Rental"
                                sub="Browse catalog"
                                img={homeImages.rental}
                            />
                        </motion.div>
                    </div>
                </div>
            </SectionBlock>

            {/* ═══ 8. CHAOS GALLERY ═══ */}
            <SectionBlock className={`${art.section.pad} bg-off-white overflow-hidden`}>
                <div className="max-w-[1500px] mx-auto">
                    <p className={`${art.type.label} mb-6`}>our gallery</p>
                    <h2 className="type-ultra font-serif text-charcoal leading-[0.88] mb-4 max-w-[12ch]">
                        Captured Memories
                    </h2>
                    <p className={`${art.type.body} mb-10 md:mb-6 max-w-xl`}>
                        Real moments from real clients — not a grid, just chaos we love.
                    </p>
                    <ChaosGallery photos={galleryPhotos} />
                </div>
            </SectionBlock>

            <MarqueeBandReveal phrases={['TURN MOMENTS INTO MEMORIES', 'MEMOFORIA', 'BOOK TODAY']} variant="dark" />

            {/* ═══ 9. FINAL CTA ═══ */}
            <SectionBlock
                id="interactive-camera"
                className="bg-gradient-to-br from-primary via-primary-dark to-charcoal text-white scroll-mt-24 overflow-hidden"
            >
                {!reduced && (
                    <motion.div
                        className="absolute inset-0 opacity-30 pointer-events-none"
                        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 20% 50%, rgba(232,196,77,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 40%)',
                            backgroundSize: '200% 200%',
                        }}
                    />
                )}
                <div className={`${art.section.pad} relative z-10 max-w-4xl mx-auto text-center`}>
                    <h2 className="type-ultra font-serif text-white leading-[0.88] mb-6">
                        Turn moments into memories with Memoforia!
                    </h2>
                    <p className="text-white/70 text-lg font-light mb-10 max-w-lg mx-auto">
                        Press the shutter to open booking — or tap below.
                    </p>
                    <div className="my-12 md:my-16">
                        <InteractiveHangingCamera redirectTo="/booking" variant="light" />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <ChunkyButton href="/locations" variant="secondary">
                            Find Locations
                        </ChunkyButton>
                    </div>
                </div>
            </SectionBlock>
        </GuestLayout>
    );
}

function ServiceCard({ href, title, sub, img }) {
    return (
        <Link href={href} className="group block relative overflow-hidden rounded-2xl md:rounded-3xl border-[3px] border-charcoal/15 shadow-[12px_16px_0_0_rgba(44,62,80,0.2)]">
            <div className="relative h-[400px] md:h-[520px] overflow-hidden">
                <img
                    src={img}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/50 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                    <h3 className="type-kinetic text-white !text-3xl md:!text-5xl mb-3">{title}</h3>
                    <p className="type-label text-white/80 flex items-center gap-2">
                        {sub}
                        <ArrowRight className="group-hover:translate-x-3 transition-transform" size={20} />
                    </p>
                </div>
            </div>
        </Link>
    );
}
