/**
 * Cultivo Icon · v10
 *
 * Mono-weight stroke icons for the operator surface. 1.5px stroke at 16x16
 * viewBox, round caps and joins. Color inherits from `currentColor` so the
 * icon takes whatever color the parent sets via Tailwind text utilities.
 *
 * Source: ui_kits/cult-ops-brand · Cultivo Icon Set v10 (39 nav icons).
 * Favicon (seed glyph) lives at public/favicon.svg, not in this registry.
 *
 * Usage:
 *   <Icon name="cultivation" size={16} className="text-cult-text-muted" />
 */

import type { ReactElement, SVGProps } from 'react';

const PATHS: Record<string, ReactElement> = {
  'accounts': <><circle cx="8" cy="5.5" r="3" /><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" /></>,
  'analytics': <><path d="M2 12l4-8 4 5 4-7" /></>,
  'audit': <><path d="M8 1.5L2.5 4.5v5L8 14.5l5.5-5v-5L8 1.5Z" /><path d="M6 8l1.5 1.5L10 7" /></>,
  'available': <><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" /></>,
  'bar-chart': <><path d="M4 12V7" /><path d="M8 12V4" /><path d="M12 12V9" /><path d="M2 14h12" /></>,
  'batches': <><circle cx="5" cy="8" r="3.5" /><circle cx="11" cy="8" r="3.5" /></>,
  'calendar': <><rect x="2.5" y="2" width="11" height="12" rx="1.5" /><path d="M2.5 5.5h11" /><path d="M5.5 2v3.5" /><path d="M10.5 2v3.5" /><rect x="5" y="8" width="2" height="2" rx="0.5" fill="currentColor" stroke="none" /></>,
  'command-center': <><rect x="1.5" y="1.5" width="5" height="5" rx="0.5" /><rect x="9.5" y="1.5" width="5" height="5" rx="0.5" /><rect x="1.5" y="9.5" width="5" height="5" rx="0.5" /><rect x="9.5" y="9.5" width="5" height="5" rx="0.5" /></>,
  'consolidate': <><path d="M4 6l4 2 4-2" /><path d="M4 10l4 2 4-2" /><path d="M8 8v6" /><path d="M8 2v4" /></>,
  'conversions': <><circle cx="6" cy="6" r="4.5" /><path d="M2 10v3.5h3.5" /><path d="M13 2.5v3" /><path d="M11.5 4h3" /></>,
  'crew': <><circle cx="6" cy="5.5" r="2.5" /><circle cx="11" cy="6" r="2" /><path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" /><path d="M10 10.5c1.4 0 2.5 1.1 2.5 2.5" /></>,
  'cultivation': <><path d="M8 13V8" /><path d="M8 8C6.5 7 3.5 6.5 3 7.5C3.5 9 5.5 9.5 8 8" /><path d="M8 8C9.5 7 12.5 6.5 13 7.5C12.5 9 10.5 9.5 8 8" /><line x1="6" y1="13" x2="10" y2="13" /></>,
  'dashboard': <><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 7v3" /><path d="M8 5.5v4.5" /><path d="M11 6.5v3.5" /></>,
  'distribution': <><path d="M2 10.5L8 13.5L14 10.5" /><path d="M2 7.5L8 10.5L14 7.5" /><path d="M2 4.5L8 7.5L14 4.5L8 1.5L2 4.5Z" /></>,
  'financial': <><rect x="2.5" y="2" width="11" height="12" rx="1.5" /><path d="M5.5 11V9" /><path d="M8 11V7" /><path d="M10.5 11V5" /></>,
  'harvest': <><path d="M3 3C3 3 5 7 5 10C5 12 4 14 4 14" /><path d="M13 3C13 3 11 7 11 10C11 12 12 14 12 14" /><path d="M5 6h6" /></>,
  'history': <><circle cx="8" cy="8" r="5.5" /><polyline points="8,4 8,8 11,9.5" /></>,
  'home': <><path d="M3 14V6l5-4.5L13 6v8" /><path d="M6.5 14v-4h3v4" /></>,
  'hub': <><rect x="1.5" y="1.5" width="5" height="5" rx="1" /><rect x="9.5" y="1.5" width="5" height="5" rx="1" /><rect x="1.5" y="9.5" width="5" height="5" rx="1" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /></>,
  'inventory': <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M2.5 6h11" /><path d="M6 2.5v3.5" /><path d="M6 9.5h4v4" /></>,
  'lab': <><path d="M6.5 1.5H9.5" /><path d="M7 1.5V5.5L3.5 11.5C3 12.5 3.7 14 5 14H11C12.3 14 13 12.5 12.5 11.5L9 5.5V1.5" /><path d="M4.5 11h7" /></>,
  'materials': <><circle cx="8" cy="4" r="2.5" /><path d="M8 6.5v4" /><path d="M5 14l3-3.5 3 3.5" /></>,
  'menu': <><path d="M2 4h12" /><path d="M2 8h12" /><path d="M2 12h12" /></>,
  'orders': <><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="1" /><path d="M8 2v2" /></>,
  'payable': <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M6 6l4 4" /><path d="M10 6l-4 4" /></>,
  'pipeline': <><path d="M2 8h3l2-4 2 8 2-4h3" /></>,
  'plant-audit': <><path d="M8 1.5 C8 1.5 4 4.5 4 8 C4 10.2 5.8 12 8 12 C10.2 12 12 10.2 12 8 C12 4.5 8 1.5 8 1.5Z" /><path d="M6 14.5h4" /><path d="M7 12v2.5" /><path d="M9 12v2.5" /></>,
  'press-cure': <><path d="M3 5h10" /><path d="M3 11h10" /><ellipse cx="8" cy="8" rx="3" ry="1.5" /><path d="M8 2v3" /></>,
  'production': <><circle cx="4" cy="12" r="2" /><circle cx="3.5" cy="5" r="1.5" /><path d="M5.7 10.8L13.5 3.5" /><path d="M4.7 6L13.5 7" /></>,
  'prospect': <><circle cx="7" cy="6" r="2.5" /><path d="M2.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" /><path d="M12 2v4" /><path d="M10 4h4" /></>,
  'queue': <><path d="M2 4h12" /><path d="M2 8h12" /><path d="M2 12h8" /></>,
  'receivable': <><path d="M10 2H3.5C2.67 2 2 2.67 2 3.5V14l3-2 3 2 3-2 3 2V3.5C14 2.67 13.33 2 12.5 2H12" /><path d="M5.5 6h5" /><path d="M5.5 8.5h3" /></>,
  'sales': <><path d="M8 2v12" /><path d="M11 4.5H6.5C5.4 4.5 4.5 5.4 4.5 6.5C4.5 7.6 5.4 8.5 6.5 8.5H10C11.1 8.5 12 9.4 12 10.5C12 11.6 11.1 12.5 10 12.5H4.5" /></>,
  'settings': <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2" /><path d="M8 1v1.5" /><path d="M8 13.5V15" /><path d="M1 8h1.5" /><path d="M13.5 8H15" /></>,
  'summary': <><rect x="2.5" y="2" width="11" height="12" rx="1.5" /><path d="M5.5 5h5" /><path d="M5.5 7.5h5" /><path d="M5.5 10h5" strokeWidth="2" /></>,
  'templates': <><path d="M2.5 4.5H7L8 3H13.5V13H2.5V4.5Z" /><path d="M5.5 7h5" /><path d="M5.5 9.5h5" /></>,
  'trending': <><polyline points="2,11 5.5,7 8.5,9.5 14,4" /><polyline points="10,4 14,4 14,7.5" /></>,
  'user': <><circle cx="8" cy="5" r="3" /><path d="M2.5 14.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" /></>,
  'wash-dry': <><path d="M2 4h12" /><path d="M4 4v6" /><path d="M7 4v8" /><path d="M10 4v7" /><path d="M13 4v5" /></>,
};

export type IconName = keyof typeof PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number | string;
  title?: string;
}

export function Icon({ name, size = 16, title, ...rest }: IconProps) {
  const path = PATHS[name];
  if (!path) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`<Icon name="${name}"/> not found in registry`);
    }
    return null;
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title && <title>{title}</title>}
      {path}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];
