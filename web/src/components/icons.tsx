import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps({ size = 18, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M16 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H6.4A4.4 4.4 0 0 0 2 19.4V21" />
      <circle cx="9" cy="7.2" r="3.6" />
      <path d="M22 21v-1.6a4.4 4.4 0 0 0-3.3-4.2M16.4 3.8a3.6 3.6 0 0 1 0 6.9" />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V10H9" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <ellipse cx="12" cy="5.2" rx="7.5" ry="3.2" />
      <path d="M4.5 5.2v6.6c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2V5.2" />
      <path d="M4.5 11.8v6.6c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2v-6.6" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.4 2.4 2.4 4.8-5" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M10.3 4.1 2.8 17a1.7 1.7 0 0 0 1.5 2.6h15.4a1.7 1.7 0 0 0 1.5-2.6L13.7 4.1a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 16.5h.01" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8h.01" />
    </svg>
  );
}

export function FileSpreadsheetIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M13.5 2.5H6.8A2.3 2.3 0 0 0 4.5 4.8v14.4a2.3 2.3 0 0 0 2.3 2.3h10.4a2.3 2.3 0 0 0 2.3-2.3V8.2Z" />
      <path d="M13.5 2.5v5.7h5.8M8 12h8M8 15.5h8M8 19h5" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

export function IdCardIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.4" />
      <circle cx="8.3" cy="11" r="2.2" />
      <path d="M5.2 16c.5-1.6 1.7-2.4 3.1-2.4s2.6.8 3.1 2.4M14 9.5h4.2M14 13h4.2" />
    </svg>
  );
}
