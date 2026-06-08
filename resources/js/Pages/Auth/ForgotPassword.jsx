import { useForm, usePage, Link, Head } from '@inertiajs/react';
import { Loader2, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
    const { flash } = usePage().props;
    const form = useForm({
        email: '',
    });

    const submit = (event) => {
        event.preventDefault();
        form.post('/forgot-password');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-primary-50 to-off-white flex flex-col items-center justify-center p-6 font-sans select-none">
            <Head title="Lupa Kata Sandi" />

            <div className="w-full max-w-[420px] bg-white p-10 rounded-3xl shadow-xl shadow-primary/5 border border-primary-50">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <img
                        src="/images/logo.png"
                        alt="MemoForia Logo"
                        className="h-16 w-16 rounded-full mx-auto mb-4 object-cover shadow-md shadow-primary/10"
                    />
                    <h1 className="font-serif text-3xl text-charcoal tracking-wide">MemoForia</h1>
                    <p className="text-sm text-warm-grey mt-1">Lupa Kata Sandi Admin</p>
                </div>

                <p className="text-sm text-slate text-center leading-relaxed mb-6 font-light">
                    Masukkan alamat email Anda di bawah ini dan kami akan mengirimkan link untuk menyetel ulang kata sandi Anda.
                </p>

                {/* Flash Message Success */}
                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-4 rounded-xl mb-6 text-center font-medium leading-relaxed">
                        {flash.success}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-6">
                    {/* Email Input */}
                    <div>
                        <label className="block text-sm text-charcoal font-medium mb-2">Email Address</label>
                        <div className="relative">
                            <input
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                type="email"
                                className={`w-full pl-11 pr-5 py-3 rounded-xl border-2 bg-off-white text-sm focus:outline-none transition-colors duration-300 ${form.errors.email ? 'border-red-300 focus:border-red-500' : 'border-beige focus:border-primary'}`}
                                placeholder="admin@memoforia.com"
                                required
                            />
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-grey" />
                        </div>
                        {form.errors.email && (
                            <p className="text-xs text-red-500 mt-2 font-medium">{form.errors.email}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="w-full flex items-center justify-center space-x-2 bg-primary text-white py-3.5 rounded-xl font-medium tracking-wide hover:bg-primary-dark active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-lg shadow-primary/25"
                    >
                        {form.processing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <span>Kirim Link Reset</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>

                    {/* Back to Login */}
                    <div className="text-center pt-2">
                        <Link href="/login" className="inline-flex items-center space-x-1.5 text-xs text-primary-dark hover:text-primary transition-colors font-medium">
                            <ArrowLeft size={12} />
                            <span>Kembali ke Halaman Login</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
