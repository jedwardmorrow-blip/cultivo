---
title: UI COMPONENTS REFERENCE
category: Frontend Development
version: 1.0
created: 2025-11-10
author: Claude AI
---

# UI Components Reference - CULT Seed-to-Sale System

> **Purpose:** API documentation for all shared UI components
> **Audience:** Frontend developers
> **Status:** Living document - update as components change

---

## Table of Contents

1. [Shared Component Library Overview](#shared-component-library-overview)
2. [Layout Components](#layout-components)
3. [Navigation Components](#navigation-components)
4. [Form Components](#form-components)
5. [Modal Components](#modal-components)
6. [Feedback Components](#feedback-components)
7. [Usage Guidelines](#usage-guidelines)

---

## Shared Component Library Overview

### Component Locations

**Core Library** (`/src/lib/components/`)
- Application-level components (layout, error boundaries, providers)
- Used across entire app

**Shared Library** (`/src/shared/components/`)
- Reusable UI primitives (forms, modals, inputs)
- Building blocks for features

**Feature Components** (`/src/features/{feature}/components/`)
- Feature-specific components
- Not intended for reuse outside feature

### Import Convention

```tsx
// Core library
import { Layout } from '@/lib/components';

// Shared library
import { BaseModal, BaseForm, FormField } from '@/shared/components';

// Feature components
import { CustomerForm } from '@/features/customers/components';
```

---

## Layout Components

### Layout

**File:** `/src/lib/components/Layout.tsx`

**Purpose:** Main application wrapper with sidebar navigation and content area

**Props:**
```typescript
interface LayoutProps {
  children: ReactNode;
}
```

**Usage:**
```tsx
import { Layout } from '@/lib/components';

function App() {
  return (
    <Layout>
      <YourPageContent />
    </Layout>
  );
}
```

**Features:**
- Fixed left sidebar navigation
- Responsive layout
- Role-based nav item visibility
- Active route highlighting

**Styling:**
- Background: `cult-black`
- Sidebar: Fixed width, scroll if needed
- Content area: Flexible width, scrollable

**When to Use:**
- Every page in the application
- Already wrapped in main App component

---

### ErrorBoundary

**File:** `/src/lib/components/ErrorBoundary.tsx`

**Purpose:** Catch React errors and display fallback UI

**Props:**
```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
```

**Usage:**
```tsx
import { ErrorBoundary } from '@/lib/components';

<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <YourComponent />
</ErrorBoundary>
```

**Features:**
- Prevents entire app crash
- Custom fallback UI
- Error logging (console)

**When to Use:**
- Wrap feature modules
- Wrap third-party components
- Critical sections of app

**Best Practice:**
```tsx
// Wrap at feature level, not every component
<ErrorBoundary>
  <OrdersManagement />
</ErrorBoundary>
```

---

### NotificationProvider

**File:** `/src/lib/components/NotificationProvider.tsx`

**Purpose:** Toast notification system for global feedback

**Props:**
```typescript
interface NotificationProviderProps {
  children: ReactNode;
}
```

**Usage:**
```tsx
// Already wrapped in App root
import { notificationService } from '@/services/notification.service';

// In any component
notificationService.success('Operation completed');
notificationService.error('Operation failed');
notificationService.info('FYI: Something happened');
```

**Notification Types:**
- `success` - Green background, auto-dismiss 3s
- `error` - Red background, auto-dismiss 5s
- `info` - Blue background, auto-dismiss 4s

**Position:** Top-right corner, stacked vertically

**When to Use:**
- After async operations (save, delete, update)
- Form submission results
- Background task completions

**When NOT to Use:**
- Inline validation errors (use FormField error)
- Expected empty states (use EmptyState component)

---

## Navigation Components

### NavigationDrawer

**File:** `/src/shared/components/navigation/NavigationDrawer.tsx`

**Purpose:** Slide-out navigation drawer with hierarchical menu structure and badge support

**Props:**
```typescript
interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sections: MenuSection[];
  currentView: string;
  onNavigate: (viewId: string) => void;
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  isAdmin: boolean;
  isTestPortal: boolean;
}

interface MenuSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  testPortalOnly?: boolean;
  badge?: number | string;
  badgeColor?: 'warning' | 'success' | 'error' | 'info' | 'default';
}
```

**Usage:**
```tsx
import { NavigationDrawer, menuStructure } from '@/shared/components/navigation';
import { useNavigationMenu } from '@/hooks/useNavigationMenu';
import { useBadgeCounts } from '@/hooks/useBadgeCounts';

function Layout() {
  const { isOpen, expandedSections, toggleSection, toggleDrawer } = useNavigationMenu(currentView);
  const { counts } = useBadgeCounts(isOpen);

  // Add badges to menu items
  const sectionsWithBadges = menuStructure.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      badge: item.id === 'orders' ? counts.orders : undefined,
    })),
  }));

  return (
    <>
      <button onClick={toggleDrawer}>
        <Menu className="w-6 h-6" />
      </button>

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
    </>
  );
}
```

**Features:**
- Slides in from left (300ms animation)
- Backdrop overlay (60% black)
- Auto-expand section containing active page
- Badge notifications for counts/status
- Role-based item visibility (adminOnly, testPortalOnly)
- Click backdrop or ESC to close
- Auto-close on navigation
- Persistent expanded state (localStorage)

**Styling:**
- Width: 280px fixed
- Background: `cult-graphite`
- Border: `cult-charcoal`
- Z-index: 50 (drawer), 40 (backdrop)

**When to Use:**
- Main application navigation
- 5+ navigation items with hierarchy
- Need badge notifications

**See Also:**
- `useNavigationMenu` hook for state management
- `useBadgeCounts` hook for badge data
- `menuStructure` for menu definition

---

### NavigationSection

**File:** `/src/shared/components/navigation/NavigationSection.tsx`

**Purpose:** Expandable/collapsible section within navigation drawer

**Props:**
```typescript
interface NavigationSectionProps {
  section: MenuSection;
  isExpanded: boolean;
  onToggle: () => void;
  currentView: string;
  onNavigate: (viewId: string) => void;
  isAdmin: boolean;
  isTestPortal: boolean;
}
```

**Features:**
- Chevron icon (right when collapsed, down when expanded)
- Section icon and label
- Filters items based on permissions
- Highlights section if contains active page
- Smooth expand/collapse animation

**Used By:** NavigationDrawer component

---

### NavigationItem

**File:** `/src/shared/components/navigation/NavigationItem.tsx`

**Purpose:** Individual navigation item with icon, label, and optional badge

**Props:**
```typescript
interface NavigationItemProps {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
}
```

**Features:**
- Icon + label layout
- Active state: white background, black text
- Inactive state: gray text, hover to white
- Badge support with color coding
- Truncates long labels

**Badge Colors:**
- `warning`: Amber (admin/alert items)
- `success`: Green (active sessions)
- `error`: Red (critical issues)
- `info`: Blue (pending items)
- `default`: Gray (general counts)

**Used By:** NavigationSection component

---

## Navigation Hooks

### useNavigationMenu

**File:** `/src/hooks/useNavigationMenu.ts`

**Purpose:** Manage navigation drawer state and expanded sections with localStorage persistence

**Signature:**
```typescript
function useNavigationMenu(currentView: string): {
  isOpen: boolean;
  expandedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}
```

**Usage:**
```tsx
import { useNavigationMenu } from '@/hooks/useNavigationMenu';

function Layout({ currentView }) {
  const {
    isOpen,
    expandedSections,
    toggleSection,
    toggleDrawer,
  } = useNavigationMenu(currentView);

  return (
    <>
      <button onClick={toggleDrawer}>Menu</button>
      <NavigationDrawer
        isOpen={isOpen}
        onClose={toggleDrawer}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        {...otherProps}
      />
    </>
  );
}
```

**Features:**
- Loads expanded sections from localStorage on mount
- Saves expanded sections to localStorage on change
- Auto-expands section containing current page
- ESC key closes drawer
- Prevents body scroll when drawer open
- Restores body scroll on unmount

**Storage Key:** `'nav-expanded-sections'`

---

### useBadgeCounts

**File:** `/src/hooks/useBadgeCounts.ts`

**Purpose:** Fetch and cache badge counts for navigation items

**Signature:**
```typescript
function useBadgeCounts(isOpen: boolean): {
  counts: BadgeCounts;
  loading: boolean;
}

interface BadgeCounts {
  orders: number;
  trimSessions: number;
  packagingSessions: number;
  batches: number;
}
```

**Usage:**
```tsx
import { useBadgeCounts } from '@/hooks/useBadgeCounts';

function NavigationWithBadges({ isDrawerOpen }) {
  const { counts, loading } = useBadgeCounts(isDrawerOpen);

  // Apply counts to menu items
  const menuWithBadges = menuStructure.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      badge: counts[item.id] || undefined,
    })),
  }));

  return <NavigationDrawer sections={menuWithBadges} />;
}
```

**Features:**
- Only fetches when drawer is open
- Caches results for 30 seconds
- Prevents unnecessary database queries
- Graceful error handling

**Queries:**
- Orders: `status IN ('submitted', 'processing')`
- Trim Sessions: `session_status = 'in_progress'`
- Packaging Sessions: `session_status = 'in_progress'`
- Batches: `lifecycle_state != 'archived'`

---

## Form Components
  activePage: string;
  onNavigate: (pageId: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  children?: MenuItem[];
  path?: string;
}
```

**Usage:**
```tsx
import { NavigationDrawer } from '@/lib/components';
import { Package, Truck, Settings } from 'lucide-react';

const menuStructure = [
  {
    id: 'operations',
    label: 'Operations',
    icon: Package,
    children: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
      { id: 'orders', label: 'Orders', path: '/orders' },
    ],
  },
  // More sections...
];

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (pageId: string) => {
    setCurrentPage(pageId);
    setIsMenuOpen(false);
  };

  return (
    <>
      <NavigationDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        menuStructure={menuStructure}
        activePage={currentPage}
        onNavigate={handleNavigate}
      />
    </>
  );
}
```

**Features:**
- Slides in from left side of screen
- Dark backdrop overlay (click to close)
- Tree navigation with collapsible sections
- Auto-expands section containing active page
- Persists expanded state in localStorage
- ESC key closes drawer
- Focus trap for keyboard navigation
- Smooth animations (250-300ms)
- Responsive width (280-320px desktop, 90% mobile)

**Styling:**
- Background: `cult-graphite`
- Border: `cult-charcoal` (right border)
- Width: `320px` (w-80)
- Height: Full viewport (h-full)
- Position: Fixed, z-index 50
- Shadow: `shadow-glow` for elevation

**Accessibility:**
- `aria-label="Navigation menu"` on drawer
- `aria-expanded` on hamburger button
- Focus trap inside drawer when open
- ESC key support
- Keyboard navigation with Tab/Arrow keys
- `aria-current="page"` on active item

**When to Use:**
- Main application navigation
- 5+ navigation items
- Hierarchical menu structure
- Mobile-responsive applications

**When NOT to Use:**
- Simple 3-4 page applications (use horizontal tabs)
- Permanent sidebar is needed (use persistent sidebar)
- Navigation must always be visible

---

### HamburgerButton

**File:** `/src/lib/components/HamburgerButton.tsx` (to be created)

**Purpose:** Toggle button for navigation drawer

**Props:**
```typescript
interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}
```

**Usage:**
```tsx
import { HamburgerButton } from '@/lib/components';

<HamburgerButton
  isOpen={isMenuOpen}
  onClick={() => setIsMenuOpen(!isMenuOpen)}
/>
```

**Features:**
- Displays three horizontal lines (Menu icon) when closed
- Displays X icon when open
- Smooth icon transition animation
- Proper ARIA labels for accessibility
- Hover state feedback

**Styling:**
- Icon size: 24x24px (w-6 h-6)
- Padding: 8px (p-2)
- Color: `cult-white`
- Hover: `cult-charcoal` background
- Transition: 200ms

**Accessibility:**
- `aria-label="Toggle navigation menu"`
- `aria-expanded={isOpen}`
- Keyboard accessible (Tab, Enter, Space)

---

### TreeNavigation

**File:** `/src/shared/components/TreeNavigation.tsx` (to be created)

**Purpose:** Hierarchical tree menu with collapsible sections

**Props:**
```typescript
interface TreeNavigationProps {
  items: TreeNode[];
  activePath: string;
  onNavigate: (path: string) => void;
  defaultExpandedNodes?: string[];
}

interface TreeNode {
  id: string;
  label: string;
  icon?: React.ComponentType;
  path?: string;
  children?: TreeNode[];
}
```

**Usage:**
```tsx
import { TreeNavigation } from '@/shared/components';
import { Settings, Package, Users } from 'lucide-react';

const treeItems = [
  {
    id: 'general',
    label: 'General Settings',
    icon: Settings,
    path: '/settings/general',
  },
  {
    id: 'products',
    label: 'Product Management',
    icon: Package,
    children: [
      { id: 'products-list', label: 'Products', path: '/settings/products' },
      { id: 'strains', label: 'Strains', path: '/settings/strains' },
      { id: 'types', label: 'Types', path: '/settings/types' },
    ],
  },
];

<TreeNavigation
  items={treeItems}
  activePath={currentPath}
  onNavigate={handleNavigate}
  defaultExpandedNodes={['products']}
/>
```

**Features:**
- Unlimited nesting levels (recommend max 3-4)
- Collapsible sections with chevron icons
- Visual indentation (16px per level)
- Active item highlighting
- Smooth expand/collapse animations
- Optional icons for each node
- Keyboard navigation support

**Visual Hierarchy:**
- Level 0: Bold, larger text
- Level 1: Regular weight, standard text
- Level 2+: Smaller text, reduced opacity
- Indentation: 16px per level

**Styling:**
- Active item: `bg-cult-off-white text-cult-black`
- Hover: `bg-cult-charcoal/50`
- Collapsed: ChevronRight icon
- Expanded: ChevronDown icon
- Spacing: 4px between items (space-y-1)

**When to Use:**
- Settings pages with categories
- File/folder navigation
- Any hierarchical content
- 10+ items with logical groupings

**When NOT to Use:**
- Flat lists (use simple list)
- 2-3 items (use tabs or buttons)
- Frequent deep navigation (add search)

---

### Breadcrumbs

**File:** `/src/shared/components/Breadcrumbs.tsx` (to be created)

**Purpose:** Show current location in hierarchy with navigation links

**Props:**
```typescript
interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

interface BreadcrumbItem {
  label: string;
  path?: string; // Omit for current page
  icon?: React.ComponentType;
}
```

**Usage:**
```tsx
import { Breadcrumbs } from '@/shared/components';

const breadcrumbItems = [
  { label: 'Settings', path: '/settings' },
  { label: 'Product Management', path: '/settings/products' },
  { label: 'Strains' }, // Current page (no path)
];

<Breadcrumbs items={breadcrumbItems} />
```

**Features:**
- Clickable links for navigation
- Current page not clickable (last item)
- ChevronRight separators
- Hover states on links
- Optional icons
- Responsive (wraps on mobile)

**Styling:**
- Text size: Small (text-sm)
- Links: `text-cult-lighter-gray` → `text-cult-white` on hover
- Current page: `text-cult-white` (not a link)
- Separator: `text-cult-medium-gray`
- Gap: 8px between items (gap-2)

**When to Use:**
- Deep hierarchies (3+ levels)
- Settings pages with nested sections
- Anywhere users might get lost
- Complement to tree navigation

**When NOT to Use:**
- Shallow navigation (1-2 levels)
- Already have clear navigation context
- Mobile with limited space

---

## Form Components

### BaseForm

**File:** `/src/shared/components/BaseForm.tsx`

**Purpose:** Standardized form wrapper with submit/cancel buttons

**Props:**
```typescript
interface BaseFormProps {
  children: ReactNode;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;      // Default: false
  isValid?: boolean;            // Default: true
  submitLabel?: string;         // Default: 'Save'
  cancelLabel?: string;         // Default: 'Cancel'
}
```

**Usage:**
```tsx
import { BaseForm } from '@/shared/components';

<BaseForm
  onSubmit={handleSave}
  onCancel={handleCancel}
  isSubmitting={isSaving}
  isValid={Object.keys(errors).length === 0}
  submitLabel="Create"
>
  {/* Form fields go here */}
</BaseForm>
```

**Features:**
- Prevents submit on Enter (must click button)
- Disables buttons while submitting
- Shows spinner on submit button
- Submit disabled if `isValid = false`
- Consistent button styling and layout

**Button Layout:**
```
┌────────────────────────────────┐
│                                │
│  (Form Fields)                 │
│                                │
├────────────────────────────────┤ ← Border separator
│              [Cancel]  [Save]  │ ← Right-aligned
└────────────────────────────────┘
```

**Styling:**
- Buttons: Right-aligned, 12px gap
- Cancel: Gray border, white text
- Submit: White background, black text
- Disabled: 50% opacity

**When to Use:**
- Every create/edit form
- Modal forms
- Multi-section forms

**When NOT to Use:**
- Search forms (use plain `<form>`)
- Filter forms (use plain `<form>`)
- Non-standard button layouts

**Example:**
```tsx
function CreateCustomerForm() {
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await saveCustomer(formData);
      notificationService.success('Customer created');
      onClose();
    } catch (error) {
      notificationService.error('Failed to create customer');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseForm
      onSubmit={handleSubmit}
      onCancel={onClose}
      isSubmitting={isSaving}
      isValid={!errors.name && !errors.email}
    >
      <FormField label="Name" required error={errors.name}>
        <input />
      </FormField>
      <FormField label="Email" required error={errors.email}>
        <input />
      </FormField>
    </BaseForm>
  );
}
```

---

### FormField

**File:** `/src/shared/components/FormField.tsx`

**Purpose:** Label, help text, and error wrapper for form inputs

**Props:**
```typescript
interface FormFieldProps {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: ReactNode;
}
```

**Usage:**
```tsx
import { FormField } from '@/shared/components';

<FormField
  label="Email Address"
  required
  helpText="We'll never share your email"
  error={errors.email}
>
  <input
    type="email"
    value={formData.email}
    onChange={handleChange}
    className="w-full px-4 py-2 bg-cult-black border border-cult-medium-gray text-cult-white"
  />
</FormField>
```

**Features:**
- Label: Uppercase, bold, small text
- Required indicator: Red asterisk (*)
- Help text: Gray, small text (if no error)
- Error text: Red, small text (replaces help text)
- Spacing: Consistent vertical gap (8px)

**Visual Structure:**
```
LABEL *
─────────────────────
[Input Field Here]
─────────────────────
Help text or error message
```

**Styling:**
- Label: `text-sm font-bold text-cult-white uppercase tracking-wider`
- Required: `text-red-500 ml-1`
- Help: `text-xs text-cult-lighter-gray`
- Error: `text-xs text-red-400`

**When to Use:**
- Every form input
- Select dropdowns
- Textareas
- Custom input components

**When NOT to Use:**
- Checkbox groups (use custom layout)
- Radio groups (use custom layout)
- Inline forms without labels

**Best Practice:**
```tsx
// ✅ Good - FormField wraps input
<FormField label="Name" required error={errors.name}>
  <input />
</FormField>

// ❌ Bad - Separate label and input
<label>Name *</label>
<input />
{errors.name && <span>{errors.name}</span>}
```

---

### FormInput

**File:** `/src/shared/components/FormInput.tsx`

**Purpose:** Standardized text input with consistent styling

**Props:**
```typescript
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  // All standard input props (value, onChange, type, etc.)
}
```

**Usage:**
```tsx
import { FormInput } from '@/shared/components';

<FormInput
  type="text"
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  placeholder="Enter name..."
/>
```

**Styling:**
- Background: `cult-black`
- Border: `cult-medium-gray`
- Text: `cult-white`
- Focus: `border-cult-white`
- Placeholder: `placeholder-cult-lighter-gray`
- Padding: `px-4 py-2`

**When to Use:**
- Standalone inputs without FormField
- Quick prototyping
- Consistent styling needed

**When NOT to Use:**
- Inside FormField (use plain `<input>` for flexibility)

**Combine with FormField:**
```tsx
<FormField label="Name" required>
  <FormInput
    value={formData.name}
    onChange={handleChange}
  />
</FormField>
```

---

## Modal Components

### BaseModal

**File:** `/src/shared/components/BaseModal.tsx`

**Purpose:** Standardized modal dialog container

**Props:**
```typescript
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}
```

**Usage:**
```tsx
import { BaseModal } from '@/shared/components';
import { Package } from 'lucide-react';

<BaseModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Create Package"
  icon={<Package />}
  maxWidth="lg"
>
  <p>Modal content goes here</p>
</BaseModal>
```

**Features:**
- Backdrop overlay (80% black)
- Click backdrop to close
- Close button (X) top-right
- Centered on screen
- Scrollable if content overflows
- Fixed header with title and icon

**Size Guide:**
| Size | Max Width | Use Case |
|------|-----------|----------|
| `sm` | 384px | Confirmation dialogs |
| `md` | 448px | Simple forms (2-3 fields) |
| `lg` | 512px | **DEFAULT** - Standard forms |
| `xl` | 576px | Complex forms (7-10 fields) |
| `2xl` | 672px | Wide forms or tables |
| `3xl` | 768px | Special cases |
| `4xl+` | Larger | Data displays, image viewers |

**Visual Structure:**
```
┌──────────────────────────────────────┐
│  [Icon]  TITLE              [X]      │ ← Header (border-bottom)
├──────────────────────────────────────┤
│                                      │
│  Content Area                        │
│  (scrollable if needed)              │
│                                      │
└──────────────────────────────────────┘
```

**Styling:**
- Background: `cult-near-black`
- Border: `cult-medium-gray`
- Header padding: 24px (p-6)
- Content padding: 24px (p-6)
- Title: `text-2xl font-bold uppercase tracking-wider`

**Accessibility:**
- Focus trap (keyboard navigation contained)
- ESC key closes modal
- Click outside closes modal

**When to Use:**
- Create/edit forms
- Confirmation dialogs
- Detail views
- Multi-step wizards

**When NOT to Use:**
- Full-screen views (use routes)
- Permanent sidebars (use Layout)

**Example:**
```tsx
function CreateCustomerModal({ isOpen, onClose }: Props) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Customer"
      icon={<UserPlus />}
      maxWidth="xl"
    >
      <BaseForm onSubmit={handleSubmit} onCancel={onClose}>
        <FormField label="Name" required>
          <input />
        </FormField>
      </BaseForm>
    </BaseModal>
  );
}
```

---

## Feedback Components

### LoadingSpinner

**File:** `/src/shared/components/LoadingSpinner.tsx`

**Purpose:** Standardized loading indicator

**Props:** None

**Usage:**
```tsx
import { LoadingSpinner } from '@/shared/components';

