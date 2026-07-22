import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'alert-triangle'
  | 'box'
  | 'calendar-clock'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'history'
  | 'key-round'
  | 'list-ordered'
  | 'loader'
  | 'lock'
  | 'log-out'
  | 'monitor'
  | 'moon'
  | 'refresh-cw'
  | 'server'
  | 'sliders-horizontal'
  | 'sun'
  | 'user'
  | 'wifi';

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

const PATHS: Record<IconName, ReactNode> = {
  'alert-triangle': (
    <>
      <path d="M10.3 3.9 1.8 18.1a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  box: (
    <>
      <path d="m21 8-9-5-9 5 9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  'calendar-clock': (
    <>
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h10" />
      <circle cx="17" cy="17" r="5" />
      <path d="M17 14v3l2 1" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  'key-round': (
    <>
      <path d="M2 18v3h3l9.5-9.5" />
      <circle cx="16.5" cy="7.5" r="5.5" />
    </>
  ),
  'list-ordered': (
    <>
      <path d="M10 6h11" />
      <path d="M10 12h11" />
      <path d="M10 18h11" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1-2-1" />
    </>
  ),
  loader: (
    <>
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="m4.9 4.9 2.8 2.8" />
      <path d="m16.3 16.3 2.8 2.8" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="m4.9 19.1 2.8-2.8" />
      <path d="m16.3 7.7 2.8-2.8" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  'log-out': (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3Z" />,
  'refresh-cw': (
    <>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  server: (
    <>
      <rect x="2" y="3" width="20" height="8" rx="2" />
      <rect x="2" y="13" width="20" height="8" rx="2" />
      <path d="M6 7h.01" />
      <path d="M6 17h.01" />
    </>
  ),
  'sliders-horizontal': (
    <>
      <path d="M21 4h-7" />
      <path d="M10 4H3" />
      <path d="M21 12h-9" />
      <path d="M8 12H3" />
      <path d="M21 20h-5" />
      <path d="M12 20H3" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="14" cy="20" r="2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.9 19.1 1.4-1.4" />
      <path d="m17.7 6.3 1.4-1.4" />
    </>
  ),
  user: (
    <>
      <path d="M19 21a7 7 0 0 0-14 0" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 13a10 10 0 0 1 14 0" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 9a15 15 0 0 1 20 0" />
      <path d="M12 20h.01" />
    </>
  ),
};

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  className,
  style,
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      style={style}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {PATHS[name]}
    </svg>
  );
}
