import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, GitBranch, Dna, ShoppingBag, X } from 'lucide-react';
import { useOmnibarSearch, type OmnibarResult, type OmnibarResultType } from '../../hooks/useOmnibarSearch';

const TYPE_CONFIG: Record<OmnibarResultType, { icon: typeof Package; label: string; color: string }> = {
  package: { icon: Package, label: 'Packages', color: 'text-violet-400' },
  batch: { icon: GitBranch, label: 'Batches', color: 'text-sky-400' },
  strain: { icon: Dna, label: 'Strains', color: 'text-emerald-400' },
  sku: { icon: ShoppingBag, label: 'SKUs', color: 'text-amber-400' },
};

interface InventoryOmnibarProps {
  onBatchSelect: (batchId: string) => void;
  onStrainSelect?: (strainId: string) => void;
}

export function InventoryOmnibar({ onBatchSelect, onStrainSelect }: InventoryOmnibarProps) {
  const { query, results, loading, search, clear } = useOmnibarSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group results by type
  const grouped = results.reduce<Record<OmnibarResultType, OmnibarResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as any);

  const flatResults = results;

  // "/" global shortcut to focus
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleSelect = useCallback((result: OmnibarResult) => {
    switch (result.type) {
      case 'package':
      case 'batch':
        if (result.batchId) onBatchSelect(result.batchId);
        break;
      case 'strain':
        onStrainSelect?.(result.id);
        break;
      case 'sku':
        // SKU drawer not yet built — for now, no-op
        break;
    }
    setIsOpen(false);
    clear();
    inputRef.current?.blur();
  }, [onBatchSelect, onStrainSelect, clear]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        clear();
        inputRef.current?.blur();
        break;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    search(e.target.value);
    setSelectedIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  const showDropdown = isOpen && (query.trim().length >= 2);

  return (
    <div ref={containerRef} className="relative w-full max-w-[480px]">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search packages, batches, strains, SKUs…"
          className="glass-input w-full pl-10 pr-10 py-2.5 rounded-cult text-sm text-white placeholder:text-white/30 focus:outline-none"
          role="combobox"
          aria-label="Search inventory"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? 'omnibar-listbox' : undefined}
          aria-haspopup="listbox"
          aria-activedescendant={showDropdown && flatResults[selectedIndex] ? `omnibar-option-${selectedIndex}` : undefined}
        />
        {query && (
          <button
            onClick={() => { clear(); inputRef.current?.focus(); }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-cult-surface-overlay text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {/* "/" hint */}
        {!query && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-white/20 bg-cult-surface-raised px-1.5 py-0.5 rounded font-mono">
            /
          </span>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 glass-modal rounded-cult border border-cult-border shadow-glass-lg overflow-hidden z-50"
            id="omnibar-listbox"
            role="listbox"
          >
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-cult-surface animate-pulse" />
                ))}
              </div>
            ) : flatResults.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-white/30">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-[10px] text-white/20 mt-1">Try a package ID, batch code, strain name, or SKU</p>
              </div>
            ) : (
              <div className="py-1 max-h-[320px] overflow-y-auto scrollbar-thin">
                {(['package', 'batch', 'strain', 'sku'] as OmnibarResultType[]).map((type) => {
                  const items = grouped[type];
                  if (!items || items.length === 0) return null;
                  const config = TYPE_CONFIG[type];
                  const Icon = config.icon;

                  return (
                    <div key={type}>
                      {/* Section header */}
                      <div className="px-3 py-1.5" role="presentation">
                        <span className={`text-[10px] uppercase tracking-wider font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>

                      {/* Result rows */}
                      {items.map((result) => {
                        const globalIdx = flatResults.indexOf(result);
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            id={`omnibar-option-${globalIdx}`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelect(result)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                              isSelected ? 'bg-cult-surface-overlay' : 'hover:bg-cult-surface'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${config.color} opacity-60`} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white font-medium truncate block">
                                {result.title}
                              </span>
                              <span className="text-[10px] text-white/30 truncate block">
                                {result.subtitle}
                              </span>
                            </div>
                            {result.meta && (
                              <span className="text-[10px] text-white/20 shrink-0">
                                {result.meta}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
