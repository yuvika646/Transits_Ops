import Link from 'next/link';
export default function PendingSignupPage() {
  return (
    <main className="loginform">
      <h1>Account request received</h1>
      <p>
        Your account is awaiting Fleet Manager approval. You can sign in after a Fleet Manager
        assigns your operational role.
      </p>
      <Link className="button" href="/login">
        Return to sign in
      </Link>
    </main>
  );
}
