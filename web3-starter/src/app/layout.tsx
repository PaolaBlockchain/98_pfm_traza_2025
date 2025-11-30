// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Web3Provider } from '@/contexts/Web3Context';
import { ToastProvider } from '@/components/ui/toast';
import Header from '@/components/Header';
import WelcomeBanner from '@/components/WelcomeBanner';

export const metadata: Metadata = {
  title: 'Web3 Starter',
  description: 'Next.js + MetaMask (Anvil 31337) demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        className="relative min-h-screen bg-white text-gray-700 antialiased" suppressHydrationWarning
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(156,163,175,0.08),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(107,114,128,0.05),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-x-10 top-12 h-px bg-gradient-to-r from-gray-200/0 via-gray-300/80 to-gray-200/0" />
        <Web3Provider>
          <ToastProvider>
            <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 md:px-10">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 rounded-b-[56px] border border-gray-200/80 bg-white/70 shadow-sm backdrop-blur-sm" />
              <div className="pointer-events-none absolute inset-y-20 left-2 w-px bg-gradient-to-b from-gray-200/10 via-gray-400/30 to-gray-200/10" />
              <div className="pointer-events-none absolute inset-y-32 right-4 w-px bg-gradient-to-b from-gray-200/10 via-gray-400/30 to-gray-200/10" />
              <div className="relative z-10 space-y-6">
                <WelcomeBanner />
                <Header />
              </div>
              <main className="relative z-10 mt-12 flex-1 space-y-10 pb-12">{children}</main>
            </div>
          </ToastProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
