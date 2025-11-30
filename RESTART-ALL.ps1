#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de reinicio completo del sistema de cadena de suministro blockchain.

.DESCRIPTION
    Este script automatiza el proceso completo de reinicio del sistema, incluyendo:
    - Detención de procesos existentes (Node.js, Anvil)
    - Limpieza de caché de Next.js y navegador
    - Reseteo de permisos de MetaMask y localStorage
    - Inicio de Anvil (blockchain local)
    - Compilación del smart contract
    - Actualización del ABI en el frontend
    - Despliegue del contrato en Anvil
    - Inicio del servidor Next.js

.PARAMETER None
    Este script no acepta parámetros. Ejecuta todos los pasos en secuencia.

.EXAMPLE
    .\RESTART-ALL.ps1
    
    Ejecuta el reinicio completo del sistema.

.NOTES
    Autor: Sistema de Cadena de Suministro
    Requiere: 
    - PowerShell 5.1 o superior
    - Foundry (forge) instalado y en PATH
    - Node.js y npm instalados
    - Anvil instalado (parte de Foundry)
    
    IMPORTANTE:
    - Este script mata procesos de Node.js y Anvil. Cierra cualquier aplicación que los use.
    - El script abre ventanas nuevas de PowerShell para Anvil y Next.js.
    - Se requiere que Anvil esté disponible en el PATH.
    - El contrato se despliega con la clave privada de Anvil Account 0 (solo para desarrollo).

.LINK
    Documentación del proyecto: README.md
#>

# ============================================================================
# CONFIGURACIÓN Y VARIABLES
# ============================================================================

# Dirección del contrato desplegado (hardcodeada para desarrollo local)
# NOTA: Esta dirección puede cambiar si se modifica el script de despliegue
$CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Clave privada de Anvil Account 0 (solo para desarrollo local)
# ADVERTENCIA: Nunca uses esta clave en producción o en mainnet
$ANVIL_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# URLs de los servicios
$ANVIL_RPC_URL = "http://localhost:8545"
$FRONTEND_URL = "http://192.168.1.13:3000"
$FRONTEND_LOCAL_URL = "http://localhost:3000"

# Rutas de directorios
$BACKEND_DIR = ".\backend"
$FRONTEND_DIR = ".\web3-starter"
$NEXT_CACHE_DIR = ".\web3-starter\.next"
$NODE_CACHE_DIR = ".\web3-starter\node_modules\.cache"

# Rutas de ABI
$ABI_SOURCE = ".\out\SupplyChain.sol\SupplyChain.json"
$ABI_DESTINATION = "..\web3-starter\src\contracts\SupplyChain.json"

# ============================================================================
# INICIO DEL SCRIPT
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REINICIO COMPLETO DEL SISTEMA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PASO 1: DETENER PROCESOS EXISTENTES
# ============================================================================
# 
# Por qué es necesario:
# - Evita conflictos de puertos (3000 para Next.js, 8545 para Anvil)
# - Asegura que no haya instancias antiguas ejecutándose
# - Libera recursos del sistema
#
# Qué hace:
# - Mata todos los procesos de Node.js (incluye Next.js)
# - Mata todos los procesos de Anvil (blockchain local)
# - Espera 2 segundos para asegurar que los procesos terminen
# ============================================================================

Write-Host "[1/7] Deteniendo procesos existentes..." -ForegroundColor Yellow

# Matar procesos de Node.js (Next.js y otros servicios Node)
# /F = Forzar terminación, /IM = Nombre de imagen
# 2>$null = Suprimir errores si el proceso no existe
taskkill /F /IM node.exe 2>$null | Out-Null

# Matar procesos de Anvil (blockchain local)
taskkill /F /IM anvil.exe 2>$null | Out-Null

# Esperar para asegurar que los procesos terminen completamente
Start-Sleep -Seconds 2

