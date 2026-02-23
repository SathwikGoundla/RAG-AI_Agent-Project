import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'DocuMind AI',
  description: 'AI-powered document intelligence platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main
            style={{
              flex: 1,
              marginLeft: 240,
              minHeight: '100vh',
              background: '#080c14',
              backgroundImage:
                'linear-gradient(rgba(124, 58, 237, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.025) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
