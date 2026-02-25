import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components';
import { useAccountDetail } from '../hooks';
import { AccountHeader } from './AccountHeader';
import { SubAccountsPanel } from './SubAccountsPanel';
import { AccountOrderHistory } from './AccountOrderHistory';
import { AccountContacts } from './AccountContacts';
import { AccountActivityLog } from './AccountActivityLog';

interface AccountDetailProps {
  accountId: string;
  onViewChange: (view: string) => void;
}

export function AccountDetail({ accountId, onViewChange }: AccountDetailProps) {
  const {
    account,
    childAccounts,
    contacts,
    orders,
    activities,
    loading,
    error,
    reload,
  } = useAccountDetail(accountId);

  const handleSelectAccount = (id: string) => {
    onViewChange(`crm-account-detail:${id}`);
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
        <button
          onClick={() => onViewChange('crm-accounts')}
          className="flex items-center gap-1 text-sm text-cult-silver hover:text-cult-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Accounts
        </button>
        {account.parent_customer_id && (
          <button
            onClick={() => handleSelectAccount(account.parent_customer_id!)}
            className="px-3 py-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded hover:bg-sky-500/20 transition-colors"
          >
            View Hub Parent
          </button>
        )}
      </div>

      <AccountHeader account={account} />

      {account.account_type === 'hub_parent' && childAccounts.length > 0 && (
        <SubAccountsPanel
          parentName={account.name}
          childAccounts={childAccounts}
          onSelectAccount={handleSelectAccount}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <AccountOrderHistory orders={orders} />
        </div>
        <div className="space-y-5">
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