{isLoading && <LoadingSpinner />}
```

**Features:**
- Spinning circle animation
- Centered vertically and horizontally
- White color (visible on dark backgrounds)
- Size: 48px diameter
- Padding: 48px vertical (py-12)

**Visual:**
```
        ○
       ◐
      ●
```

**When to Use:**
- Full page loading
- Section loading (tables, cards)
- Initial data fetch
- Loading state before content appears

**When NOT to Use:**
- Button loading (use inline spinner)
- Quick operations (<500ms)
- Background tasks (use toast after completion)

**Variations:**

**Full Page:**
```tsx
if (isLoading) {
  return <LoadingSpinner />;
}
```

**Section Loading:**
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

**Inline Spinner (Custom):**
```tsx
// For buttons - use Loader2 from lucide-react
<button disabled={isSubmitting}>
  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
  Save
</button>
```

---

### ErrorDisplay

**File:** `/src/shared/components/ErrorDisplay.tsx`

**Purpose:** Standardized error message display

**Props:**
```typescript
interface ErrorDisplayProps {
  message: string;
  title?: string;  // Default: 'Error'
}
```

**Usage:**
```tsx
import { ErrorDisplay } from '@/shared/components';

{error && (
  <ErrorDisplay
    title="Failed to Load Customers"
    message={error.message}
  />
)}
```

**Features:**
- Red background (20% opacity)
- Red border
- Alert icon (AlertCircle)
- Title: Bold, uppercase, red
- Message: Regular text, lighter red

**Visual Structure:**
```
┌──────────────────────────────────────┐
│  ⚠  TITLE                            │
│     Error message text goes here...  │
└──────────────────────────────────────┘
```

**Styling:**
- Background: `bg-red-900/20`
- Border: `border-red-700`
- Title: `text-red-400 font-bold uppercase`
- Message: `text-red-200 text-sm`
- Padding: 16px (p-4)

**When to Use:**
- Section-level errors (data fetch failed)
- Operation errors (save failed)
- Validation summary (multiple field errors)

**When NOT to Use:**
- Field-level errors (use FormField error prop)
- Global errors (use toast notification)
- Expected states (use EmptyState)

**Example:**
```tsx
function CustomersList() {
  const { customers, isLoading, error } = useCustomers();

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to Load Customers"
        message="Unable to fetch customer data. Please try again."
      />
    );
  }

  return <table>{/* customers */}</table>;
}
```

---

## Usage Guidelines

### Component Selection Decision Tree

**Need navigation?**
- Main app → `NavigationDrawer` + `HamburgerButton`
- Within page → `TreeNavigation` or tabs
- Show location → `Breadcrumbs`
- Deep hierarchy → `TreeNavigation` + `Breadcrumbs`

**Need a form?**
- → Use `BaseForm` + `FormField` combination
- → Add `BaseModal` if form is in modal

**Need to show status?**
- Loading → `LoadingSpinner`
- Error → `ErrorDisplay` (section) or `notificationService.error()` (global)
- Success → `notificationService.success()`
- Empty → Custom empty state component

**Need user input?**
- Text → `<input>` inside `FormField`
- Dropdown → `<select>` inside `FormField`
- Checkbox → Custom layout with `FormField` wrapper
- File → `<input type="file">` inside `FormField`

**Need modal dialog?**
- Simple → `BaseModal` + content
- Form → `BaseModal` + `BaseForm`
- Wizard → `BaseModal` + custom step logic
- Confirmation → `BaseModal` + buttons

---

### Styling Conventions

**Always Use:**
- Tailwind utility classes
- Design system colors (cult-*)
- Consistent spacing (p-4, p-6, space-y-4)

**Never Use:**
- Inline styles (`style={{}}`)
- Custom CSS files for components
- Hardcoded colors (use design tokens)

**Color Variables:**
```css
/* Available in Tailwind config */
cult-black: #000000
cult-near-black: #0a0a0a
cult-dark-gray: #1a1a1a
cult-medium-gray: #2a2a2a
cult-light-gray: #3a3a3a
cult-lighter-gray: #666666
cult-white: #ffffff
cult-off-white: #f5f5f5
```

---

### Accessibility Best Practices

**Keyboard Navigation:**
- All interactive elements must be focusable
- Tab order should be logical
- ESC closes modals
- Enter submits forms (unless disabled)

**ARIA Labels:**
- Add `aria-label` to icon-only buttons
- Use `aria-describedby` for field help text
- Add `role="alert"` to error messages

**Focus Management:**
- Focus first field when modal opens
- Return focus when modal closes
- Visible focus indicators (outline)

**Example:**
```tsx
<button
  onClick={handleAction}
  aria-label="Delete customer"
  className="focus:outline-none focus:ring-2 focus:ring-cult-white"
