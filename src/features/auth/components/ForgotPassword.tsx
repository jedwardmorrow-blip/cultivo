import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components';

interface ForgotPasswordProps {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center p-6">
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
            <p className="text-cult-light-gray">
              We've sent a password reset link to <strong className="text-white">{email}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-cult-black border border-cult-medium-gray rounded p-4">
              <p className="text-sm text-cult-light-gray mb-2">What to do next:</p>
              <ol className="text-sm text-cult-light-gray space-y-1 list-decimal list-inside">
                <li>Check your email inbox</li>
                <li>Click the password reset link</li>
                <li>Enter your new password</li>
                <li>Sign in with your new password</li>
              </ol>
            </div>

            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 bg-cult-medium-gray text-white py-3 rounded font-bold uppercase tracking-wider hover:bg-cult-surface-overlay transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cult-black flex items-center justify-center p-6">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-cult-light-gray">Enter your email to receive a password reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-cult-light-gray mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cult-text-muted" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-cult-black border border-cult-medium-gray rounded text-white placeholder-cult-text-muted focus:outline-none focus:border-white transition"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              fullWidth
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 bg-cult-medium-gray text-white py-3 rounded font-bold uppercase tracking-wider hover:bg-cult-surface-overlay transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
