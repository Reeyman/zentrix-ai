"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link className={`nav-item ${active ? "nav-item-active" : ""}`} href={href}>
      {children}
    </Link>
  );
}

export default function SubNav() {
  return (
    <aside className="sub-nav">
      <nav className="sub-nav-list">
        <NavLink href="/app/settings">Settings</NavLink>
        <NavLink href="/app/users">Users</NavLink>
        <NavLink href="/app/roles">Roles & Permissions</NavLink>
        <NavLink href="/app/audit">Audit Log</NavLink>
        <NavLink href="/app/integrations">Integrations</NavLink>
      </nav>
    </aside>
  );
}
