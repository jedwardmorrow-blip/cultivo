import { useState, useEffect, useCallback } from 'react';
import { menuStructure } from '../shared/components/navigation/menuStructure';

const STORAGE_KEY = 'nav-expanded-sections';

export function useNavigationMenu(currentView: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedSections)));
    } catch (error) {
      console.error('Failed to save navigation state:', error);
    }
  }, [expandedSections]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const sectionWithActivePage = menuStructure.find((section) =>
      section.items.some((item) => item.id === currentView)
    );
    if (sectionWithActivePage) {
      setExpandedSections((prev) => new Set(prev).add(sectionWithActivePage.id));
    }
  }, [currentView]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    expandedSections,
    toggleSection,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
}
