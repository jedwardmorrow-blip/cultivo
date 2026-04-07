import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { getSiteUrl } from '@/lib/utils';
import { Users, UserPlus, Check, X, AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/shared/components';
import { Database } from '@/lib/database';
import { settingsService } from '../services/settings.service';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export function UserManagement() {
  const { profile, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user' as 'admin' | 'manager' | 'user',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserProfile | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await settingsService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      setFormData({ email: '', password: '', fullName: '', role: 'user' });
      setShowAddForm(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .rpc('update_user_profile', {
          target_user_id: userId,
          new_is_active: !currentStatus
        });

      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user status:', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'manager' | 'user') => {
    try {
      const { error } = await supabase
        .rpc('update_user_profile', {
          target_user_id: userId,
          new_role: newRole
        });

      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    setResettingPassword(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetPasswordUser.email, {
        redirectTo: `${getSiteUrl()}/reset-password`,
      });

      if (error) throw error;

      setResetSuccess(`Password reset email sent to ${resetPasswordUser.email}`);
      setTimeout(() => {
        setResetSuccess(null);
        setResetPasswordUser(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
      setTimeout(() => setError(''), 5000);
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return <div className="text-white">Loading users...</div>;
  }

  if (!isAdmin) {
    return (
      <div>
        <div className="bg-cult-danger-muted border border-cult-danger rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-cult-danger flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-cult-text-primary mb-2">Access Denied</h2>
            <p className="text-cult-text-primary/80">You must be an administrator to access user management.</p>
            <p className="text-cult-text-primary/80 mt-2 text-sm">Debug: profile={JSON.stringify(profile)}, isAdmin={String(isAdmin)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-wide">User Management</h2>
          <p className="text-cult-light-gray mt-1">Manage user accounts and permissions</p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          icon={<UserPlus className="w-5 h-5" />}
        >
          Add User
        </Button>
      </div>

      {resetSuccess && (
        <div className="bg-cult-success-muted border border-cult-success rounded-lg p-4 mb-6 flex items-start gap-3">
          <Check className="w-6 h-6 text-cult-success flex-shrink-0" />
          <div>
            <p className="text-cult-text-primary font-medium">{resetSuccess}</p>
            <p className="text-cult-text-primary/80 text-sm mt-1">The user will receive an email with instructions to reset their password.</p>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Create New User</h2>
          <form onSubmit={handleAddUser} className="space-y-4">
            {error && (
              <div className="bg-cult-danger-muted border border-cult-danger rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
                <p className="text-cult-text-primary/80 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-cult-black border border-cult-medium-gray rounded text-white focus:outline-none focus:border-white transition"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 bg-cult-black border border-cult-medium-gray rounded text-white focus:outline-none focus:border-white transition"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-cult-black border border-cult-medium-gray rounded text-white focus:outline-none focus:border-white transition"
                  placeholder="Min. 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'user' })}
                  className="w-full px-4 py-2 bg-cult-black border border-cult-medium-gray rounded text-white focus:outline-none focus:border-white transition"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={submitting}
                loading={submitting}
                size="sm"
              >
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError('');
                  setFormData({ email: '', password: '', fullName: '', role: 'user' });
                }}
                className="bg-cult-medium-gray text-white px-6 py-2 font-bold uppercase tracking-wider hover:bg-cult-surface-overlay transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-cult-near-black rounded-lg shadow border border-cult-medium-gray">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cult-surface-sunken border-b border-cult-medium-gray">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase">Role</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cult-text-muted uppercase">Created</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cult-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cult-border-subtle">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-cult-surface-overlay">
                  <td className="px-4 py-3 text-sm text-white">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-cult-light-gray">{user.full_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value as 'admin' | 'manager' | 'user')}
                      disabled={user.id === profile?.id}
                      className="bg-cult-black border border-cult-medium-gray rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-cult-success-muted text-cult-success">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-cult-danger-muted text-cult-danger">
                        <X className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-cult-light-gray">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        disabled={user.id === profile?.id}
                        className="text-xs font-medium text-white hover:text-cult-text-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setResetPasswordUser(user)}
                        className="flex items-center gap-1 text-xs font-medium text-cult-info hover:text-cult-info/80 transition"
                      >
                        <RotateCw className="w-3 h-3" />
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-cult-text-muted mx-auto mb-3" />
            <p className="text-cult-light-gray">No users found</p>
          </div>
        )}
      </div>

      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Reset Password</h3>
            <p className="text-cult-light-gray mb-2">
              Send a password reset email to:
            </p>
            <p className="text-white font-medium mb-4">{resetPasswordUser.email}</p>
            <p className="text-cult-light-gray text-sm mb-6">
              The user will receive an email with a secure link to reset their password.
              The link will expire after 24 hours.
            </p>

            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
                <p className="text-cult-text-primary/80 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleResetPassword}
                disabled={resettingPassword}
                loading={resettingPassword}
                className="flex-1"
              >
                {resettingPassword ? 'Sending...' : 'Send Reset Email'}
              </Button>
              <button
                onClick={() => {
                  setResetPasswordUser(null);
                  setError('');
                }}
                disabled={resettingPassword}
                className="flex-1 bg-cult-medium-gray text-white px-6 py-3 rounded font-bold uppercase tracking-wider hover:bg-cult-surface-overlay transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
