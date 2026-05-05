import { useState } from 'react';
import { Users, Mail, Phone, Star, Plus, X, Save, Pencil, Check } from 'lucide-react';
import type { CustomerContact, CustomerContactInput } from '../types';
import { createContact, updateContact, deleteContact } from '../services';

interface AccountContactsProps {
  contacts: CustomerContact[];
  customerId: string;
  legacyContactName: string | null;
  legacyEmail: string | null;
  legacyPhone: string | null;
  onReload: () => void;
}

const INPUT_CLASS = 'px-3 py-2 bg-cult-surface border border-cult-border rounded text-sm text-cult-text-primary placeholder-cult-text-secondary focus:outline-none focus:border-cult-text-muted';

export function AccountContacts({
  contacts,
  customerId,
  legacyContactName,
  legacyEmail,
  legacyPhone,
  onReload,
}: AccountContactsProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', title: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', title: '', email: '', phone: '' });

  const hasLegacyData = legacyContactName || legacyEmail || legacyPhone;
  const legacyContacts = parseLegacyContacts(legacyContactName, legacyEmail, legacyPhone);

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    const input: CustomerContactInput = {
      customer_id: customerId,
      name: formData.name.trim(),
      title: formData.title.trim() || undefined,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
    };
    await createContact(input);
    setFormData({ name: '', title: '', email: '', phone: '' });
    setShowForm(false);
    setSaving(false);
    onReload();
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    onReload();
  };

  const startEdit = (contact: CustomerContact) => {
    setEditingId(contact.id);
    setEditData({
      name: contact.name,
      title: contact.title || '',
      email: contact.email || '',
      phone: contact.phone || '',
    });
  };

  const handleEditSave = async () => {
    if (!editingId || !editData.name.trim()) return;
    setSaving(true);
    await updateContact(editingId, {
      name: editData.name.trim(),
      title: editData.title.trim() || undefined,
      email: editData.email.trim() || undefined,
      phone: editData.phone.trim() || undefined,
    });
    setEditingId(null);
    setSaving(false);
    onReload();
  };

  const handleTogglePrimary = async (contact: CustomerContact) => {
    await updateContact(contact.id, { is_primary: !contact.is_primary });
    onReload();
  };

  return (
    <div className="bg-cult-surface border border-cult-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-surface-raised flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cult-text-secondary" />
          <h3 className="text-sm font-semibold text-cult-text-primary uppercase tracking-wider">Contacts</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cult-text-primary bg-cult-surface border border-cult-border rounded hover:bg-cult-surface-raised transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-cult-surface-raised bg-cult-surface/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={INPUT_CLASS} />
            <input type="text" placeholder="Title (e.g., Buyer)" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={INPUT_CLASS} />
            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={INPUT_CLASS} />
            <input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={INPUT_CLASS} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={!formData.name.trim() || saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cult-opaque-black bg-cult-accent rounded hover:bg-cult-accent-hover transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              Save Contact
            </button>
            <button
              onClick={() => { setShowForm(false); setFormData({ name: '', title: '', email: '', phone: '' }); }}
              className="px-3 py-1.5 text-xs text-cult-text-secondary hover:text-cult-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-cult-surface-raised/50">
        {contacts.map((contact) => (
          editingId === contact.id ? (
            <div key={contact.id} className="px-5 py-3 bg-cult-surface/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" placeholder="Name *" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={INPUT_CLASS} />
                <input type="text" placeholder="Title" value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className={INPUT_CLASS} />
                <input type="email" placeholder="Email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className={INPUT_CLASS} />
                <input type="tel" placeholder="Phone" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className={INPUT_CLASS} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleEditSave}
                  disabled={!editData.name.trim() || saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cult-opaque-black bg-cult-accent rounded hover:bg-cult-accent-hover transition-colors disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 text-xs text-cult-text-secondary hover:text-cult-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={contact.id} className="px-5 py-3 flex items-center justify-between group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-cult-text-primary">{contact.name}</span>
                  <button
                    onClick={() => handleTogglePrimary(contact)}
                    className={`transition-all ${
                      contact.is_primary
                        ? 'text-cult-warning'
                        : 'text-cult-surface-raised hover:text-cult-warning/60 opacity-0 group-hover:opacity-100'
                    }`}
                    title={contact.is_primary ? 'Primary contact' : 'Set as primary'}
                  >
                    <Star className={`w-3 h-3 ${contact.is_primary ? 'fill-cult-warning' : ''}`} />
                  </button>
                  {contact.title && (
                    <span className="text-xs text-cult-text-muted bg-cult-surface px-1.5 py-0.5 rounded">{contact.title}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-cult-text-muted hover:text-cult-text-primary transition-colors">
                      <Mail className="w-3 h-3" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-cult-text-muted hover:text-cult-text-primary transition-colors">
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => startEdit(contact)}
                  className="p-1.5 text-cult-border hover:text-cult-text-primary transition-colors"
                  title="Edit contact"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-1.5 text-cult-border hover:text-cult-danger transition-colors"
                  title="Remove contact"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        ))}

        {contacts.length === 0 && hasLegacyData && (
          <>
            <div className="px-5 py-2 bg-cult-surface/20">
              <span className="text-xs uppercase tracking-wider text-cult-text-secondary">Legacy Contact Data</span>
            </div>
            {legacyContacts.map((lc, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-cult-text-muted">{lc.name}</span>
                  {lc.title && (
                    <span className="text-xs text-cult-text-secondary bg-cult-surface px-1.5 py-0.5 rounded">{lc.title}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  {lc.email && (
                    <a href={`mailto:${lc.email}`} className="flex items-center gap-1 text-xs text-cult-text-muted hover:text-cult-text-primary transition-colors">
                      <Mail className="w-3 h-3" />
                      {lc.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {contacts.length === 0 && !hasLegacyData && !showForm && (
          <div className="px-5 py-6 text-center text-sm text-cult-text-muted">
            No contacts added yet.
          </div>
        )}
      </div>
    </div>
  );
}

function parseLegacyContacts(names: string | null, emails: string | null, phone: string | null) {
  if (!names) return [];

  const nameList = names.split(',').map((n) => n.trim()).filter(Boolean);
  const emailList = emails ? emails.split(',').map((e) => e.trim()).filter(Boolean) : [];

  return nameList.map((rawName, i) => {
    const titleMatch = rawName.match(/\(([^)]+)\)/);
    const title = titleMatch ? titleMatch[1] : null;
    const name = rawName.replace(/\([^)]+\)/, '').trim();
    return {
      name,
      title,
      email: emailList[i] || null,
      phone: i === 0 ? phone : null,
    };
  });
}
