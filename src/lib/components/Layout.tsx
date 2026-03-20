import { ReactNode, useState } from 'react';
import { Menu, LogOut, ChevronDown, Home, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth';
import { useLogos } from '../../hooks';
import { useNavigationMenu } from '../../hooks/useNavigationMenu';
import { useBadgeCounts } from '../../hooks/useBadgeCounts';
import { NavigationDrawer, menuStructure, SectionTabs, SubNavBar } from '../../shared/components/navigation';
import { getActiveSectionId } from '../../shared/components/navigation/sectionNavigation';

import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { getLogoUrl } = useLogos();
  const location = useLocation();
  const navigate = useNavigate();

  // Strip leading slash for backwards compatibility with the legacy navigation strings
  const currentView = location.pathname.replace(/^\//, '') || 'dashboard';

  const eyeLogoUrl = getLogoUrl('eye');
  const lightLogoUrl = getLogoUrl('light') || '/cult-logo-cropped.svg';

  const { isOpen, expandedSections, toggleSection, toggleDrawer } = useNavigationMenu(currentView);
  const { badgeMap } = useBadgeCounts(true);

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

  return (
    <div className="min-h-screen bg-cult-black">
      <nav className="border-b sticky top-0 z-40 shadow-glow bg-cult-graphite border-cult-charcoal">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogoClick}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
                title="Go to Dashboard"
              >
                {eyeLogoUrl && (
                  <img
                    src={eyeLogoUrl}
                    alt="Cult Cannabis Eye"
                    className="h-9 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <img
                  src={lightLogoUrl}
                  alt="Cult Cannabis Logo"
                  className="h-9 object-contain hidden sm:block"
                  onError={(e) => {
                    e.currentTarget.src = '/cult-logo-cropped.svg';
                  }}
                />
              </button>

              <div className="w-px h-8 bg-cult-charcoal mx-1" />

              <SectionTabs
                currentView={currentView}
                onSectionChange={handleSectionChange}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`p-2 rounded-cult transition-colors ${
                    currentView === 'dashboard'
                      ? 'text-cult-white bg-cult-charcoal'
                      : 'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50'
                  }`}
                  title="Dashboard"
                >
                  <Home className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className={`p-2 rounded-cult transition-colors ${
                    currentView === 'analytics'
                      ? 'text-cult-white bg-cult-charcoal'
                      : 'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50'
                  }`}
                  title="Analytics"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className={`p-2 rounded-cult transition-colors ${
                    currentView === 'settings'
                      ? 'text-cult-white bg-cult-charcoal'
                      : 'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50'
                  }`}
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleDrawer}
                  className="p-2 text-cult-silver hover:text-cult-white transition-colors rounded-cult hover:bg-cult-charcoal/50"
                  aria-label="More navigation"
                  aria-expanded={isOpen}
                  title="More"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-8 bg-cult-charcoal mx-1" />

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 text-cult-silver hover:text-cult-off-white transition-all duration-300 rounded-cult hover:bg-cult-charcoal"
                >
                  <div className="w-7 h-7 bg-cult-charcoal rounded-full flex items-center justify-center text-cult-off-white font-semibold text-xs border border-cult-silver/20">
                    {profile?.email?.[0].toUpperCase() || 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-cult-graphite border border-cult-charcoal rounded-cult shadow-glow-strong py-1 animate-slide-in z-50">
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

      <main className="max-w-[1400px] mx-auto px-6 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
