import { ReactNode, useState, useMemo } from 'react';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth';
import { useLogos } from '../../hooks';
import { PortalBanner } from '../../components/PortalBanner';
import { PortalSwitcher } from '../../components/PortalSwitcher';
import { useTestPortal } from '../../contexts/TestPortalContext';
import { useNavigationMenu } from '../../hooks/useNavigationMenu';
import { useBadgeCounts } from '../../hooks/useBadgeCounts';
import { NavigationDrawer, menuStructure } from '../../shared/components/navigation';
import type { MenuSection } from '../../shared/components/navigation';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Layout({ children, currentView, onViewChange }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { logos, loading: logosLoading, getLogoUrl } = useLogos();
  const { isTestPortal } = useTestPortal();

  const eyeLogoUrl = getLogoUrl('eye');
  const lightLogoUrl = getLogoUrl('light') || '/cult-logo-cropped.svg';

  const { isOpen, expandedSections, toggleSection, toggleDrawer } = useNavigationMenu(currentView);
  const { counts } = useBadgeCounts(isOpen);

  const sectionsWithBadges = useMemo(() => {
    const applyBadgeToItem = (item: MenuSection['items'][0]): MenuSection['items'][0] => {
      let badge: number | string | undefined;
      let badgeColor: 'warning' | 'success' | 'error' | 'info' | 'default' | undefined;

      if (item.id === 'orders' && counts.orders > 0) {
        badge = counts.orders;
        badgeColor = 'info';
      } else if (item.id === 'trim-sessions' && counts.trimSessions > 0) {
        badge = counts.trimSessions;
        badgeColor = 'success';
      } else if (item.id === 'packaging-sessions' && counts.packagingSessions > 0) {
        badge = counts.packagingSessions;
        badgeColor = 'success';
      } else if (item.id === 'batches' && counts.batches > 0) {
        badge = counts.batches;
        badgeColor = 'default';
      } else if (item.id === 'inventory' && counts.inventoryTotal > 0) {
        badge = counts.inventoryTotal;
        badgeColor = 'info';
      } else if (item.id === 'inventory-all' && counts.inventoryTotal > 0) {
        badge = counts.inventoryTotal;
        badgeColor = 'info';
      } else if (item.id === 'inventory-binned' && counts.inventoryBinned > 0) {
        badge = counts.inventoryBinned;
        badgeColor = 'default';
      } else if (item.id === 'inventory-bucked' && counts.inventoryBucked > 0) {
        badge = counts.inventoryBucked;
        badgeColor = 'default';
      } else if (item.id === 'inventory-bulk' && counts.inventoryBulk > 0) {
        badge = counts.inventoryBulk;
        badgeColor = 'default';
      } else if (item.id === 'inventory-packaged' && counts.inventoryPackaged > 0) {
        badge = counts.inventoryPackaged;
        badgeColor = 'success';
      } else if (item.id === 'inventory-conversions' && counts.pendingConversions > 0) {
        badge = counts.pendingConversions;
        badgeColor = 'warning';
      } else if (item.id === 'inventory-audits' && counts.activeAudit) {
        badge = 'Active';
        badgeColor = 'error';
      }

      const children = item.children?.map(applyBadgeToItem);

      return { ...item, badge, badgeColor: badgeColor || item.badgeColor, children };
    };

    return menuStructure.map((section) => ({
      ...section,
      items: section.items.map(applyBadgeToItem),
    }));
  }, [counts]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-cult-black">
      <PortalBanner />
      <nav className={`border-b sticky top-0 z-40 shadow-glow ${
        isTestPortal
          ? 'bg-amber-900/20 border-amber-600/30'
          : 'bg-cult-graphite border-cult-charcoal'
      }`}>
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleDrawer}
                className="p-2 text-cult-silver hover:text-cult-white transition-colors rounded-cult hover:bg-cult-charcoal"
                aria-label="Open navigation menu"
                aria-expanded={isOpen}
              >
                <Menu className="w-6 h-6" />
              </button>
              {eyeLogoUrl && (
                <img
                  src={eyeLogoUrl}
                  alt="Cult Cannabis Eye"
                  className="h-10 object-contain hover:opacity-80 transition-opacity"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <img
                src={lightLogoUrl}
                alt="Cult Cannabis Logo"
                className="h-10 object-contain hover:opacity-80 transition-opacity"
                onError={(e) => {
                  e.currentTarget.src = '/cult-logo-cropped.svg';
                }}
              />
              <PortalSwitcher />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 text-cult-silver hover:text-cult-off-white transition-all duration-300 rounded-cult hover:bg-cult-charcoal"
              >
                <div className="w-8 h-8 bg-cult-charcoal rounded-full flex items-center justify-center text-cult-off-white font-semibold text-sm border border-cult-silver/20">
                  {profile?.email?.[0].toUpperCase() || 'U'}
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-cult-graphite border border-cult-charcoal rounded-cult shadow-glow-strong py-1 animate-slide-in">
                  <div className="px-4 py-3 border-b border-cult-charcoal">
                    <p className="text-sm font-medium text-cult-off-white">{profile?.full_name || 'User'}</p>
                    <p className="text-caption text-cult-silver">{profile?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-cult bg-cult-charcoal text-cult-off-white capitalize">
                      {profile?.role}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-cult-silver hover:text-cult-off-white hover:bg-cult-charcoal transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <NavigationDrawer
        isOpen={isOpen}
        onClose={toggleDrawer}
        sections={sectionsWithBadges}
        currentView={currentView}
        onNavigate={onViewChange}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        isAdmin={isAdmin}
        isTestPortal={isTestPortal}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
