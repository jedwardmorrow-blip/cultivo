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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("/cult-logo-outline.png")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '120px 120px',
          backgroundPosition: '0 0'
        }}
      />
      <div className="glass-card w-full max-w-md p-8 relative z-10 animate-slide-in">
        <div className="text-center mb-8">
          <img
            src="/cult-logo-white-320.png"
            alt="Cult Cannabis Logo"
            className="w-32 h-32 mx-auto hover:scale-105 transition-transform duration-300"
          />
          <p className="text-cult-text-secondary -mt-3 text-caption uppercase tracking-wider">Operations Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-cult-danger-muted border border-cult-danger rounded-cult p-3 flex items-start gap-2 animate-flicker">
              <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
              <p className="text-cult-text-primary text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-cult-text-primary mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cult-text-muted" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-input w-full pl-10 pr-4 py-3 rounded-cult text-cult-text-primary placeholder-cult-text-muted focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-cult-text-primary">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-cult-text-secondary hover:text-cult-accent transition-colors duration-300"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cult-text-muted" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="glass-input w-full pl-10 pr-4 py-3 rounded-cult text-cult-text-primary placeholder-cult-text-muted focus:border-cult-accent focus:ring-2 focus:ring-cult-accent/20"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cult-accent text-cult-opaque-black py-3 rounded-cult font-medium uppercase tracking-wider hover:bg-cult-accent-hover hover:shadow-glow-accent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-caption text-cult-text-muted">
            Contact your administrator for account access
          </p>
        </div>
      </div>
    </div>
  );
}
