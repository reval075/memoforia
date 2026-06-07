import { useForm, Head } from '@inertiajs/react';
import { Loader2, Lock, Mail, ArrowRight } from 'lucide-react';

export default function ResetPassword({ token, email }) {
    const form = useForm({
        token: token || '',
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();
        form.post('/reset-password');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-primary-50 to-off-white flex flex-col items-center justify-center p-6 font-sans select-none">
            <Head title="Atur Ulang Kata Sandi" />

            <div className="w-full max-w-[420px] bg-white p-10 rounded-3xl shadow-xl shadow-primary/5 border border-primary-50">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <img 
                        src="/images/logo.png" 
                        alt="MemoForia Logo" 
                        className="h-16 w-16 rounded-full mx-auto mb-4 object-cover shadow-md shadow-primary/10" 
                    />
                    <h1 className="font-serif text-3xl text-charcoal tracking-wide">MemoForia</h1>
                    <p className="text-sm text-warm-grey mt-1">Atur Ulang Kata Sandi Admin</p>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    {/* Hidden Token Input */}
                    <input type="hidden" name="token" value={form.data.token} />

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm text-charcoal font-medium mb-2">Email Address</label>
                        <div className="relative">
                            <input
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                type="email"
                                autoComplete="username"
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

                    {/* Password Input */}
                    <div>
                        <label className="block text-sm text-charcoal font-medium mb-2">Kata Sandi Baru</label>
                        <div className="relative">
                            <input
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                type="password"
                                autoComplete="new-password"
                                className={`w-full pl-11 pr-5 py-3 rounded-xl border-2 bg-off-white text-sm focus:outline-none transition-colors duration-300 ${form.errors.password ? 'border-red-300 focus:border-red-500' : 'border-beige focus:border-primary'}`}
                                placeholder="••••••••"
                                required
                            />
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-grey" />
                        </div>
                        {form.errors.password && (
                            <p className="text-xs text-red-500 mt-2 font-medium">{form.errors.password}</p>
                        )}
                    </div>

                    {/* Confirm Password Input */}
                    <div>
                        <label className="block text-sm text-charcoal font-medium mb-2">Konfirmasi Kata Sandi Baru</label>
                        <div className="relative">
                            <input
                                value={form.data.password_confirmation}
                                onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                type="password"
                                autoComplete="new-password"
                                className={`w-full pl-11 pr-5 py-3 rounded-xl border-2 bg-off-white text-sm focus:outline-none transition-colors duration-300 ${form.errors.password_confirmation ? 'border-red-300 focus:border-red-500' : 'border-beige focus:border-primary'}`}
                                placeholder="••••••••"
                                required
                            />
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-grey" />
                        </div>
                        {form.errors.password_confirmation && (
                            <p className="text-xs text-red-500 mt-2 font-medium">{form.errors.password_confirmation}</p>
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
                                <span>Reset Kata Sandi</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
