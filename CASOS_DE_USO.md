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

## 12. Casos de Prueba - Testing Manual

### 12.1 Caso 0: Aprobar Usuarios de Prueba (OBLIGATORIO PRIMERO)

#### Descripción
Antes de realizar cualquier prueba, es necesario aprobar los usuarios de prueba registrados por el script de deployment.

#### Precondiciones
- Sistema iniciado con `RESTART-ALL.ps1`
- Usuarios registrados en estado PENDING

#### Pasos
1. Abre Chrome en **modo incógnito** (Ctrl+Shift+N)
2. Ve a `http://localhost:3000`
3. Conecta MetaMask con **Account 0** (ADMIN)
4. Ve a `/admin/users`
5. **Aprueba cada usuario** (PRODUCER, FACTORY, RETAILER, CONSUMER)
6. Verás el historial registrándose automáticamente

#### Resultado Esperado
- ✅ 4 usuarios aprobados
- ✅ Historial visible con acciones "requested" y "approved"

---

### 12.2 Caso 1: Conectar como PRODUCER (Usuario Aprobado)

#### Descripción
Verificar que un usuario aprobado puede acceder al dashboard completo.

#### Precondiciones
- Debes haber completado el Caso 0 primero

#### Pasos
1. Desconecta la wallet del admin
2. Conecta MetaMask con **Account 1** (PRODUCER)

#### Resultado Esperado
- ✅ La página te redirige a `/dashboard`
- ✅ Ves tu información: cuenta, rol PRODUCER, estado "approved"
- ✅ Tienes acceso a "Tokens" y "Transferencias"
- ❌ NO ves "Acceso limitado"

---

### 12.3 Caso 2: Conectar como Usuario No Aprobado

#### Descripción
Verificar que un usuario no aprobado no puede acceder al dashboard.

#### Precondiciones
- NO aprobar al FACTORY en el Caso 0

#### Pasos
1. Conecta MetaMask con **Account 2** (FACTORY)

#### Resultado Esperado
- ⚠️ Mensaje: "Acceso limitado - Tu cuenta aún no tiene permisos"
- ℹ️ El usuario debe esperar aprobación del admin

---

### 12.4 Caso 3: Conectar como ADMIN

#### Descripción
Verificar que el admin tiene acceso completo al sistema.

#### Pasos
1. Conecta MetaMask con **Account 0** (ADMIN)

#### Resultado Esperado
- ✅ Dashboard completo
- ✅ Acceso adicional a `/admin/users`
- ✅ Puede ver y gestionar todos los usuarios
- ✅ Puede aprobar/rechazar usuarios pendientes

---

### 12.5 Caso 4: Registrar un Nuevo Usuario (Flujo Completo)

#### Descripción
Flujo completo de registro de un nuevo usuario desde la solicitud hasta la aprobación.

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

---

### 12.6 Caso 5: Rechazar un Usuario (Flujo de Rechazo)

#### Descripción
Verificar el flujo de rechazo de un usuario.

#### Pasos
1. Registra un nuevo usuario (Account 6)
2. Como admin, **rechaza** al usuario
3. Vuelve a conectar con Account 6

#### Resultado Esperado
- ❌ Mensaje: "Solicitud Rechazada"
- ℹ️ Opción para realizar nueva solicitud

---

## 13. Casos de Uso - Gestión de Tokens

### 13.1 Crear Token Raíz (Producer)

#### Descripción
Un Producer crea un token inicial (sin padre) que representa una materia prima.

#### Precondiciones
- Usuario con rol Producer aprobado
- Wallet conectada

#### Flujo
```
1. Producer accede a /tokens/create
2. Completa el formulario:
   - Nombre: "Harina"
   - Suministro Total: 2000
   - Metadatos: {"lote":"A", "peso":"1kg"}
   - Token padre: Sin padre (token raíz)
3. Hace clic en "Registrar token"
4. Confirma transacción en MetaMask
5. Token creado con ID único
```

#### Resultado Esperado
- ✅ Token creado exitosamente
- ✅ Balance del Producer = Suministro Total (2000)
- ✅ Token aparece en "Mis tokens"
- ✅ Token marcado como "Token Raíz"

#### Validaciones del Contrato
- Producer solo puede crear tokens raíz (parentId = 0)
- Suministro Total > 0
- Usuario debe estar Approved

---

### 13.2 Crear Token Derivado (Factory)

