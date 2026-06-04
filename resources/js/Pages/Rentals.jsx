import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, CheckCircle, Package, Calendar, User, X } from 'lucide-react';

export default function Rentals() {
    const [equipments, setEquipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [rentalCode, setRentalCode] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        customer_name: '', customer_email: '', customer_phone: '',
        start_date: '', end_date: '', notes: '',
    });

    useEffect(() => {
        const params = {};
        if (form.start_date) params.start_date = form.start_date;
        if (form.end_date) params.end_date = form.end_date;
        const query = new URLSearchParams(params).toString();
        axios.get(`/api/rental-equipments${query ? `?${query}` : ''}`)
            .then(res => setEquipments(res.data.data))
            .catch(() => setError('Gagal memuat data peralatan.'))
            .finally(() => setLoading(false));
    }, [form.start_date, form.end_date]);

    const addToCart = (equipment) => {
        const existing = cart.find(c => c.equipment_id === equipment.id);
        const avail = typeof equipment.available_stock !== 'undefined' ? equipment.available_stock : equipment.stock;
        if (existing) {
            if (existing.qty < avail) {
                setCart(cart.map(c => c.equipment_id === equipment.id ? { ...c, qty: c.qty + 1 } : c));
            }
        } else {
            if (avail > 0) setCart([...cart, { equipment_id: equipment.id, qty: 1, equipment }]);
        }
        setShowCart(true);
    };

    const updateQty = (equipmentId, delta) => {
        setCart(cart.map(c => {
            if (c.equipment_id === equipmentId) {
                const newQty = c.qty + delta;
                if (newQty <= 0) return null;
                const avail = typeof c.equipment.available_stock !== 'undefined' ? c.equipment.available_stock : c.equipment.stock;
                if (newQty > avail) return c;
                return { ...c, qty: newQty };
            }
            return c;
        }).filter(Boolean));
    };

    const removeFromCart = (equipmentId) => {
        setCart(cart.filter(c => c.equipment_id !== equipmentId));
    };

    const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

    const handleSubmit = async () => {
        setSubmitting(true); setError('');
        try {
            const payload = {
                ...form,
                items: cart.map(c => ({ equipment_id: c.equipment_id, qty: c.qty })),
            };
            const res = await axios.post('/api/rental-requests', payload);
            setRentalCode(res.data.rental_code || '');
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Terjadi kesalahan.');
        } finally { setSubmitting(false); }
    };

    if (loading) {
        return (
            <GuestLayout><Head title="Equipment Rentals" />
                <div className="min-h-[70vh] flex items-center justify-center"><Loader2 size={40} className="animate-spin text-primary" /></div>
            </GuestLayout>
        );
    }

    if (success) {
        return (
            <GuestLayout><Head title="Pengajuan Berhasil" />
                <section className="py-24 px-6 min-h-[70vh] flex items-center justify-center">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-lg mx-auto bg-white p-12 rounded-3xl shadow-xl">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={40} className="text-green-500" /></div>
                        <h2 className="text-3xl font-serif mb-4">Pengajuan Sewa Berhasil!</h2>
                        <p className="text-slate font-light mb-4">Terima kasih, <strong>{form.customer_name}</strong>. Tim kami akan segera meninjau pengajuan Anda.</p>
                        {rentalCode && (
                            <div className="bg-beige rounded-2xl p-5 mb-6">
                                <p className="text-xs text-warm-grey uppercase tracking-wider mb-1">Kode Sewa Anda</p>
                                <p className="text-2xl font-bold font-mono text-primary tracking-wider">{rentalCode}</p>
                                <p className="text-xs text-warm-grey mt-2">Simpan kode ini untuk melacak status dan membayar sewa Anda.</p>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {rentalCode && (
                                <a href={`/track-booking?code=${encodeURIComponent(rentalCode)}`}
                                    className="bg-primary text-white px-8 py-3 rounded-full hover:bg-primary-dark transition-all font-medium">
                                    Lacak Status Sewa
                                </a>
                            )}
                            <a href="/" className="border border-beige text-charcoal px-8 py-3 rounded-full hover:bg-beige transition-all">Kembali ke Home</a>
                        </div>
                    </motion.div>
                </section>
            </GuestLayout>
        );
    }

    return (
        <GuestLayout>
            <Head title="Equipment Rentals" />
            <section className="py-24 px-6 max-w-7xl mx-auto min-h-[70vh]">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <p className="text-primary uppercase tracking-widest text-sm mb-4">Professional Gear</p>
                    <h1 className="text-4xl md:text-5xl font-serif mb-4">Equipment Rentals</h1>
                    <p className="text-slate text-lg font-light max-w-2xl mx-auto">Browse our catalog of professional equipment available for rent.</p>
                </motion.div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8 text-center text-sm">{error}</div>}

                {/* Equipment Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {equipments.map((eq, i) => (
                        <motion.div key={eq.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-2xl overflow-hidden border border-beige hover:shadow-lg hover:shadow-primary/5 transition-all group">
                            <div className="h-48 bg-beige flex items-center justify-center overflow-hidden">
                                {eq.image ? <img src={eq.image} alt={eq.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    : <Package size={48} className="text-warm-grey" />}
                            </div>
                            <div className="p-6">
                                {eq.category && <span className="text-xs uppercase tracking-widest text-primary bg-primary-50 px-3 py-1 rounded-full">{eq.category}</span>}
                                <h3 className="font-serif text-xl mt-3 mb-2">{eq.name}</h3>
                                {eq.description && <p className="text-sm text-slate font-light line-clamp-2 mb-3">{eq.description}</p>}
                                <div className="flex items-center justify-between mt-4">
                                    <div>
                                        <p className="text-xl font-serif text-primary">Rp {Number(eq.price_per_day).toLocaleString('id-ID')}</p>
                                        <p className="text-xs text-warm-grey">per hari</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-warm-grey mb-2">Stok: {typeof eq.available_stock !== 'undefined' ? eq.available_stock : eq.stock}{
                                            typeof eq.available_stock !== 'undefined' ? <span className="text-xxs text-warm-grey block">(total {eq.stock})</span> : null
                                        }</p>
                                        <button onClick={() => addToCart(eq)} disabled={(typeof eq.available_stock !== 'undefined' ? eq.available_stock : eq.stock) <= 0}
                                            className={`px-5 py-2 rounded-full text-sm transition-all ${((typeof eq.available_stock !== 'undefined' ? eq.available_stock : eq.stock) > 0) ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-beige text-warm-grey cursor-not-allowed'}`}>
                                            <Plus size={14} className="inline mr-1" /> Sewa
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {equipments.length === 0 && <p className="text-slate col-span-3 text-center py-16 font-light">Belum ada peralatan tersedia saat ini.</p>}
                </div>

                {/* Floating Cart Button */}
                {cart.length > 0 && !showForm && (
                    <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setShowCart(!showCart)}
                        className="fixed bottom-8 right-8 bg-primary text-white p-4 rounded-full shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all z-40">
                        <ShoppingCart size={24} />
                        <span className="absolute -top-2 -right-2 bg-accent text-charcoal text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">{totalItems}</span>
                    </motion.button>
                )}

                {/* Cart Slide Panel */}
                <AnimatePresence>
                    {showCart && cart.length > 0 && !showForm && (
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
                            className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-white shadow-2xl z-50 flex flex-col">
                            <div className="p-6 border-b border-beige flex items-center justify-between">
                                <h3 className="font-serif text-xl">Keranjang Sewa</h3>
                                <button onClick={() => setShowCart(false)} className="text-warm-grey hover:text-charcoal"><X size={24} /></button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-6 space-y-4">
                                {cart.map(item => (
                                    <div key={item.equipment_id} className="flex items-center justify-between bg-off-white p-4 rounded-xl">
                                        <div className="flex-grow">
                                            <p className="font-medium text-sm">{item.equipment.name}</p>
                                            <p className="text-xs text-primary">Rp {Number(item.equipment.price_per_day).toLocaleString('id-ID')}/hari</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => updateQty(item.equipment_id, -1)} className="w-8 h-8 rounded-full bg-beige flex items-center justify-center hover:bg-primary-100"><Minus size={14} /></button>
                                            <span className="w-8 text-center font-medium">{item.qty}</span>
                                            <button onClick={() => updateQty(item.equipment_id, 1)} className="w-8 h-8 rounded-full bg-beige flex items-center justify-center hover:bg-primary-100"><Plus size={14} /></button>
                                            <button onClick={() => removeFromCart(item.equipment_id)} className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 border-t border-beige">
                                <button onClick={() => { setShowCart(false); setShowForm(true); }}
                                    className="w-full bg-primary text-white py-4 rounded-full hover:bg-primary-dark transition-all font-medium">
                                    Lanjut ke Form Pengajuan
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Rental Form Modal */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                                className="bg-white rounded-3xl p-8 md:p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-serif text-2xl flex items-center"><User size={20} className="mr-2 text-primary" /> Form Pengajuan Sewa</h3>
                                    <button onClick={() => setShowForm(false)} className="text-warm-grey hover:text-charcoal"><X size={24} /></button>
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm text-charcoal mb-2 font-medium">Nama Lengkap *</label>
                                        <input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                                            className="w-full px-5 py-3 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white" placeholder="Nama Anda" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-charcoal mb-2 font-medium">Email</label>
                                        <input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })}
                                            className="w-full px-5 py-3 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white" placeholder="email@contoh.com" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-charcoal mb-2 font-medium">No. Telepon / WhatsApp</label>
                                        <input type="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                                            className="w-full px-5 py-3 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white" placeholder="0812-xxxx-xxxx" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-charcoal mb-2 font-medium">Tanggal Mulai *</label>
                                            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                                                className="w-full px-5 py-3 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-charcoal mb-2 font-medium">Tanggal Selesai *</label>
                                            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                                                className="w-full px-5 py-3 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-charcoal mb-2 font-medium">Catatan</label>
                                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                                            className="w-full px-5 py-3 rounded-xl border-2 border-beige focus:border-primary focus:outline-none transition-colors bg-off-white resize-none" placeholder="Permintaan khusus..." />
                                    </div>

                                    {/* Cart summary */}
                                    <div className="bg-primary-50 rounded-xl p-4 space-y-2">
                                        <p className="text-sm font-medium text-charcoal mb-2">Item yang disewa:</p>
                                        {cart.map(item => (
                                            <div key={item.equipment_id} className="flex justify-between text-sm">
                                                <span className="text-slate">{item.equipment.name} x{item.qty}</span>
                                                <span className="text-primary font-medium">Rp {Number(item.equipment.price_per_day * item.qty).toLocaleString('id-ID')}/hari</span>
                                            </div>
                                        ))}
                                    </div>

                                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

                                    <button onClick={handleSubmit}
                                        disabled={submitting || !form.customer_name || !form.start_date || !form.end_date}
                                        className="w-full bg-primary text-white py-4 rounded-full hover:bg-primary-dark transition-all font-medium disabled:opacity-50 flex items-center justify-center space-x-2">
                                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                        <span>{submitting ? 'Memproses...' : 'Ajukan Penyewaan'}</span>
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </GuestLayout>
    );
}
