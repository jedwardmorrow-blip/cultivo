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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-cult-black">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("/cult-logo-outline.png")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '120px 120px',
          backgroundPosition: '0 0'
        }}
      />
      <div className="bg-cult-graphite/95 backdrop-blur-sm border border-cult-charcoal rounded-cult shadow-glow-strong w-full max-w-md p-8 relative z-10 animate-slide-in">
        <div className="text-center mb-8">
          <img
            src="/cult-logo-white-320.png"
            alt="Cult Cannabis Logo"
            className="w-32 h-32 mx-auto hover:scale-105 transition-transform duration-300"
          />
          <p className="text-cult-silver -mt-3 text-caption uppercase tracking-wider">Operations Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-cult-red/10 border border-cult-red rounded-cult p-3 flex items-start gap-2 animate-flicker">
              <AlertCircle className="w-5 h-5 text-cult-red flex-shrink-0 mt-0.5" />
              <p className="text-cult-off-white text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-cult-off-white mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cult-silver" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white placeholder-cult-silver focus:outline-none focus:border-cult-red focus:ring-2 focus:ring-cult-red/50 transition-all duration-300"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-cult-off-white">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-cult-silver hover:text-cult-off-white transition-colors duration-300"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cult-silver" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-cult-black border border-cult-charcoal rounded-cult text-cult-off-white placeholder-cult-silver focus:outline-none focus:border-cult-red focus:ring-2 focus:ring-cult-red/50 transition-all duration-300"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cult-off-white text-cult-black py-3 rounded-cult font-medium uppercase tracking-wider hover:bg-white hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-caption text-cult-silver">
            Contact your administrator for account access
          </p>
        </div>
      </div>
    </div>
  );
}
