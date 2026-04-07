import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cult-black flex items-center justify-center p-6">
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-xl w-full max-w-md p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-cult-success-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-cult-success" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password Updated</h1>
            <p className="text-cult-light-gray mb-4">
              Your password has been successfully updated
            </p>
            <p className="text-sm text-cult-text-muted">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cult-black flex items-center justify-center p-6">
      <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
          <p className="text-cult-light-gray">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-cult-danger-muted border border-cult-danger rounded p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
              <p className="text-cult-text-primary/80 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-cult-light-gray mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cult-text-muted" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-cult-black border border-cult-medium-gray rounded text-white placeholder-cult-text-muted focus:outline-none focus:border-white transition"
                placeholder="Min. 6 characters"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-cult-light-gray mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cult-text-muted" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-cult-black border border-cult-medium-gray rounded text-white placeholder-cult-text-muted focus:outline-none focus:border-white transition"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            fullWidth
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
