import { useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import VintageHangingCamera from '@/components/booking-session/VintageHangingCamera';
import CameraFlashOverlay from '@/components/booking-session/CameraFlashOverlay';
import BookingSessionPanel from '@/components/booking-session/BookingSessionPanel';

const FLASH_MS = 650;

export default function BookingSession() {
    const [phase, setPhase] = useState('intro'); // intro | flash | revealed
    const [isFlashing, setIsFlashing] = useState(false);

    const handleShutter = useCallback(() => {
        if (phase !== 'intro') return;
        setIsFlashing(true);
        setPhase('flash');
        setTimeout(() => {
            setPhase('revealed');
            setIsFlashing(false);
        }, FLASH_MS);
    }, [phase]);

    const isIntro = phase === 'intro';
    const isRevealed = phase === 'revealed';
    const sceneBlurred = phase === 'flash' || isRevealed;

    return (
        <div className="min-h-screen bg-off-white text-charcoal overflow-hidden relative">
            <Head title="Booking Session — MemoForia" />

            <div
                className={`absolute inset-0 z-0 transition-all duration-700 ${
                    sceneBlurred ? 'blur-md scale-[1.02]' : ''
                }`}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary-50 to-off-white" />
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-accent/10 blur-3xl" />
            </div>

            <CameraFlashOverlay active={phase === 'flash'} />

            <header className="relative z-20 flex justify-between items-center px-6 md:px-12 py-6">
                <Link href="/" className="flex items-center gap-3 group">
                    <img
                        src="/images/logo.png"
                        alt="MemoForia"
                        className="h-9 w-9 rounded-full object-cover shadow-md shadow-primary/20 group-hover:ring-2 group-hover:ring-primary/30 transition-all"
                    />
                    <span className="font-serif text-lg text-charcoal group-hover:text-primary-dark transition-colors">
                        MemoForia
                    </span>
                </Link>
                {isRevealed && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] uppercase tracking-[0.3em] text-primary-dark"
                    >
                        Session Terbuka
                    </motion.span>
                )}
                {isIntro && (
                    <Link
                        href="/booking"
                        className="text-xs uppercase tracking-widest text-primary-dark hover:text-primary transition-colors"
                    >
                        Lewati intro →
                    </Link>
                )}
            </header>

            <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-88px)] px-6 pb-16">
                <AnimatePresence mode="wait">
                    {isIntro && (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.9, y: -30 }}
                            transition={{ duration: 0.55 }}
                            className="flex flex-col items-center"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-10 max-w-lg"
                            >
                                <p className="text-primary uppercase tracking-[0.35em] text-[10px] mb-4 font-medium">
                                    Professional Photo Studio
                                </p>
                                <h1 className="text-3xl md:text-5xl font-serif text-charcoal leading-tight mb-4">
                                    Capture Your <span className="italic text-primary-dark">Moment</span>
                                </h1>
                                <p className="text-sm text-slate font-light leading-relaxed">
                                    Tekan tombol shutter pada kamera untuk membuka panel booking session.
                                </p>
                            </motion.div>

                            <VintageHangingCamera
                                variant="dark"
                                onShutterClick={handleShutter}
                                disabled={isFlashing}
                                isFlashing={isFlashing}
                            />
                        </motion.div>
                    )}

                    {(phase === 'flash' || isRevealed) && (
                        <motion.div
                            key="panel-wrap"
                            className="w-full"
                            initial={false}
                            animate={{ opacity: isRevealed ? 1 : 0 }}
                            transition={{ duration: 0.5, delay: isRevealed ? 0.15 : 0 }}
                        >
                            {isRevealed && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0, y: -16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6 }}
                                        className="text-center mb-10 max-w-lg mx-auto"
                                    >
                                        <h1 className="text-2xl md:text-4xl font-serif text-charcoal">
                                            Selamat datang di <span className="italic text-primary-dark">studio</span>
                                        </h1>
                                        <p className="text-sm text-slate mt-2 font-light">
                                            Pilih tanggal tersedia dan lanjutkan ke formulir booking.
                                        </p>
                                    </motion.div>
                                    <BookingSessionPanel />
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {phase === 'flash' && (
                        <motion.div
                            className="fixed inset-0 flex items-center justify-center pointer-events-none z-30"
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{ opacity: 0, scale: 0.75, y: -60 }}
                            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <VintageHangingCamera variant="dark" onShutterClick={() => {}} disabled isFlashing />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