>
  <Trash2 />
</button>
```

---

### Testing Components

**Unit Tests:**
- Test props affect render
- Test callbacks fire
- Test keyboard interactions
- Test accessibility

**Example:**
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BaseModal } from './BaseModal';

test('closes modal when close button clicked', () => {
  const onClose = jest.fn();

  render(
    <BaseModal isOpen={true} onClose={onClose} title="Test">
      Content
    </BaseModal>
  );

  fireEvent.click(screen.getByLabelText('Close'));
  expect(onClose).toHaveBeenCalled();
});
```

---

## Anti-Patterns (What NOT to Do)

### ❌ Don't Create Custom Modals
```tsx
// Bad - reinventing the wheel
<div className="fixed inset-0 z-50">
  <div className="bg-black/80">
    <div className="bg-cult-black p-6">
      {/* modal content */}
    </div>
  </div>
</div>

// Good - use BaseModal
<BaseModal isOpen={true} onClose={handleClose} title="My Modal">
  {/* modal content */}
</BaseModal>
```

### ❌ Don't Skip FormField for Form Inputs
```tsx
// Bad - inconsistent styling
<label>Name</label>
<input />
{error && <span className="text-red-400">{error}</span>}

// Good - consistent pattern
<FormField label="Name" required error={error}>
  <input />
</FormField>
```

