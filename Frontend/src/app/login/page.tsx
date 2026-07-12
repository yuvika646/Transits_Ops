'use client';

import Link from 'next/link';
import { useState } from 'react';
import { API_URL, ApiError, api } from '@/lib/api';
import { demoAccounts, type CurrentUser } from '@/lib/auth';

function signInMessage(code?: string): string {
  if (code === 'ACCOUNT_PENDING') return 'Your account is awaiting Fleet Manager approval.';
  if (code === 'ACCOUNT_REJECTED')
    return 'This account request was rejected. Contact your Fleet Manager.';
  if (code === 'ACCOUNT_SUSPENDED') return 'This account is suspended. Contact your Fleet Manager.';
  return 'Invalid email or password.';
}

export default function Login() {
  const [email, setEmail] = useState('raven.k@transitops.in');
  const [password, setPassword] = useState('Transit@2026');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/sign-in/email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new ApiError(payload?.message ?? 'Sign in failed.', response.status, payload?.code);
      await api<CurrentUser>('/api/v1/me');
      location.href = '/dashboard';
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? signInMessage(caught.code)
          : 'Cannot reach TransitOps. Check that the backend is running.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login">
      <section className="intro">
        <h1 className="brand">TransitOps</h1>
        <h2>Smart Transport Operations Platform</h2>
        <p>One login, five roles</p>
        <ul>
          {['Fleet Manager', 'Dispatcher', 'Driver', 'Safety Officer', 'Financial Analyst'].map(
            (role) => (
              <li key={role}>• {role}</li>
            ),
          )}
        </ul>
        <footer style={{ marginTop: 'auto' }}>TRANSITOPS © 2026 · RBAC ENABLED</footer>
      </section>
      <section className="loginform">
        <h1>Sign in to your account</h1>
        <p className="sub">Access is scoped to your approved operational role.</p>
        <form className="form" onSubmit={signIn}>
          <label className="field">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <div className="notice" role="alert">
              {error}
            </div>
          )}
          <button className="button orange" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="sub">
          New to TransitOps? <Link href="/signup">Request an account</Link>
        </p>
        <p className="sub">Demo accounts</p>
        <div className="grid">
          {demoAccounts.map(([name, accountEmail, role]) => (
            <button
              type="button"
              className="button"
              key={accountEmail}
              onClick={() => {
                setEmail(accountEmail);
                setPassword('Transit@2026');
              }}
            >
              {name} — {role.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
