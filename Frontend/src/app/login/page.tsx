'use client';
import { useState } from 'react';
import { accounts } from '@/lib/store';
export default function Login() {
  const [email, setEmail] = useState('raven.k@transitops.in'),
    [password, setPassword] = useState('Transit@2026'),
    [err, setErr] = useState('');
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const a = accounts.find((x) => x[1] === email);
    if (!a || password !== 'Transit@2026') {
      setErr('Invalid credentials. Use the supplied demo password.');
      return;
    }
    localStorage.setItem(
      'transitops-user',
      JSON.stringify({ name: a[0], email: a[1], role: a[2], initials: a[3] }),
    );
    location.href = '/dashboard';
  };
  return (
    <main className="login">
      <section className="intro">
        <h1 className="brand">TransitOps</h1>
        <h2>Smart Transport Operations Platform</h2>
        <p>One login, five roles</p>
        <ul>
          {['Fleet Manager', 'Dispatcher', 'Driver', 'Safety Officer', 'Financial Analyst'].map(
            (x) => (
              <li key={x}>• {x}</li>
            ),
          )}
        </ul>
        <footer style={{ marginTop: 'auto' }}>TRANSITOPS © 2026 · RBAC ENABLED</footer>
      </section>
      <section className="loginform">
        <h1>Sign in to your account</h1>
        <p className="sub">Access is scoped to your operational role.</p>
        <form className="form" onSubmit={go}>
          <label className="field">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
            />
          </label>
          {err && <div className="notice">{err}</div>}
          <button className="button orange">Sign In</button>
        </form>
        <p className="sub">Demo accounts</p>
        <div className="grid">
          {accounts.map((a) => (
            <button
              className="button"
              key={a[1]}
              onClick={() => {
                setEmail(a[1]);
                setPassword('Transit@2026');
              }}
            >
              {a[0]} — {a[2].replace('_', ' ')}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