#### Descripción
Un Factory crea un token derivado a partir de un token padre recibido.

#### Precondiciones
- Factory tiene balance > 0 de un token padre
- Factory aprobado

#### Flujo
```
1. Factory recibe transferencia de token "Harina" (200 unidades)
2. Factory accede a /tokens/create
3. Completa el formulario:
   - Nombre: "Pasta"
   - Suministro Total: 300
   - Metadatos: {"tipo":"pasta", "peso":"500g"}
   - Token padre: Selecciona "Harina"
4. Sistema valida:
   - Balance disponible: 200
   - Cantidad a crear: 300
   - Validación: 300 <= 200 (falla)
5. Factory ajusta a 200 o menos
6. Hace clic en "Registrar token"
7. Confirma transacción
```

#### Resultado Esperado
- ✅ Token "Pasta" creado con parentId = ID de "Harina"
- ✅ Balance del Factory en "Harina" disminuye: 200 - 300 = -100 (revertiría)
- ✅ Balance del Factory en "Pasta" = 300
- ✅ Relación padre-hijo establecida

#### Validaciones del Contrato
- Factory debe tener balance suficiente del token padre
- Relación 1:1 (1 unidad padre = 1 unidad derivada)
- Factory no puede crear tokens raíz

---

### 13.3 Crear Token Derivado (Retailer)

#### Descripción
Un Retailer crea un token derivado a partir de un token padre recibido.

#### Precondiciones
- Retailer tiene balance > 0 de un token padre
- Retailer aprobado

#### Flujo
```
1. Retailer recibe transferencia de token "Pasta" (200 unidades)
2. Retailer accede a /tokens/create
3. Completa el formulario:
   - Nombre: "Comida"
   - Suministro Total: 2
   - Token padre: Selecciona "Pasta"
4. Sistema valida balance disponible
5. Confirma transacción
```

#### Resultado Esperado
- ✅ Token "Comida" creado
- ✅ Balance del Retailer en "Pasta" disminuye: 200 - 2 = 198
- ✅ Balance del Retailer en "Comida" = 2
- ✅ Relación 1:1 mantenida

---

### 13.4 Validación de Balance al Crear Token

#### Descripción
Sistema valida que el usuario tenga balance suficiente del token padre antes de crear un token derivado.

#### Precondiciones
- Factory o Retailer con balance limitado

#### Flujo
```
1. Factory tiene 100 unidades de "Harina"
2. Intenta crear token con Suministro Total = 200
3. Sistema valida: 200 > 100
```

#### Resultado Esperado
- ❌ Error: "No puedes crear 200 tokens. Solo tienes 100 unidades disponibles del token padre"
- ✅ Input resaltado en rojo
- ✅ Botón "Registrar token" deshabilitado

---

### 13.5 Ver Detalles de Token

#### Descripción
Usuario visualiza información completa de un token específico.

#### Flujo
```
1. Usuario accede a /tokens
2. Hace clic en "Ver detalles" de un token
3. Sistema carga:
   - Información del token (ID, nombre, creador, suministro total)
   - Balance del usuario
   - Token padre (si existe)
   - Árbol de trazabilidad
```

#### Resultado Esperado
- ✅ Información completa del token visible
- ✅ Balance correcto según rol:
  - Creador: Suministro Total - Transferido
  - Otros: Recibido - Transferido
- ✅ Árbol de trazabilidad muestra padre e hijos
- ✅ Botón "Transferir tokens" (si balance > 0 y no es Consumer)

---

### 13.6 Balance del Token - Cálculo Correcto

#### Descripción
Verificar que el balance se calcula correctamente según el rol del usuario.

#### Caso: Creador del Token
```
1. Producer crea token "Harina" con Suministro Total = 2000
2. Balance inicial del Producer = 2000
3. Producer transfiere 200 a Factory
4. Balance del Producer = 2000 - 200 = 1800
```

#### Caso: Receptor del Token
```
1. Factory recibe 200 unidades de "Harina"
2. Balance inicial del Factory = 200
3. Factory transfiere 50 a Retailer
4. Balance del Factory = 200 - 50 = 150
```

#### Validaciones
- ✅ Balance se actualiza automáticamente en cada transferencia
- ✅ Balance se refresca al aceptar/rechazar transferencias
- ✅ Botón "🔄 Refrescar" disponible para actualización manual

---

## 14. Casos de Uso - Transferencias

### 14.1 Solicitar Transferencia (Producer → Factory)

