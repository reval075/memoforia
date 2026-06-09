import { useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Package, Check, X, Trash2, Edit2, Plus, LogOut, Loader2, Image, CreditCard, Eye, TrendingUp, Settings, RefreshCw, FileText, User, Sparkles, Clock, AlertCircle } from 'lucide-react';

function StatusBadge({ status }) {
    const cfg = {
        pending_approval: ['Pending Approval', 'bg-amber-50 text-amber-700 ring-amber-200'],
        waiting_dp: ['Waiting DP', 'bg-sky-50 text-sky-700 ring-sky-200'],
        confirmed: ['Confirmed', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
        completed: ['Completed', 'bg-slate-100 text-slate-600 ring-slate-200'],
        cancelled: ['Cancelled', 'bg-red-50 text-red-600 ring-red-200'],
        expired: ['Expired', 'bg-orange-50 text-orange-600 ring-orange-200'],
        rejected: ['Rejected', 'bg-red-100 text-red-700 ring-red-200']
    };
    const [label, cls] = cfg[status] || [status, 'bg-gray-100 text-gray-600 ring-gray-200'];
    return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${cls}`}>{label}</span>;
}

function PaymentBadge({ status }) {
    const cfg = {
        unpaid: ['Belum Bayar', 'bg-gray-100 text-gray-500 ring-gray-200'],
        partial: ['DP Terbayar', 'bg-amber-50 text-amber-600 ring-amber-200'],
        paid: ['Lunas', 'bg-emerald-50 text-emerald-700 ring-emerald-200']
    };
    const [label, cls] = cfg[status] || [status || '-', 'bg-gray-100 text-gray-500 ring-gray-200'];
    return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${cls}`}>{label}</span>;
}

function SummaryCard({ label, value, sub, highlight, icon: Icon, loading }) {
    return (
        <div className={`group flex-1 min-w-[150px] rounded-2xl px-5 py-4 border ${highlight ? 'bg-primary border-primary/40 shadow-sm' : 'bg-white border-beige'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-white/70' : 'text-warm-grey'}`}>{label}</p>
                    {loading ? <div className="h-7 w-16 bg-beige rounded-lg animate-pulse" /> : <p className={`text-2xl font-bold leading-none ${highlight ? 'text-white' : 'text-charcoal'}`}>{value}</p>}
                    {sub && <p className={`text-xs mt-1 truncate ${highlight ? 'text-white/60' : 'text-warm-grey'}`}>{sub}</p>}
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-white/20 text-white' : 'bg-beige text-slate'}`}><Icon size={16} /></div>
            </div>
        </div>
    );
}

