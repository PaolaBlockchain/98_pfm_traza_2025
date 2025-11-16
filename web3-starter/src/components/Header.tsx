'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentType } from 'react';
import { Activity } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';

const navClass =
  'group flex items-center gap-2 rounded-md border border-gray-200/70 bg-white/70 px-3 py-2 text-xs uppercase tracking-[0.35em] text-gray-500 transition-all duration-300 hover:-translate-y-[1px] hover:border-gray-300 hover:shadow-sm';

type NavConfig = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  visible: boolean;
};

export default function Header() {
  const { account, status, disconnect, connect, role } = useWallet();
  const router = useRouter();
  const isAdmin = status === 'approved' && !!account && role?.toLowerCase() === 'admin';

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const items: NavConfig[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Activity, visible: isAdmin },
  ];

  return (
    <header className="relative z-10">
      <div className="relative flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white/80 px-6 py-5 shadow-sm backdrop-blur-sm">
        {/* Sección izquierda: título e información de cuenta */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/70 text-gray-500 shadow-sm">
            <Activity className="h-4 w-4 animate-pulse" />
          </span>
          <div className="leading-snug">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-gray-400">Supply Chain</p>
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-gray-600">{account && role ? role : 'Inicio'}</p>
            {account && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[0.6rem] font-mono text-gray-500 uppercase tracking-[0.2em]">
                  {shortenAddress(account)}
                </span>
                {role && (
                  <span className="text-[0.55rem] font-mono text-blue-600 uppercase tracking-[0.25em] font-semibold">
                    {formatRole(role)}
                  </span>
                )}
                {!role && account && (
                  <span className="text-[0.5rem] font-mono text-orange-500 uppercase tracking-[0.3em]">
                    Sin rol
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sección central: botones de navegación */}
        <nav className="flex flex-wrap items-center gap-3 flex-1 justify-start mx-4">
          {items
            .filter((item) => item.visible)
            .map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={navClass}>
                <Icon className="h-3.5 w-3.5 text-gray-400 transition duration-300 group-hover:text-gray-500" />
                <span>{label}</span>
              </Link>
            ))}
        </nav>

        {/* Sección derecha: botón conectar/desconectar */}
        <div className="flex items-center flex-shrink-0">
          {!account && (
            <button onClick={connect} className={`${navClass} border-blue-300/90 bg-blue-50/90 text-blue-600 hover:border-blue-400 hover:text-blue-700`}>
              <span>Conectar</span>
            </button>
          )}
          {account && (
            <button
              onClick={() => {
                disconnect();
                router.replace('/');
              }}
              className={`${navClass} ml-1 border-red-300/90 bg-red-50/90 text-red-600 hover:border-red-400 hover:text-red-700`}
            >
              <span>Desconectar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
