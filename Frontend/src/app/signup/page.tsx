'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, postJson } from '@/lib/api';

type Form = {
  name: string;
  email: string;
  password: string;
  confirmation: string;
  organizationCode: string;
};
const initial: Form = { name: '', email: '', password: '', confirmation: '', organizationCode: '' };

export default function SignupPage() {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const update = (key: keyof Form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmation) return setError('Passwords do not match.');
    setSubmitting(true);
    try {
      await postJson('/api/v1/registration', {
        name: form.name,
        email: form.email,
        password: form.password,
        organizationCode: form.organizationCode,
      });
      router.push('/signup/pending');
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'INVALID_ORGANIZATION_CODE')
        setError('The organization code is invalid.');
      else if (caught instanceof ApiError) setError(caught.message);
      else setError('Cannot reach TransitOps. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login">
      <section className="intro">
        <h1 className="brand">TransitOps</h1>
        <h2>Request access</h2>
        <p>
          Use the private code supplied by your organization. A Fleet Manager will approve your
          account and assign one operational role.
        </p>
      </section>
      <section className="loginform">
        <h1>Create your account</h1>
        <p className="sub">New accounts cannot access operations until approved.</p>
        <form className="form" onSubmit={submit}>
          <label className="field">
            Full name
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
          </label>
          <label className="field">
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </label>
          <label className="field">
            Password
            <input
              required
              minLength={8}
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </label>
          <label className="field">
            Confirm password
            <input
              required
              type="password"
              value={form.confirmation}
              onChange={(e) => update('confirmation', e.target.value)}
            />
          </label>
          <label className="field">
            Organization code
            <input
              required
              value={form.organizationCode}
              onChange={(e) => update('organizationCode', e.target.value)}
            />
          </label>
          {error && (
            <div className="notice" role="alert">
              {error}
            </div>
          )}
          <button className="button orange" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Request account'}
          </button>
        </form>
        <p className="sub">
          <Link href="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
