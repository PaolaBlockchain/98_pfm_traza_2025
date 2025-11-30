'use client';
import { useWallet } from '@/hooks/useWallet';

export default function WelcomeBanner() {
  const { account } = useWallet();

  if (account) return null;

  return (
    <div className="relative z-10 mb-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <span className="text-2xl">👋</span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ¡Bienvenido al Sistema de Trazabilidad!
            </h2>
            <p className="text-sm text-gray-700">
              Conecta tu wallet de MetaMask para comenzar. Necesitarás seleccionar tu rol y esperar la aprobación del administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

