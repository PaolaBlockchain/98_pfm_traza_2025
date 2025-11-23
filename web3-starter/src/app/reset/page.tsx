'use client';

export default function ResetPage() {
  const handleReset = () => {
    // Limpiar todo el localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    alert('✅ Caché del navegador limpiado. Redirigiendo a inicio...');
    
    // Redirigir a la página principal
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">🔧 Resetear Sistema</h1>
        <p className="text-sm text-gray-600 mb-6">
          Esta página limpiará completamente el caché del navegador, incluyendo:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
          <li>Datos de wallet guardados</li>
          <li>Estado de registro</li>
          <li>Historial de eventos</li>
          <li>Todos los datos de localStorage</li>
        </ul>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-xs text-yellow-700">
            ⚠️ <strong>Advertencia:</strong> Después de limpiar, deberás volver a conectar MetaMask.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          🗑️ Limpiar Todo y Reiniciar
        </button>
        <a
          href="/"
          className="block text-center mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver al inicio sin limpiar
        </a>
      </div>
    </div>
  );
}