Write-Host "[OK] Procesos detenidos" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PASO 2: LIMPIAR CACHÉ Y RESETEAR NAVEGADOR
# ============================================================================
#
# Por qué es necesario:
# - Next.js cachea compilaciones que pueden causar errores
# - El navegador cachea JavaScript y puede usar versiones antiguas
# - MetaMask mantiene permisos y conexiones que pueden causar conflictos
# - localStorage puede tener datos obsoletos
#
# Qué hace:
# - Elimina el directorio .next de Next.js (caché de compilación)
# - Elimina node_modules/.cache si existe
# - Crea y abre un HTML temporal que:
#   * Revoca permisos de MetaMask
#   * Limpia localStorage y sessionStorage
#   * Se cierra automáticamente
# ============================================================================

Write-Host "[2/7] Limpiando caché y reseteando navegador..." -ForegroundColor Yellow

# Limpiar caché de compilación de Next.js
# El directorio .next contiene archivos compilados y optimizados
# Eliminarlo fuerza a Next.js a recompilar todo desde cero
if (Test-Path $NEXT_CACHE_DIR) {
    Remove-Item -Path $NEXT_CACHE_DIR -Recurse -Force
    Write-Host "   - Caché de Next.js eliminado" -ForegroundColor Gray
}

# Limpiar caché de node_modules si existe
# Algunos paquetes pueden cachear datos aquí
if (Test-Path $NODE_CACHE_DIR) {
    Remove-Item -Path $NODE_CACHE_DIR -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   - Caché de node_modules eliminado" -ForegroundColor Gray
}

# Crear página HTML temporal para resetear MetaMask y almacenamiento del navegador
# Esta página se abre automáticamente, ejecuta JavaScript para limpiar todo,
# y se cierra sola después de 2 segundos
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
                // Esto desconecta todas las cuentas conectadas
                if (window.ethereum) {
                    try {
                        await window.ethereum.request({
                            method: "wallet_revokePermissions",
                            params: [{ eth_accounts: {} }]
                        });
                    } catch (e) {
                        // Ignorar si MetaMask no soporta revokePermissions
                        // (versiones antiguas de MetaMask)
                    }
                }
                
                // Limpiar todo el almacenamiento local del navegador
                // Esto incluye localStorage y sessionStorage
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
        
        // Ejecutar al cargar la página
        resetAll();
    </script>
</body>
</html>
"@

# Guardar el HTML temporal
$resetFile = "$FRONTEND_DIR\reset-temp.html"
$resetHtml | Out-File -FilePath $resetFile -Encoding UTF8

# Abrir en el navegador predeterminado para ejecutar el reset
# El navegador ejecutará el JavaScript que limpia todo
Start-Process $resetFile
Start-Sleep -Seconds 4  # Esperar a que el navegador ejecute el script

# Eliminar el archivo temporal después de usarlo
Remove-Item -Path $resetFile -Force -ErrorAction SilentlyContinue

# Mensajes adicionales para el usuario
Write-Host "   - IMPORTANTE: Cierra todas las pestañas de localhost:3000" -ForegroundColor Yellow
Write-Host "   - Usa modo incógnito o borra caché del navegador (Ctrl+Shift+Del)" -ForegroundColor Yellow

Write-Host "[OK] Caché y navegador reseteados" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PASO 3: INICIAR ANVIL (BLOCKCHAIN LOCAL)
# ============================================================================
#
# Por qué es necesario:
# - Anvil es una blockchain local de desarrollo (fork de Hardhat Network)
# - Permite probar smart contracts sin usar testnets o mainnet
# - Proporciona cuentas pre-fundadas para desarrollo
# - Es necesario antes de desplegar el contrato
#
# Qué hace:
# - Abre una nueva ventana de PowerShell
# - Ejecuta el comando 'anvil' que inicia el servidor blockchain
# - El servidor escucha en http://localhost:8545
# - Chain ID: 31337 (por defecto)
#
# NOTA: Anvil debe estar instalado (parte de Foundry)
# ============================================================================

