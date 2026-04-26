import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { ForgotPassword } from './ForgotPassword';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn } = useAuth();

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cult-surface-inset">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <div
            className="text-cult-text-primary"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: '28px',
              letterSpacing: '0.16em',
            }}
          >
            CULTIVO
          </div>
          <div
            className="mt-3 text-cult-text-muted font-mono uppercase"
            style={{ fontSize: '10px', letterSpacing: '0.18em' }}
          >
            Cultivation Operations
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="border border-cult-danger/40 bg-cult-danger-muted px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-cult-danger flex-shrink-0 mt-0.5" />
              <p className="text-cult-text-primary text-sm">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block font-mono uppercase mb-2 text-cult-text-muted"
              style={{ fontSize: '10px', letterSpacing: '0.14em' }}
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-input w-full pl-10 pr-3 py-2.5 text-cult-text-primary placeholder-cult-text-faint focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label
                htmlFor="password"
                className="block font-mono uppercase text-cult-text-muted"
                style={{ fontSize: '10px', letterSpacing: '0.14em' }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-cult-text-muted hover:text-cult-accent transition-colors"
              >
                Forgot
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-text-muted" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="glass-input w-full pl-10 pr-3 py-2.5 text-cult-text-primary placeholder-cult-text-faint focus:outline-none"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cult-accent text-cult-opaque-black py-2.5 font-mono uppercase tracking-widest text-sm hover:bg-cult-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ letterSpacing: '0.16em' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-cult-border-faint text-center">
          <p
            className="text-cult-text-faint font-mono uppercase"
            style={{ fontSize: '10px', letterSpacing: '0.14em' }}
          >
            Contact your administrator for access
          </p>
        </div>
      </div>
    </div>
  );
}