### ❌ Don't Use Inline Styles
```tsx
// Bad - not maintainable
<div style={{ padding: '24px', backgroundColor: '#0a0a0a' }}>

// Good - use Tailwind
<div className="p-6 bg-cult-near-black">
```

### ❌ Don't Hardcode Colors
```tsx
// Bad - not using design system
<div className="bg-[#0a0a0a] text-[#ffffff]">

// Good - use design tokens
<div className="bg-cult-near-black text-cult-white">
```

---

## Quick Reference

### Most Used Components

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `NavigationDrawer` | Main navigation | App-level navigation menu |
| `TreeNavigation` | Hierarchical menu | Settings, nested content |
| `BaseModal` | Modal dialog | Forms, confirmations, detail views |
| `BaseForm` | Form wrapper | Every create/edit form |
| `FormField` | Field wrapper | Every form input |
| `LoadingSpinner` | Loading indicator | Data fetching, async operations |
| `ErrorDisplay` | Error message | Section errors, operation failures |

### Component Combinations

**Main Navigation Structure:**
```tsx
<>
  <header>
    <HamburgerButton isOpen={isOpen} onClick={toggleMenu} />
    <Logo />
    <UserMenu />
  </header>
  <NavigationDrawer
    isOpen={isOpen}
    onClose={closeMenu}
    menuStructure={menuItems}
    activePage={currentPage}
    onNavigate={handleNavigate}
  />
  <main>{children}</main>
</>
```