Write-Host "[3/7] Iniciando Anvil..." -ForegroundColor Yellow

# Iniciar Anvil en una nueva ventana de PowerShell
# -NoExit: Mantiene la ventana abierta para ver los logs
# -Command: Comando a ejecutar (muestra título y ejecuta anvil)
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Write-Host "=== ANVIL BLOCKCHAIN ===" -ForegroundColor Cyan; anvil'

# Esperar a que Anvil inicie completamente
Start-Sleep -Seconds 3

Write-Host "[OK] Anvil iniciado" -ForegroundColor Green
Write-Host "   - RPC URL: $ANVIL_RPC_URL" -ForegroundColor Gray
Write-Host "   - Chain ID: 31337" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# PASO 4: COMPILAR SMART CONTRACT
# ============================================================================
#
# Por qué es necesario:
# - Compila el código Solidity a bytecode ejecutable
# - Genera el ABI (Application Binary Interface) necesario para el frontend
# - Detecta errores de compilación antes del despliegue
# - Debe ejecutarse antes de copiar el ABI y desplegar
#
# Qué hace:
# - Ejecuta 'forge build' en el directorio backend
# - Compila todos los contratos en src/
# - Genera archivos en out/ (bytecode y ABI)
# - Verifica que la compilación sea exitosa
#
# NOTA: Si la compilación falla, el script se detiene
# ============================================================================

Write-Host "[4/7] Compilando contrato..." -ForegroundColor Yellow

# Cambiar al directorio backend donde están los contratos
cd $BACKEND_DIR

# Compilar el contrato usando Foundry
# 2>&1 | Out-Null: Suprime la salida (solo queremos saber si fue exitoso)
forge build 2>&1 | Out-Null

# Verificar el código de salida
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Contrato compilado" -ForegroundColor Green
    Write-Host "   - Bytecode generado en: out/SupplyChain.sol/" -ForegroundColor Gray
    Write-Host "   - ABI generado en: out/SupplyChain.sol/SupplyChain.json" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Error al compilar el contrato" -ForegroundColor Red
    Write-Host "   - Revisa los errores de compilación en el código Solidity" -ForegroundColor Yellow
    cd ..
    exit 1
}

Write-Host ""

# ============================================================================
# PASO 5: COPIAR ABI ACTUALIZADO AL FRONTEND
# ============================================================================
#
# Por qué es necesario:
# - El ABI (Application Binary Interface) define cómo interactuar con el contrato
# - El frontend necesita el ABI para llamar funciones del contrato
# - Si el contrato cambia, el ABI debe actualizarse
# - Sin el ABI actualizado, el frontend no puede usar nuevas funciones
#
# Qué hace:
# - Copia SupplyChain.json desde backend/out/ al frontend
# - Sobrescribe el ABI anterior con el nuevo
# - Verifica que el archivo fuente exista antes de copiar
# - Muestra advertencia si no se encuentra el ABI
#
# RUTAS:
# - Origen: backend/out/SupplyChain.sol/SupplyChain.json
# - Destino: web3-starter/src/contracts/SupplyChain.json
# ============================================================================

Write-Host "[5/7] Copiando ABI actualizado..." -ForegroundColor Yellow

# Definir rutas (relativas al directorio backend donde estamos)
$abiSource = $ABI_SOURCE
$abiDest = $ABI_DESTINATION

