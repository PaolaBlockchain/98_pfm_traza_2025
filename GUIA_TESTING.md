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

> **Nota:** Los casos de prueba detallados han sido movidos a `CASOS_DE_USO.md` (Secciones 12-17).
> 
> Para ver los casos de prueba completos, incluyendo:
> - Casos de prueba de usuarios (Sección 12)
> - Casos de uso de tokens (Sección 13)
> - Casos de uso de transferencias (Sección 14)
> - Casos de uso de trazabilidad (Sección 15)
> - Errores y soluciones (Sección 16)
> - Checklist completo de testing (Sección 17)
>
> Consulta el archivo `CASOS_DE_USO.md`.

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