#### Descripción
Producer solicita transferir tokens a Factory.

#### Precondiciones
- Producer tiene balance > 0
- Factory está aprobado
- Flujo de roles válido (Producer → Factory)

#### Flujo
```
1. Producer accede a /transfers?tokenId=1
2. Selecciona destinatario: Factory (solo ve Factories aprobados)
3. Ingresa cantidad: 200
4. Hace clic en "Solicitar Transferencia"
5. Confirma transacción en MetaMask
```

#### Resultado Esperado
- ✅ Transferencia creada con estado PENDING
- ✅ Balance del Producer NO se modifica todavía
- ✅ Factory ve la transferencia en "Pendientes"
- ✅ Producer ve la transferencia en "Historial"

---

### 14.2 Aceptar Transferencia (Factory)

#### Descripción
Factory acepta una transferencia pendiente de Producer.

#### Precondiciones
- Transferencia pendiente donde Factory es receptor
- Factory tiene permisos para aceptar

#### Flujo
```
1. Factory accede a /transfers
2. Ve transferencia pendiente de Producer
3. Hace clic en "Aceptar"
4. Confirma transacción en MetaMask
```

#### Resultado Esperado
- ✅ Transferencia cambia a estado ACCEPTED
- ✅ Balance del Producer disminuye
- ✅ Balance del Factory aumenta
- ✅ Evento TransferAccepted emitido
- ✅ Balance se actualiza automáticamente en todas las páginas

---

### 14.3 Rechazar Transferencia

#### Descripción
Receptor rechaza una transferencia pendiente.

#### Flujo
```
1. Factory accede a /transfers
2. Ve transferencia pendiente
3. Hace clic en "Rechazar"
4. Confirma transacción
```

#### Resultado Esperado
- ✅ Transferencia cambia a estado REJECTED
- ✅ Balance NO se modifica
- ✅ Evento TransferRejected emitido

---

### 14.4 Restricciones de Transferencia por Rol

#### Descripción
Validar que solo se permiten transferencias según el flujo de roles.

#### Flujos Permitidos
- ✅ Producer → Factory
- ✅ Factory → Retailer
- ✅ Retailer → Consumer

#### Flujos NO Permitidos
- ❌ Producer → Retailer (debe pasar por Factory)
- ❌ Producer → Consumer (debe pasar por Factory y Retailer)
- ❌ Factory → Producer (flujo inverso no permitido)
- ❌ Admin → Cualquiera (Admin no puede transferir)
- ❌ Cualquiera → Admin (Admin no puede recibir)
- ❌ Consumer → Cualquiera (Consumer no puede transferir)

#### Validaciones del Contrato
```solidity
function _validateTransferRoles(Roles fromRole, Roles toRole) internal pure returns (bool) {
    if (fromRole == Roles.Producer) return toRole == Roles.Factory;
    if (fromRole == Roles.Factory) return toRole == Roles.Retailer;
    if (fromRole == Roles.Retailer) return toRole == Roles.Consumer;
    return false; // Admin y Consumer NO pueden transferir
}
```

---

## 15. Casos de Uso - Árbol de Trazabilidad

### 15.1 Visualizar Árbol de Trazabilidad Completo

#### Descripción
Usuario visualiza la cadena completa de trazabilidad de un token, incluyendo su origen y transferencias.

#### Precondiciones
- Token existe en el sistema
- Usuario tiene acceso al token (balance > 0 o es creador)

#### Flujo
```
1. Usuario accede a /tokens/[id]
2. Sistema carga el árbol de trazabilidad
3. Muestra:
   - Token actual
   - Token padre (si existe)
   - Padre del padre (abuelo, si existe)
   - Transferencias recibidas y enviadas
   - Tokens hijos (si existen)
```

#### Resultado Esperado
- ✅ Árbol completo visible con estructura jerárquica
- ✅ Información de cada nodo:
  - Nombre del token
  - ID del token
  - Rol del creador (con icono y color)
  - Suministro total
  - Transferencias con detalles completos
- ✅ Líneas conectoras visuales
- ✅ Botones expandir/colapsar

---

### 15.2 Ver Token Padre en el Árbol

#### Descripción
Verificar que el árbol muestra el token padre y su propio padre (abuelo) para mostrar la cadena completa.

#### Caso de Prueba
```
Token actual: "Comida" (ID: 6)
Token padre: "Pasta" (ID: 4)
Abuelo: "Harina" (ID: 1)
```

