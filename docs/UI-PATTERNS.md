---
title: UI PATTERNS
category: Frontend Development
version: 1.0
created: 2025-11-10
author: Claude AI
---

# UI Patterns - CULT Seed-to-Sale System

> **Purpose:** Document common UI patterns and interaction workflows used throughout the application
> **Audience:** Frontend developers, UX designers
> **Status:** Living document - update as patterns evolve

---

## Table of Contents

1. [Navigation Patterns](#1-navigation-patterns)
2. [Form Patterns](#2-form-patterns)
3. [Modal Patterns](#3-modal-patterns)
4. [Table Patterns](#4-table-patterns)
5. [State Feedback Patterns](#5-state-feedback-patterns)
6. [Bulk Operations](#6-bulk-operations)
7. [Validation Patterns](#7-validation-patterns)

---

## 1. Navigation Patterns

### 1.1 Hamburger Menu with Slide-Out Drawer (Primary Pattern)

**Use Case:** Main application navigation with hierarchical menu structure

**Terminology:**
- **Hamburger Menu**: Three horizontal lines icon that toggles navigation
- **Slide-Out Drawer**: Panel that slides in from left side containing navigation
- **Tree Navigation**: Hierarchical menu with collapsible sections
- **Accordion Menu**: Sections that expand/collapse to show nested items

**Standard Flow:**
```
User clicks hamburger icon → Drawer slides in from left → User expands section → User clicks page → Drawer closes → Page loads
```

**Visual Structure:**
```
Header (sticky):
┌──────────────────────────────────────────────────┐
│ ☰  [Logo]                    [User Menu] [▼]    │
└──────────────────────────────────────────────────┘

When hamburger clicked, drawer slides in:
┌────────────────┐
│ [X]            │ ← Close button
│                │
│ ▼ Operations   │ ← Expanded section
│   • Dashboard  │
│   • Orders     │ ← Active page (highlighted)
│   • Batches    │
│   • Inventory  │
│                │
│ ► Production   │ ← Collapsed section
│                │
│ ► Distribution │ ← Collapsed section
│                │
│ ▼ Settings     │ ← Expanded section
│   ► General    │ ← Collapsed subsection
│   ► Products   │
│   ► Resources  │
└────────────────┘
    [Backdrop - click to close]
```

**Implementation Pattern:**
```tsx
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';

function NavigationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activePage, setActivePage] = useState('dashboard');

  // Toggle drawer open/closed
  const toggleDrawer = () => setIsOpen(!isOpen);

  // Toggle section expanded/collapsed
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Close drawer when navigating
  const handleNavigation = (pageId: string) => {
    setActivePage(pageId);
    setIsOpen(false);
  };

  // Auto-expand section containing active page
  useEffect(() => {
    const section = findSectionForPage(activePage);
    if (section) {
      setExpandedSections(prev => new Set(prev).add(section));
    }
  }, [activePage]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleDrawer}
        className="p-2 text-cult-white hover:bg-cult-charcoal transition-colors"
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-Out Drawer */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-80 bg-cult-graphite border-r border-cult-charcoal z-50
          transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Navigation menu"
      >
        {/* Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-cult-charcoal">
          <h2 className="text-lg font-bold text-cult-white uppercase tracking-wider">Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-cult-silver hover:text-cult-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tree */}
        <nav className="p-4">
          {menuStructure.map(section => (
            <NavSection
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              activePage={activePage}
              onNavigate={handleNavigation}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavSection({ section, isExpanded, onToggle, activePage, onNavigate }) {
  const Icon = section.icon;
  const hasChildren = section.children && section.children.length > 0;
  const isActive = section.children?.some(child => child.id === activePage);

  return (
    <div className="mb-2">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-cult
          transition-colors duration-200
          ${isActive
            ? 'bg-cult-charcoal text-cult-white'
            : 'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50'}
        `}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span className="font-medium uppercase tracking-wider text-sm">
            {section.label}
          </span>
        </div>
        {hasChildren && (
          isExpanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Nested Items */}
      {hasChildren && isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {section.children.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-cult text-sm
                transition-colors duration-200
                ${activePage === item.id
                  ? 'bg-cult-off-white text-cult-black font-medium'
                  : 'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50'}
              `}
            >
              <div className="w-1 h-1 rounded-full bg-current" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Menu Structure Data:**
```tsx
const menuStructure = [
  {
    id: 'operations',
    label: 'Operations',
    icon: Package,
    children: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'orders', label: 'Orders' },
      { id: 'batches', label: 'Batches' },
      { id: 'inventory', label: 'Inventory' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Scissors,
    children: [
      { id: 'sessions', label: 'All Sessions' },
      { id: 'trim-sessions', label: 'Trim Sessions' },
      { id: 'packaging-sessions', label: 'Packaging Sessions' },
    ],
  },
  {
    id: 'distribution',
    label: 'Distribution',
    icon: Truck,
    children: [
      { id: 'delivery', label: 'Delivery Calendar' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'eod-summary', label: 'EOD Summary' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    children: [
      { id: 'settings-general', label: 'General' },
      { id: 'settings-branding', label: 'Branding' },
      { id: 'settings-products', label: 'Product Management' },
      { id: 'settings-resources', label: 'Resource Management' },
    ],
  },
];
```

**State Management Pattern:**
```tsx
// Custom hook for navigation state
function useNavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('nav-expanded-sections');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem('nav-expanded-sections', JSON.stringify(Array.from(expandedSections)));
  }, [expandedSections]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return { isOpen, setIsOpen, expandedSections, setExpandedSections };
}
```

**Conventions:**
- Drawer width: 280-320px (comfortable reading, not too wide)
- Animation duration: 250-300ms (smooth, not too slow)
- Backdrop opacity: 60% black (visible but not too dark)
- Auto-close drawer after navigation (keeps screen uncluttered)
- Only expand section containing current page (minimize scrolling)
- Persist expanded state in localStorage (remember user preferences)
- Support ESC key to close drawer (keyboard accessibility)
- Click backdrop to close drawer (intuitive interaction)
- Prevent body scroll when drawer open (focus on navigation)

**Accessibility Requirements:**
- `aria-label="Toggle navigation menu"` on hamburger button
- `aria-expanded={isOpen}` on hamburger button
- `aria-label="Navigation menu"` on drawer
- `aria-label="Close menu"` on close button
- `aria-current="page"` on active menu item
- Focus trap inside drawer when open
- Keyboard navigation with Tab, Arrow keys, Enter
- ESC key closes drawer
- Restore focus to hamburger button when closing

**Mobile Optimization:**
- Drawer width: 90% of viewport on mobile (max 320px)
- Touch target sizes: Minimum 44x44px for tap targets
- Swipe-to-close gesture support (optional enhancement)
- Smooth spring animations for natural feel
- Test on various screen sizes

**When to Use:**
- Main application navigation with 5+ top-level items
- Hierarchical navigation with 2-3 levels of nesting
- Applications with limited header space
- Mobile-first or responsive applications

**When NOT to Use:**
- Simple applications with 3-4 flat pages (use horizontal tabs)
- Desktop-only applications where sidebar is always visible
- Navigation needs to be always visible (use persistent sidebar)

**Badge Notifications:**
Badges display counts or status on navigation items:
```tsx
// Badge colors
- 'warning': Amber/orange (admin/alert items)
- 'success': Green (active sessions)
- 'error': Red (critical issues)
- 'info': Blue (pending items)
- 'default': Gray (general counts)

// Badge implementation
{item.badge && (
  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getBadgeStyles(item.badgeColor)}`}>
    {item.badge}
  </span>
)}
```

**Badge Data Hook:**
```tsx
// src/hooks/useBadgeCounts.ts
export function useBadgeCounts(isOpen: boolean) {
  const [counts, setCounts] = useState<BadgeCounts>({
    orders: 0,
    trimSessions: 0,
    packagingSessions: 0,
    batches: 0,
  });

  // Fetches counts when drawer opens
  // Caches for 30 seconds to reduce queries
  useEffect(() => {
    if (!isOpen) return;
    // ... fetch logic
  }, [isOpen]);

  return { counts, loading };
}
```

**Examples in Codebase:**
- Main app navigation: `src/lib/components/Layout.tsx` (implemented)
- Navigation components: `src/shared/components/navigation/` (complete)
- Navigation hook: `src/hooks/useNavigationMenu.ts` (complete)
- Badge counts hook: `src/hooks/useBadgeCounts.ts` (complete)
- Inventory sidebar: `src/features/inventory/components/InventorySidebar.tsx` (reference)

---

### 1.2 Tree Navigation / Accordion Pattern

**Use Case:** Hierarchical content organization within a page or section

**Terminology:**
- **Tree Navigation**: Hierarchical list with parent-child relationships
- **Accordion**: UI pattern where only one section can be open at a time (single-expand)
- **Multi-Accordion**: Multiple sections can be open simultaneously (multi-expand)
- **Collapsible Section**: Individual expandable/collapsible container

**Visual Structure:**
```
▼ Parent Section 1 (Expanded)
  • Child Item 1
  • Child Item 2 (Active)
  ▼ Sub-section
    • Nested Item 1
    • Nested Item 2

► Parent Section 2 (Collapsed)

▼ Parent Section 3 (Expanded)
  • Child Item 3
  • Child Item 4
```

**Implementation Pattern:**
```tsx
interface TreeNode {
  id: string;
  label: string;
  icon?: React.ComponentType;
  children?: TreeNode[];
  path?: string;
}

function TreeNavigation({ items, activePath, onNavigate }: Props) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {items.map(item => (
        <TreeNode
          key={item.id}
          node={item}
          level={0}
          isExpanded={expandedNodes.has(item.id)}
          onToggle={toggleNode}
          activePath={activePath}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function TreeNode({ node, level, isExpanded, onToggle, activePath, onNavigate }) {
  const hasChildren = node.children && node.children.length > 0;
  const isActive = node.path === activePath;
  const Icon = node.icon;
  const indentPx = level * 16; // 16px per level

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggle(node.id);
          } else if (node.path) {
            onNavigate(node.path);
          }
        }}
        style={{ paddingLeft: `${indentPx + 12}px` }}
        className={`
          w-full flex items-center gap-2 py-2 pr-3 rounded-cult
          transition-colors duration-200 text-sm
          ${isActive
            ? 'bg-cult-off-white text-cult-black font-medium'
            : 'text-cult-silver hover:text-cult-white hover:bg-cult-charcoal/50'}
        `}
      >
        {hasChildren && (
          isExpanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />
        )}
        {!hasChildren && <div className="w-4" />}
        {Icon && <Icon className="w-4 h-4" />}
        <span>{node.label}</span>
      </button>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isExpanded={expandedNodes.has(child.id)}
              onToggle={onToggle}
              activePath={activePath}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Conventions:**
- Indentation: 16px per nesting level
- Chevron icons: Point right when collapsed, down when expanded
- Smooth transitions: 200ms for expand/collapse animation
- Visual hierarchy: Font weight and size decrease with nesting
- Active state: Highlighted background on current page
- Support unlimited nesting (though recommend max 3-4 levels)

**When to Use:**
- Settings pages with categorized options
- File/folder navigation
- Documentation with sections and subsections
- Any hierarchical content organization

**When NOT to Use:**
- Flat lists without hierarchy (use simple list)
- 2-3 items only (use tabs or buttons)
- Frequent navigation between distant sections (use search)

---

### 1.3 Nested Menu Items in Navigation Drawer

**Use Case:** Multi-level navigation within the main navigation drawer (as of 2025-01-12)

**Key Features:**
- Parent menu items can contain child items that expand/collapse inline
- Parent items show expand/collapse chevron indicators
- Child items are indented (0.75rem per level) for visual hierarchy
- Badges display on both parent and child items
- Active state highlights both child item and dim-highlights parent

**Example Use Case:**
The Inventory section contains 9 sub-views (All Inventory, Binned, Bucked, Bulk, Packaged, Daily Activity, Conversions, Conversion History, Audits). These are nested under the Inventory parent item instead of having a separate sidebar.

**Implementation Pattern:**
```tsx
// types.ts
interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  children?: MenuItem[];  // Recursive nesting
  badge?: number | string;
  badgeColor?: 'warning' | 'success' | 'error' | 'info' | 'default';
}

// menuStructure.ts
{
  id: 'inventory',
  label: 'Inventory',
  icon: Archive,
  children: [
    { id: 'inventory-all', label: 'All Inventory', icon: Archive },
    { id: 'inventory-binned', label: 'Binned', icon: Leaf },
    { id: 'inventory-bucked', label: 'Bucked', icon: Archive },
    // ... more children
  ],
}

// NavigationItem.tsx
export function NavigationItem({ item, currentView, onClick, depth = 0 }) {
  const hasChildren = item.children && item.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      onClick();
    }
  };

  return (
    <div>
      <button onClick={handleClick} style={{ paddingLeft: depth > 0 ? `${(depth + 1) * 0.75}rem` : undefined }}>
        {/* Item content with expand/collapse chevron */}
      </button>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1 animate-fade-in">
          {item.children.map(child => (
            <NavigationItem
              key={child.id}
              item={child}
              currentView={currentView}
              onClick={onClick}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Badge Application for Nested Items:**
```tsx
// Layout.tsx - Apply badges recursively to nested items
const applyBadgeToItem = (item: MenuItem): MenuItem => {
  let badge, badgeColor;

  if (item.id === 'inventory-conversions' && counts.pendingConversions > 0) {
    badge = counts.pendingConversions;
    badgeColor = 'warning';
  }
  // ... other badge logic

  const children = item.children?.map(applyBadgeToItem);
  return { ...item, badge, badgeColor, children };
};
```

**Routing Pattern:**
```tsx
// App.tsx - Handle nested view IDs
case 'inventory-all':
  return <AllInventoryViewWrapper />;
case 'inventory-binned':
  return <BinnedInventoryViewWrapper />;
// ... handle all nested routes
```

**Best Practices:**
- Use clear, hierarchical ID naming: `parent-child` (e.g., `inventory-all`, `inventory-conversions`)
- Apply consistent indentation (0.75rem per level)
- Parent items should only expand/collapse, not navigate
- Leaf items (no children) navigate to their view
- Auto-expand parent when child is active
- Show badges on relevant items (pending counts, active indicators)
- Use appropriate badge colors (warning=pending, error=active, info=count, success=complete)

**When to Use Nested Items:**
- Section has 3+ related sub-views
- Sub-views are conceptually grouped under a parent concept
- Reduces clutter in main navigation
- Improves discoverability of related features

**When NOT to Use:**
- Only 1-2 sub-items (use flat structure)
- Sub-items are not conceptually related
- Deep nesting (3+ levels) - consider restructuring

---

### 1.4 Breadcrumb Navigation

**Use Case:** Show current location in hierarchy and allow upward navigation

**Pattern:**
```tsx
<div className="flex items-center gap-2 text-sm mb-4">
  <Link to="/settings" className="text-cult-lighter-gray hover:text-cult-white">
    Settings
  </Link>
  <ChevronRight className="w-4 h-4 text-cult-medium-gray" />
  <Link to="/settings/products" className="text-cult-lighter-gray hover:text-cult-white">
    Product Management
  </Link>
  <ChevronRight className="w-4 h-4 text-cult-medium-gray" />
  <span className="text-cult-white">Strains</span>
</div>
```

**Conventions:**
- Use ChevronRight as separator
- Last item not clickable (current page)
- Gray text for hierarchy, white for current
- All previous items clickable and hoverable

---

### 1.4 Tabs Navigation (Within Page)

**Use Case:** Related views in same context without nested hierarchy

**Pattern:**
```tsx
const tabs = ['Products', 'Strains', 'Types', 'Stages'];
const [activeTab, setActiveTab] = useState('Products');

<div className="border-b border-cult-medium-gray">
  <div className="flex gap-6">
    {tabs.map(tab => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`
          px-4 py-3 font-bold uppercase tracking-wider
          ${activeTab === tab
            ? 'text-cult-white border-b-2 border-cult-white'
            : 'text-cult-lighter-gray hover:text-cult-white'}
        `}
      >
        {tab}
      </button>
    ))}
  </div>
</div>
```

**Conventions:**
- Underline indicates active tab
- Uppercase tab labels
- Hover state on inactive tabs
- Use when tabs are all at same hierarchy level

**When to Use:**
- 2-6 related views at same level
- No nested hierarchy needed
- All tabs equally important

**When NOT to Use:**
- More than 6 tabs (use tree navigation or select dropdown)
- Nested hierarchy (use tree navigation)
- Mobile devices with many tabs (overflow issues)

---

## 2. Form Patterns

### 1.1 Create/Edit Pattern (Most Common)

**Use Case:** Creating or editing entities (customers, products, batches, etc.)

**Standard Flow:**
```
View List → Click "Create" → Modal Opens → Fill Form → Submit → Success → Modal Closes → List Refreshes
```

**Implementation Pattern:**
```tsx
import { BaseModal } from '@/shared/components/BaseModal';
import { BaseForm } from '@/shared/components/BaseForm';
import { FormField } from '@/shared/components/FormField';

function CreateEntityModal({ isOpen, onClose }: Props) {
  const [formData, setFormData] = useState<EntityFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await entityService.create(formData);
      notificationService.success('Entity created successfully');
      onClose();
    } catch (error) {
      notificationService.error('Failed to create entity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Entity"
      maxWidth="lg"
    >
      <BaseForm
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
        isValid={Object.keys(errors).length === 0}
      >
        <FormField
          label="Name"
          required
          error={errors.name}
        >
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-cult-black border border-cult-medium-gray text-cult-white focus:border-cult-white"
          />
        </FormField>

        {/* Additional form fields */}
      </BaseForm>
    </BaseModal>
  );
}
```

**Components Used:**
- `BaseModal` - Container with title and close button
- `BaseForm` - Handles form submission and action buttons
- `FormField` - Label, error display, help text wrapper

**Conventions:**
- All forms use `BaseForm` for consistent button layout
- Required fields marked with red asterisk (*)
- Errors display below field in red text
- Submit button disabled while submitting (shows spinner)
- Cancel button available at all times

**Examples in Codebase:**
- `src/features/customers/components/CustomerForm.tsx` (7,299 bytes)
- `src/features/products/components/StrainsManagement.tsx` (19,255 bytes)
- `src/features/batches/components/BatchManagement.tsx`

---

### 1.2 Multi-Section Form Pattern

**Use Case:** Complex entities with logical groupings (customer with license, contact, address sections)

**Visual Structure:**
```
┌─────────────────────────────────────┐
│  [Basic Information Section]        │
│  - Name                              │
│  - Type                              │
├─────────────────────────────────────┤
│  [License Information Section]      │
│  - License Number                    │
│  - License Type                      │
├─────────────────────────────────────┤
│  [Contact Information Section]      │
│  - Email                             │
│  - Phone                             │
└─────────────────────────────────────┘
```

**Implementation Pattern:**
```tsx
<BaseForm {...formProps}>
  {/* Section 1 */}
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-cult-white uppercase">Basic Information</h3>
    <FormField label="Name" required>
      {/* input */}
    </FormField>
  </div>

  {/* Section Divider */}
  <div className="border-t border-cult-medium-gray my-6"></div>

  {/* Section 2 */}
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-cult-white uppercase">License Information</h3>
    <FormField label="License Number" required>
      {/* input */}
    </FormField>
  </div>
</BaseForm>
```

**Conventions:**
- Sections separated by horizontal border
- Section headings: uppercase, bold, larger text
- Logical grouping reduces cognitive load
- All sections in single form (not wizard steps)

**Example:** `src/features/customers/components/CustomerForm.tsx` (4 sections)

---

### 1.3 Inline Edit Pattern

**Use Case:** Quick edits without opening modal (table row editing)

**Flow:**
```
Normal View → Click Edit Icon → Fields Become Editable → Edit → Save/Cancel
```

**Pattern:**
- Edit icon appears on row hover
- Click edit: inputs replace text
- Save/Cancel buttons appear inline
- ESC key cancels, Enter saves (when appropriate)

**When to Use:**
- Simple, single-field edits
- Quick status changes
- Non-critical edits (no validation required)

**When NOT to Use:**
- Multi-field edits (use modal)
- Complex validation required
- Related data needs to be shown

---

## 2. Modal Patterns

### 2.1 Simple Modal (Single Action)

**Use Case:** Single-purpose modals (confirm delete, view details, simple form)

**Size Guide:**
- `sm` (max-w-sm): Confirmation dialogs, alerts
- `md` (max-w-md): Simple forms (2-3 fields)
- `lg` (max-w-lg): **DEFAULT** - Standard forms (4-6 fields)
- `xl` (max-w-xl): Complex forms (7-10 fields)
- `2xl+`: Special cases (data tables, image viewers)

**Standard Structure:**
```tsx
<BaseModal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm Action"
  icon={<AlertTriangle />}
  maxWidth="sm"
>
  <p className="text-cult-lighter-gray">
    Are you sure you want to delete this item?
  </p>

  <div className="flex justify-end gap-3 mt-6">
    <button onClick={onClose}>Cancel</button>
    <button onClick={handleConfirm}>Confirm</button>
  </div>
</BaseModal>
```

**Conventions:**
- Title: Uppercase, bold
- Icon: Optional, placed left of title
- Content padding: 24px (p-6)
- Close button: Always top-right (X icon)
- Backdrop: Click to close (unless critical action)

---

### 2.2 Wizard Modal (Multi-Step)

**Use Case:** Complex workflows requiring multiple steps (COA upload, combine packages, session completion)

**Visual Structure:**
```
┌────────────────────────────────────┐
│  Modal Title              [X]      │
├────────────────────────────────────┤
│  [Step 1] [Step 2] [Step 3]        │ ← Step Indicator
├────────────────────────────────────┤
│                                    │
│  [Current Step Content]            │
│                                    │
│                                    │
├────────────────────────────────────┤
│  [Back]            [Next/Submit]   │ ← Step Navigation
└────────────────────────────────────┘
```

**State Management Pattern:**
```tsx
interface WizardState {
  currentStep: number;
  totalSteps: number;
  stepData: Record<number, any>;
  isValid: boolean;
}

function useWizardFlow(totalSteps: number) {
  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    totalSteps,
    stepData: {},
    isValid: false,
  });

  const nextStep = () => {
    if (state.currentStep < state.totalSteps) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const previousStep = () => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const canProceed = () => state.isValid;

  return { state, nextStep, previousStep, canProceed };
}
```

**Step Indicator Pattern:**
```tsx
<div className="flex items-center justify-center gap-4 pb-6">
  {Array.from({ length: totalSteps }, (_, i) => (
    <div
      key={i}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${i + 1 === currentStep
          ? 'bg-cult-white text-cult-black'
          : i + 1 < currentStep
            ? 'bg-green-600 text-white'
            : 'bg-cult-medium-gray text-cult-lighter-gray'}
      `}
    >
      {i + 1 < currentStep ? '✓' : i + 1}
    </div>
  ))}
</div>
```

**Navigation Buttons:**
```tsx
<div className="flex justify-between pt-6 border-t border-cult-medium-gray">
  <button
    onClick={previousStep}
    disabled={currentStep === 1}
    className="px-6 py-2 border border-cult-medium-gray text-cult-white disabled:opacity-50"
  >
    Back
  </button>

  <button
    onClick={currentStep === totalSteps ? handleSubmit : nextStep}
    disabled={!canProceed()}
    className="px-6 py-2 bg-cult-white text-cult-black disabled:opacity-50"
  >
    {currentStep === totalSteps ? 'Submit' : 'Next'}
  </button>
</div>
```

**Conventions:**
- Step indicator always visible
- "Back" button disabled on step 1
- "Next" button disabled if current step invalid
- Last step shows "Submit" instead of "Next"
- Data persists when going back/forward
- Can skip optional steps
- Cannot skip required steps

**Examples in Codebase:**
- `src/features/coa/components/COAReviewWizard.tsx`
- `src/features/order-form/components/StandaloneOrderFormRefactored.tsx` (4 steps)

---

### 2.3 Confirmation Dialog

**Use Case:** Destructive actions (delete, archive, cancel)

**Standard Implementation:**
```tsx
<BaseModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Delete"
  icon={<AlertTriangle className="text-red-400" />}
  maxWidth="sm"
>
  <p className="text-cult-lighter-gray mb-4">
    Are you sure you want to delete <strong className="text-cult-white">{entityName}</strong>?
    This action cannot be undone.
  </p>

  <div className="flex justify-end gap-3">
    <button
      onClick={() => setShowConfirm(false)}
      className="px-6 py-2 border border-cult-medium-gray text-cult-white"
    >
      Cancel
    </button>
    <button
      onClick={handleDelete}
      className="px-6 py-2 bg-red-600 text-white hover:bg-red-700"
    >
      Delete
    </button>
  </div>
</BaseModal>
```

**Conventions:**
- Warning icon in title (AlertTriangle)
- Mention entity name specifically
- Warn if action is irreversible
- Destructive button is red
- Cancel button is neutral (gray border)
- Focus trap (ESC closes, Enter confirms)

---

## 3. Table Patterns

### 3.1 Standard Data Table

**Use Case:** List views for all entities (customers, products, orders, inventory)

**Visual Structure:**
```
┌───────────────────────────────────────────────────────────┐
│  [Search]  [Filters ▼]  [+ Create]                        │ ← Actions Bar
├───────────────────────────────────────────────────────────┤
│  Name ↓  │  Type  │  Status  │  Created  │  Actions      │ ← Header Row
├───────────────────────────────────────────────────────────┤
│  Item 1  │  TypeA │  Active  │  Nov 10   │  [Edit][Del]  │
│  Item 2  │  TypeB │  Archived│  Nov 9    │  [Edit][Del]  │
│  Item 3  │  TypeA │  Active  │  Nov 8    │  [Edit][Del]  │
└───────────────────────────────────────────────────────────┘
```

**Implementation Pattern:**
```tsx
<div className="bg-cult-near-black">
  {/* Actions Bar */}
  <div className="flex justify-between items-center p-4 border-b border-cult-medium-gray">
    <div className="flex gap-3">
      <input
        type="text"
        placeholder="Search..."
        className="px-4 py-2 bg-cult-black border border-cult-medium-gray text-cult-white"
      />
      <select className="px-4 py-2 bg-cult-black border border-cult-medium-gray text-cult-white">
        <option>All Types</option>
      </select>
    </div>
    <button className="px-6 py-2 bg-cult-white text-cult-black">
      + Create
    </button>
  </div>

  {/* Table */}
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-cult-medium-gray">
          <th className="text-left px-4 py-3 text-cult-white font-bold uppercase">
            Name
          </th>
          {/* More headers */}
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id} className="border-b border-cult-medium-gray hover:bg-cult-black">
            <td className="px-4 py-3 text-cult-white">{item.name}</td>
            {/* More cells */}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

**Conventions:**
- Headers: Uppercase, bold, left-aligned
- Rows: Hover background change
- Actions column: Always rightmost
- Responsive: Horizontal scroll on mobile
- Empty state: "No items found" message

---

### 3.2 Sortable Table

**Use Case:** Tables with column sorting

**Visual Indicator:**
```
Name ↓  │  Type ↕  │  Created ↑
```

**Implementation:**
```tsx
const [sortField, setSortField] = useState<string>('name');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

const handleSort = (field: string) => {
  if (sortField === field) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setSortField(field);
    setSortDirection('asc');
  }
};

// In header
<th onClick={() => handleSort('name')} className="cursor-pointer">
  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
</th>
```

**Conventions:**
- Clickable column headers
- Arrow indicates sort direction
- Default sort: Usually by name or created date
- Visual feedback on hover (underline or bg change)

---

### 3.3 Table with Bulk Actions

**Use Case:** Operations on multiple items (combine packages, bulk delete, bulk archive)

**Visual Structure:**
```
☑ Select All  │  [2 selected]  │  [Combine] [Delete]
─────────────────────────────────────────────────────
☐ Item 1
☑ Item 2
☑ Item 3
```

**Implementation Pattern:**
```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const toggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

const toggleSelectAll = () => {
  if (selectedIds.size === items.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(items.map(item => item.id)));
  }
};

// In render
{selectedIds.size > 0 && (
  <div className="flex items-center gap-3 p-4 bg-cult-black border-b border-cult-medium-gray">
    <span className="text-cult-white">{selectedIds.size} selected</span>
    <button
      onClick={handleBulkAction}
      className="px-4 py-2 bg-cult-white text-cult-black"
    >
      Bulk Action
    </button>
  </div>
)}
```

**Conventions:**
- Checkbox in first column
- "Select All" checkbox in header
- Selected count displayed prominently
- Bulk action buttons only show when items selected
- Clear selection after action completes

**Example:** Combine Packages feature (pending implementation)

---

## 4. State Feedback Patterns

### 4.1 Loading States

**Types:**

**A. Full Screen Loading**
```tsx
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

if (isLoading) {
  return <LoadingSpinner />;
}
```

**B. Inline Loading (Inside Button)**
```tsx
<button disabled={isSubmitting}>
  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
  {isSubmitting ? 'Saving...' : 'Save'}
</button>
```

**C. Section Loading (Part of page)**
```tsx
<div className="relative">
  {isLoading && (
    <div className="absolute inset-0 bg-cult-black/80 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  )}
  {/* Content */}
</div>
```

**Conventions:**
- Use `LoadingSpinner` component for consistency
- Disable interactive elements while loading
- Show loading text if action takes >2 seconds
- Spinner: 12px (button), 48px (full screen)

---

### 4.2 Error States

**Types:**

**A. Form Field Error (Inline)**
```tsx
<FormField
  label="Email"
  error={errors.email}
>
  <input />
</FormField>
```

**B. Section Error (Alert)**
```tsx
import { ErrorDisplay } from '@/shared/components/ErrorDisplay';

{error && (
  <ErrorDisplay
    title="Failed to Load"
    message={error.message}
  />
)}
```

**C. Toast Notification (Global)**
```tsx
import { notificationService } from '@/services/notification.service';

notificationService.error('Failed to save customer');
```

**Conventions:**
- Field errors: Red text below field
- Section errors: Red background alert with icon
- Toast errors: Auto-dismiss after 5 seconds
- Error messages: User-friendly, actionable
- Never show raw error stack traces

**Priority:**
1. Field-level (most specific)
2. Section-level (operation failed)
3. Toast (global feedback)

---

### 4.3 Success States

**Types:**

**A. Toast Notification (Primary)**
```tsx
notificationService.success('Customer created successfully');
```

**B. Inline Success Message**
```tsx
{justSaved && (
  <div className="bg-green-900/20 border border-green-700 p-3 flex items-center gap-2">
    <CheckCircle className="w-5 h-5 text-green-400" />
    <span className="text-green-400">Saved successfully</span>
  </div>
)}
```

**C. Visual State Change**
```tsx
// Button changes to checkmark briefly
<button className={`${justSaved ? 'bg-green-600' : 'bg-cult-white'}`}>
  {justSaved ? <Check /> : 'Save'}
</button>
```

**Conventions:**
- Toast: Default success feedback (auto-dismiss 3s)
- Inline: For critical confirmations
- Visual change: For immediate feedback
- Success messages: Concise, positive tone

---

### 4.4 Empty States

**Use Case:** No data to display (empty table, no search results)

**Implementation:**
```tsx
{items.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 text-cult-lighter-gray">
    <Package className="w-16 h-16 mb-4 opacity-50" />
    <p className="text-lg font-bold">No items found</p>
    <p className="text-sm mt-2">Create your first item to get started</p>
    <button className="mt-4 px-6 py-2 bg-cult-white text-cult-black">
      + Create Item
    </button>
  </div>
)}
```

**Conventions:**
- Icon: Large, muted (opacity-50)
- Message: Explain why empty + how to fix
- Call-to-action: Primary action button
- Centered in container
- Empty search: "No results for '{query}'"

---

## 6. Bulk Operations

### 6.1 Bulk Action Pattern

**Flow:**
```
1. User selects multiple items (checkboxes)
2. Bulk action bar appears
3. User clicks bulk action button
4. Confirmation modal (if destructive)
5. Action executes on all selected
6. Success toast shows count
7. Selection clears
```

**Example Implementation:**
```tsx
const handleBulkDelete = async () => {
  const confirmed = await confirmDialog({
    title: 'Delete Multiple Items',
    message: `Delete ${selectedIds.size} items?`,
  });

  if (!confirmed) return;

  try {
    await Promise.all(
      Array.from(selectedIds).map(id => deleteItem(id))
    );
    notificationService.success(`Deleted ${selectedIds.size} items`);
    setSelectedIds(new Set());
    refreshList();
  } catch (error) {
    notificationService.error('Failed to delete some items');
  }
};
```

**Conventions:**
- Always confirm destructive bulk actions
- Show progress if operation takes >2 seconds
- Report partial failures clearly
- Clear selection on success

---

## 7. Validation Patterns

### 7.1 Real-Time Validation

**Use Case:** Field validation as user types

**Pattern:**
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const validateField = (field: string, value: any) => {
  let error = '';

  if (field === 'email' && !/\S+@\S+\.\S+/.test(value)) {
    error = 'Invalid email format';
  }

  setErrors(prev => ({
    ...prev,
    [field]: error,
  }));
};

// In onChange
onChange={(e) => {
  setFormData({ ...formData, email: e.target.value });
  validateField('email', e.target.value);
}}
```

**Conventions:**
- Validate on blur (not on every keystroke)
- Show error after user leaves field
- Clear error when user starts typing again
- Don't block submission (show all errors on submit)

---

### 7.2 Uniqueness Validation

**Use Case:** Unique constraint fields (package ID, email, batch number)

**Pattern:**
```tsx
const [isChecking, setIsChecking] = useState(false);
const [isUnique, setIsUnique] = useState<boolean | null>(null);

const checkUniqueness = useMemo(
  () => debounce(async (value: string) => {
    if (!value) return;

    setIsChecking(true);
    try {
      const exists = await checkIfExists(value);
      setIsUnique(!exists);
    } finally {
      setIsChecking(false);
    }
  }, 500),
  []
);

// Visual feedback
{isChecking && <Loader2 className="w-4 h-4 animate-spin" />}
{isUnique === false && <X className="w-4 h-4 text-red-400" />}
{isUnique === true && <Check className="w-4 h-4 text-green-400" />}
```

**Conventions:**
- Debounce API calls (500ms)
- Show loading spinner while checking
- Visual indicator (checkmark or X)
- Error message if not unique

---

## Cross-Pattern Conventions

### Color System
- **Background:** `cult-black` (tables, inputs), `cult-near-black` (containers)
- **Borders:** `cult-medium-gray` (standard), `cult-light-gray` (hover)
- **Text:** `cult-white` (primary), `cult-lighter-gray` (secondary)
- **Accents:** `cult-white` (primary actions), `red-600` (destructive)

### Typography
- **Headings:** Uppercase, bold, tracking-wider
- **Labels:** Uppercase, bold, text-sm
- **Body:** Normal case, text-cult-lighter-gray
- **Buttons:** Uppercase, font-medium, tracking-wider

### Spacing
- **Container padding:** 24px (p-6)
- **Section spacing:** 24px (space-y-6)
- **Element spacing:** 12px (space-y-3)
- **Button padding:** 24px x 8px (px-6 py-2)

### Transitions
- **Standard:** `transition-all` (all properties)
- **Colors:** `transition-colors` (bg, text, border)
- **Duration:** 200ms (default)

---

## Pattern Decision Tree

**Need navigation?**
- Main app navigation → Hamburger Menu with Slide-Out Drawer (1.1)
- Page sections → Tabs Navigation (1.4)
- Deep hierarchy → Tree Navigation (1.2) + Breadcrumbs (1.3)
- Settings/configuration → Tree Navigation (1.2)

**Need to show a list?** → Standard Data Table (4.1)
**Need to create/edit?** → Create/Edit Pattern (2.1) + BaseModal (3.1)
**Complex multi-step workflow?** → Wizard Modal (3.2)
**Destructive action?** → Confirmation Dialog (3.3)
**Multiple selections?** → Bulk Operations (6.1)
**Show status?** → State Feedback Patterns (5.1-5.4)

---

## Related Documentation
- [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md) - Component API documentation
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - Backend workflows
- [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md) - Code patterns

---

**Version History:**
- v1.0 (2025-11-10): Initial documentation based on existing codebase patterns
