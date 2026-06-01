import { useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Package, Check, X, Trash2, Edit2, Plus, LogOut, Loader2, ListCollapse, Image, Sparkles } from 'lucide-react';

export default function Dashboard() {
    const { auth, initialRentals = [], pendingRentalCount = 0 } = usePage().props;
    const form = useForm();

    const [activeTab, setActiveTab] = useState('bookings');
    const [configSubTab, setConfigSubTab] = useState('packages'); // packages, variants, addons, templates

    // Data lists
    const [bookings, setBookings] = useState([]);
    const [rentals, setRentals] = useState(Array.isArray(initialRentals) ? initialRentals : []);
    const [packages, setPackages] = useState([]);
    const [addons, setAddons] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [blockedDates, setBlockedDates] = useState([]);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Block Date State
    const [blockForm, setBlockForm] = useState({ date: '', reason: '' });

    // Configuration CRUD States
    const [packageForm, setPackageForm] = useState({ id: null, name: '', category: 'soft_file', description: '', is_active: true });
    const [isEditingPackage, setIsEditingPackage] = useState(false);

    const [variantForm, setVariantForm] = useState({ id: null, service_package_id: '', name: '', price: '', duration_hours: '', print_limit: '', extra_hour_price: '', is_unlimited: false });
    const [isEditingVariant, setIsEditingVariant] = useState(false);

    const [addonForm, setAddonForm] = useState({ id: null, name: '', price: '', description: '', is_active: true });
    const [isEditingAddon, setIsEditingAddon] = useState(false);

    const [templateForm, setTemplateForm] = useState({ id: null, name: '', size: '4R', frame_type: '', layout_type: '', is_active: true });
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);

    // Filters (separate per tab — shared filter caused empty rental list when booking filter didn't match)
    const [bookingStatusFilter, setBookingStatusFilter] = useState('');
    const [rentalStatusFilter, setRentalStatusFilter] = useState('pending_approval');

    const logout = (event) => {
        event.preventDefault();
        form.post('/logout');
    };

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    // Load Data Helpers
    const loadBookings = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (bookingStatusFilter) {
            params.set('status', bookingStatusFilter);
        }
        axios.get(`/admin/api/bookings?${params.toString()}`)
            .then((res) => setBookings(Array.isArray(res.data?.data) ? res.data.data : []))
            .catch((err) => {
                console.error('loadBookings failed', err);
                showMsg(err.response?.data?.message || 'Gagal memuat booking.', 'error');
                setBookings([]);
            })
            .finally(() => setLoading(false));
    };

    const loadRentals = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (rentalStatusFilter) {
            params.set('status', rentalStatusFilter);
        }
        axios.get(`/admin/api/rentals?${params.toString()}`)
            .then((res) => setRentals(Array.isArray(res.data?.data) ? res.data.data : []))
            .catch((err) => {
                console.error('loadRentals failed', err);
                showMsg(err.response?.data?.message || 'Gagal memuat data sewa.', 'error');
            })
            .finally(() => setLoading(false));
    };

    const openRentalsTab = () => {
        setActiveTab('rentals');
    };

    const openBookingsTab = () => {
        setActiveTab('bookings');
    };

    const loadPackages = () => {
        axios.get('/admin/api/service-packages')
            .then(res => setPackages(res.data.data))
            .catch(() => showMsg('Gagal memuat paket jasa.', 'error'));
    };

    const loadAddons = () => {
        axios.get('/admin/api/addons')
            .then(res => setAddons(res.data.data))
            .catch(() => showMsg('Gagal memuat addons.', 'error'));
    };

    const loadTemplates = () => {
        axios.get('/admin/api/photo-templates')
            .then(res => setTemplates(res.data.data))
            .catch(() => showMsg('Gagal memuat templates.', 'error'));
    };

    const loadBlockedDates = () => {
        axios.get('/admin/api/unavailable-dates')
            .then(res => setBlockedDates(res.data.data))
            .catch(() => showMsg('Gagal memuat tanggal blok.', 'error'));
    };

    useEffect(() => {
        if (activeTab === 'bookings') {
            loadBookings();
        }
    }, [bookingStatusFilter, activeTab]);

    useEffect(() => {
        if (activeTab === 'rentals') {
            loadRentals();
        }
    }, [rentalStatusFilter, activeTab]);

    useEffect(() => {
        loadPackages();
        loadAddons();
        loadTemplates();
        loadBlockedDates();
    }, []);

    // Booking Actions
    const handleApprove = (id) => {
        axios.post(`/admin/api/bookings/${id}/approve`)
            .then(res => {
                showMsg(res.data.message);
                loadBookings();
            })
            .catch(err => showMsg(err.response?.data?.message || 'Gagal menyetujui booking.', 'error'));
    };

    const handleReject = (id) => {
        const reason = prompt('Masukkan alasan penolakan booking:');
        if (reason !== null) {
            axios.post(`/admin/api/bookings/${id}/reject`, { notes: reason })
                .then(res => {
                    showMsg(res.data.message);
                    loadBookings();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal menolak booking.', 'error'));
        }
    };

    const handleVerifyPayment = (paymentId, status) => {
        axios.post(`/admin/api/payments/${paymentId}/verify`, { status })
            .then(res => {
                showMsg(res.data.message);
                loadBookings();
                loadBlockedDates();
            })
            .catch(err => showMsg(err.response?.data?.message || 'Gagal verifikasi pembayaran.', 'error'));
    };

    const handleCompleteEvent = (id) => {
        axios.post(`/admin/api/bookings/${id}/complete`)
            .then(res => {
                showMsg(res.data.message);
                loadBookings();
            })
            .catch(err => showMsg(err.response?.data?.message || 'Gagal menyelesaikan event.', 'error'));
    };

    const handleCancelBooking = (id) => {
        if (confirm('Batalkan booking ini?')) {
            axios.post(`/admin/api/bookings/${id}/cancel`)
                .then(res => {
                    showMsg(res.data.message);
                    loadBookings();
                    loadBlockedDates();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal membatalkan booking.', 'error'));
        }
    };

    // Rental Actions
    const handleRentalApprove = (id) => {
        axios.post(`/admin/api/rentals/${id}/approve`)
            .then(res => {
                showMsg(res.data.message);
                loadRentals();
            })
            .catch(err => showMsg(err.response?.data?.message || 'Gagal menyetujui sewa.', 'error'));
    };

    const handleRentalReject = (id) => {
        const reason = prompt('Masukkan alasan penolakan sewa:');
        if (reason !== null) {
            axios.post(`/admin/api/rentals/${id}/reject`, { notes: reason })
                .then(res => {
                    showMsg(res.data.message);
                    loadRentals();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal menolak sewa.', 'error'));
        }
    };

    const handleRentalVerifyPayment = (paymentId, status) => {
        axios.post(`/admin/api/rentals-payments/${paymentId}/verify`, { status })
            .then(res => {
                showMsg(res.data.message);
                loadRentals();
            })
            .catch(err => showMsg(err.response?.data?.message || 'Gagal verifikasi pembayaran.', 'error'));
    };

    const handleCompleteRental = (id) => {
        axios.post(`/admin/api/rentals/${id}/complete`)
            .then(res => {
                showMsg(res.data.message);
                loadRentals();
            })
            .catch(err => showMsg(err.response?.data?.message || 'Gagal menyelesaikan sewa.', 'error'));
    };

    const handleCancelRental = (id) => {
        if (confirm('Batalkan penyewaan ini?')) {
            axios.post(`/admin/api/rentals/${id}/cancel`)
                .then(res => {
                    showMsg(res.data.message);
                    loadRentals();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal membatalkan sewa.', 'error'));
        }
    };

    // Unavailable Dates Actions
    const handleBlockDateSubmit = (e) => {
        e.preventDefault();
        axios.post('/admin/api/unavailable-dates', blockForm)
            .then(res => {
                showMsg(res.data.message);
                setBlockForm({ date: '', reason: '' });
                loadBlockedDates();
            })
            .catch(err => showMsg(err.response?.data?.message || 'Gagal memblok tanggal.', 'error'));
    };

    const handleUnblockDate = (date) => {
        if (confirm(`Buka blokir untuk tanggal ${date}?`)) {
            axios.delete(`/admin/api/unavailable-dates/${date}`)
                .then(res => {
                    showMsg(res.data.message);
                    loadBlockedDates();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal membuka blok.', 'error'));
        }
    };

    // Service Package CRUD
    const handlePackageSubmit = (e) => {
        e.preventDefault();
        const request = isEditingPackage
            ? axios.put(`/admin/api/service-packages/${packageForm.id}`, packageForm)
            : axios.post('/admin/api/service-packages', packageForm);

        request.then(res => {
            showMsg(res.data.message);
            setPackageForm({ id: null, name: '', category: 'soft_file', description: '', is_active: true });
            setIsEditingPackage(false);
            loadPackages();
        }).catch(err => showMsg(err.response?.data?.message || 'Gagal menyimpan paket.', 'error'));
    };

    const handleEditPackage = (pkg) => {
        setPackageForm({ id: pkg.id, name: pkg.name, category: pkg.category, description: pkg.description || '', is_active: !!pkg.is_active });
        setIsEditingPackage(true);
    };

    const handleDeletePackage = (id) => {
        if (confirm('Hapus paket jasa ini beserta varian di dalamnya?')) {
            axios.delete(`/admin/api/service-packages/${id}`)
                .then(res => {
                    showMsg(res.data.message);
                    loadPackages();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal menghapus paket.', 'error'));
        }
    };

    // Package Variant CRUD
    const handleVariantSubmit = (e) => {
        e.preventDefault();
        const request = isEditingVariant
            ? axios.put(`/admin/api/package-variants/${variantForm.id}`, variantForm)
            : axios.post('/admin/api/package-variants', variantForm);

        request.then(res => {
            showMsg(res.data.message);
            setVariantForm({ id: null, service_package_id: '', name: '', price: '', duration_hours: '', print_limit: '', extra_hour_price: '', is_unlimited: false });
            setIsEditingVariant(false);
            loadPackages(); // Variants are nested in packages
        }).catch(err => showMsg(err.response?.data?.message || 'Gagal menyimpan varian.', 'error'));
    };

    const handleEditVariant = (v) => {
        setVariantForm({
            id: v.id,
            service_package_id: v.service_package_id,
            name: v.name,
            price: v.price,
            duration_hours: v.duration_hours || '',
            print_limit: v.print_limit || '',
            extra_hour_price: v.extra_hour_price || '',
            is_unlimited: !!v.is_unlimited,
        });
        setIsEditingVariant(true);
    };

    const handleDeleteVariant = (id) => {
        if (confirm('Hapus varian paket ini?')) {
            axios.delete(`/admin/api/package-variants/${id}`)
                .then(res => {
                    showMsg(res.data.message);
                    loadPackages();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal menghapus varian.', 'error'));
        }
    };

    // Addons CRUD
    const handleAddonSubmit = (e) => {
        e.preventDefault();
        const request = isEditingAddon
            ? axios.put(`/admin/api/addons/${addonForm.id}`, addonForm)
            : axios.post('/admin/api/addons', addonForm);

        request.then(res => {
            showMsg(res.data.message);
            setAddonForm({ id: null, name: '', price: '', description: '', is_active: true });
            setIsEditingAddon(false);
            loadAddons();
        }).catch(err => showMsg(err.response?.data?.message || 'Gagal menyimpan addon.', 'error'));
    };

    const handleEditAddon = (add) => {
        setAddonForm({ id: add.id, name: add.name, price: add.price, description: add.description || '', is_active: !!add.is_active });
        setIsEditingAddon(true);
    };

    const handleDeleteAddon = (id) => {
        if (confirm('Hapus addon ini?')) {
            axios.delete(`/admin/api/addons/${id}`)
                .then(res => {
                    showMsg(res.data.message);
                    loadAddons();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal menghapus addon.', 'error'));
        }
    };

    // Templates CRUD
    const handleTemplateSubmit = (e) => {
        e.preventDefault();
        const request = isEditingTemplate
            ? axios.put(`/admin/api/photo-templates/${templateForm.id}`, templateForm)
            : axios.post('/admin/api/photo-templates', templateForm);

        request.then(res => {
            showMsg(res.data.message);
            setTemplateForm({ id: null, name: '', size: '4R', frame_type: '', layout_type: '', is_active: true });
            setIsEditingTemplate(false);
            loadTemplates();
        }).catch(err => showMsg(err.response?.data?.message || 'Gagal menyimpan template.', 'error'));
    };

    const handleEditTemplate = (t) => {
        setTemplateForm({ id: t.id, name: t.name, size: t.size, frame_type: t.frame_type || '', layout_type: t.layout_type || '', is_active: !!t.is_active });
        setIsEditingTemplate(true);
    };

    const handleDeleteTemplate = (id) => {
        if (confirm('Hapus template ini?')) {
            axios.delete(`/admin/api/photo-templates/${id}`)
                .then(res => {
                    showMsg(res.data.message);
                    loadTemplates();
                })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal menghapus template.', 'error'));
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending_approval':
                return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'waiting_dp':
                return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'confirmed':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'completed':
                return 'bg-slate-100 text-slate-800 border-slate-200';
            case 'expired':
                return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'rejected':
            case 'cancelled':
                return 'bg-red-50 text-red-700 border-red-100';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    // Format DP expiration display
    const formatExpiration = (dpExpiredAt) => {
        if (!dpExpiredAt) return null;
        const expiry = new Date(dpExpiredAt);
        const now = new Date();
        const diff = expiry - now;

        if (diff <= 0) return { text: 'DP Expired', isExpired: true };

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { text: `${hours}j ${mins}m tersisa`, isExpired: false };
    };

    const sumVerifiedPayments = (payments = []) =>
        payments
            .filter((p) => p.status === 'verified')
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const isManualPayment = (pay) =>
        pay.payment_source === 'manual' || (!!pay.proof_image && pay.payment_source !== 'midtrans');

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans antialiased text-charcoal">
            {/* Header */}
            <header className="sticky top-0 bg-white border-b border-beige z-30 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img src="/images/logo.png" alt="Memforia Admin" className="w-10 h-10 rounded-full" onError={(e) => e.target.style.display = 'none'} />
                        <div>
                            <h1 className="font-serif text-xl md:text-2xl font-medium tracking-tight text-charcoal">Memoforia Admin Console</h1>
                            <p className="text-xs text-warm-grey">Event Photobooth Vendor Booking Manager</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="hidden sm:inline text-sm text-slate">Welcome, <strong className="font-medium text-charcoal">{auth?.user?.name || 'Administrator'}</strong></span>
                        <button onClick={logout} className="flex items-center space-x-1 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors">
                            <LogOut size={14} /> <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Notifications */}
            {message.text && (
                <div className={`fixed top-20 right-6 z-50 px-6 py-3 rounded-xl border text-sm shadow-lg transition-all ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 space-y-2">
                    <button onClick={openBookingsTab}
                        className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-left font-medium transition-all ${activeTab === 'bookings' ? 'bg-primary text-white shadow-lg' : 'bg-white hover:bg-beige text-charcoal'}`}>
                        <ListCollapse size={18} />
                        <span>Booking approvals</span>
                    </button>
                    <button onClick={openRentalsTab}
                        className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-left font-medium transition-all ${activeTab === 'rentals' ? 'bg-primary text-white shadow-lg' : 'bg-white hover:bg-beige text-charcoal'}`}>
                        <Package size={18} />
                        <span className="flex-1">Rental approvals</span>
                        {pendingRentalCount > 0 && (
                            <span className={`min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-bold text-center ${
                                activeTab === 'rentals' ? 'bg-white text-primary' : 'bg-primary text-white'
                            }`}>
                                {pendingRentalCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('calendar')}
                        className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-left font-medium transition-all ${activeTab === 'calendar' ? 'bg-primary text-white shadow-lg' : 'bg-white hover:bg-beige text-charcoal'}`}>
                        <Calendar size={18} />
                        <span>Calendar blocks</span>
                    </button>
                    <button onClick={() => setActiveTab('configuration')}
                        className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-left font-medium transition-all ${activeTab === 'configuration' ? 'bg-primary text-white shadow-lg' : 'bg-white hover:bg-beige text-charcoal'}`}>
                        <Package size={18} />
                        <span>Configuration CRUD</span>
                    </button>
                </div>

                {/* Main Panel Content */}
                <div className="lg:col-span-3">
                    
                    {/* TAB: BOOKINGS APPROVAL & PAYMENTS */}
                    {activeTab === 'bookings' && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-primary-50">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-beige">
                                <div>
                                    <h2 className="font-serif text-2xl text-charcoal">Booking Requests Pipeline</h2>
                                    <p className="text-xs text-warm-grey">Verify customer events, manage waitlists, and verify DP/full payments</p>
                                </div>
                                <select value={bookingStatusFilter} onChange={e => setBookingStatusFilter(e.target.value)} className="mt-4 sm:mt-0 px-4 py-2 border border-beige rounded-xl bg-off-white text-sm focus:outline-none">
                                    <option value="">Semua Status</option>
                                    <option value="pending_approval">Pending Approval</option>
                                    <option value="waiting_dp">Waiting DP</option>
                                    <option value="confirmed">Confirmed (Locked Calendar)</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="expired">Expired (DP Timeout)</option>
                                </select>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {bookings.map(booking => (
                                        <div key={booking.id} className="border border-beige rounded-2xl p-6 hover:shadow-md transition-shadow bg-white">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-beige pb-3 mb-4">
                                                <div>
                                                    <span className="text-xs font-semibold text-primary">{booking.booking_code}</span>
                                                    <h3 className="font-serif text-lg text-charcoal">{booking.event_name}</h3>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatusStyle(booking.status)}`}>
                                                    {booking.status.replace('_', ' ')}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate mb-6">
                                                <div>
                                                    <p>👤 <strong>Customer:</strong> {booking.customer_name} ({booking.customer_phone})</p>
                                                    <p>✉️ <strong>Email:</strong> {booking.customer_email}</p>
                                                    <p>📍 <strong>Location:</strong> {booking.event_location}</p>
                                                    <p>📅 <strong>Event Time:</strong> {booking.event_datetime || booking.event_date}</p>
                                                    {booking.status === 'waiting_dp' && booking.dp_expired_at && (() => {
                                                        const exp = formatExpiration(booking.dp_expired_at);
                                                        if (!exp) return null;
                                                        return <p className={`text-xs font-semibold mt-1 ${exp.isExpired ? 'text-orange-600' : 'text-blue-600'}`}>⏰ {exp.isExpired ? '⚠️ ' : ''}Batas DP: {new Date(booking.dp_expired_at).toLocaleString('id-ID')} ({exp.text})</p>;
                                                    })()}
                                                    {booking.status === 'expired' && <p className="text-xs font-semibold text-orange-600 mt-1">⚠️ Booking expired — batas waktu DP terlewati</p>}
                                                </div>
                                                <div>
                                                    <p>📦 <strong>Package:</strong> {booking.service_package?.name} ({booking.package_variant?.name || 'Varian Default'})</p>
                                                    <p>✨ <strong>Template Frame:</strong> {booking.selected_template?.name || 'Custom'}</p>
                                                    <p>💵 <strong>Total Price:</strong> Rp {Number(booking.total_price).toLocaleString('id-ID')}</p>
                                                    <p>💳 <strong>Payment status:</strong> <span className="font-semibold uppercase text-xs">{booking.payment_status?.replace('_', ' ')}</span></p>
                                                </div>
                                            </div>

                                            {/* Addons List */}
                                            {booking.addons?.length > 0 && (
                                                <div className="bg-off-white rounded-xl p-4 text-xs mb-6 border border-beige/60">
                                                    <strong className="block text-primary mb-1">Addons Terpilih:</strong>
                                                    <ul className="list-disc list-inside space-y-1 text-slate">
                                                        {booking.addons.map(add => (
                                                            <li key={add.id}>{add.name} (x{add.pivot.quantity}) - Rp {(Number(add.pivot.price) * add.pivot.quantity).toLocaleString('id-ID')}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {booking.notes && (
                                                <div className="bg-off-white rounded-xl p-4 text-xs italic mb-6">
                                                    <strong>Catatan:</strong> {booking.notes}
                                                </div>
                                            )}

                                            {/* Payments Proofs Verification */}
                                            {booking.payments?.length > 0 && (
                                                <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-4 mb-6">
                                                    <strong className="block text-xs uppercase tracking-wider text-blue-700 mb-2">Riwayat Bukti Transfer:</strong>
                                                    <div className="space-y-3">
                                                        {booking.payments.map(pay => (
                                                            <div key={pay.id} className="flex items-center justify-between border-b border-blue-50/50 pb-2 last:border-b-0 last:pb-0">
                                                                <div className="text-xs">
                                                                    <p>💰 <strong>Nominal:</strong> Rp {Number(pay.amount).toLocaleString('id-ID')} ({pay.payment_type?.toUpperCase()})</p>
                                                                    <p>🏦 <strong>Metode:</strong> {pay.payment_method}</p>
                                                                    <p>📂 <strong>Bukti Gambar:</strong> <a href={pay.proof_image} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Lihat Gambar</a></p>
                                                                    <p>📋 <strong>Status:</strong> <span className="font-semibold">{pay.status}</span></p>
                                                                </div>
                                                                {pay.status === 'pending' && isManualPayment(pay) && (
                                                                    <div className="flex space-x-2">
                                                                        <button onClick={() => handleVerifyPayment(pay.id, 'verified')} className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-full"><Check size={14} /></button>
                                                                        <button onClick={() => handleVerifyPayment(pay.id, 'rejected')} className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full"><X size={14} /></button>
                                                                    </div>
                                                                )}
                                                                {pay.status === 'pending' && pay.payment_source === 'midtrans' && (
                                                                    <span className="text-[10px] text-warm-grey uppercase">Menunggu gateway</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-beige">
                                                {booking.status === 'pending_approval' && (
                                                    <>
                                                        <button onClick={() => handleApprove(booking.id)} className="flex items-center space-x-1 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full text-xs font-semibold transition-colors shadow-md">
                                                            <Check size={14} /> <span>Approve (Waiting DP)</span>
                                                        </button>
                                                        <button onClick={() => handleReject(booking.id)} className="flex items-center space-x-1 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-semibold transition-colors">
                                                            <X size={14} /> <span>Reject</span>
                                                        </button>
                                                    </>
                                                )}

                                                {booking.status === 'confirmed' && (
                                                    <button onClick={() => handleCompleteEvent(booking.id)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-semibold transition-colors">
                                                        Selesaikan Event (Completed)
                                                    </button>
                                                )}

                                                {['waiting_dp', 'confirmed'].includes(booking.status) && (
                                                    <button onClick={() => handleCancelBooking(booking.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-semibold transition-colors">
                                                        Batalkan Booking
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {bookings.length === 0 && (
                                        <div className="text-center py-16 text-warm-grey">
                                            <ListCollapse size={40} className="mx-auto mb-2 opacity-50" />
                                            <p className="font-light">Tidak ada data booking pada kategori status ini.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: RENTALS APPROVAL & PAYMENTS */}
                    {activeTab === 'rentals' && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-primary-50">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-beige">
                                <div>
                                    <h2 className="font-serif text-2xl text-charcoal">Rental Requests Pipeline</h2>
                                    <p className="text-xs text-warm-grey">Manage equipment rentals, approve requests, and verify payments</p>
                                </div>
                                <select value={rentalStatusFilter} onChange={e => setRentalStatusFilter(e.target.value)} className="mt-4 sm:mt-0 px-4 py-2 border border-beige rounded-xl bg-off-white text-sm focus:outline-none">
                                    <option value="">Semua Status</option>
                                    <option value="pending_approval">Menunggu Persetujuan</option>
                                    <option value="waiting_dp">Waiting DP</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {rentals.map(rental => (
                                        <div key={rental.id} className="border border-beige rounded-2xl p-6 hover:shadow-md transition-shadow bg-white">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-beige pb-3 mb-4">
                                                <div>
                                                    <span className="text-xs font-semibold text-primary">{rental.rental_code}</span>
                                                    <h3 className="font-serif text-lg text-charcoal">Rental Alat #{rental.id}</h3>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatusStyle(rental.status)}`}>
                                                    {rental.status === 'pending_approval' ? 'menunggu persetujuan' : rental.status.replace('_', ' ')}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate mb-6">
                                                <div>
                                                    <p>👤 <strong>Customer:</strong> {rental.customer_name} ({rental.customer_phone})</p>
                                                    <p>✉️ <strong>Email:</strong> {rental.customer_email}</p>
                                                    <p>📅 <strong>Rent Dates:</strong> {rental.start_date} s/d {rental.end_date}</p>
                                                    {rental.status === 'waiting_dp' && rental.dp_expired_at && (() => {
                                                        const exp = formatExpiration(rental.dp_expired_at);
                                                        if (!exp) return null;
                                                        return <p className={`text-xs font-semibold mt-1 ${exp.isExpired ? 'text-orange-600' : 'text-blue-600'}`}>⏰ {exp.isExpired ? '⚠️ ' : ''}Batas DP: {new Date(rental.dp_expired_at).toLocaleString('id-ID')} ({exp.text})</p>;
                                                    })()}
                                                    {rental.status === 'expired' && <p className="text-xs font-semibold text-orange-600 mt-1">⚠️ Sewa expired — batas waktu DP terlewati</p>}
                                                </div>
                                                <div>
                                                    <p>💵 <strong>Total Price:</strong> Rp {Number(rental.total_price).toLocaleString('id-ID')}</p>
                                                    <p>💳 <strong>Payment status:</strong> <span className="font-semibold uppercase text-xs">{rental.payment_status?.replace('_', ' ')}</span></p>
                                                    {(() => {
                                                        const paid = sumVerifiedPayments(rental.payments);
                                                        const remaining = Math.max(0, Number(rental.total_price || 0) - paid);
                                                        return (
                                                            <>
                                                                <p>✅ <strong>Dibayar:</strong> Rp {paid.toLocaleString('id-ID')}</p>
                                                                <p>📌 <strong>Sisa:</strong> Rp {remaining.toLocaleString('id-ID')}</p>
                                                            </>
                                                        );
                                                    })()}
                                                    {rental.status === 'confirmed' && rental.settlement_due_at && (
                                                        <p className="text-xs font-semibold text-amber-700 mt-1">
                                                            ⏳ Batas pelunasan: {new Date(rental.settlement_due_at).toLocaleString('id-ID')}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-primary mt-2">
                                                        🔗 Pelanggan lacak: <span className="font-mono">/track-booking</span> · kode <strong>{rental.rental_code}</strong>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Items List */}
                                            {rental.items?.length > 0 && (
                                                <div className="bg-off-white rounded-xl p-4 text-xs mb-6 border border-beige/60">
                                                    <strong className="block text-primary mb-1">Peralatan Disewa:</strong>
                                                    <ul className="list-disc list-inside space-y-1 text-slate">
                                                        {rental.items.map(item => (
                                                            <li key={item.id}>{item.equipment?.name || 'Unknown Item'} (x{item.qty}) - Rp {Number(item.price).toLocaleString('id-ID')}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {rental.notes && (
                                                <div className="bg-off-white rounded-xl p-4 text-xs italic mb-6">
                                                    <strong>Catatan:</strong> {rental.notes}
                                                </div>
                                            )}

                                            {/* Payments Proofs Verification */}
                                            {rental.payments?.length > 0 && (
                                                <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-4 mb-6">
                                                    <strong className="block text-xs uppercase tracking-wider text-blue-700 mb-2">Riwayat Bukti Transfer:</strong>
                                                    <div className="space-y-3">
                                                        {rental.payments.map(pay => (
                                                            <div key={pay.id} className="flex items-center justify-between border-b border-blue-50/50 pb-2 last:border-b-0 last:pb-0">
                                                                <div className="text-xs">
                                                                    <p>💰 <strong>Nominal:</strong> Rp {Number(pay.amount).toLocaleString('id-ID')} ({pay.payment_type?.replace('_', ' ')})</p>
                                                                    <p>🏦 <strong>Metode:</strong> {pay.payment_method} · <span className="uppercase">{pay.payment_source || 'manual'}</span></p>
                                                                    {pay.proof_image && (
                                                                        <p>📂 <strong>Bukti:</strong> <a href={pay.proof_image} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Lihat Gambar</a></p>
                                                                    )}
                                                                    <p>📋 <strong>Status:</strong> <span className="font-semibold">{pay.status}</span></p>
                                                                </div>
                                                                {pay.status === 'pending' && isManualPayment(pay) && (
                                                                    <div className="flex space-x-2">
                                                                        <button onClick={() => handleRentalVerifyPayment(pay.id, 'verified')} className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-full"><Check size={14} /></button>
                                                                        <button onClick={() => handleRentalVerifyPayment(pay.id, 'rejected')} className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full"><X size={14} /></button>
                                                                    </div>
                                                                )}
                                                                {pay.status === 'pending' && pay.payment_source === 'midtrans' && (
                                                                    <span className="text-[10px] text-warm-grey uppercase">Menunggu gateway</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-beige">
                                                {rental.status === 'pending_approval' && (
                                                    <>
                                                        <button onClick={() => handleRentalApprove(rental.id)} className="flex items-center space-x-1 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full text-xs font-semibold transition-colors shadow-md">
                                                            <Check size={14} /> <span>Approve (Waiting DP)</span>
                                                        </button>
                                                        <button onClick={() => handleRentalReject(rental.id)} className="flex items-center space-x-1 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-semibold transition-colors">
                                                            <X size={14} /> <span>Reject</span>
                                                        </button>
                                                    </>
                                                )}

                                                {rental.status === 'confirmed' && rental.payment_status === 'paid' && (
                                                    <button onClick={() => handleCompleteRental(rental.id)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-semibold transition-colors">
                                                        Selesaikan Sewa (Completed)
                                                    </button>
                                                )}

                                                {['waiting_dp', 'confirmed'].includes(rental.status) && (
                                                    <button onClick={() => handleCancelRental(rental.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-semibold transition-colors">
                                                        Batalkan Sewa
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {rentals.length === 0 && (
                                        <div className="text-center py-16 text-warm-grey">
                                            <Package size={40} className="mx-auto mb-2 opacity-50" />
                                            <p className="font-light">Tidak ada data penyewaan pada kategori status ini.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: CALENDAR BLOCKS */}
                    {activeTab === 'calendar' && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-primary-50">
                            <h2 className="font-serif text-2xl text-charcoal mb-2">Block Calendar Dates</h2>
                            <p className="text-xs text-warm-grey mb-8 pb-4 border-b border-beige">Manage vendor off-days or maintenance blocks</p>

                            <form onSubmit={handleBlockDateSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8 bg-off-white/50 p-6 rounded-2xl border border-beige">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal mb-2">Select Date</label>
                                    <input type="date" required value={blockForm.date} onChange={e => setBlockForm({ ...blockForm, date: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-beige bg-white focus:outline-none focus:border-primary text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal mb-2">Block Reason</label>
                                    <input type="text" placeholder="e.g. Maintenance, Vendor off" value={blockForm.reason} onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-beige bg-white focus:outline-none focus:border-primary text-sm" />
                                </div>
                                <div>
                                    <button type="submit" className="w-full flex items-center justify-center space-x-1 bg-primary hover:bg-primary-dark text-white py-3 rounded-xl text-xs font-semibold transition-colors uppercase tracking-wider shadow-md shadow-primary/10">
                                        <Plus size={16} /> <span>Block Date</span>
                                    </button>
                                </div>
                            </form>

                            <h3 className="font-serif text-lg text-charcoal mb-4">Blocked Calendar Dates</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-beige text-xs text-warm-grey font-semibold uppercase">
                                            <th className="py-3 px-4">Date</th>
                                            <th className="py-3 px-4">Reason</th>
                                            <th className="py-3 px-4">Blocked By</th>
                                            <th className="py-3 px-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-beige text-sm">
                                        {blockedDates.map(bd => (
                                            <tr key={bd.id} className="hover:bg-off-white/50">
                                                <td className="py-4 px-4 font-semibold text-charcoal">{bd.date}</td>
                                                <td className="py-4 px-4 font-light text-slate">{bd.reason}</td>
                                                <td className="py-4 px-4 text-xs font-medium text-slate">{bd.creator?.name || 'Admin'}</td>
                                                <td className="py-4 px-4 text-right">
                                                    <button onClick={() => handleUnblockDate(bd.date)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {blockedDates.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center py-8 text-warm-grey font-light">Belum ada tanggal diblokir.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: CONFIGURATION CRUD */}
                    {activeTab === 'configuration' && (
                        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-primary-50">
                            <div className="flex border-b border-beige mb-8">
                                {['packages', 'variants', 'addons', 'templates'].map(sub => (
                                    <button key={sub} onClick={() => setConfigSubTab(sub)}
                                        className={`px-6 py-3 font-medium text-sm transition-all border-b-2 capitalize ${configSubTab === sub ? 'border-primary text-primary' : 'border-transparent text-slate hover:text-charcoal'}`}>
                                        {sub}
                                    </button>
                                ))}
                            </div>

                            {/* SUB TAB: SERVICE PACKAGES */}
                            {configSubTab === 'packages' && (
                                <div className="space-y-8">
                                    <form onSubmit={handlePackageSubmit} className="space-y-4 bg-off-white/50 p-6 rounded-2xl border border-beige">
                                        <h3 className="font-serif text-md text-charcoal mb-2">{isEditingPackage ? 'Edit Paket Jasa' : 'Tambah Paket Jasa Baru'}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Package Name</label>
                                                <input type="text" required placeholder="e.g. Premium Unlimited" value={packageForm.name} onChange={e => setPackageForm({ ...packageForm, name: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Category</label>
                                                <select required value={packageForm.category} onChange={e => setPackageForm({ ...packageForm, category: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm">
                                                    <option value="soft_file">Soft File Only</option>
                                                    <option value="unlimited_print">Unlimited Prints</option>
                                                    <option value="limited_print">Limited Prints</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center space-x-2 pt-6">
                                                <input type="checkbox" id="pkg_active" checked={packageForm.is_active} onChange={e => setPackageForm({ ...packageForm, is_active: e.target.checked })} />
                                                <label htmlFor="pkg_active" className="text-xs font-semibold text-charcoal">Package Active</label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-charcoal mb-1">Description</label>
                                            <textarea required placeholder="Detailed marketing/service text..." value={packageForm.description} onChange={e => setPackageForm({ ...packageForm, description: e.target.value })}
                                                className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm resize-none" rows="2" />
                                        </div>
                                        <div className="flex justify-end space-x-2 pt-2">
                                            {isEditingPackage && (
                                                <button type="button" onClick={() => { setIsEditingPackage(false); setPackageForm({ id: null, name: '', category: 'soft_file', description: '', is_active: true }); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate rounded-lg text-xs font-semibold">Cancel</button>
                                            )}
                                            <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-xs font-semibold shadow-md shadow-primary/10">
                                                <span>{isEditingPackage ? 'Update Paket' : 'Simpan Paket'}</span>
                                            </button>
                                        </div>
                                    </form>

                                    <h3 className="font-serif text-lg text-charcoal mb-4">Daftar Paket Jasa</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {packages.map(pkg => (
                                            <div key={pkg.id} className="border border-beige rounded-2xl p-5 bg-white flex flex-col justify-between hover:shadow-sm">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-serif text-md text-charcoal">{pkg.name}</h4>
                                                        <span className="text-xs text-warm-grey capitalize">({pkg.category?.replace('_', ' ')})</span>
                                                    </div>
                                                    <p className="text-xs text-slate font-light leading-relaxed mb-4">{pkg.description}</p>
                                                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-semibold ${pkg.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        {pkg.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-end space-x-2 pt-4 border-t border-beige mt-4">
                                                    <button onClick={() => handleEditPackage(pkg)} className="p-2 text-primary hover:bg-primary-50 rounded-full"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeletePackage(pkg.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SUB TAB: PACKAGE VARIANTS */}
                            {configSubTab === 'variants' && (
                                <div className="space-y-8">
                                    <form onSubmit={handleVariantSubmit} className="space-y-4 bg-off-white/50 p-6 rounded-2xl border border-beige">
                                        <h3 className="font-serif text-md text-charcoal mb-2">{isEditingVariant ? 'Edit Varian Paket' : 'Tambah Varian Paket Baru'}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Service Package *</label>
                                                <select required value={variantForm.service_package_id} onChange={e => setVariantForm({ ...variantForm, service_package_id: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm">
                                                    <option value="">-- Pilih Paket Jasa --</option>
                                                    {packages.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Variant Name *</label>
                                                <input type="text" required placeholder="e.g. 3 Jam Unlimited" value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Price (IDR) *</label>
                                                <input type="number" required placeholder="e.g. 2500000" value={variantForm.price} onChange={e => setVariantForm({ ...variantForm, price: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Duration (Hours)</label>
                                                <input type="number" placeholder="Optional" value={variantForm.duration_hours} onChange={e => setVariantForm({ ...variantForm, duration_hours: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Print Limit</label>
                                                <input type="number" placeholder="Optional" value={variantForm.print_limit} onChange={e => setVariantForm({ ...variantForm, print_limit: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Extra Hour Price (IDR)</label>
                                                <input type="number" placeholder="Optional" value={variantForm.extra_hour_price} onChange={e => setVariantForm({ ...variantForm, extra_hour_price: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div className="flex items-center space-x-2 pt-6">
                                                <input type="checkbox" id="v_unlimited" checked={variantForm.is_unlimited} onChange={e => setVariantForm({ ...variantForm, is_unlimited: e.target.checked })} />
                                                <label htmlFor="v_unlimited" className="text-xs font-semibold text-charcoal">Unlimited Print</label>
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-2 pt-2">
                                            {isEditingVariant && (
                                                <button type="button" onClick={() => { setIsEditingVariant(false); setVariantForm({ id: null, service_package_id: '', name: '', price: '', duration_hours: '', print_limit: '', extra_hour_price: '', is_unlimited: false }); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate rounded-lg text-xs font-semibold">Cancel</button>
                                            )}
                                            <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-xs font-semibold shadow-md shadow-primary/10">
                                                <span>{isEditingVariant ? 'Update Varian' : 'Simpan Varian'}</span>
                                            </button>
                                        </div>
                                    </form>

                                    <h3 className="font-serif text-lg text-charcoal mb-4">Varian Terdaftar:</h3>
                                    <div className="space-y-4">
                                        {packages.map(p => (
                                            <div key={p.id} className="border border-beige rounded-2xl p-5 bg-white">
                                                <h4 className="font-serif text-md text-primary font-semibold border-b border-beige pb-2 mb-3">{p.name} Variants:</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {p.package_variants?.map(v => (
                                                        <div key={v.id} className="p-4 border border-beige rounded-xl bg-off-white/40 flex flex-col justify-between">
                                                            <div>
                                                                <h5 className="font-medium text-charcoal text-sm">{v.name}</h5>
                                                                <p className="text-lg font-serif text-primary mt-1">Rp {Number(v.price).toLocaleString('id-ID')}</p>
                                                                <p className="text-xs text-slate mt-2">
                                                                    Operational: {v.duration_hours ? `${v.duration_hours} Jam` : '-'} | Limit: {v.print_limit ? `${v.print_limit} Lembar` : (v.is_unlimited ? 'Unlimited' : '-')}
                                                                </p>
                                                            </div>
                                                            <div className="flex justify-end space-x-2 pt-3 border-t border-beige/60 mt-3">
                                                                <button onClick={() => handleEditVariant(v)} className="p-1.5 text-primary hover:bg-primary-50 rounded-full"><Edit2 size={12} /></button>
                                                                <button onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!p.package_variants || p.package_variants.length === 0) && (
                                                        <p className="text-xs text-warm-grey italic">Belum ada varian ditambahkan.</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SUB TAB: ADDONS */}
                            {configSubTab === 'addons' && (
                                <div className="space-y-8">
                                    <form onSubmit={handleAddonSubmit} className="space-y-4 bg-off-white/50 p-6 rounded-2xl border border-beige">
                                        <h3 className="font-serif text-md text-charcoal mb-2">{isEditingAddon ? 'Edit Addon' : 'Tambah Addon Baru'}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Addon Name</label>
                                                <input type="text" required placeholder="e.g. Custom Backdrop" value={addonForm.name} onChange={e => setAddonForm({ ...addonForm, name: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Price (IDR)</label>
                                                <input type="number" required placeholder="e.g. 500000" value={addonForm.price} onChange={e => setAddonForm({ ...addonForm, price: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div className="flex items-center space-x-2 pt-6">
                                                <input type="checkbox" id="add_active" checked={addonForm.is_active} onChange={e => setAddonForm({ ...addonForm, is_active: e.target.checked })} />
                                                <label htmlFor="add_active" className="text-xs font-semibold text-charcoal">Addon Active</label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-charcoal mb-1">Description</label>
                                            <textarea required placeholder="Keychain acrylic custom design, extra photographer assistant..." value={addonForm.description} onChange={e => setAddonForm({ ...addonForm, description: e.target.value })}
                                                className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm resize-none" rows="2" />
                                        </div>
                                        <div className="flex justify-end space-x-2 pt-2">
                                            {isEditingAddon && (
                                                <button type="button" onClick={() => { setIsEditingAddon(false); setAddonForm({ id: null, name: '', price: '', description: '', is_active: true }); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate rounded-lg text-xs font-semibold">Cancel</button>
                                            )}
                                            <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-xs font-semibold shadow-md shadow-primary/10">
                                                <span>{isEditingAddon ? 'Update Addon' : 'Simpan Addon'}</span>
                                            </button>
                                        </div>
                                    </form>

                                    <h3 className="font-serif text-lg text-charcoal mb-4">Daftar Addons Acara:</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {addons.map(add => (
                                            <div key={add.id} className="border border-beige rounded-2xl p-5 bg-white flex flex-col justify-between hover:shadow-sm">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-serif text-md text-charcoal font-semibold">{add.name}</h4>
                                                        <p className="text-md font-serif text-primary">Rp {Number(add.price).toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <p className="text-xs text-slate font-light leading-relaxed mb-4">{add.description}</p>
                                                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-semibold ${add.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        {add.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-end space-x-2 pt-4 border-t border-beige mt-4">
                                                    <button onClick={() => handleEditAddon(add)} className="p-2 text-primary hover:bg-primary-50 rounded-full"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteAddon(add.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SUB TAB: PHOTO TEMPLATES */}
                            {configSubTab === 'templates' && (
                                <div className="space-y-8">
                                    <form onSubmit={handleTemplateSubmit} className="space-y-4 bg-off-white/50 p-6 rounded-2xl border border-beige">
                                        <h3 className="font-serif text-md text-charcoal mb-2">{isEditingTemplate ? 'Edit Template Frame' : 'Tambah Template Frame Baru'}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Template Name</label>
                                                <input type="text" required placeholder="e.g. Classic Strip" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Size (e.g. 4R, 2x6 strip)</label>
                                                <input type="text" required placeholder="e.g. 4R" value={templateForm.size} onChange={e => setTemplateForm({ ...templateForm, size: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div className="flex items-center space-x-2 pt-6">
                                                <input type="checkbox" id="temp_active" checked={templateForm.is_active} onChange={e => setTemplateForm({ ...templateForm, is_active: e.target.checked })} />
                                                <label htmlFor="temp_active" className="text-xs font-semibold text-charcoal">Template Active</label>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Frame Style / Type</label>
                                                <input type="text" placeholder="e.g. Vintage, Neon, Modern" value={templateForm.frame_type} onChange={e => setTemplateForm({ ...templateForm, frame_type: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-charcoal mb-1">Layout Grid Type</label>
                                                <input type="text" placeholder="e.g. 3-Grid vertical, 4-Grid square" value={templateForm.layout_type} onChange={e => setTemplateForm({ ...templateForm, layout_type: e.target.value })}
                                                    className="w-full px-4 py-2 border border-beige bg-white rounded-xl focus:outline-none text-sm" />
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-2 pt-2">
                                            {isEditingTemplate && (
                                                <button type="button" onClick={() => { setIsEditingTemplate(false); setTemplateForm({ id: null, name: '', size: '4R', frame_type: '', layout_type: '', is_active: true }); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate rounded-lg text-xs font-semibold">Cancel</button>
                                            )}
                                            <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-xs font-semibold shadow-md shadow-primary/10">
                                                <span>{isEditingTemplate ? 'Update Template' : 'Simpan Template'}</span>
                                            </button>
                                        </div>
                                    </form>

                                    <h3 className="font-serif text-lg text-charcoal mb-4">Daftar Layout Frame Foto:</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {templates.map(t => (
                                            <div key={t.id} className="border border-beige rounded-2xl p-5 bg-white flex flex-col justify-between hover:shadow-sm">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-serif text-md text-charcoal font-semibold">{t.name}</h4>
                                                        <span className="text-xs text-warm-grey">Size: {t.size}</span>
                                                    </div>
                                                    <p className="text-xs text-slate mt-1">Gaya Frame: {t.frame_type || '-'}</p>
                                                    <p className="text-xs text-slate mt-1 mb-4">Grid Layout: {t.layout_type || '-'}</p>
                                                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-semibold ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        {t.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-end space-x-2 pt-4 border-t border-beige mt-4">
                                                    <button onClick={() => handleEditTemplate(t)} className="p-2 text-primary hover:bg-primary-50 rounded-full"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
