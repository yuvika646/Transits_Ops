import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'TransitOps',
  description: 'Smart Transport Operations Platform',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
