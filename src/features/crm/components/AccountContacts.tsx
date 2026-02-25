import { useState } from 'react';
import { Users, Mail, Phone, Star, Plus, X, Save } from 'lucide-react';
import type { CustomerContact, CustomerContactInput } from '../types';
import { createContact, deleteContact } from '../services';

interface AccountContactsProps {
  contacts: CustomerContact[];
  customerId: string;
  legacyContactName: string | null;
  legacyEmail: string | null;
  legacyPhone: string | null;
  onReload: () => void;
}

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

  return (
    <div className="bg-cult-near-black border border-cult-medium-gray rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-cult-charcoal flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cult-silver" />
          <h3 className="text-sm font-semibold text-cult-white uppercase tracking-wider">Contacts</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cult-white bg-cult-dark-gray border border-cult-medium-gray rounded hover:bg-cult-charcoal transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-cult-charcoal bg-cult-dark-gray/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray"
            />
            <input
              type="text"
              placeholder="Title (e.g., Buyer)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="px-3 py-2 bg-cult-near-black border border-cult-medium-gray rounded text-sm text-cult-white placeholder-cult-silver focus:outline-none focus:border-cult-lighter-gray"
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={!formData.name.trim() || saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cult-black bg-cult-white rounded hover:bg-cult-off-white transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              Save Contact
            </button>
            <button
              onClick={() => { setShowForm(false); setFormData({ name: '', title: '', email: '', phone: '' }); }}
              className="px-3 py-1.5 text-xs text-cult-silver hover:text-cult-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-cult-charcoal/50">
        {contacts.map((contact) => (
          <div key={contact.id} className="px-5 py-3 flex items-center justify-between group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-cult-white">{contact.name}</span>
                {contact.is_primary && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                {contact.title && (
                  <span className="text-[10px] text-cult-light-gray bg-cult-dark-gray px-1.5 py-0.5 rounded">{contact.title}</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-cult-light-gray hover:text-cult-white transition-colors">
                    <Mail className="w-3 h-3" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-cult-light-gray hover:text-cult-white transition-colors">
                    <Phone className="w-3 h-3" />
                    {contact.phone}
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(contact.id)}
              className="p-1.5 text-cult-medium-gray hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              title="Remove contact"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {contacts.length === 0 && hasLegacyData && (
          <>
            <div className="px-5 py-2 bg-cult-dark-gray/20">
              <span className="text-[10px] uppercase tracking-wider text-cult-silver">Legacy Contact Data</span>
            </div>
            {legacyContacts.map((lc, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-cult-light-gray">{lc.name}</span>
                  {lc.title && (
                    <span className="text-[10px] text-cult-silver bg-cult-dark-gray px-1.5 py-0.5 rounded">{lc.title}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  {lc.email && (
                    <a href={`mailto:${lc.email}`} className="flex items-center gap-1 text-xs text-cult-light-gray hover:text-cult-white transition-colors">
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
          <div className="px-5 py-6 text-center text-sm text-cult-light-gray">
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
