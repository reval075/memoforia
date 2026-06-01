import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Upload, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { formatCurrency } from '../utils/bookingDisplay';

const MAX_FILE_SIZE_KB = 5120;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_KB * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const paymentTypeLabel = {
    dp: 'Down Payment (DP)',
    settlement: 'Pelunasan',
    full_payment: 'Bayar Lunas (Transfer Manual)',
};

/**
 * Guest manual transfer proof upload (booking or rental).
 */
export default function PaymentProofUpload({
    transactionCode,
    contact,
    transactionData,
    transactionType = 'booking',
    onUploadSuccess,
}) {
    const isRental = transactionType === 'rental';
    const allowedTypes = transactionData?.allowed_payment_types || [];
    const defaultPaymentType = allowedTypes[0] || 'settlement';

    const uploadEndpoint = isRental
        ? '/api/rental-requests/payment-proof'
        : '/api/bookings/payment-proof';

    const [form, setForm] = useState({
        amount: '',
        payment_method: 'Bank Transfer',
        payment_type: defaultPaymentType,
    });
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            payment_type: allowedTypes.includes(prev.payment_type) ? prev.payment_type : defaultPaymentType,
        }));
    }, [defaultPaymentType, allowedTypes]);

    useEffect(() => {
        if (form.payment_type === 'settlement' && transactionData?.remaining_amount) {
            setForm((prev) => ({
                ...prev,
                amount: prev.amount || String(transactionData.remaining_amount),
            }));
        }
        if (form.payment_type === 'full_payment' && transactionData?.total_price && !form.amount) {
            setForm((prev) => ({
                ...prev,
                amount: String(transactionData.total_price),
            }));
        }
    }, [form.payment_type, transactionData?.remaining_amount, transactionData?.total_price]);

    const validateFile = (selectedFile) => {
        if (!selectedFile) {
            return 'File bukti transfer wajib diunggah.';
        }

        if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
            return 'Format file harus berupa gambar (JPG, PNG, WEBP, atau GIF).';
        }

        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            return `Ukuran file maksimal ${MAX_FILE_SIZE_KB / 1024} MB.`;
        }

        return null;
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0] || null;
        setUploadError('');
        setUploadSuccess('');

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }

        if (!selectedFile) {
            setFile(null);
            setFieldErrors((prev) => ({ ...prev, proof_file: null }));
            return;
        }

        const fileError = validateFile(selectedFile);
        if (fileError) {
            setFile(null);
            setFieldErrors((prev) => ({ ...prev, proof_file: fileError }));
            return;
        }

        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setFieldErrors((prev) => ({ ...prev, proof_file: null }));
    };

    const validateForm = () => {
        const errors = {};

        if (!form.amount || Number(form.amount) <= 0) {
            errors.amount = 'Nominal pembayaran wajib diisi.';
        }

        if (!form.payment_method.trim()) {
            errors.payment_method = 'Metode pembayaran wajib diisi.';
        }

        const fileError = validateFile(file);
        if (fileError) {
            errors.proof_file = fileError;
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploadError('');
        setUploadSuccess('');

        if (!validateForm()) {
            return;
        }

        setUploading(true);

        const formData = new FormData();
        if (isRental) {
            formData.append('rental_code', transactionCode);
        } else {
            formData.append('booking_code', transactionCode);
        }
        formData.append('contact', contact);
        formData.append('amount', form.amount);
        formData.append('payment_type', form.payment_type);
        formData.append('payment_method', form.payment_method);
        formData.append('proof_file', file);

        try {
            const response = await axios.post(uploadEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data?.success) {
                setUploadSuccess(response.data.message || 'Bukti pembayaran berhasil diunggah.');
                setFile(null);
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }
                setForm({
                    amount: '',
                    payment_method: 'Bank Transfer',
                    payment_type: defaultPaymentType,
                });

                if (onUploadSuccess) {
                    await onUploadSuccess();
                }
                return;
            }

            setUploadError('Gagal mengunggah bukti pembayaran. Silakan coba lagi.');
        } catch (err) {
            if (err.response?.status === 422) {
                const apiErrors = err.response.data?.errors;
                if (apiErrors) {
                    setFieldErrors({
                        amount: apiErrors.amount?.[0] || null,
                        payment_method: apiErrors.payment_method?.[0] || null,
                        proof_file: apiErrors.proof_file?.[0] || null,
                    });
                }
                setUploadError(
                    err.response?.data?.message ||
                        'Gagal mengunggah bukti pembayaran. Periksa kembali data Anda.'
                );
            } else {
                setUploadError('Terjadi gangguan jaringan. Silakan coba lagi.');
            }
        } finally {
            setUploading(false);
        }
    };

    const entityLabel = isRental ? 'sewa' : 'booking';

    return (
        <div className="bg-white rounded-2xl border border-beige p-6 md:p-8 shadow-sm">
            <h3 className="font-serif text-lg text-charcoal mb-5 flex items-center border-b border-beige pb-3">
                <Upload size={20} className="mr-2 text-primary shrink-0" />
                Upload Bukti Transfer Manual
            </h3>

            <p className="text-sm text-slate font-light mb-6 leading-relaxed">
                Alternatif jika tidak memakai pembayaran online: unggah bukti transfer untuk diverifikasi admin.
                {form.payment_type === 'full_payment' && isRental && (
                    <span className="block mt-2 text-warm-grey">
                        Untuk DP sebagian, gunakan pembayaran online di atas.
                    </span>
                )}
            </p>

            {uploadSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-2xl mb-6 text-sm flex items-start gap-2">
                    <CheckCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{uploadSuccess}</span>
                </div>
            )}

            {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm text-center">
                    {uploadError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {allowedTypes.length > 1 && (
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-2">Jenis Pembayaran</label>
                        <select
                            value={form.payment_type}
                            onChange={(e) => setForm((prev) => ({ ...prev, payment_type: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-beige bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            disabled={uploading}
                        >
                            {allowedTypes.map((type) => (
                                <option key={type} value={type}>
                                    {paymentTypeLabel[type] || type}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {allowedTypes.length === 1 && (
                    <p className="text-sm text-charcoal font-medium">
                        {paymentTypeLabel[allowedTypes[0]] || allowedTypes[0]}
                    </p>
                )}

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-charcoal">Nominal Pembayaran (Rp)</label>
                        {form.payment_type === 'settlement' && transactionData?.remaining_amount != null && (
                            <span className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
                                Sisa: {formatCurrency(transactionData.remaining_amount)}
                            </span>
                        )}
                    </div>
                    <input
                        type="number"
                        min="0"
                        step="1000"
                        value={form.amount}
                        onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder={
                            form.payment_type === 'settlement' && transactionData?.remaining_amount
                                ? `Contoh: ${Number(transactionData.remaining_amount)}`
                                : transactionData?.total_price
                                ? `Contoh: ${Number(transactionData.total_price)}`
                                : 'Masukkan nominal'
                        }
                        className={`w-full px-4 py-3 rounded-xl border bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                            fieldErrors.amount ? 'border-red-300' : 'border-beige'
                        }`}
                        disabled={uploading}
                    />
                    {fieldErrors.amount && <p className="text-red-600 text-xs mt-2">{fieldErrors.amount}</p>}
                    {form.payment_type === 'settlement' && transactionData?.remaining_amount && (
                        <p className="text-xs text-warm-grey mt-2">
                            Sisa tagihan: {formatCurrency(transactionData.remaining_amount)}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Metode Pembayaran</label>
                    <input
                        type="text"
                        value={form.payment_method}
                        onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                        placeholder="BCA, Mandiri, QRIS, dll."
                        className={`w-full px-4 py-3 rounded-xl border bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                            fieldErrors.payment_method ? 'border-red-300' : 'border-beige'
                        }`}
                        disabled={uploading}
                    />
                    {fieldErrors.payment_method && (
                        <p className="text-red-600 text-xs mt-2">{fieldErrors.payment_method}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Bukti Transfer (Gambar)</label>
                    <input
                        type="file"
                        accept={ACCEPTED_TYPES.join(',')}
                        onChange={handleFileChange}
                        className={`w-full text-sm text-slate file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-white file:cursor-pointer hover:file:bg-primary-dark ${
                            fieldErrors.proof_file ? 'border border-red-300 rounded-xl p-2' : ''
                        }`}
                        disabled={uploading}
                    />
                    <p className="text-xs text-warm-grey mt-2">
                        JPG, PNG, WEBP, atau GIF — maks. {MAX_FILE_SIZE_KB / 1024} MB
                    </p>
                    {fieldErrors.proof_file && (
                        <p className="text-red-600 text-xs mt-2">{fieldErrors.proof_file}</p>
                    )}

                    {previewUrl && (
                        <div className="mt-4 rounded-xl border border-beige overflow-hidden bg-off-white">
                            <img
                                src={previewUrl}
                                alt="Preview bukti pembayaran"
                                className="w-full max-h-64 object-contain"
                            />
                            {file && (
                                <p className="text-xs text-warm-grey px-4 py-2 border-t border-beige flex items-center gap-1">
                                    <ImageIcon size={14} />
                                    {file.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white px-8 py-3.5 rounded-full hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            <span>Mengunggah...</span>
                        </>
                    ) : (
                        <>
                            <Upload size={18} />
                            <span>Kirim Bukti Pembayaran</span>
                        </>
                    )}
                </button>
            </form>

            {transactionData?.total_price && (
                <p className="text-xs text-warm-grey text-center mt-4">
                    Total {entityLabel}: {formatCurrency(transactionData.total_price)}
                </p>
            )}
        </div>
    );
}