#### Resultado Esperado
- ✅ Árbol muestra: Comida → Pasta → Harina
- ✅ Cada nivel muestra su información completa
- ✅ Transferencias de cada nivel visibles
- ✅ No hay ciclos infinitos

---

### 15.3 Error: Ciclo Detectado en Árbol de Trazabilidad

#### Descripción
Sistema previene y maneja ciclos infinitos en el árbol de trazabilidad.

#### Problema Original
- Error: "Ciclo detectado hacia arriba en token X"
- El árbol quedaba en estado "Cargando..." indefinidamente

#### Solución Implementada
1. **Separación de detección de ciclos:**
   - `visitedDown`: Previene ciclos hacia abajo (hijos)
   - `visitedUp`: Previene ciclos hacia arriba (padres)

2. **Carga simplificada del padre:**
   - Carga solo 2 niveles hacia arriba (padre y abuelo)
   - No carga recursivamente más niveles para evitar complejidad

3. **Timeout de seguridad:**
   - Timeout de 30 segundos
   - Mensaje de error si la carga tarda demasiado

#### Validaciones
- ✅ No se agrega el padre a `visitedUp` antes de cargarlo
- ✅ Se verifica ciclo antes de cargar recursivamente
- ✅ Se muestra mensaje claro si hay timeout

---

### 15.4 Error: Balance Incorrecto en Detalles del Token

#### Descripción
Verificar que el balance se muestra correctamente según el rol del usuario.

#### Problema Original
- Balance mostraba valor incorrecto
- No se actualizaba después de transferencias

#### Solución Implementada
1. **Balance desde el contrato:**
   - Se obtiene directamente de `getTokenBalance(tokenId, account)`
   - El contrato calcula correctamente: Total Supply - Transferido (creador) o Recibido - Transferido (otros)

2. **Actualización automática:**
   - Suscripción a eventos `TransferAccepted` y `TransferRejected`
   - Balance se actualiza automáticamente

3. **Botón de refresco manual:**
   - Botón "🔄 Refrescar" para actualizar balance manualmente

#### Validaciones
- ✅ Balance correcto para creador: Suministro Total - Transferido
- ✅ Balance correcto para receptores: Recibido - Transferido
- ✅ Balance se actualiza en tiempo real
- ✅ Mensaje aclaratorio para no-creadores

---

## 16. Casos de Uso - Errores y Soluciones

### 16.1 Error: MetaMask Transaction Cancelled

#### Descripción
Usuario cancela una transacción en MetaMask.

#### Comportamiento Original
- Error genérico mostrado al usuario
- No se distinguía entre cancelación y error real

#### Solución Implementada
1. **Detección de cancelación:**
   - Código de error 4001 (ACTION_REJECTED)
   - Mensajes: "user denied", "user rejected", "canceled"

2. **Mensaje amigable:**
   - Toaster de tipo "warning"
   - Mensaje: "El usuario ha cancelado la solicitud desde MetaMask"

3. **Funciones afectadas:**
   - `requestUserRole`
   - `createToken`
   - `approveUser`
   - `rejectUser`
   - `transfer`
   - `acceptTransfer`
   - `rejectTransfer`

#### Resultado Esperado
- ✅ Mensaje claro cuando el usuario cancela
- ✅ No se muestra error genérico
- ✅ Usuario puede intentar nuevamente

---

### 16.2 Error: TypeError - contractWithSigner.transfer is not a function

#### Descripción
Error al intentar crear una transferencia debido a ABI desactualizado.

#### Problema Original
- ABI del contrato no incluía la función `transfer`
- Frontend no podía llamar a la función

#### Solución Implementada
1. **Actualización del script RESTART-ALL.ps1:**
   - Agregado paso para compilar contrato (`forge build`)
   - Agregado paso para copiar ABI actualizado

2. **Fallback en ContractService:**
   - Uso de `ethers.Interface.encodeFunctionData` como fallback
   - `signer.sendTransaction` si `getFunction` falla

#### Validaciones
- ✅ ABI se actualiza automáticamente en cada deployment
- ✅ Sistema funciona incluso con ABI desactualizado (fallback)

---

### 16.3 Error: TypeError - this.contract.filters.TransferRequested is not a function

#### Descripción
Error al intentar filtrar eventos de transferencia.

#### Problema Original
- `ethers.js` v6 cambió cómo se acceden a los filtros de eventos
- ABI podría no incluir eventos correctamente

