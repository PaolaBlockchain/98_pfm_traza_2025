#!/usr/bin/env pwsh
# Script para reiniciar completamente el proyecto

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REINICIO COMPLETO DEL SISTEMA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Matar todos los procesos
Write-Host "[1/5] Deteniendo procesos existentes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null | Out-Null
taskkill /F /IM anvil.exe 2>$null | Out-Null
Start-Sleep -Seconds 2
Write-Host "[OK] Procesos detenidos" -ForegroundColor Green
Write-Host ""

# 2. Limpiar caché y resetear navegador
Write-Host "[2/5] Limpiando caché y reseteando navegador..." -ForegroundColor Yellow

# Limpiar caché de Next.js
$nextPath = ".\web3-starter\.next"
if (Test-Path $nextPath) {
    Remove-Item -Path $nextPath -Recurse -Force
    Write-Host "   - Caché de Next.js eliminado" -ForegroundColor Gray
}

# Limpiar node_modules/.cache si existe
$nodeCachePath = ".\web3-starter\node_modules\.cache"
if (Test-Path $nodeCachePath) {
    Remove-Item -Path $nodeCachePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   - Caché de node_modules eliminado" -ForegroundColor Gray
}

# Crear página HTML temporal para resetear MetaMask y localStorage
$resetHtml = @"
<!DOCTYPE html>
<html>
<head>
    <title>Reseteando conexión...</title>
    <style>
        body { 
            font-family: Arial; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: #1a1a2e;
            color: #eee;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: #16213e;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>🔄 Reseteando aplicación...</h2>
        <div class="spinner"></div>
        <p>Limpiando caché y permisos de MetaMask</p>
        <p style="font-size: 12px; color: #888;">Esta ventana se cerrará automáticamente</p>
    </div>
    <script>
        async function resetAll() {
            try {
                // Revocar permisos de MetaMask si está disponible
                if (window.ethereum) {
                    try {
                        await window.ethereum.request({
                            method: "wallet_revokePermissions",
                            params: [{ eth_accounts: {} }]
                        });
                    } catch (e) {
                        // Ignorar si no soporta revoke
                    }
                }
                
                // Limpiar almacenamiento
                localStorage.clear();
                sessionStorage.clear();
                
                // Cerrar ventana después de 2 segundos
                setTimeout(() => {
                    window.close();
                }, 2000);
            } catch (error) {
                console.error('Error reseteando:', error);
                setTimeout(() => window.close(), 2000);
            }
        }
        
        // Ejecutar al cargar
        resetAll();
    </script>
</body>
</html>
"@

$resetFile = ".\web3-starter\reset-temp.html"
$resetHtml | Out-File -FilePath $resetFile -Encoding UTF8

# Abrir en navegador para ejecutar el reset
Start-Process $resetFile
Start-Sleep -Seconds 4

# Eliminar archivo temporal
Remove-Item -Path $resetFile -Force -ErrorAction SilentlyContinue

# Mensaje adicional sobre limpieza manual
Write-Host "   - IMPORTANTE: Cierra todas las pestañas de localhost:3000" -ForegroundColor Yellow
Write-Host "   - Usa modo incógnito o borra caché del navegador (Ctrl+Shift+Del)" -ForegroundColor Yellow

Write-Host "[OK] Caché y navegador reseteados" -ForegroundColor Green
Write-Host ""

# 3. Iniciar Anvil
Write-Host "[3/5] Iniciando Anvil..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Write-Host "=== ANVIL BLOCKCHAIN ===" -ForegroundColor Cyan; anvil'
Start-Sleep -Seconds 3
Write-Host "[OK] Anvil iniciado" -ForegroundColor Green
Write-Host ""

# 4. Desplegar contrato
Write-Host "[4/5] Desplegando contrato..." -ForegroundColor Yellow
cd backend
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 2>&1 | Out-Null
$contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
Write-Host "[OK] Contrato desplegado" -ForegroundColor Green
Write-Host "   - Contrato: $contractAddress" -ForegroundColor Cyan
cd ..
Write-Host ""

# 5. Iniciar Next.js
Write-Host "[5/5] Iniciando Next.js..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd web3-starter; Write-Host "=== NEXT.JS FRONTEND ===" -ForegroundColor Cyan; npm run dev'
Start-Sleep -Seconds 5
Write-Host "[OK] Next.js iniciado en http://localhost:3000" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SISTEMA INICIADO CORRECTAMENTE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "INFORMACIÓN DEL SISTEMA:" -ForegroundColor Yellow
Write-Host "  - Anvil: http://localhost:8545 (Chain ID: 31337)" -ForegroundColor White
Write-Host "  - Contrato: $contractAddress" -ForegroundColor White
Write-Host "  - Admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Account 0)" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Espera 10 segundos más a que Next.js compile" -ForegroundColor White
Write-Host "  2. Abre Chrome en MODO INCÓGNITO (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "  3. Ve a: http://localhost:3000" -ForegroundColor White
Write-Host "  4. Los usuarios deben conectar MetaMask y solicitar su rol" -ForegroundColor White
Write-Host "  5. El admin (Account 0) debe aprobar las solicitudes" -ForegroundColor White
Write-Host ""
Write-Host "CUENTAS DE ANVIL DISPONIBLES:" -ForegroundColor Yellow
Write-Host "  - Account 0 (Admin)   : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" -ForegroundColor Cyan
Write-Host "  - Account 1           : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8" -ForegroundColor White
Write-Host "  - Account 2           : 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" -ForegroundColor White
Write-Host "  - Account 3           : 0x90F79bf6EB2c4f870365E785982E1f101E93b906" -ForegroundColor White
Write-Host "  - Account 4           : 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" -ForegroundColor White
Write-Host ""
Write-Host "NOTA: Los usuarios deben registrarse manualmente desde la web" -ForegroundColor Red
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

