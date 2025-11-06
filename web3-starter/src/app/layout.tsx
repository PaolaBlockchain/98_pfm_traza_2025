import './globals.css';
import { Web3Provider } from '@/contexts/Web3Context';
import Header from '@/components/Header';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Web3Provider>
          <Header />
          <main className="max-w-4xl mx-auto p-4">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