#### Solución Implementada
1. **Construcción manual de filtros:**
   - Uso de `ethers.Interface` para crear filtros manualmente
   - `provider.getLogs` como alternativa

2. **Manejo robusto:**
   - Try-catch en todos los listeners de eventos
   - No crashea la aplicación si el evento no existe

#### Validaciones
- ✅ Eventos se escuchan correctamente
- ✅ Sistema no crashea si hay problemas con eventos
- ✅ Logs informativos en consola

---

### 16.4 Error: Duplicate Approval Transaction

#### Descripción
Múltiples transacciones de aprobación para el mismo usuario causan errores.

#### Problema Original
- MetaMask tiene múltiples transacciones pendientes
- Una ya fue procesada en blockchain
- Otras fallan con `InvalidTransition` o `CALL_EXCEPTION`

#### Solución Implementada
1. **Estado de procesamiento:**
   - `processingUsers` Set para rastrear usuarios en proceso
   - Botones deshabilitados durante procesamiento

2. **Validación frontend:**
   - Verifica estado del usuario antes de enviar transacción
   - Muestra mensaje si ya está aprobado/rechazado

3. **Manejo de errores:**
   - Captura `InvalidTransition` y `CALL_EXCEPTION`
   - Mensaje: "Este usuario ya fue aprobado por otra transacción"
   - Recarga automática de usuarios

#### Validaciones
- ✅ No se pueden enviar múltiples transacciones simultáneas
- ✅ Mensajes claros cuando hay conflictos
- ✅ Lista se actualiza automáticamente

---

### 16.5 Error: Cambio de Cuenta/Rol desde MetaMask

#### Descripción
Cuando el usuario cambia de cuenta o rol desde MetaMask, el header se actualiza pero el body no.

#### Problema Original
- Header mostraba nuevo rol
- Páginas (tokens, transferencias) mostraban datos del usuario anterior
- Confusión para el usuario

#### Solución Implementada
1. **Redirección automática:**
   - `handleAccountsChanged` detecta cambio de cuenta
   - Redirige automáticamente al dashboard

2. **Detección en páginas:**
   - Cada página detecta cambios de cuenta
   - Redirige si detecta cambio

3. **Rutas de redirección:**
   - Admin → `/admin/users`
   - Otros aprobados → `/dashboard`
   - No aprobados → `/`

#### Validaciones
- ✅ Redirección automática al cambiar cuenta
- ✅ No se muestran datos del usuario anterior
- ✅ Experiencia de usuario clara

---

### 16.6 Error: Admin Aparece en Lista de Usuarios

#### Descripción
El admin aparecía en la lista de usuarios pendientes/aprobados.

#### Solución Implementada
- Filtrado de usuarios con `roleId === 0` (ADMIN)
- Admin no aparece en la tabla de usuarios

---

### 16.7 Error: Producer Puede Seleccionar Token Padre

#### Descripción
Producer podía seleccionar un token padre, pero solo debe crear tokens raíz.

#### Solución Implementada
- Dropdown "Token padre" deshabilitado para Producer
- Validación en contrato: `if (u.rol == Roles.Producer) revert InvalidParent();`

---

### 16.8 Error: Balance y Transferencias Pendientes no Validados

#### Descripción
Factory/Retailer podían intentar crear tokens sin tener balance o con transferencias pendientes.

#### Solución Implementada
1. **Validación de balance:**
   - Verifica si Factory/Retailer tiene tokens
   - Muestra mensaje si no tiene balance

2. **Validación de transferencias:**
   - Verifica transferencias pendientes donde el usuario es receptor
   - Muestra mensaje con link a `/transfers`

3. **Deshabilitación del formulario:**
   - Botón "Registrar token" deshabilitado si no hay balance

---

### 16.9 Error: Validación de Cantidad de Tokens a Crear

#### Descripción
Sistema no validaba que la cantidad de tokens a crear no excediera el balance del token padre.

#### Solución Implementada
1. **Validación en tiempo real:**
   - Carga balance del token padre seleccionado
   - Valida que `totalSupply <= parentTokenBalance`
   - Muestra error si excede

2. **Atributo max en input:**
   - Input de cantidad tiene `max={parentTokenBalance}`
   - Previene entrada de valores inválidos

3. **Mensajes informativos:**
   - Muestra balance disponible
   - Explica relación de consumo (1:1)

---