# Verificar que el ABI compilado existe
if (Test-Path $abiSource) {
    # Copiar el ABI al frontend
    # -Force: Sobrescribe el archivo si ya existe
    Copy-Item -Path $abiSource -Destination $abiDest -Force
    
    Write-Host "[OK] ABI copiado a frontend" -ForegroundColor Green
    Write-Host "   - Origen: $abiSource" -ForegroundColor Gray
    Write-Host "   - Destino: $abiDest" -ForegroundColor Gray
} else {
    Write-Host "[ADVERTENCIA] No se encontró el ABI compilado" -ForegroundColor Yellow
    Write-Host "   - Verifica que forge build se ejecutó correctamente" -ForegroundColor Yellow
    Write-Host "   - Ruta esperada: $abiSource" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# PASO 6: DESPLEGAR CONTRATO EN ANVIL
# ============================================================================
#
# Por qué es necesario:
# - El contrato debe estar desplegado en la blockchain para ser usado
# - Anvil es una blockchain local, así que el despliegue es instantáneo
# - Cada vez que Anvil se reinicia, el contrato debe redesplegarse
# - El frontend necesita la dirección del contrato desplegado
#
# Qué hace:
# - Ejecuta el script de despliegue (Deploy.s.sol)
# - Despliega el contrato en Anvil usando la cuenta 0
# - Usa la clave privada de Anvil Account 0 (solo desarrollo)
# - Verifica que el despliegue sea exitoso
#
# NOTA: La dirección del contrato está hardcodeada porque Anvil siempre
#       despliega en la misma dirección si se usa la misma cuenta y nonce
# ============================================================================

Write-Host "[6/7] Desplegando contrato..." -ForegroundColor Yellow

# Desplegar el contrato usando el script de Foundry
# --rpc-url: URL de Anvil (blockchain local)
# --broadcast: Envía la transacción (no es simulación)
# --private-key: Clave privada de Account 0 de Anvil (solo desarrollo)
# 2>&1 | Out-Null: Suprime la salida
forge script script/Deploy.s.sol --rpc-url $ANVIL_RPC_URL --broadcast --private-key $ANVIL_PRIVATE_KEY 2>&1 | Out-Null

# Verificar que el despliegue fue exitoso
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Contrato desplegado" -ForegroundColor Green
    Write-Host "   - Contrato: $CONTRACT_ADDRESS" -ForegroundColor Cyan
    Write-Host "   - Blockchain: Anvil Local (Chain ID: 31337)" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Error al desplegar el contrato" -ForegroundColor Red
    Write-Host "   - Verifica que Anvil esté ejecutándose" -ForegroundColor Yellow
    Write-Host "   - Revisa los logs de Anvil para más detalles" -ForegroundColor Yellow
    cd ..
    exit 1
}

# Volver al directorio raíz
cd ..

Write-Host ""

# ============================================================================
# PASO 7: INICIAR SERVIDOR NEXT.JS
# ============================================================================
#
# Por qué es necesario:
# - Next.js es el framework del frontend
# - El servidor de desarrollo compila y sirve la aplicación
# - Debe iniciarse después de que el contrato esté desplegado
# - El frontend necesita el contrato desplegado para funcionar
#
# Qué hace:
# - Abre una nueva ventana de PowerShell
# - Cambia al directorio web3-starter
# - Ejecuta 'npm run dev' para iniciar el servidor de desarrollo
# - El servidor escucha en http://localhost:3000
#
# NOTA: Next.js puede tardar unos segundos en compilar la primera vez
# ============================================================================

Write-Host "[7/7] Iniciando Next.js..." -ForegroundColor Yellow

# Iniciar Next.js en una nueva ventana de PowerShell
# -NoExit: Mantiene la ventana abierta para ver los logs
# -Command: Cambia al directorio y ejecuta npm run dev
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd web3-starter; Write-Host '=== NEXT.JS FRONTEND ===' -ForegroundColor Cyan; npm run dev"

# Esperar a que Next.js inicie
Start-Sleep -Seconds 5

