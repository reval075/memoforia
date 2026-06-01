import Navbar from '@/Components/Navbar';
import { motion } from 'framer-motion';
import { Camera, Phone, Mail, MapPin } from 'lucide-react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-off-white text-charcoal selection:bg-primary selection:text-white">
            <Navbar />
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex-grow"
            >
                {children}
            </motion.main>
            <footer className="bg-charcoal text-white pt-16 pb-10 border-t-2 border-charcoal">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="md:col-span-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <img src="/images/logo.png" alt="MemoForia" className="h-12 w-12 rounded-full object-cover"/>
                                <span className="font-serif text-2xl">MemoForia</span>
                            </div>
                            <p className="text-white/60 text-sm leading-relaxed">Premium Photo Studio & Booth Experience. Capturing your most precious moments with elegance.</p>
                        </div>
                        <div>
                            <h4 className="font-sans text-sm uppercase tracking-widest text-accent mb-6">Quick Links</h4>
                            <ul className="space-y-3">
                                {['Home', 'Book Studio', 'Rentals', 'Pricelist', 'Locations'].map((item) => (
                                    <li key={item}><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">{item}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-sans text-sm uppercase tracking-widest text-accent mb-6">Services</h4>
                            <ul className="space-y-3">
                                {['Photo Booth Booking', 'Equipment Rental', 'Studio Session', 'Event Coverage'].map((item) => (
                                    <li key={item}><a href="#" className="text-white/60 hover:text-white transition-colors text-sm">{item}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-sans text-sm uppercase tracking-widest text-accent mb-6">Contact</h4>
                            <ul className="space-y-3">
                                <li className="flex items-center space-x-3 text-white/60 text-sm"><Camera size={16}/><span>@memoforia</span></li>
                                <li className="flex items-center space-x-3 text-white/60 text-sm"><Phone size={16}/><span>+62 812-3456-7890</span></li>
                                <li className="flex items-center space-x-3 text-white/60 text-sm"><Mail size={16}/><span>memoforia@gmail.com</span></li>
                                <li className="flex items-center space-x-3 text-white/60 text-sm"><MapPin size={16}/><span>Jakarta, Indonesia</span></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
                        <p className="text-white/40 text-sm">© 2026 MemoForia. All rights reserved.</p>
                        <p className="text-white/40 text-sm mt-2 md:mt-0">Crafted with ✦ passion for photography</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