### 16.10 Error: Consumer Puede Crear Tokens

#### Descripción
Consumer tenía acceso a crear tokens, pero no debería poder hacerlo.

#### Solución Implementada
1. **Restricción en contrato:**
   - `if (u.rol == Roles.Consumer) revert RoleNotAllowedToCreateToken();`

2. **Restricción en frontend:**
   - Botones de crear token ocultos para Consumer
   - Página de creación muestra mensaje de acceso denegado

---

### 16.11 Error: Consumer Puede Transferir Tokens

#### Descripción
Consumer tenía acceso a transferir tokens, pero no debería poder hacerlo.

#### Solución Implementada
1. **Restricción en contrato:**
   - `_validateTransferRoles` retorna `false` para Consumer
   - Consumer no puede ser remitente ni destinatario

2. **Restricción en frontend:**
   - Botón "Transferir tokens" oculto para Consumer
   - Enlace "Transferencias" oculto en dashboard para Consumer

---

## 17. Checklist de Testing Completo

### 17.1 Testing de Usuarios

- [ ] El script `RESTART-ALL.ps1` se ejecuta sin errores
- [ ] Anvil está corriendo (ventana visible con logs)
- [ ] Next.js está corriendo (ventana visible con logs de compilación)
- [ ] Puedes conectar como PRODUCER y ver el dashboard completo
- [ ] Puedes conectar como FACTORY y ver el dashboard completo
- [ ] Puedes conectar como RETAILER y ver el dashboard completo
- [ ] Puedes conectar como CONSUMER y ver el dashboard completo
- [ ] Puedes conectar como ADMIN y ver el panel de administración
- [ ] Puedes registrar un nuevo usuario desde Account 5
- [ ] Como admin, puedes aprobar al nuevo usuario
- [ ] El nuevo usuario puede acceder al dashboard después de aprobación
- [ ] Admin no aparece en la lista de usuarios
- [ ] Cambio de cuenta desde MetaMask redirige al dashboard

### 17.2 Testing de Tokens

- [ ] Producer puede crear token raíz
- [ ] Producer NO puede seleccionar token padre
- [ ] Factory puede crear token derivado con token padre
- [ ] Retailer puede crear token derivado con token padre
- [ ] Consumer NO puede crear tokens (botones ocultos)
- [ ] Consumer NO puede acceder a página de creación (mensaje de acceso denegado)
- [ ] Validación de balance del token padre funciona
- [ ] Validación de cantidad no excede balance funciona
- [ ] Tokens aparecen en "Mis tokens" correctamente
- [ ] Detalles del token muestran información correcta
- [ ] Balance se calcula correctamente para creador
- [ ] Balance se calcula correctamente para receptores
- [ ] Balance se actualiza automáticamente después de transferencias
- [ ] Botón "🔄 Refrescar" funciona correctamente

### 17.3 Testing de Transferencias

- [ ] Producer puede transferir a Factory
- [ ] Factory puede transferir a Retailer
- [ ] Retailer puede transferir a Consumer
- [ ] Producer NO puede transferir a Retailer
- [ ] Producer NO puede transferir a Consumer
- [ ] Admin NO puede crear transferencias
- [ ] Admin NO puede aceptar transferencias
- [ ] Consumer NO puede transferir tokens (botón oculto)
- [ ] Consumer NO ve enlace "Transferencias" en dashboard
- [ ] Transferencias pendientes se muestran correctamente
- [ ] Aceptar transferencia actualiza balances
- [ ] Rechazar transferencia no modifica balances
- [ ] Cancelación de transacción muestra mensaje amigable

### 17.4 Testing de Trazabilidad

- [ ] Árbol de trazabilidad se carga correctamente
- [ ] Árbol muestra token padre (1 nivel)
- [ ] Árbol muestra abuelo (2 niveles hacia arriba)
- [ ] Árbol muestra transferencias recibidas
- [ ] Árbol muestra transferencias enviadas
- [ ] Árbol muestra tokens hijos
- [ ] No hay ciclos infinitos
- [ ] Timeout funciona si la carga tarda demasiado
- [ ] Iconos y colores por rol se muestran correctamente
- [ ] Información de transferencias completa (remitente, destinatario, cantidad, fecha, estado)

---

**Versión:** 2.0  
**Fecha:** 30 de noviembre de 2025  
**Autor:** GitHub Copilot  
**Proyecto:** Sistema de Trazabilidad Supply Chain
