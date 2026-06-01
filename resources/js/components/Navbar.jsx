import { Link } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { motionTokens } from '@/motion';
import ChunkyButton from '@/components/art/ChunkyButton';

function NavLink({ href, children, onClick }) {
    return (
        <motion.div whileHover={{ y: -2 }} transition={motionTokens.spring.soft}>
            <Link
                href={href}
                onClick={onClick}
                className="group relative font-sans font-bold uppercase tracking-[0.18em] text-xs text-charcoal/70 hover:text-charcoal transition-colors"
            >
                {children}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary group-hover:w-full transition-all duration-500 ease-out" />
            </Link>
        </motion.div>
    );
}

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', href: '/' },
        { name: 'Book Studio', href: '/booking-session' },
        { name: 'Track Booking', href: '/track-booking' },
        { name: 'Rentals', href: '/rentals' },
        { name: 'Pricelist', href: '/pricelist' },
        { name: 'Locations', href: '/locations' },
    ];

    return (
        <>
            <motion.header
                initial={false}
                animate={{
                    backgroundColor: scrolled ? 'rgba(248, 249, 252, 0.95)' : 'rgba(248, 249, 252, 0)',
                    borderBottomColor: scrolled ? 'rgba(44, 62, 80, 0.08)' : 'rgba(44, 62, 80, 0)',
                }}
                transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease.out }}
                className="fixed w-full z-50 backdrop-blur-md border-b-2"
            >
                <div className="max-w-[1400px] mx-auto px-5 sm:px-8 md:px-12 py-4 md:py-5 flex justify-between items-center">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={motionTokens.spring.soft}>
                        <Link href="/" className="flex items-center gap-3">
                            <img
                                src="/images/logo.png"
                                alt="MemoForia"
                                className="h-11 w-11 rounded-full object-cover border-2 border-white shadow-md"
                            />
                            <span className="font-serif text-xl md:text-2xl font-medium text-charcoal tracking-tight">
                                MemoForia
                            </span>
                        </Link>
                    </motion.div>

                    <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
                        {navLinks.map((link) => (
                            <NavLink key={link.name} href={link.href}>
                                {link.name}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="hidden lg:block">
                        <ChunkyButton href="/booking-session" className="!py-3 !px-8 !text-xs">
                            Book Now
                        </ChunkyButton>
                    </div>

                    <button
                        type="button"
                        className="lg:hidden text-charcoal p-2 -mr-2"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? 'Close menu' : 'Open menu'}
                    >
                        {isOpen ? <X size={28} strokeWidth={2.5} /> : <Menu size={28} strokeWidth={2.5} />}
                    </button>
                </div>
            </motion.header>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -24 }}
                        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.ease.out }}
                        className="fixed inset-0 z-40 bg-off-white flex flex-col justify-center items-center px-8"
                    >
                        <img src="/images/logo.png" alt="" className="h-24 w-24 rounded-full mb-12 border-4 border-white shadow-xl" />
                        <div className="flex flex-col gap-8 items-center w-full max-w-sm">
                            {navLinks.map((link, i) => (
                                <motion.div
                                    key={link.name}
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.07, ease: motionTokens.ease.out }}
                                    className="w-full text-center"
                                >
                                    <Link
                                        href={link.href}
                                        onClick={() => setIsOpen(false)}
                                        className="type-shout !text-2xl text-charcoal hover:text-primary-dark transition-colors"
                                    >
                                        {link.name}
                                    </Link>
                                </motion.div>
                            ))}
                            <ChunkyButton href="/booking-session" className="w-full justify-center mt-4">
                                Book Now
                            </ChunkyButton>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
