'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutGrid,
  Target,
  UsersRound,
  ChartColumn,
  Settings2,
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: any;
  badge?: string;
};

const MOBILE_NAV: NavItem[] = [
  { label: 'Overview', href: '/app/overview', icon: LayoutGrid },
  { label: 'Campaigns', href: '/app/campaigns', icon: Target },
  { label: 'Audiences', href: '/app/audiences', icon: UsersRound, badge: 'New' },
  { label: 'Analytics', href: '/app/analytics', icon: ChartColumn },
  { label: 'Settings', href: '/app/settings', icon: Settings2 },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/app/settings') {
      return pathname === href || pathname.startsWith('/app/settings/');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="mobile-bottom-nav">
      {MOBILE_NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${active ? 'active' : ''}`}
          >
            <item.icon />
            <span>{item.label}</span>
            {item.badge && (
              <span className="mobile-nav-badge">{item.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