Write-Host "[OK] Next.js iniciado" -ForegroundColor Green
Write-Host "   - URL Local: $FRONTEND_LOCAL_URL" -ForegroundColor Gray
Write-Host "   - URL Red: $FRONTEND_URL" -ForegroundColor Gray
Write-Host "   - Nota: Puede tardar unos segundos más en compilar" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# RESUMEN FINAL
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SISTEMA INICIADO CORRECTAMENTE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "INFORMACIÓN DEL SISTEMA:" -ForegroundColor Yellow
Write-Host "  - Anvil: $ANVIL_RPC_URL (Chain ID: 31337)" -ForegroundColor White
Write-Host "  - Contrato: $CONTRACT_ADDRESS" -ForegroundColor White
Write-Host "  - Admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Account 0)" -ForegroundColor White
Write-Host "  - Frontend Local: $FRONTEND_LOCAL_URL" -ForegroundColor White
Write-Host "  - Frontend Red: $FRONTEND_URL" -ForegroundColor White
Write-Host "  - ABI: Actualizado automáticamente desde backend/out" -ForegroundColor White
Write-Host ""

Write-Host "PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Espera 10 segundos más a que Next.js compile completamente" -ForegroundColor White
Write-Host "  2. Abre Chrome en MODO INCÓGNITO (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "     - El modo incógnito evita problemas de caché" -ForegroundColor Gray
Write-Host "  3. Ve a: $FRONTEND_URL" -ForegroundColor White
Write-Host "  4. Conecta MetaMask a Anvil Local (Chain ID: 31337)" -ForegroundColor White
Write-Host "  5. Los usuarios deben conectar MetaMask y solicitar su rol" -ForegroundColor White
Write-Host "  6. El admin (Account 0) debe aprobar las solicitudes" -ForegroundColor White
Write-Host ""

Write-Host "CUENTAS DE ANVIL DISPONIBLES:" -ForegroundColor Yellow
Write-Host "  - Account 0 (Admin)   : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" -ForegroundColor Cyan
Write-Host "  - Account 1           : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8" -ForegroundColor White
Write-Host "  - Account 2           : 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" -ForegroundColor White
Write-Host "  - Account 3           : 0x90F79bf6EB2c4f870365E785982E1f101E93b906" -ForegroundColor White
Write-Host "  - Account 4           : 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" -ForegroundColor White
Write-Host ""
Write-Host "  NOTA: Todas las cuentas tienen 10,000 ETH para pruebas" -ForegroundColor Gray
Write-Host ""

Write-Host "NOTA IMPORTANTE:" -ForegroundColor Red
Write-Host "  - Los usuarios deben registrarse manualmente desde la web" -ForegroundColor White
Write-Host "  - El admin debe aprobar las solicitudes desde /admin/users" -ForegroundColor White
Write-Host "  - Este script es solo para desarrollo local" -ForegroundColor White
Write-Host ""

Write-Host "Script completado. Las ventanas de Anvil y Next.js deberían estar abiertas." -ForegroundColor Green
Write-Host ""

# ============================================================================
# NOTAS ADICIONALES
# ============================================================================
#
# TROUBLESHOOTING:
#
# 1. Si Anvil no inicia:
#    - Verifica que Foundry esté instalado: forge --version
#    - Verifica que Anvil esté en el PATH
#    - Revisa la ventana de PowerShell de Anvil para errores
#
# 2. Si el contrato no se despliega:
#    - Verifica que Anvil esté ejecutándose (puerto 8545)
#    - Revisa los logs de Anvil para errores
#    - Verifica que el script Deploy.s.sol exista
#
# 3. Si Next.js no inicia:
#    - Verifica que Node.js esté instalado: node --version
#    - Verifica que npm esté instalado: npm --version
#    - Verifica que las dependencias estén instaladas: npm install
#
# 4. Si el frontend no puede conectar al contrato:
#    - Verifica que el ABI se haya copiado correctamente
#    - Verifica que la dirección del contrato sea correcta
#    - Verifica que MetaMask esté conectado a Anvil Local
#
# 5. Si hay errores de compilación:
#    - Revisa los errores en la salida de forge build
#    - Verifica que todos los imports estén correctos
#    - Verifica que la versión de Solidity sea compatible
#
# ============================================================================

# Comentado para ejecución no interactiva
# Si quieres que el script espere antes de cerrar, descomenta estas líneas:
# Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
# $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
