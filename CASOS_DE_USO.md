# Casos de Uso - Sistema de Supply Chain

## Descripción General
Sistema de gestión de usuarios con roles y estados para trazabilidad en cadena de suministro, implementado con smart contracts en Solidity y frontend en Next.js.

---

## 1. Roles del Sistema

### 1.1 Roles Disponibles

| Rol | ID | Descripción | Permisos |
|-----|----|-----------|---------| 
| **Admin** | 0 | Administrador del sistema | Control total: aprobar/rechazar usuarios, cambiar roles, gestionar permisos |
| **Producer** | 1 | Productor de materias primas | Crear y gestionar productos iniciales en la cadena |
| **Factory** | 2 | Procesador/Fabricante | Transformar materias primas en productos |
| **Retailer** | 3 | Distribuidor/Minorista | Distribución y venta de productos |
| **Consumer** | 4 | Consumidor final | Consultar trazabilidad de productos |

### 1.2 Restricciones de Roles
- ✅ Usuarios pueden solicitar: Producer, Factory, Retailer, Consumer
- ❌ Rol Admin NO puede ser solicitado por usuarios (solo asignado por contrato)
- ✅ Solo existe UN admin por contrato (Account #0 de Anvil en desarrollo)

---

## 2. Estados de Usuario

### 2.1 Máquina de Estados

```
┌──────────┐
│          │
│  NUEVO   │ (No registrado)
│          │
└────┬─────┘
     │ requestUserRole()
     ▼
┌──────────┐
│          │
│ PENDING  │ ◄────────────┐
│          │              │
└────┬─────┘              │
     │                    │
     │                    │ (Re-solicitar)
     ├─────────┬──────────┤
     │         │          │
     ▼         ▼          │
┌─────────┐ ┌──────────┐ │
│         │ │          │ │
│APPROVED │ │ REJECTED │─┘
│         │ │          │
└────┬────┘ └──────────┘
     │
     │ cancelMyAccount()
     ▼
┌──────────┐
│          │
│ CANCELED │ (Terminal)
│          │
└──────────┘
```

### 2.2 Descripción de Estados

| Estado | Valor | Descripción | Estado Terminal |
|--------|-------|-------------|----------------|
| **Pending** | 0 | Usuario registrado esperando aprobación del admin | No |
| **Approved** | 1 | Usuario activo con permisos completos | No |
| **Rejected** | 2 | Usuario rechazado por admin | No |
| **Canceled** | 3 | Usuario canceló su cuenta o fue dado de baja | Sí |

---

## 3. Casos de Uso por Estado

### 3.1 Estado: PENDING (En espera)

#### Descripción
Usuario ha enviado solicitud de rol y espera aprobación del administrador.

#### Acciones Permitidas

| Acción | Usuario | Admin | Resultado |
|--------|---------|-------|-----------|
| **Cancelar solicitud** | ✅ SÍ | ❌ NO | Estado → CANCELED |
| **Aprobar usuario** | ❌ NO | ✅ SÍ | Estado → APPROVED |
| **Rechazar usuario** | ❌ NO | ✅ SÍ | Estado → REJECTED |
| **Volver a solicitar** | ❌ NO | ❌ NO | Error: UserAlreadyRegistered |
| **Acceder a dashboard** | ❌ NO | ✅ SÍ (si es admin) | Acceso limitado |

#### Flujo del Usuario
```
1. Usuario conecta wallet con MetaMask
2. Selecciona rol (Producer, Factory, Retailer, Consumer)
3. Hace clic en "Emitir solicitud"
4. Confirma transacción en MetaMask
5. Sistema registra en blockchain con estado PENDING
6. Usuario ve mensaje: "Cola de Validación - Esperando aprobación"
7. Opciones:
   - Esperar aprobación del admin
   - Cancelar solicitud (botón "Cancelar solicitud")
```

#### Código del Contrato
```solidity
function cancelMyAccount() external {
    User storage user = users[addressToUserId[msg.sender]];
    require(user.status == UserStatus.Pending, "Solo usuarios Pending pueden cancelar");
    user.status = UserStatus.Canceled;
    emit UserStatusChanged(msg.sender, user.id, UserStatus.Canceled);
}
```

---

### 3.2 Estado: APPROVED (Aprobado)

#### Descripción
Usuario aprobado por el admin con acceso completo al sistema según su rol.

#### Acciones Permitidas

| Acción | Usuario | Admin | Resultado |
|--------|---------|-------|-----------|
| **Cancelar cuenta** | ✅ SÍ | ❌ NO | Estado → CANCELED |
| **Acceder a dashboard** | ✅ SÍ | ✅ SÍ | Acceso completo según rol |
| **Cambiar rol** | ❌ NO | ✅ SÍ | Rol actualizado |
| **Volver a solicitar** | ❌ NO | ❌ NO | Error: UserAlreadyRegistered |

#### Flujo del Usuario
```
1. Admin aprueba la solicitud desde /admin/users
2. Sistema emite evento UserStatusChanged(address, id, APPROVED)
3. Usuario recarga página o reconecta wallet
4. Sistema detecta estado APPROVED
5. Redirección automática:
   - Si rol = ADMIN → /admin/users
   - Si rol = Producer/Factory/Retailer/Consumer → /dashboard
6. Usuario puede usar todas las funcionalidades de su rol
```

#### Funcionalidades por Rol

**Producer:**
- Crear productos (materias primas)
- Registrar lotes
- Transferir a Factory

**Factory:**
- Recibir materias primas
- Procesar/transformar productos
- Transferir a Retailer

**Retailer:**
- Recibir productos procesados
- Distribuir a consumidores
- Registrar ventas

**Consumer:**
- Consultar trazabilidad
- Ver historial de producto
- Verificar autenticidad

---

### 3.3 Estado: REJECTED (Rechazado)

#### Descripción
Usuario rechazado por el administrador. Debe volver a solicitar acceso.

#### Acciones Permitidas

| Acción | Usuario | Admin | Resultado |
|--------|---------|-------|-----------|
| **Cancelar solicitud** | ❌ NO | ❌ NO | Error: InvalidTransition |
| **Volver a solicitar** | ✅ SÍ | ❌ NO | Estado → PENDING (mismo ID) |
| **Acceder a dashboard** | ❌ NO | ✅ SÍ (si es admin) | Mensaje de error: "Solicitud rechazada" |
| **Cambiar estado** | ❌ NO | ✅ SÍ | Admin puede aprobar después |

#### Flujo del Usuario
```
1. Admin rechaza solicitud desde /admin/users
2. Sistema emite evento UserStatusChanged(address, id, REJECTED)
3. Usuario ve:
   - Header: Badge rojo "❌ RECHAZADO"
   - Página principal: Alerta roja con mensaje de rechazo
   - Formulario de nueva solicitud visible inmediatamente
4. Usuario puede:
   ✅ Seleccionar un nuevo rol
   ✅ Enviar nueva solicitud (actualiza mismo registro)
   ❌ NO puede cancelar (botón no aparece)
5. Nueva solicitud → Estado cambia a PENDING
```

#### Mensajes al Usuario

**Header:**
```
❌ RECHAZADO
```

**Página Principal:**
```
❌ Tu solicitud anterior fue rechazada

La wallet 0x70997970... fue rechazada por el administrador.

Puedes enviar una nueva solicitud seleccionando un rol a continuación.
```

**Dashboard (si intenta acceder):**
```
❌ Solicitud Rechazada

Tu cuenta fue rechazada por el administrador.
No tienes permisos para acceder a este panel. 
Debes realizar una nueva solicitud desde la página principal.

[🔄 Ir a realizar nueva solicitud]
```

#### Código del Contrato - Re-registro
```solidity
function requestUserRoleById(uint8 rolId) external {
    uint256 existingId = addressToUserId[msg.sender];
    
    // Permitir re-registro si fue rechazado
    if (existingId != 0) {
        UserStatus currentStatus = users[existingId].status;
        if (currentStatus == UserStatus.Rejected) {
            // Actualizar usuario existente
            users[existingId].rol = Roles(rolId);
            users[existingId].status = UserStatus.Pending;
            emit UserRegistered(msg.sender, existingId, Roles(rolId), UserStatus.Pending);
            return;
        }
    }
    // ... crear nuevo usuario si no existe
}
```

---

### 3.4 Estado: CANCELED (Cancelado)

#### Descripción
Usuario canceló su propia cuenta o fue dado de baja. Estado terminal.

#### Acciones Permitidas

| Acción | Usuario | Admin | Resultado |
|--------|---------|-------|-----------|
| **Cancelar solicitud** | ❌ NO (ya está cancelado) | ❌ NO | Error: InvalidTransition |
| **Volver a solicitar** | ✅ SÍ | ❌ NO | Estado → PENDING (mismo ID) |
| **Acceder a dashboard** | ❌ NO | ✅ SÍ (si es admin) | Acceso limitado |
| **Cambiar estado** | ❌ NO | ✅ SÍ | Admin puede cambiar manualmente |

#### Flujo del Usuario
```
1. Usuario en estado PENDING hace clic en "Cancelar solicitud"
2. Transacción se envía al contrato: cancelMyAccount()
3. Sistema emite evento UserStatusChanged(address, id, CANCELED)
4. Usuario ve:
   - Alerta amarilla: "Solicitud cancelada"
   - Formulario de nueva solicitud visible
5. Usuario puede volver a solicitar acceso cuando desee
```

#### Mensajes al Usuario

**Alerta:**
```
Solicitud cancelada

Cancelaste tu solicitud anterior. 
Puedes volver a solicitar acceso cuando lo desees.
```

---

## 4. Matriz de Transiciones de Estado

### 4.1 Transiciones Permitidas

| Estado Actual | → Pending | → Approved | → Rejected | → Canceled |
|---------------|-----------|------------|------------|------------|
| **Pending** | ❌ | ✅ (admin) | ✅ (admin) | ✅ (usuario/admin) |
| **Approved** | ❌ | ❌ | ❌ | ✅ (usuario/admin) |
| **Rejected** | ❌* | ❌ | ❌ | ❌ |
| **Canceled** | ❌* | ❌ | ❌ | ❌ |

*Nota: Usuarios REJECTED y CANCELED pueden **volver a solicitar** (crea nuevo registro con estado PENDING usando el mismo ID).

### 4.2 Código de Validación - SupplyChainHelper.sol

```solidity
function canTransition(uint8 from, uint8 to) internal pure returns (bool) {
    // Pending -> Approved / Rejected / Canceled
    if (from == 0) {
        return (to == 1 || to == 2 || to == 3);
    }
    // Approved -> Canceled
    if (from == 1) {
        return (to == 3);
    }
    // Rejected -> NO puede cancelar (debe volver a solicitar)
    if (from == 2) {
        return false;
    }
    // Canceled -> (terminal, no hay salida)
    if (from == 3) {
        return false;
    }
    return false;
}
```

---

## 5. Casos de Uso del Admin

### 5.1 Aprobar Usuario

#### Precondiciones
- Usuario conectado debe ser admin
- Usuario objetivo debe existir en el contrato
- Usuario objetivo debe estar en estado PENDING

#### Flujo
```
1. Admin accede a /admin/users
2. Ve tabla con usuarios pendientes
3. Hace clic en botón "Aprobar" junto a un usuario
4. Sistema llama a: contractService.approveUser(address)
5. Transacción confirmada en MetaMask
6. Contrato emite: UserStatusChanged(address, id, APPROVED)
7. Tabla se actualiza automáticamente
8. Se registra en historial: { action: 'approved', adminAddress }
```

#### Código
```typescript
async approveUser(address: string) {
  const signer = await this.getSigner();
  const contractWithSigner = this.contract.connect(signer);
  const tx = await contractWithSigner.approveUser(address);
  return await tx.wait();
}
```

---

### 5.2 Rechazar Usuario

#### Precondiciones
- Usuario conectado debe ser admin
- Usuario objetivo debe existir en el contrato
- Usuario objetivo debe estar en estado PENDING

#### Flujo
```
1. Admin accede a /admin/users
2. Ve tabla con usuarios pendientes
3. Hace clic en botón "Rechazar" junto a un usuario
4. Sistema llama a: contractService.rejectUser(address)
5. Transacción confirmada en MetaMask
6. Contrato emite: UserStatusChanged(address, id, REJECTED)
7. Tabla se actualiza: Estado = "Rejected"
8. Se registra en historial: { action: 'rejected', adminAddress }
9. Sistema incrementa contador de rechazos para esa wallet
10. Si rechazos >= 2: Aparece alerta amarilla ⚠️
```

#### Alertas de Seguridad

**Alerta por múltiples rechazos:**
```
⚠️ Usuarios con múltiples rechazos

Los siguientes usuarios han sido rechazados repetidamente:
• 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 - 3 rechazos de 4 solicitudes
• 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC - 2 rechazos de 3 solicitudes
```

---

### 5.3 Ver Historial de Usuario

#### Funcionalidad
Admin puede ver historial completo de solicitudes, aprobaciones y rechazos por usuario.

#### Información Mostrada
```
Historial completo de 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

#1  23/11/2025 10:30:45 - Solicitud enviada (rol: Producer)
#2  23/11/2025 10:35:12 - Rechazado por 0xf39Fd6e51a...
#3  23/11/2025 11:00:23 - Solicitud enviada (rol: Factory)
#4  23/11/2025 11:05:50 - Rechazado por 0xf39Fd6e51a...
#5  23/11/2025 12:15:30 - Solicitud enviada (rol: Producer)
#6  23/11/2025 12:20:10 - Aprobado por 0xf39Fd6e51a...
```

#### Badges en Tabla
- 🔵 Azul: Número total de solicitudes
- 🔴 Rojo: Número de rechazos
- ✅ Verde: Aprobado

---

## 6. Sistema de Historial

### 6.1 Eventos Registrados

Cada acción queda registrada en `localStorage` con:

```typescript
interface RequestHistoryEntry {
  id: number;              // ID incremental único (1, 2, 3...)
  address: string;         // Wallet del usuario
  timestamp: number;       // Fecha/hora en milisegundos
  action: 'requested' | 'approved' | 'rejected' | 'canceled';
  roleId?: number;         // Rol solicitado (1-4)
  adminAddress?: string;   // Admin que aprobó/rechazó
}
```

### 6.2 Estadísticas por Usuario

```typescript
interface UserStats {
  totalRequests: number;    // Total de solicitudes
  approvals: number;        // Aprobaciones
  rejections: number;       // Rechazos
  cancellations: number;    // Cancelaciones
}
```

### 6.3 Ejemplo de Datos

```json
[
  {
    "id": 1,
    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "timestamp": 1732350123456,
    "action": "requested",
    "roleId": 1
  },
  {
    "id": 2,
    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "timestamp": 1732350234567,
    "action": "rejected",
    "adminAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  },
  {
    "id": 3,
    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "timestamp": 1732350345678,
    "action": "requested",
    "roleId": 1
  },
  {
    "id": 4,
    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "timestamp": 1732350456789,
    "action": "approved",
    "adminAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  }
]
```

---

## 7. Validaciones y Errores

### 7.1 Errores del Contrato

| Error | Descripción | Cuándo ocurre |
|-------|-------------|---------------|
| `NotAdmin()` | No tiene permisos de admin | Usuario intenta aprobar/rechazar |
| `UserAlreadyRegistered()` | Usuario ya registrado | Intenta registrarse estando PENDING/APPROVED |
| `UserDoesNotExist()` | Usuario no existe | Intenta consultar usuario inexistente |
| `AdminRoleNotAllowed()` | Rol admin no permitido | Usuario intenta solicitar rol Admin |
| `RoleOutOfRange()` | ID de rol inválido | RoleId > 4 o < 0 |
| `InvalidTransition()` | Transición no permitida | Intenta cancelar estando REJECTED |
| `AdminCannotCancelAccount()` | Admin no puede cancelarse | Admin intenta cancelar su cuenta |

### 7.2 Manejo de Errores en Frontend

```typescript
try {
  await contractService.requestUserRole(roleId);
  setStatus('pending');
} catch (error: any) {
  // Usuario canceló en MetaMask
  if (error?.code === 4001) {
    console.log('Usuario canceló la transacción');
    return;
  }
  
  // Usuario ya registrado
  if (error?.message?.includes('UserAlreadyRegistered')) {
    alert('Ya tienes una solicitud activa');
    return;
  }
  
  // Otros errores
  alert(`Error: ${error.message}`);
}
```

---

## 8. Flujos Completos

### 8.1 Flujo: Usuario Nuevo se Registra como Producer

```
1. Usuario abre http://localhost:3000
2. Ve pantalla: "Selecciona tu rol - Para comenzar"
3. Hace clic en "Conectar" (si no está conectado)
4. MetaMask se abre, selecciona Account #1
5. Wallet conectada: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
6. Header muestra: "0x7099...79C8 | Sin rol"
7. Selecciona "Producer" del dropdown
8. Hace clic en "Emitir solicitud"
9. MetaMask pide confirmación de transacción
10. Usuario confirma
11. Transacción minada en blockchain
12. Evento: UserRegistered(0x7099..., 1, Producer, Pending)
13. Sistema registra en historial: { id: 1, action: 'requested', roleId: 1 }
14. Página muestra: "Cola de Validación - Esperando aprobación"
15. Header muestra badge: "⏳ PENDIENTE"
16. Usuario espera aprobación del admin
```

---

### 8.2 Flujo: Admin Aprueba Usuario

```
1. Admin conecta con Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
2. Sistema detecta admin automáticamente
3. Redirección automática a /admin/users
4. Ve tabla con usuario pendiente:
   - Wallet: 0x7099...79C8
   - Rol: Producer
   - Estado: Pending
   - Historial: [1 solicitud]
5. Admin hace clic en "Aprobar"
6. MetaMask pide confirmación
7. Transacción: approveUser(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
8. Evento: UserStatusChanged(0x7099..., 1, Approved)
9. Sistema registra: { id: 2, action: 'approved', adminAddress: '0xf39Fd...' }
10. Tabla se actualiza: Estado = "Approved"
11. Usuario (si está conectado) ve cambio automático
12. Redirección a /dashboard
```

---

### 8.3 Flujo: Usuario Rechazado Vuelve a Solicitar

```
1. Usuario conecta wallet (ya rechazado anteriormente)
2. Sistema consulta contrato: getUserInfo(address)
3. Respuesta: { role: 1, status: 2 (Rejected) }
4. Web3Context establece: status = 'rejected'
5. Header muestra badge rojo: "❌ RECHAZADO"
6. Página muestra:
   - Alerta roja: "Tu solicitud anterior fue rechazada"
   - Formulario: "🔄 Nueva Solicitud de Rol"
7. Usuario selecciona "Factory" (cambia de rol)
8. Hace clic en "Emitir solicitud"
9. Contrato detecta: addressToUserId[msg.sender] = 1 (existe)
10. Verifica: users[1].status == Rejected
11. Actualiza: users[1].rol = Factory, users[1].status = Pending
12. Evento: UserRegistered(0x7099..., 1, Factory, Pending)
13. Sistema registra: { id: 3, action: 'requested', roleId: 2 }
14. Estado cambia a PENDING
15. Usuario ve: "Cola de Validación - Esperando aprobación"
```

---

## 9. Seguridad y Buenas Prácticas

### 9.1 Validaciones Implementadas

✅ **Control de acceso basado en roles**
- Solo admin puede aprobar/rechazar
- Usuarios solo pueden gestionar su propia cuenta

✅ **Validación de transiciones de estado**
- Máquina de estados estricta
- No se permiten saltos de estado inválidos

✅ **Protección del admin**
- Admin no puede ser rechazado
- Admin no puede cancelar su cuenta
- Admin no puede cambiar su propio rol

✅ **Prevención de doble registro**
- Usuario solo puede tener una cuenta activa (PENDING o APPROVED)
- Usuarios REJECTED/CANCELED pueden re-solicitar

✅ **Eventos de auditoría**
- Todos los cambios de estado emiten eventos
- Historial completo en localStorage

### 9.2 Mejoras Futuras

🔄 **Persistencia del historial**
- Migrar de localStorage a base de datos (MongoDB/PostgreSQL)
- Leer eventos directamente del blockchain

🔄 **Notificaciones**
- Email al usuario cuando es aprobado/rechazado
- Notificaciones en tiempo real con WebSockets

🔄 **Roles dinámicos**
- Admin puede crear nuevos roles
- Permisos granulares por operación

🔄 **Límite de rechazos**
- Bloquear wallets con >N rechazos
- Lista negra automática

---

## 10. Comandos y Scripts

### 10.1 Desarrollo Local

**Iniciar todo el sistema:**
```powershell
cd C:\Repo\Krypt5_Folder\proyectoFinalSolidtity\98_pfm_traza_2025
.\RESTART-ALL.ps1
```

**Solo compilar contrato:**
```powershell
cd backend
forge build
```

**Desplegar contrato:**
```powershell
cd backend
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Iniciar frontend:**
```powershell
cd web3-starter
npm run dev
```

### 10.2 Testing

**Tests unitarios del contrato:**
```powershell
cd backend
forge test -vv
```

**Test específico:**
```powershell
forge test --match-test testRequestUserRole -vvv
```

---

## 11. Configuración

### 11.1 Cuentas de Anvil (Desarrollo)

| Cuenta | Dirección | Rol | Uso |
|--------|-----------|-----|-----|
| Account #0 | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | Admin | Administrador del sistema |
| Account #1 | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | Producer | Usuario de prueba |
| Account #2 | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC | - | Disponible |
| Account #3+ | ... | - | Disponibles |

### 11.2 Contrato Desplegado

```
Network: Anvil (local)
Chain ID: 31337
RPC URL: http://localhost:8545
Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 11.3 Frontend

```
URL Local: http://localhost:3000
URL Red: http://192.168.1.13:3000
Framework: Next.js 16.0.1 (Turbopack)
Web3 Library: ethers.js v6
```

---

**Versión:** 1.0  
**Fecha:** 23 de noviembre de 2025  
**Autor:** GitHub Copilot  
**Proyecto:** Sistema de Trazabilidad Supply Chain
