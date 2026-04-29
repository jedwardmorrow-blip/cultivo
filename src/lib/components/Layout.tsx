import { ReactNode, useState } from 'react';
import { Menu, LogOut, ChevronDown, Home, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth';
import { useNavigationMenu } from '../../hooks/useNavigationMenu';
import { useBadgeCounts } from '../../hooks/useBadgeCounts';
import { NavigationDrawer, menuStructure, SectionTabs, SubNavBar } from '../../shared/components/navigation';
import { getActiveSectionId } from '../../shared/components/navigation/sectionNavigation';
import { useBatchCOAAvailabilityAlert } from '../../features/batches/hooks/useBatchCOAAvailabilityAlert';

import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const buildVersion = (import.meta.env.VITE_BUILD_VERSION as string | undefined) ?? 'dev';

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAdmin, isSales } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Strip leading slash for backwards compatibility with the legacy navigation strings
  const currentView = location.pathname.replace(/^\//, '') || 'dashboard';

  const { isOpen, expandedSections, toggleSection, toggleDrawer } = useNavigationMenu(currentView);
  const { badgeMap } = useBadgeCounts(true);

  // Notifies when a batch COA is received
  useBatchCOAAvailabilityAlert();

  const activeSectionId = getActiveSectionId(currentView);
  const showSubNav = activeSectionId !== null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSectionChange = (_sectionId: string, defaultView: string) => {
    navigate(`/${defaultView}`);
  };

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const userInitial = profile?.email?.[0]?.toUpperCase() ?? 'U';
  const personaLabel = profile?.role ? profile.role.replace(/_/g, ' ') : 'operator';

  return (
    <div className="min-h-screen bg-cult-surface-inset">
      {isDemoMode && (
        <div
          className="sticky top-0 z-50 bg-cult-warning text-cult-opaque-black text-center font-mono py-1 uppercase"
          style={{ fontSize: '10px', letterSpacing: '0.16em' }}
        >
          Demo Environment · Data shown is fictional
        </div>
      )}

      <nav
        className="sticky top-0 z-40 bg-cult-surface border-b border-cult-border safe-top"
      >
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between py-3 gap-3">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
              <button
                onClick={handleLogoClick}
                className="flex items-baseline gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
                title="Go to Dashboard"
              >
                <span
                  className="text-cult-text-primary"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    fontSize: '15px',
                    letterSpacing: '0.16em',
                  }}
                >
                  CULTIVO
                </span>
              </button>

              <div className="w-px h-5 bg-cult-border" />

              <SectionTabs
                currentView={currentView}
                onSectionChange={handleSectionChange}
                allowedSectionIds={isSales && !isAdmin ? ['crm'] : undefined}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div
                className="hidden xl:flex flex-col items-end leading-tight"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.10em' }}
              >
                <span className="text-cult-text-secondary uppercase">Cult Cannabis</span>
                <span className="text-cult-text-faint uppercase">{buildVersion}</span>
              </div>

              <div className="w-px h-5 bg-cult-border hidden xl:block" />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`p-2 transition-colors hidden 2xl:block ${
                    currentView === 'dashboard'
                      ? 'text-cult-text-primary bg-cult-surface-raised'
                      : 'text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-raised'
                  }`}
                  title="Dashboard"
                >
                  <Home className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/hub')}
                  className={`p-2 transition-colors hidden 2xl:block ${
                    currentView === 'hub' || currentView.startsWith('hub-') || currentView === 'pipeline-planner' || currentView === 'pipeline-forecast' || currentView === 'strain-analytics'
                      ? 'text-cult-text-primary bg-cult-surface-raised'
                      : 'text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-raised'
                  }`}
                  title="Hub"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className={`p-2 transition-colors hidden 2xl:block ${
                    currentView === 'settings'
                      ? 'text-cult-text-primary bg-cult-surface-raised'
                      : 'text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-raised'
                  }`}
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleDrawer}
                  className="p-2 text-cult-text-muted hover:text-cult-text-primary transition-colors hover:bg-cult-surface-raised"
                  aria-label="More navigation"
                  aria-expanded={isOpen}
                  title="More"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-5 bg-cult-border mx-1 hidden sm:block" />

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 text-cult-text-muted hover:text-cult-text-primary transition-colors hover:bg-cult-surface-raised"
                >
                  <div
                    className="w-7 h-7 bg-cult-surface-raised flex items-center justify-center text-cult-text-primary font-mono border border-cult-border"
                    style={{ fontSize: '11px' }}
                  >
                    {userInitial}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-60 bg-cult-surface-raised border border-cult-border-strong py-1 animate-slide-in z-50">
                    <div className="px-4 py-3 border-b border-cult-border">
                      <p className="text-sm font-medium text-cult-text-primary">{profile?.full_name || 'User'}</p>
                      <p
                        className="font-mono text-cult-text-muted mt-0.5"
                        style={{ fontSize: '11px', letterSpacing: '0.04em' }}
                      >
                        {profile?.email}
                      </p>
                      <span
                        className="inline-block mt-2 px-1.5 py-0.5 font-mono uppercase border border-cult-border text-cult-text-secondary"
                        style={{ fontSize: '9px', letterSpacing: '0.14em' }}
                      >
                        {personaLabel}
                      </span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-cult-text-muted hover:text-cult-text-primary hover:bg-cult-surface-overlay transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {showSubNav && (
        <SubNavBar
          currentView={currentView}
          onNavigate={(viewId) => navigate(`/${viewId}`)}
          badgeMap={badgeMap}
        />
      )}

      <NavigationDrawer
        isOpen={isOpen}
        onClose={toggleDrawer}
        sections={menuStructure}
        currentView={currentView}
        onNavigate={(viewId) => navigate(`/${viewId}`)}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        isAdmin={isAdmin}
      />

      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-8 animate-fade-in safe-bottom">
        {children}
      </main>
    </div>
  );
}