function RejectModal({ open, onConfirm, onClose }) {
    const [reason, setReason] = useState('');
    useEffect(() => { if (!open) setReason(''); }, [open]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="font-serif text-lg text-charcoal mb-1">Alasan Penolakan</h3>
                <p className="text-xs text-warm-grey mb-4">Catatan ini akan tersimpan dan dikirimkan kepada customer.</p>
                <textarea rows={4} autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="Tuliskan alasan penolakan..." className="w-full px-4 py-3 border border-beige rounded-xl text-sm focus:outline-none focus:border-primary resize-none" />
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-slate bg-beige hover:bg-gray-200 transition-colors">Batal</button>
                    <button onClick={() => onConfirm(reason)} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Tolak</button>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { auth, initialRentals = [], pendingRentalCount = 0 } = usePage().props;
    const form = useForm();
    const [activeTab, setActiveTab] = useState('bookings');
    const [configSubTab, setConfigSubTab] = useState('packages');
    
    // Data
    const [bookings, setBookings] = useState([]);
    const [rentals, setRentals] = useState(Array.isArray(initialRentals) ? initialRentals : []);
    const [packages, setPackages] = useState([]);
    const [packageVariants, setPackageVariants] = useState([]);
    const [addons, setAddons] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [blockedDates, setBlockedDates] = useState([]);
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [stats, setStats] = useState({ pending_bookings: 0, active_bookings: 0, pending_rentals: 0, pending_payments: 0, monthly_revenue: 0 });
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedType, setSelectedType] = useState(null); // 'booking' | 'rental'
    const [rejectModal, setRejectModal] = useState({ open: false, id: null, type: null });
    const [filter, setFilter] = useState('');

    // Forms
    const [blockForm, setBlockForm] = useState({ date: '', reason: '' });
    const [packageForm, setPackageForm] = useState({ id: null, name: '', category: 'soft_file', description: '', is_active: true, display_order: 0, includes_softfile: false, includes_prints: false, includes_qr_code: false, includes_gif: false, includes_custom_template: false, includes_supporting_crew: false, includes_tiket_antrian: false });
    const [variantForm, setVariantForm] = useState({ id: null, service_package_id: '', name: '', price: '', duration_hours: '', print_limit: '', extra_hour_price: '', is_unlimited: false });
    const [addonForm, setAddonForm] = useState({ id: null, name: '', price: '', description: '', is_active: true, display_order: 0 });
    const [templateForm, setTemplateForm] = useState({ id: null, name: '', size: '4R', frame_type: '', layout_type: '', description: '', is_active: true, display_order: 0 });

    const showMsg = (text, type = 'success') => { setMessage({ text, type }); setTimeout(() => setMessage({ text: '', type: '' }), 5000); };
    
    const loadStats = () => { setStatsLoading(true); axios.get('/admin/api/stats').then(r => setStats(r.data)).catch(() => {}).finally(() => setStatsLoading(false)); };
    const loadBookings = () => { setLoading(true); const p = new URLSearchParams(); if (filter) p.set('status', filter); axios.get(`/admin/api/bookings?${p}`).then(r => setBookings(Array.isArray(r.data?.data) ? r.data.data : [])).catch(err => showMsg('Gagal memuat booking.', 'error')).finally(() => setLoading(false)); };
    const loadRentals = () => { setLoading(true); const p = new URLSearchParams(); if (filter) p.set('status', filter); axios.get(`/admin/api/rentals?${p}`).then(r => setRentals(Array.isArray(r.data?.data) ? r.data.data : [])).catch(err => showMsg('Gagal memuat sewa.', 'error')).finally(() => setLoading(false)); };
    const loadPackages = () => axios.get('/admin/api/service-packages').then(r => setPackages(r.data.data)).catch(() => showMsg('Gagal memuat paket.', 'error'));
    const loadVariants = () => axios.get('/admin/api/service-packages').then(r => {
        const allVariants = (r.data.data || []).flatMap(p => (p.package_variants || []).map(v => ({ ...v, package_name: p.name })));
        setPackageVariants(allVariants);
        setPackages(r.data.data);
    }).catch(() => showMsg('Gagal memuat variants.', 'error'));
    const loadAddons = () => axios.get('/admin/api/addons').then(r => setAddons(r.data.data)).catch(() => showMsg('Gagal memuat addons.', 'error'));
    const loadTemplates = () => axios.get('/admin/api/photo-templates').then(r => setTemplates(r.data.data)).catch(() => showMsg('Gagal memuat templates.', 'error'));
    const loadBlockedDates = () => axios.get('/admin/api/unavailable-dates').then(r => setBlockedDates(r.data.data)).catch(() => showMsg('Gagal memuat tanggal blok.', 'error'));

    useEffect(() => { if (activeTab === 'bookings') loadBookings(); else if (activeTab === 'rentals') loadRentals(); }, [filter, activeTab]);
    useEffect(() => { loadStats(); loadVariants(); loadAddons(); loadTemplates(); loadBlockedDates(); }, []);

    // Actions
    const req = (promise, type) => promise.then(r => { showMsg(r.data.message); if (type === 'booking') loadBookings(); else if (type === 'rental') loadRentals(); else loadBlockedDates(); loadStats(); }).catch(err => showMsg(err.response?.data?.message || 'Gagal', 'error'));
    
    const handleApprove = id => req(axios.post(`/admin/api/bookings/${id}/approve`), 'booking');
    const handleRentalApprove = id => req(axios.post(`/admin/api/rentals/${id}/approve`), 'rental');
    const handleReject = id => setRejectModal({ open: true, id, type: 'booking' });
    const handleRentalReject = id => setRejectModal({ open: true, id, type: 'rental' });
    const doReject = reason => { 
        const { id, type } = rejectModal; 
        req(axios.post(`/admin/api/${type === 'booking' ? 'bookings' : 'rentals'}/${id}/reject`, { notes: reason }), type); 
        setRejectModal({ open: false, id: null, type: null }); setSelectedItem(null); 
    };
    
    const handleVerify = (pid, status, type) => {
        axios.post(`/admin/api/${type === 'booking' ? 'payments' : 'rentals-payments'}/${pid}/verify`, { status }).then(r => {
            showMsg(r.data.message); loadStats(); type === 'booking' ? loadBookings() : loadRentals();
            setSelectedItem(prev => prev ? { ...prev, payments: prev.payments.map(p => p.id === pid ? { ...p, status } : p) } : null);
        }).catch(err => showMsg(err.response?.data?.message || 'Gagal.', 'error'));
    };

    const handleComplete = (id, type) => req(axios.post(`/admin/api/${type === 'booking' ? 'bookings' : 'rentals'}/${id}/complete`), type);
    const handleCancel = (id, type) => { if (confirm('Batalkan pesanan ini?')) { req(axios.post(`/admin/api/${type === 'booking' ? 'bookings' : 'rentals'}/${id}/cancel`), type); setSelectedItem(null); } };
    const handleRegenerateDoc = (code, type) => { if (confirm(`Regenerate dokumen ${type}?`)) axios.post(`/api/bookings/${code}/documents/regenerate`, { type }).then(r => { showMsg(r.data.message); loadBookings(); }).catch(err => showMsg(err.response?.data?.message || 'Gagal.', 'error')); };

    const handleBlockDateSubmit = e => {
        e.preventDefault();
        axios.post('/admin/api/unavailable-dates', blockForm)
            .then(r => { showMsg(r.data.message); setBlockForm({ date: '', reason: '' }); loadBlockedDates(); })
            .catch(err => showMsg(err.response?.data?.message || 'Gagal.', 'error'));
    };
    const handleUnblockDate = date => {
        if (confirm(`Buka blokir tanggal ${date}?`)) {
            axios.delete(`/admin/api/unavailable-dates/${date}`)
                .then(r => { showMsg(r.data.message); loadBlockedDates(); })
                .catch(err => showMsg(err.response?.data?.message || 'Gagal.', 'error'));
        }
    };

    // Config CRUD
    const handleForm = (e, endpoint, formState, setFormState, isEdit, setIsEdit, reloadFn) => {
        e.preventDefault();
        const method = isEdit ? 'put' : 'post';
        const url = `/admin/api/${endpoint}${isEdit ? `/${formState.id}` : ''}`;
        axios[method](url, formState).then(r => { showMsg(r.data.message); setFormState({ ...formState, id: null }); setIsEdit(false); reloadFn(); }).catch(err => showMsg(err.response?.data?.message || 'Gagal', 'error'));
    };
    
    const handleTemplateSubmit = e => {
        e.preventDefault();
        const fd = new FormData();
        Object.entries(templateForm).forEach(([k, v]) => {
            if (v == null) return;
            if (v instanceof File) { fd.append(k, v); return; }
            // FormData converts booleans to "true"/"false" — Laravel requires 1/0
            if (typeof v === 'boolean') { fd.append(k, v ? '1' : '0'); return; }
            fd.append(k, v);
        });
        const url = `/admin/api/photo-templates${templateForm.id ? `/${templateForm.id}` : ''}`;
        axios.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' }, params: templateForm.id ? { _method: 'PUT' } : {} })
            .then(r => {
                showMsg(r.data.message);
                setTemplateForm({ id: null, name: '', size: '4R', frame_type: '', layout_type: '', description: '', is_active: true, display_order: 0 });
                loadTemplates();
            }).catch(err => showMsg(err.response?.data?.message || 'Gagal', 'error'));
    };

    const del = (url, reloadFn) => { if (confirm('Hapus item ini?')) axios.delete(url).then(r => { showMsg(r.data.message); reloadFn(); }).catch(err => showMsg(err.response?.data?.message || 'Gagal', 'error')); };

    // Helpers
    const formatRp = num => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
    const sumVerified = py => (py || []).filter(p => p.status === 'verified').reduce((s, p) => s + Number(p.amount || 0), 0);
    const navBtn = (tab, label, count) => (
        <button onClick={() => { setActiveTab(tab); setSelectedItem(null); setFilter(''); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary/10 text-primary' : 'text-slate hover:bg-beige/50'}`}>
            <span>{label}</span>
            {count > 0 && <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-primary text-white' : 'bg-beige text-slate'}`}>{count}</span>}
        </button>
    );

    const DetailPanel = () => {
        if (!selectedItem) return null;
        const item = selectedItem;
        const isB = selectedType === 'booking';
        const code = isB ? item.booking_code : item.rental_code;
        const paid = sumVerified(item.payments);
        const rem = Math.max(0, item.total_price - paid);

        return (
            <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl border-l border-beige z-40 transform transition-transform overflow-y-auto flex flex-col">
                <div className="sticky top-0 bg-white border-b border-beige px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h3 className="font-serif text-lg font-semibold text-charcoal">{code}</h3>
                        <div className="flex gap-2 mt-1"><StatusBadge status={item.status} /></div>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-beige rounded-full text-warm-grey"><X size={20} /></button>
                </div>
                
                <div className="p-6 space-y-6 flex-1">
                    {/* Customer Info */}
                    <div className="bg-off-white rounded-xl p-4 border border-beige/60">
                        <h4 className="text-xs font-bold uppercase text-warm-grey mb-3 flex items-center gap-2"><User size={14} /> Customer Info</h4>
                        <div className="space-y-2 text-sm text-charcoal">
                            <p><span className="text-warm-grey inline-block w-20">Name:</span> {item.customer_name}</p>
                            <p><span className="text-warm-grey inline-block w-20">Phone:</span> {item.customer_phone}</p>
                            <p><span className="text-warm-grey inline-block w-20">Email:</span> {item.customer_email}</p>
                        </div>
                    </div>

                    {/* Event/Rental Info */}
                    <div className="bg-off-white rounded-xl p-4 border border-beige/60">
                        <h4 className="text-xs font-bold uppercase text-warm-grey mb-3 flex items-center gap-2"><Calendar size={14} /> {isB ? 'Event Details' : 'Rental Details'}</h4>
                        <div className="space-y-2 text-sm text-charcoal">
                            {isB ? (
                                <>
                                    <p><span className="text-warm-grey inline-block w-20">Event:</span> {item.event_name}</p>
                                    <p><span className="text-warm-grey inline-block w-20">Location:</span> {item.event_location}</p>
                                    <p><span className="text-warm-grey inline-block w-20">Date:</span> {item.event_datetime || item.event_date}</p>
                                    <p><span className="text-warm-grey inline-block w-20">Package:</span> {item.service_package?.name} ({item.package_variant?.name})</p>
                                    <p><span className="text-warm-grey inline-block w-20">Frame:</span> {item.selected_template?.name || 'Custom'}</p>
                                    {item.addons?.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-beige">
                                            <p className="text-xs font-semibold text-slate mb-1">Addons:</p>
                                            <ul className="list-disc list-inside text-xs text-warm-grey">
                                                {item.addons.map(a => <li key={a.id}>{a.name} (x{a.pivot.quantity})</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p><span className="text-warm-grey inline-block w-20">Start:</span> {item.start_date}</p>
                                    <p><span className="text-warm-grey inline-block w-20">End:</span> {item.end_date}</p>
                                    <div className="mt-2 pt-2 border-t border-beige">
                                        <p className="text-xs font-semibold text-slate mb-1">Items:</p>
                                        <ul className="list-disc list-inside text-xs text-warm-grey">
                                            {item.items?.map(i => <li key={i.id}>{i.equipment?.name} (x{i.qty})</li>)}
                                        </ul>
                                    </div>
                                </>
                            )}
                            {item.notes && <div className="mt-2 p-3 bg-amber-50 rounded-lg text-xs italic text-amber-800 border border-amber-100">{item.notes}</div>}
                        </div>
                    </div>

                    {/* Financial Info */}
                    <div className="bg-off-white rounded-xl p-4 border border-beige/60">
                        <h4 className="text-xs font-bold uppercase text-warm-grey mb-3 flex items-center gap-2"><CreditCard size={14} /> Financials</h4>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-warm-grey">Total Price</span>
                            <span className="text-lg font-bold text-charcoal">{formatRp(item.total_price)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-warm-grey">Paid (Verified)</span>
                            <span className="text-sm font-semibold text-emerald-600">{formatRp(paid)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-beige">
                            <span className="text-sm text-warm-grey">Remaining</span>
                            <span className="text-sm font-bold text-red-500">{formatRp(rem)}</span>
                        </div>
                    </div>

                    {/* Payments */}
                    <div className="bg-off-white rounded-xl p-4 border border-beige/60">
                        <h4 className="text-xs font-bold uppercase text-warm-grey mb-3 flex items-center gap-2"><RefreshCw size={14} /> Payment History</h4>
                        {item.payments?.length > 0 ? (
                            <div className="space-y-3">
                                {item.payments.map(p => (
                                    <div key={p.id} className="p-3 bg-white border border-beige rounded-lg">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-bold text-charcoal uppercase">{p.payment_type}</span>
                                            <span className={`text-[10px] font-bold uppercase ${p.status==='verified'?'text-emerald-600':p.status==='rejected'?'text-red-600':'text-amber-600'}`}>{p.status}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-charcoal mb-1">{formatRp(p.amount)}</p>
                                        <p className="text-[11px] text-warm-grey capitalize">{p.payment_method} · {p.payment_source}</p>
                                        
                                        {p.proof_image && (
                                            <a href={p.proof_image} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-dark">
                                                <Image size={12} /> View Proof
                                            </a>
                                        )}
                                        
                                        {p.status === 'pending' && (p.payment_source === 'manual' || p.proof_image) && (
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-beige">
                                                <button onClick={() => handleVerify(p.id, 'verified', selectedType)} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg text-xs font-semibold transition-colors">Verify</button>
                                                <button onClick={() => handleVerify(p.id, 'rejected', selectedType)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded-lg text-xs font-semibold transition-colors">Reject</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-warm-grey">No payment records found.</p>}
                    </div>

                    {/* Documents */}
                    {isB && item.documents?.length > 0 && (
                        <div className="bg-off-white rounded-xl p-4 border border-beige/60">
                            <h4 className="text-xs font-bold uppercase text-warm-grey mb-3 flex items-center gap-2"><FileText size={14} /> Documents</h4>
                            <div className="space-y-2">
                                {item.documents.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-2 bg-white border border-beige rounded-lg">
                                        <div>
                                            <p className="text-xs font-bold text-charcoal uppercase">{d.document_type.replace('_',' ')}</p>
                                            <p className="text-[10px] text-warm-grey">{new Date(d.generated_at).toLocaleDateString('id-ID')}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <a href={`/api/bookings/${d.id}/download`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md"><Eye size={14} /></a>
                                            <button onClick={() => handleRegenerateDoc(item.booking_code, d.document_type)} className="p-1.5 bg-slate-100 text-slate hover:bg-slate-200 rounded-md"><RefreshCw size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="sticky bottom-0 bg-white border-t border-beige p-4 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    {item.status === 'pending_approval' && (
                        <>
                            <button onClick={() => isB ? handleApprove(item.id) : handleRentalApprove(item.id)} className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Approve</button>
                            <button onClick={() => isB ? handleReject(item.id) : handleRentalReject(item.id)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-sm font-semibold transition-colors">Reject</button>
                        </>
                    )}
                    {item.status === 'confirmed' && (!isB ? item.payment_status === 'paid' : true) && (
                        <button onClick={() => handleComplete(item.id, selectedType)} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Mark as Completed</button>
                    )}
                    {['waiting_dp', 'confirmed'].includes(item.status) && (
                        <button onClick={() => handleCancel(item.id, selectedType)} className="w-auto px-4 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-sm font-semibold transition-colors"><Trash2 size={18} /></button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans text-charcoal flex">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-beige z-30 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-beige">
                    <img src="/images/logo.png" alt="Logo" className="w-8 h-8 rounded-full mr-3" onError={e=>e.target.style.display='none'} />
                    <h1 className="font-serif text-lg font-bold text-charcoal tracking-tight">Memoforia Admin</h1>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div>
                        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-warm-grey mb-2">Booking Management</p>
                        <div className="space-y-1">
                            {navBtn('bookings', 'Booking Approvals', stats.pending_bookings)}
                            {navBtn('calendar', 'Calendar Blocks', 0)}
                        </div>
                    </div>
                    <div>
                        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-warm-grey mb-2">Rental Management</p>
                        <div className="space-y-1">
                            {navBtn('rentals', 'Rental Approvals', stats.pending_rentals)}
                        </div>
                    </div>
                    <div>
                        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-warm-grey mb-2">Master Data</p>
                        <div className="space-y-1">
                            {navBtn('config', 'Configuration CRUD', 0)}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="sticky top-0 h-16 bg-white/80 backdrop-blur-md border-b border-beige z-20 px-8 flex items-center justify-between">
                    <h2 className="font-serif text-xl font-semibold capitalize text-charcoal">{activeTab.replace('_', ' ')}</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate">Hi, <strong>{auth?.user?.name || 'Admin'}</strong></span>
                        <button onClick={e => {e.preventDefault(); form.post('/logout')}} className="p-2 text-slate hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"><LogOut size={18} /></button>
                    </div>
                </header>

                {/* Notifications */}
                {message.text && (
                    <div className={`fixed top-20 right-8 z-50 px-6 py-3 rounded-xl border text-sm font-medium shadow-lg animate-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                        {message.text}
                    </div>
                )}

                <div className="p-8 max-w-7xl mx-auto w-full">
                    {/* Summary Cards */}
                    <div className="flex flex-wrap gap-4 mb-8">
                        <SummaryCard label="Pending Approval" value={stats.pending_bookings + stats.pending_rentals} sub="Bookings & Rentals" icon={AlertCircle} highlight={(stats.pending_bookings + stats.pending_rentals) > 0} loading={statsLoading} />
                        <SummaryCard label="Active Events" value={stats.active_bookings} sub="Confirmed bookings" icon={Sparkles} loading={statsLoading} />
                        <SummaryCard label="Pending Payments" value={stats.pending_payments} sub="Needs manual verification" icon={Clock} highlight={stats.pending_payments > 0} loading={statsLoading} />
                        <SummaryCard label="Monthly Revenue" value={formatRp(stats.monthly_revenue)} sub="From verified payments" icon={TrendingUp} loading={statsLoading} />
                    </div>

                    {/* Tabs Content */}
                    <div className="bg-white rounded-3xl shadow-sm border border-beige min-h-[500px]">
                        
                        {/* BOOKINGS & RENTALS TABLE */}
                        {(activeTab === 'bookings' || activeTab === 'rentals') && (
                            <div>
                                <div className="px-6 py-5 border-b border-beige flex items-center justify-between">
                                    <h3 className="font-serif text-lg font-semibold text-charcoal">{activeTab === 'bookings' ? 'Booking List' : 'Rental List'}</h3>
                                    <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 border border-beige rounded-xl text-sm bg-off-white focus:outline-none focus:border-primary">
                                        <option value="">All Statuses</option>
                                        <option value="pending_approval">Pending Approval</option>
                                        <option value="waiting_dp">Waiting DP</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                
                                {loading ? (
                                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse whitespace-nowrap">
                                            <thead>
                                                <tr className="bg-off-white text-xs text-warm-grey font-bold uppercase tracking-wider border-b border-beige">
                                                    <th className="px-6 py-4">Code</th>
                                                    <th className="px-6 py-4">Customer</th>
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Payment</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-beige">
                                                {(activeTab === 'bookings' ? bookings : rentals).map(item => {
                                                    const isB = activeTab === 'bookings';
                                                    const code = isB ? item.booking_code : item.rental_code;
                                                    const date = isB ? (item.event_datetime || item.event_date) : `${item.start_date} - ${item.end_date}`;
                                                    return (
                                                        <tr key={item.id} onClick={() => { setSelectedItem(item); setSelectedType(activeTab === 'bookings' ? 'booking' : 'rental'); }} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                                            <td className="px-6 py-4 text-sm font-semibold text-primary">{code}</td>
                                                            <td className="px-6 py-4 text-sm text-charcoal">
                                                                <p className="font-medium">{item.customer_name}</p>
                                                                <p className="text-xs text-warm-grey">{item.customer_phone}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate">{date}</td>
                                                            <td className="px-6 py-4 text-sm font-semibold text-charcoal">{formatRp(item.total_price)}</td>
                                                            <td className="px-6 py-4"><PaymentBadge status={item.payment_status} /></td>
                                                            <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button onClick={e => { e.stopPropagation(); setSelectedItem(item); setSelectedType(activeTab === 'bookings' ? 'booking' : 'rental'); }} className="p-2 text-primary hover:bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"><Eye size={18} /></button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                                {(activeTab === 'bookings' ? bookings : rentals).length === 0 && (
                                                    <tr><td colSpan="7" className="px-6 py-12 text-center text-warm-grey">No records found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CALENDAR BLOCKS */}
                        {activeTab === 'calendar' && (
                            <div className="p-6">
                                <form onSubmit={handleBlockDateSubmit} className="flex flex-wrap gap-4 items-end bg-off-white p-6 rounded-2xl border border-beige mb-8">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-bold text-warm-grey uppercase mb-2">Select Date</label>
                                        <input type="date" required value={blockForm.date} onChange={e => setBlockForm({...blockForm, date: e.target.value})} className="w-full px-4 py-2 border border-beige rounded-xl text-sm" />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-bold text-warm-grey uppercase mb-2">Reason</label>
                                        <input type="text" required placeholder="Maintenance..." value={blockForm.reason} onChange={e => setBlockForm({...blockForm, reason: e.target.value})} className="w-full px-4 py-2 border border-beige rounded-xl text-sm" />
                                    </div>
                                    <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl text-sm">Block Date</button>
                                </form>
                                <table className="w-full text-left border-collapse">
                                    <thead><tr className="bg-off-white text-xs text-warm-grey font-bold uppercase border-b border-beige"><th className="px-6 py-3">Date</th><th className="px-6 py-3">Reason</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                                    <tbody className="divide-y divide-beige">
                                        {blockedDates.map(b => (
                                            <tr key={b.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-semibold">{b.date}</td><td className="px-6 py-4 text-slate">{b.reason}</td>
                                                <td className="px-6 py-4 text-right"><button onClick={()=>handleUnblockDate(b.date)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={16}/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* CONFIGURATION */}
                        {activeTab === 'config' && (
                            <div>
                                <div className="flex px-6 border-b border-beige">
                                    {['packages', 'variants', 'addons', 'templates'].map(sub => (
                                        <button key={sub} onClick={() => setConfigSubTab(sub)} className={`px-6 py-4 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${configSubTab === sub ? 'border-primary text-primary' : 'border-transparent text-warm-grey hover:text-charcoal'}`}>{sub}</button>
                                    ))}
                                </div>
                                <div className="p-6">
                                    {/* Packages */}
                                    {configSubTab === 'packages' && (
                                        <div className="space-y-8">
                                            <form onSubmit={e => handleForm(e, 'service-packages', packageForm, setPackageForm, packageForm.id!=null, v=>{}, loadPackages)} className="bg-off-white p-6 rounded-2xl border border-beige grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-3 mb-2 flex items-center justify-between"><h4 className="font-serif font-semibold">{packageForm.id ? 'Edit Package' : 'New Package'}</h4>{packageForm.id && <button type="button" onClick={()=>setPackageForm({id:null, name:'', category:'soft_file', description:'', is_active:true, display_order:0})} className="text-xs text-warm-grey underline">Cancel Edit</button>}</div>
                                                <input type="text" required placeholder="Name" value={packageForm.name} onChange={e=>setPackageForm({...packageForm, name: e.target.value})} className="px-4 py-2 border rounded-xl text-sm" />
                                                <select required value={packageForm.category} onChange={e=>setPackageForm({...packageForm, category: e.target.value})} className="px-4 py-2 border rounded-xl text-sm"><option value="soft_file">Soft File</option><option value="unlimited_print">Unlimited Print</option><option value="limited_print">Limited Print</option></select>
                                                <input type="number" placeholder="Order" value={packageForm.display_order} onChange={e=>setPackageForm({...packageForm, display_order: e.target.value})} className="px-4 py-2 border rounded-xl text-sm" />
                                                <textarea required placeholder="Description" value={packageForm.description} onChange={e=>setPackageForm({...packageForm, description: e.target.value})} className="md:col-span-3 px-4 py-2 border rounded-xl text-sm" rows="2" />
                                                <div className="md:col-span-3 flex justify-end"><button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-xl text-sm">Save</button></div>
                                            </form>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {packages.map(p => (
                                                    <div key={p.id} className="p-4 border rounded-xl flex justify-between items-start">
                                                        <div><h5 className="font-bold">{p.name}</h5><p className="text-xs text-warm-grey">{p.category}</p></div>
                                                        <div className="flex gap-2"><button onClick={()=>setPackageForm(p)} className="p-1.5 text-primary bg-primary/10 rounded"><Edit2 size={14}/></button><button onClick={()=>del(`/admin/api/service-packages/${p.id}`, loadPackages)} className="p-1.5 text-red-500 bg-red-50 rounded"><Trash2 size={14}/></button></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Variants */}
                                    {configSubTab === 'variants' && (
                                        <div className="space-y-8">
                                            {/* Form */}
                                            <form onSubmit={e => handleForm(e, 'package-variants', variantForm, setVariantForm, variantForm.id != null, v => {}, loadVariants)} className="bg-off-white p-6 rounded-2xl border border-beige grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-3 mb-2 flex items-center justify-between">
                                                    <h4 className="font-serif font-semibold">{variantForm.id ? 'Edit Variant' : 'New Variant'}</h4>
                                                    {variantForm.id && <button type="button" onClick={() => setVariantForm({ id: null, service_package_id: '', name: '', price: '', duration_hours: '', print_limit: '', extra_hour_price: '', is_unlimited: false })} className="text-xs text-warm-grey underline">Cancel Edit</button>}
                                                </div>
                                                <select required value={variantForm.service_package_id} onChange={e => setVariantForm({ ...variantForm, service_package_id: e.target.value })} className="px-4 py-2 border rounded-xl text-sm">
                                                    <option value="">Select Package</option>
                                                    {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                <input type="text" required placeholder="Variant Name" value={variantForm.name} onChange={e => setVariantForm({ ...variantForm, name: e.target.value })} className="px-4 py-2 border rounded-xl text-sm" />
                                                <input type="number" required placeholder="Price (Rp)" value={variantForm.price} onChange={e => setVariantForm({ ...variantForm, price: e.target.value })} className="px-4 py-2 border rounded-xl text-sm" />
                                                <div className="md:col-span-3 flex justify-end">
                                                    <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-xl text-sm">Save Variant</button>
                                                </div>
                                            </form>

                                            {/* Filter by Package */}
                                            <div className="flex items-center gap-3">
                                                <label className="text-xs font-bold text-warm-grey uppercase">Filter by Package:</label>
                                                <select value={selectedPackageId} onChange={e => setSelectedPackageId(e.target.value)} className="px-4 py-2 border border-beige rounded-xl text-sm bg-white">
                                                    <option value="">All Packages</option>
                                                    {packages.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                                </select>
                                            </div>

                                            {/* Variant List */}
                                            <div className="divide-y divide-beige border border-beige rounded-2xl overflow-hidden">
                                                {(selectedPackageId
                                                    ? packageVariants.filter(v => String(v.service_package_id) === selectedPackageId)
                                                    : packageVariants
                                                ).length === 0 ? (
                                                    <p className="px-6 py-8 text-center text-warm-grey text-sm">Tidak ada variant ditemukan. Pilih package atau tambah variant baru.</p>
                                                ) : (
                                                    (selectedPackageId
                                                        ? packageVariants.filter(v => String(v.service_package_id) === selectedPackageId)
                                                        : packageVariants
                                                    ).map(v => (
                                                        <div key={v.id} className="flex items-center justify-between px-6 py-4 bg-white hover:bg-slate-50">
                                                            <div>
                                                                <p className="font-semibold text-charcoal text-sm">{v.name}</p>
                                                                <p className="text-xs text-warm-grey mt-0.5">{v.package_name} · {formatRp(v.price)}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setVariantForm({ id: v.id, service_package_id: String(v.service_package_id), name: v.name, price: v.price, duration_hours: v.duration_hours || '', print_limit: v.print_limit || '', extra_hour_price: v.extra_hour_price || '', is_unlimited: v.is_unlimited || false })} className="p-1.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => del(`/admin/api/package-variants/${v.id}`, loadVariants)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Addons */}
                                    {configSubTab === 'addons' && (
                                        <div className="space-y-8">
                                            {/* Form */}
                                            <form onSubmit={e => handleForm(e, 'addons', addonForm, setAddonForm, addonForm.id != null, v => {}, loadAddons)} className="bg-off-white p-6 rounded-2xl border border-beige grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2 mb-2 flex items-center justify-between">
                                                    <h4 className="font-serif font-semibold">{addonForm.id ? 'Edit Addon' : 'New Addon'}</h4>
                                                    {addonForm.id && <button type="button" onClick={() => setAddonForm({ id: null, name: '', price: '', description: '', is_active: true, display_order: 0 })} className="text-xs text-warm-grey underline">Cancel Edit</button>}
                                                </div>
                                                <input type="text" required placeholder="Addon Name" value={addonForm.name} onChange={e => setAddonForm({ ...addonForm, name: e.target.value })} className="px-4 py-2 border rounded-xl text-sm" />
                                                <input type="number" required placeholder="Price (Rp)" value={addonForm.price} onChange={e => setAddonForm({ ...addonForm, price: e.target.value })} className="px-4 py-2 border rounded-xl text-sm" />
                                                <textarea placeholder="Description (optional)" value={addonForm.description} onChange={e => setAddonForm({ ...addonForm, description: e.target.value })} className="md:col-span-2 px-4 py-2 border rounded-xl text-sm" rows="2" />
                                                <div className="md:col-span-2 flex justify-end">
                                                    <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-xl text-sm">Save Addon</button>
                                                </div>
                                            </form>

                                            {/* Addon List */}
                                            <div className="divide-y divide-beige border border-beige rounded-2xl overflow-hidden">
                                                {addons.length === 0 ? (
                                                    <p className="px-6 py-8 text-center text-warm-grey text-sm">Belum ada addon. Tambah addon baru di atas.</p>
                                                ) : (
                                                    addons.map(a => (
                                                        <div key={a.id} className="flex items-center justify-between px-6 py-4 bg-white hover:bg-slate-50">
                                                            <div>
                                                                <p className="font-semibold text-charcoal text-sm">{a.name}</p>
                                                                <p className="text-xs text-warm-grey mt-0.5">{formatRp(a.price)}{a.description ? ` · ${a.description}` : ''}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setAddonForm({ id: a.id, name: a.name, price: a.price, description: a.description || '', is_active: a.is_active, display_order: a.display_order || 0 })} className="p-1.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => del(`/admin/api/addons/${a.id}`, loadAddons)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Templates */}
                                    {configSubTab === 'templates' && (
                                        <div className="space-y-8">
                                            {/* Form */}
                                            <form onSubmit={handleTemplateSubmit} className="bg-off-white p-6 rounded-2xl border border-beige grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2 mb-2 flex items-center justify-between">
                                                    <h4 className="font-serif font-semibold">{templateForm.id ? 'Edit Template' : 'New Template Frame'}</h4>
                                                    {templateForm.id && <button type="button" onClick={() => setTemplateForm({ id: null, name: '', size: '4R', frame_type: '', layout_type: '', description: '', is_active: true, display_order: 0 })} className="text-xs text-warm-grey underline">Cancel Edit</button>}
                                                </div>
                                                <input type="text" required placeholder="Template Name" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} className="px-4 py-2 border rounded-xl text-sm" />
                                                <input type="text" placeholder="Size (e.g. 4R)" value={templateForm.size} onChange={e => setTemplateForm({ ...templateForm, size: e.target.value })} className="px-4 py-2 border rounded-xl text-sm" />
                                                <input type="file" accept="image/*" onChange={e => setTemplateForm({ ...templateForm, frame_image: e.target.files?.[0] })} className="px-4 py-2 border rounded-xl text-sm bg-white" />
                                                <input type="number" placeholder="Display Order" value={templateForm.display_order} onChange={e => setTemplateForm({ ...templateForm, display_order: e.target.value })} className="px-4 py-2 border rounded-xl text-sm" />
                                                <div className="md:col-span-2 flex justify-end">
                                                    <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-xl text-sm">Save Template</button>
                                                </div>
                                            </form>

                                            {/* Template List */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {templates.length === 0 ? (
                                                    <p className="col-span-2 px-6 py-8 text-center text-warm-grey text-sm">Belum ada template. Tambah template baru di atas.</p>
                                                ) : (
                                                    templates.map(t => (
                                                        <div key={t.id} className="p-4 border border-beige rounded-xl flex items-center gap-4 bg-white hover:bg-slate-50">
                                                            {t.frame_image && (
                                                                <img src={`/storage/${t.frame_image}`} alt={t.name} className="w-14 h-14 object-cover rounded-lg border border-beige flex-shrink-0" onError={e => e.target.style.display = 'none'} />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-charcoal text-sm truncate">{t.name}</p>
                                                                <p className="text-xs text-warm-grey mt-0.5">{t.size}{t.frame_type ? ` · ${t.frame_type}` : ''}</p>
                                                            </div>
                                                            <div className="flex gap-2 flex-shrink-0">
                                                                <button onClick={() => setTemplateForm({ id: t.id, name: t.name, size: t.size || '4R', frame_type: t.frame_type || '', layout_type: t.layout_type || '', description: t.description || '', is_active: t.is_active, display_order: t.display_order || 0 })} className="p-1.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => del(`/admin/api/photo-templates/${t.id}`, loadTemplates)} className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Overlays */}
            {selectedItem && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30" onClick={() => setSelectedItem(null)} />}
            <DetailPanel />
            <RejectModal open={rejectModal.open} onConfirm={doReject} onClose={() => setRejectModal({open: false})} />
        </div>
    );
}
