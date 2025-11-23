# 🧪 Guía de Testing - Usuarios de Prueba

## ⚡ Inicio Rápido

### 1. Iniciar el Sistema Completo

```powershell
.\RESTART-ALL.ps1
```

Este script hace:
1. ✅ Detiene procesos anteriores (Node.js, Anvil)
2. ✅ Limpia caché de Next.js
3. ✅ Inicia blockchain local (Anvil)
4. ✅ Despliega el contrato SupplyChain
5. ✅ **Registra 4 usuarios de prueba en estado PENDING**
6. ✅ Inicia el frontend Next.js

**Espera ~40 segundos** para que todo esté listo.

**IMPORTANTE:** Los usuarios están registrados pero en estado **PENDING**. Necesitan ser aprobados por el admin.

## 👥 Cuentas de Prueba Disponibles

| Rol | Dirección | Account # | Estado Inicial |
|-----|-----------|-----------|----------------|
| **ADMIN** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | 0 | ✅ Aprobado (automático) |
| **PRODUCER** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | 1 | ⏳ PENDING (requiere aprobación) |
| **FACTORY** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | 2 | ⏳ PENDING (requiere aprobación) |
| **RETAILER** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | 3 | ⏳ PENDING (requiere aprobación) |
| **CONSUMER** | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | 4 | ⏳ PENDING (requiere aprobación) |

## 🎯 Casos de Prueba

### Caso 0: Aprobar Usuarios de Prueba (OBLIGATORIO PRIMERO)

1. Abre Chrome en **modo incógnito** (Ctrl+Shift+N)
2. Ve a `http://localhost:3000`
3. Conecta MetaMask con **Account 0** (ADMIN)
4. Ve a `/admin/users`
5. **Aprueba cada usuario** (PRODUCER, FACTORY, RETAILER, CONSUMER)
6. Verás el historial registrándose automáticamente
7. **Resultado esperado:**
   - ✅ 4 usuarios aprobados
   - ✅ Historial visible con acciones "requested" y "approved"

### Caso 1: Conectar como PRODUCER (Usuario Aprobado)

**Requisito:** Debes haber completado el Caso 0 primero

1. Desconecta la wallet del admin
2. Conecta MetaMask con **Account 1** (PRODUCER)
3. **Resultado esperado:**
   - ✅ La página te redirige a `/dashboard`
   - ✅ Ves tu información: cuenta, rol PRODUCER, estado "approved"
   - ✅ Tienes acceso a "Tokens" y "Transferencias"
   - ❌ NO ves "Acceso limitado"

### Caso 2: Conectar como Usuario No Aprobado

**Requisito:** NO aprobar al FACTORY en el Caso 0

1. Conecta MetaMask con **Account 2** (FACTORY)
2. **Resultado esperado:**
   - ⚠️ Mensaje: "Acceso limitado - Tu cuenta aún no tiene permisos"
   - ℹ️ El usuario debe esperar aprobación del admin

### Caso 3: Conectar como ADMIN

1. Conecta MetaMask con **Account 0** (ADMIN)
2. **Resultado esperado:**
   - ✅ Dashboard completo
   - ✅ Acceso adicional a `/admin/users`
   - ✅ Puede ver y gestionar todos los usuarios
   - ✅ Puede aprobar/rechazar usuarios pendientes

### Caso 4: Registrar un Nuevo Usuario (Flujo Completo)

#### Paso 1: Solicitar Registro
1. Conecta MetaMask con **Account 5** (o cualquier cuenta no registrada)
2. La app mostrará: "No estás registrado"
3. Selecciona un rol (ej: PRODUCER)
4. Haz clic en "Solicitar Registro"
5. **Resultado:**
   - ✅ Estado cambia a "pending"
   - ⚠️ Mensaje: "Acceso limitado - Espera aprobación del admin"

#### Paso 2: Aprobar como Admin
1. Desconecta la wallet en MetaMask
2. Conecta con **Account 0** (ADMIN)
3. Ve a `/admin/users`
4. Busca al nuevo usuario (Account 5)
5. Haz clic en "Aprobar"
6. Confirma la transacción en MetaMask

#### Paso 3: Verificar Acceso
1. Desconecta el admin
2. Vuelve a conectar con **Account 5**
3. Recarga la página
4. **Resultado:**
   - ✅ Ahora ves el dashboard completo
   - ✅ Estado: "approved"

### Caso 5: Rechazar un Usuario (Flujo de Rechazo)

1. Registra un nuevo usuario (Account 6)
2. Como admin, **rechaza** al usuario
3. Vuelve a conectar con Account 6
4. **Resultado:**
   - ❌ Mensaje: "Solicitud Rechazada"
   - ℹ️ Opción para realizar nueva solicitud

## 🐛 Debugging

### Problema: "Acceso limitado" para usuarios de prueba

**Diagnóstico:**
1. Abre la consola del navegador (F12)
2. Busca este log:
   ```
   ✅ Estado del contrato: approved
   ```
3. Si dice `pending` en vez de `approved`, el script de deployment no completó correctamente

**Solución:**
```powershell
# Reiniciar todo el sistema
.\RESTART-ALL.ps1
```

### Problema: MetaMask no conecta

**Solución:**
1. Verifica que Anvil esté corriendo (ventana separada debe estar visible)
2. En MetaMask, agrega la red local manualmente:
   - Network Name: `Anvil Local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

### Problema: "Transaction failed"

**Diagnóstico:**
- Puede ser un problema de nonce o gas
- Reinicia MetaMask: Settings → Advanced → Reset Account

**Solución:**
```powershell
# Reinicia todo desde cero
.\RESTART-ALL.ps1
```

## 📊 Logs Esperados en la Consola

Al conectar como PRODUCER, deberías ver:

```
🔍 Cuenta conectada desde MetaMask: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
📋 Info completa del usuario desde el contrato: {role: 1, status: 1, ...}
👑 ¿Es admin?: false
✅ Rol del contrato: PRODUCER (roleId: 1)
✅ Estado del contrato: approved (statusId: 1)
🚀 Redirigiendo a /dashboard (usuario aprobado)
```

## 🔧 Comandos Útiles

### Ver logs de Anvil
```powershell
# La ventana de Anvil muestra todas las transacciones en tiempo real
```

### Compilar contratos manualmente
```powershell
cd backend
forge build
```

### Ejecutar solo el script de deployment
```powershell
cd backend
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Ver estado del contrato
```powershell
cd backend
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "nextUserId()(uint256)" --rpc-url http://localhost:8545
```

## 📁 Estructura de Scripts

```
├── RESTART-ALL.ps1            ✅ Script principal de reinicio completo
└── backend/
    └── script/
        └── Deploy.s.sol       ⛓️ Despliega contrato y registra usuarios
```

## ✅ Checklist de Testing

Antes de considerar que todo funciona:

- [ ] El script `RESTART-ALL.ps1` se ejecuta sin errores
- [ ] Anvil está corriendo (ventana visible con logs)
- [ ] Next.js está corriendo (ventana visible con logs de compilación)
- [ ] Puedes conectar como PRODUCER y ver el dashboard completo
- [ ] Puedes conectar como FACTORY y ver el dashboard completo
- [ ] Puedes conectar como ADMIN y ver el panel de administración
- [ ] Puedes registrar un nuevo usuario desde Account 5
- [ ] Como admin, puedes aprobar al nuevo usuario
- [ ] El nuevo usuario puede acceder al dashboard después de aprobación

---

**Última actualización:** 2025-01-23  
**Estado:** ✅ Sistema consolidado y funcionando correctamente