**Settings with Tree Navigation:**
```tsx
<div className="flex gap-6">
  <aside className="w-64">
    <TreeNavigation
      items={settingsMenu}
      activePath={currentPath}
      onNavigate={handleNavigate}
    />
  </aside>
  <div className="flex-1">
    <Breadcrumbs items={breadcrumbPath} />
    {renderSettingsContent()}
  </div>
</div>
```

**Create Form in Modal:**
```tsx
<BaseModal isOpen={isOpen} onClose={onClose} title="Create">
  <BaseForm onSubmit={handleSubmit} onCancel={onClose}>
    <FormField label="Name" required>
      <input />
    </FormField>
  </BaseForm>
</BaseModal>
```

**Loading with Error Fallback:**
```tsx
{isLoading && <LoadingSpinner />}
{error && <ErrorDisplay message={error.message} />}
{data && <DataDisplay data={data} />}
```

**Form with Validation:**
```tsx
<BaseForm
  isSubmitting={isSaving}
  isValid={!errors.name && !errors.email}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
>
  <FormField label="Name" required error={errors.name}>
    <input />
  </FormField>
</BaseForm>
```

---

## Related Documentation
- [UI-PATTERNS.md](./UI-PATTERNS.md) - Common UI interaction patterns
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - Backend workflows
- [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md) - Development guide

---

**Version History:**
- v1.0 (2025-11-10): Initial documentation - all shared components documented
