'use client';
import Link from 'next/link';
import { useWallet } from '../hooks/useWallet';

export default function Header() {
  const { account } = useWallet();
  return (
    <header className="border-b bg-white">
      <nav className="max-w-4xl mx-auto p-4 flex gap-4 text-sm">
        <Link href="/">Inicio</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/profile" className="ml-auto">{account ? 'Perfil' : 'Conectar'}</Link>
      </nav>
    </header>
  );
}
