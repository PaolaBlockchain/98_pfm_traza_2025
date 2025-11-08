// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Web3Provider } from '../../contexts/Web3Context';
import Header from '../../components/Header';

export const metadata: Metadata = {
  title: 'Web3 Starter',
  description: 'Next.js + MetaMask (Anvil 31337) demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* suppressHydrationWarning evita errores si extensiones del navegador
         (p. ej., Grammarly) inyectan atributos en <body> antes de hidratar */}
      <body className="min-h-screen bg-gray-50 text-gray-900" suppressHydrationWarning>
        <Web3Provider>
          <Header />
          <main className="max-w-4xl mx-auto p-4">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
