'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { label } from '@/lib/store';
import { API_URL } from '@/lib/api';
import type { Role } from '@/lib/types';

export type TransitOpsUser = {
  name: string;
  email: string;
  role: Role;
  initials: string;
  allowedPaths: string[];
};

const navigationItems = [
  ['/dashboard', 'Dashboard'],
  ['/fleet', 'Fleet'],
  ['/drivers', 'Drivers'],
  ['/trips', 'Trips'],
  ['/maintenance', 'Maintenance'],
  ['/fuel-expenses', 'Fuel & Expenses'],
  ['/analytics', 'Analytics'],
  ['/settings', 'Settings'],
];

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={'badge ' + status.toLowerCase().replaceAll('_', '-')}>{label(status)}</span>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="row between">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="sub">Gandhinagar Depot GTY Â· live mock operations data</p>
      </div>
      {children}
    </div>
  );
}

export function AppShell({ user, children }: { user: TransitOpsUser; children: ReactNode }) {
  const currentPath = typeof window === 'undefined' ? '' : location.pathname;
  const visibleNavigationItems = navigationItems.filter(([path]) =>
    user.allowedPaths.includes(path),
  );

  async function handleSignOut() {
    await fetch(`${API_URL}/api/v1/auth/sign-out`, { method: 'POST', credentials: 'include' });
    location.href = '/login';
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="brand">TransitOps</h1>
        <nav className="nav">
          {visibleNavigationItems.map(([path, name]) => (
            <Link className={currentPath === path ? 'active' : ''} href={path} key={path}>
              {name}
            </Link>
          ))}
        </nav>
        <div style={{ position: 'absolute', bottom: 20 }}>
          <button className="button danger" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <input className="search" placeholder="Search vehicles, drivers or tripsâ€¦" />
          <span>{user.name}</span>
          <StatusBadge status={user.role} />
          <span className="badge">{user.initials}</span>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
