import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { notificationService } from '@/services';
import { useAccountDetail, useAccountDeepDive } from '../hooks';
import { updateAccountInfo } from '../services';
import { AccountHeader } from './AccountHeader';
import { AccountHealthBadge } from './AccountHealthBadge';
import { AccountInfoEditModal } from './AccountInfoEditModal';
import { SubAccountsPanel } from './SubAccountsPanel';
import { AccountOrderHistory } from './AccountOrderHistory';
import { AccountContacts } from './AccountContacts';
import { AccountActivityLog } from './AccountActivityLog';
import { AccountProductMix } from './AccountProductMix';
import { AccountDeliveryHistory } from './AccountDeliveryHistory';
import { AccountPriceList } from './AccountPriceList';
import { AccountPinnedNotes } from './AccountPinnedNotes';
import { AccountSampleHistory } from './AccountSampleHistory';
import type { AccountInfoInput } from '../types';

interface AccountDetailProps {
  accountId: string;
  onViewChange: (view: string) => void;
  onCreateOrder?: (customerId: string) => void;
  onCreateSampleOrder?: (customerId: string) => void;
}

const TABS = [
  { key: 'orders' as const, label: 'Orders' },
  { key: 'products' as const, label: 'Product Mix' },
  { key: 'deliveries' as const, label: 'Deliveries' },
  { key: 'pricing' as const, label: 'Pricing' },
  { key: 'samples' as const, label: 'Samples' },
];

export function AccountDetail({ accountId, onViewChange, onCreateOrder, onCreateSampleOrder }: AccountDetailProps) {
  const {
    account,
    childAccounts,
    chainPerformance,
    contacts,
    orders,
    activities,
    loading,
    error,
    reload,
  } = useAccountDetail(accountId);

  const {
    healthScore,
    productMix,
    deliveryHistory,
    monthlyRevenue,
    loading: deepDiveLoading,
  } = useAccountDeepDive(accountId);

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'deliveries' | 'pricing' | 'samples'>('orders');
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSelectAccount = (id: string) => {
    onViewChange(`crm-account-detail:${id}`);
  };

  const handleSaveAccountInfo = async (input: AccountInfoInput) => {
    if (!account) return;
    const result = await updateAccountInfo(accountId, input, account);
    if (result.error) {
      notificationService.error('Failed to update account info');
      throw result.error;
    }
    notificationService.success('Account info updated');
    reload();
  };

  if (loading) return <LoadingSpinner />;

  if (error || !account) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => onViewChange('crm-accounts')}
          className="flex items-center gap-1 text-sm text-cult-silver hover:text-cult-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Accounts
        </button>
        <div className="bg-cult-near-black border border-red-500/30 rounded-lg p-8 text-center">
          <p className="text-red-400">{error || 'Account not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewChange('crm-accounts')}
            className="flex items-center gap-1 text-sm text-cult-silver hover:text-cult-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Accounts
          </button>
          <AccountHealthBadge healthScore={healthScore} size="sm" />
        </div>
        {account.parent_customer_id && (
          <button
            onClick={() => handleSelectAccount(account.parent_customer_id!)}
            className="px-3 py-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded hover:bg-sky-500/20 transition-colors"
          >
            View Hub Parent
          </button>
        )}
      </div>

      <AccountHeader
        account={account}
        healthScore={healthScore}
        monthlyRevenue={monthlyRevenue}
        onCreateOrder={onCreateOrder ? () => onCreateOrder(accountId) : undefined}
        onCreateSampleOrder={onCreateSampleOrder ? () => onCreateSampleOrder(accountId) : undefined}
        onEdit={() => setShowEditModal(true)}
      />

      <AccountInfoEditModal
        account={account}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveAccountInfo}
      />

      {account.account_type === 'hub_parent' && childAccounts.length > 0 && (
        <SubAccountsPanel
          parentName={account.name}
          childAccounts={childAccounts}
          chainPerformance={chainPerformance}
          deliveryModel={account.delivery_model}
          onSelectAccount={handleSelectAccount}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="flex items-center gap-1 bg-cult-dark-gray/50 rounded-lg p-1 border border-cult-medium-gray/50">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-cult-near-black text-cult-white shadow-sm'
                    : 'text-cult-silver hover:text-cult-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'orders' && <AccountOrderHistory orders={orders} />}
          {activeTab === 'products' && <AccountProductMix productMix={productMix} loading={deepDiveLoading} />}
          {activeTab === 'deliveries' && <AccountDeliveryHistory deliveries={deliveryHistory} loading={deepDiveLoading} />}
          {activeTab === 'pricing' && <AccountPriceList customerId={accountId} />}
          {activeTab === 'samples' && <AccountSampleHistory customerId={accountId} />}
        </div>
        <div className="space-y-5">
          <AccountPinnedNotes customerId={accountId} onUnpin={reload} />
          <AccountContacts
            contacts={contacts}
            customerId={accountId}
            legacyContactName={account.contact_name}
            legacyEmail={account.email}
            legacyPhone={account.phone}
            onReload={reload}
          />
          <AccountActivityLog
            activities={activities}
            customerId={accountId}
            onReload={reload}
          />
        </div>
      </div>
    </div>
  );
}
