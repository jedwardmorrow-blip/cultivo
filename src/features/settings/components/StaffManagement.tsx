import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Check, X, Search, Filter } from 'lucide-react';
import { Button } from '@/shared/components';
import type { StaffMember } from '@/types';
import { upsertStaff, deleteStaff, toggleStaffActive, loadStaffList } from '../services/staff.service';

interface StaffFormData {
  first_name: string;
  last_name: string;
  position_title: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  hourly_rate: string;
  pin_code: string;
  start_date: string;
  end_date: string;
  reports_to: string;
  slack_id: string;
  notes: string;
  is_active: boolean;
}

const DEPARTMENTS = [
  'leadership',
  'governance',
  'cultivation',
  'post_production',
  'sales',
  'inventory',
];

const ROLES = [
  'admin',
  'manager',
  'cultivator',
  'trimmer',
  'packager',
  'sales',
  'inventory',
  'staff',
];

const emptyFormData: StaffFormData = {
  first_name: '',
  last_name: '',
  position_title: '',
  department: '',
  role: '',
  email: '',
  phone: '',
  hourly_rate: '',
  pin_code: '',
  start_date: '',
  end_date: '',
  reports_to: '',
  slack_id: '',
  notes: '',
  is_active: true,
};

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(emptyFormData);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      setStaff(await loadStaffList());
    } catch (err: any) {
      setError(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await upsertStaff({
        id: editingStaff?.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || null,
        position_title: formData.position_title.trim() || null,
        department: formData.department || null,
        role: formData.role || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        pin_code: formData.pin_code.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        reports_to: formData.reports_to || null,
        slack_id: formData.slack_id.trim() || null,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
      });
      setShowModal(false);
      setEditingStaff(null);
      setFormData(emptyFormData);
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff member');
    }
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      position_title: member.position_title || '',
      department: member.department || '',
      role: member.role || '',
      email: member.email || '',
      phone: member.phone || '',
      hourly_rate: member.hourly_rate?.toString() || '',
      pin_code: member.pin_code || '',
      start_date: member.start_date || '',
      end_date: member.end_date || '',
      reports_to: member.reports_to || '',
      slack_id: member.slack_id || '',
      notes: member.notes || '',
      is_active: member.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (member: StaffMember) => {
    if (!window.confirm('Are you sure you want to delete ' + member.first_name + ' ' + (member.last_name || '') + '? This action cannot be undone.')) return;
    try {
      setError(null);
      await deleteStaff(member.id);
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff member');
    }
  };

  const toggleActive = async (member: StaffMember) => {
    try {
      setError(null);
      await toggleStaffActive(member.id, !member.is_active);
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to update staff status');
    }
  };

  const handleAddNew = () => { setEditingStaff(null); setFormData(emptyFormData); setShowModal(true); };

  const formatDepartment = (dept: string | null) => {
    if (!dept) return '\u2014';
    return dept.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const filteredStaff = staff.filter((member) => {
    const matchesDept = departmentFilter === 'all' || member.department === departmentFilter;
    const matchesSearch = !searchQuery || (member.first_name + ' ' + (member.last_name || '')).toLowerCase().includes(searchQuery.toLowerCase()) || (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) || (member.position_title && member.position_title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  if (loading) return (<div className="flex items-center justify-center py-12"><div className="text-cult-text-muted">Loading staff directory...</div></div>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cult-text-primary" />
          <h2 className="text-lg font-semibold text-cult-text-primary">Staff Directory</h2>
          <span className="text-sm text-cult-text-muted">({staff.length} members)</span>
        </div>
        <Button onClick={handleAddNew} size="sm" icon={Plus}>Add Staff</Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cult-border" />
          <input type="text" placeholder="Search by name, email, or title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm placeholder-cult-border focus:outline-none focus:border-cult-text-muted" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cult-border" />
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm px-3 py-2 focus:outline-none focus:border-cult-text-muted">
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((dept) => (<option key={dept} value={dept}>{dept.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>))}
          </select>
        </div>
      </div>
      {error && (<div className="bg-cult-danger-muted border border-cult-danger text-cult-danger px-4 py-2 rounded-lg text-sm">{error}</div>)}
      <div className="overflow-x-auto border border-cult-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cult-border bg-cult-surface">
              <th className="text-left px-4 py-3 text-cult-text-muted font-medium">Name</th>
              <th className="text-left px-4 py-3 text-cult-text-muted font-medium">Position</th>
              <th className="text-left px-4 py-3 text-cult-text-muted font-medium">Department</th>
              <th className="text-left px-4 py-3 text-cult-text-muted font-medium">Role</th>
              <th className="text-left px-4 py-3 text-cult-text-muted font-medium">Email</th>
              <th className="text-center px-4 py-3 text-cult-text-muted font-medium">Status</th>
              <th className="text-right px-4 py-3 text-cult-text-muted font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (<tr><td colSpan={7} className="text-center py-8 text-cult-border">{searchQuery || departmentFilter !== 'all' ? 'No staff members match your filters' : 'No staff members found'}</td></tr>) : (
              filteredStaff.map((member) => (
                <tr key={member.id} className="border-b border-cult-border/50 hover:bg-cult-black/50 cursor-pointer" onClick={() => handleEdit(member)}>
                  <td className="px-4 py-3 text-cult-text-primary font-medium">{member.first_name} {member.last_name || ''}</td>
                  <td className="px-4 py-3 text-cult-text-muted">{member.position_title || '\u2014'}</td>
                  <td className="px-4 py-3 text-cult-text-muted">{formatDepartment(member.department)}</td>
                  <td className="px-4 py-3 text-cult-text-muted capitalize">{member.role || '\u2014'}</td>
                  <td className="px-4 py-3 text-cult-text-muted">{member.email || '\u2014'}</td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleActive(member)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${member.is_active ? 'bg-cult-success-muted text-cult-success border-cult-success hover:bg-cult-success-muted/80' : 'bg-red-900/30 text-cult-danger border-red-600 hover:bg-red-900/50'}`}>
                      {member.is_active ? (<><Check className="w-3 h-3" /> Active</>) : (<><X className="w-3 h-3" /> Inactive</>)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(member)} className="p-1.5 rounded hover:bg-cult-border/30 text-cult-text-muted hover:text-cult-text-primary transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(member)} className="p-1.5 rounded hover:bg-cult-danger-muted text-cult-text-muted hover:text-cult-danger transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-cult-surface border border-cult-border rounded-cult w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cult-border">
              <h3 className="text-lg font-semibold text-cult-text-primary">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button onClick={() => { setShowModal(false); setEditingStaff(null); setFormData(emptyFormData); }} className="text-cult-text-muted hover:text-cult-text-primary transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm text-cult-text-muted mb-1">First Name <span className="text-cult-danger">*</span></label><input type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
                <div><label className="block text-sm text-cult-text-muted mb-1">Last Name</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm text-cult-text-muted mb-1">Position Title</label><input type="text" value={formData.position_title} onChange={(e) => setFormData({ ...formData, position_title: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
                <div><label className="block text-sm text-cult-text-muted mb-1">Department</label><select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted"><option value="">Select Department</option>{DEPARTMENTS.map((dept) => (<option key={dept} value={dept}>{dept.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>))}</select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm text-cult-text-muted mb-1">Role</label><select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted"><option value="">Select Role</option>{ROLES.map((role) => (<option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>))}</select></div>
                <div><label className="block text-sm text-cult-text-muted mb-1">Reports To</label><select value={formData.reports_to} onChange={(e) => setFormData({ ...formData, reports_to: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted"><option value="">None</option>{staff.filter((s) => s.id !== editingStaff?.id).map((s) => (<option key={s.id} value={s.id}>{s.first_name} {s.last_name || ''} {s.position_title ? '(' + s.position_title + ')' : ''}</option>))}</select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm text-cult-text-muted mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
                <div><label className="block text-sm text-cult-text-muted mb-1">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm text-cult-text-muted mb-1">Hourly Rate ($)</label><input type="number" step="0.01" min="0" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
                <div><label className="block text-sm text-cult-text-muted mb-1">Slack ID</label><input type="text" value={formData.slack_id} onChange={(e) => setFormData({ ...formData, slack_id: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
                <div><label className="block text-sm text-cult-text-muted mb-1">Worker PIN</label><input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={formData.pin_code} onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="4-6 digit PIN for /worker login" className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted font-mono tracking-widest" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm text-cult-text-muted mb-1">Start Date</label><input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
                <div><label className="block text-sm text-cult-text-muted mb-1">End Date</label><input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted" /></div>
              </div>
              <div><label className="block text-sm text-cult-text-muted mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 bg-cult-black border border-cult-border rounded-lg text-cult-text-primary text-sm focus:outline-none focus:border-cult-text-muted resize-none" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded border-cult-border" /><label htmlFor="is_active" className="text-sm text-cult-text-muted">Active Staff Member</label></div>
              {error && (<div className="bg-cult-danger-muted border border-cult-danger text-cult-danger px-4 py-2 rounded-lg text-sm">{error}</div>)}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingStaff(null); setFormData(emptyFormData); }} className="px-4 py-2 text-sm text-cult-text-muted hover:text-cult-text-primary transition-colors">Cancel</button>
                <Button type="submit" size="sm" icon={editingStaff ? Check : Plus}>{editingStaff ? 'Save Changes' : 'Add Staff Member'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}