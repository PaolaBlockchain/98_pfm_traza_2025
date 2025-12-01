# DRAFT - Contenido Eliminado de CASOS_DE_USO.md

**Fecha de creación**: 2025-12-01
**Razón**: Contenido eliminado durante revisión y actualización del documento principal
**Nota**: Este contenido fue removido por ser incorrecto, redundante o no implementado

---

## SECCIÓN ELIMINADA: 13.3 - Crear Token Derivado (Retailer)

**Razón de eliminación**: El contrato NO permite a Retailer crear tokens (línea 470 de SupplyChain.sol: `if (u.rol == Roles.Retailer) revert RoleNotAllowedToCreateToken();`)

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

## SECCIÓN ELIMINADA: Referencias a /profile

**Razón de eliminación**: La página /profile no está implementada (directorio vacío)

### Del índice de páginas (líneas 163-165):
```markdown
#### **`/profile` - Perfil**
- **Información del usuario**
- **Portfolio de tokens**
```

### De estructura del proyecto (línea 419):
```markdown
└── profile/page.tsx            // Perfil del usuario
```

### Del checklist (línea 687):
```markdown
  - [ ] `/profile` - Perfil usuario
```

---

## SECCIÓN REDUCIDA: 6.2 y 6.3 - Detalles del Historial

**Razón de reducción**: Demasiado detallado para una implementación con localStorage. Se mantiene solo la estructura básica.

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

## SECCIÓN ELIMINADA: 10 - Comandos y Scripts

**Razón de eliminación**: Información redundante con 03_GUIA_TECNICA_INSTALACION.md

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

## SECCIÓN ELIMINADA: 11 - Configuración

**Razón de eliminación**: Información redundante con 03_GUIA_TECNICA_INSTALACION.md

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

## SECCIÓN ELIMINADA: Parte de 16.8 - Mención de Retailer

**Razón de eliminación**: Retailer no puede crear tokens

### De 16.8 Error: Balance y Transferencias Pendientes no Validados

~~Factory/Retailer podían intentar crear tokens sin tener balance o con transferencias pendientes.~~

Corrección: Solo Factory puede crear tokens derivados.

---

## NOTAS PARA REVISIÓN FUTURA

1. **Página /profile**: Si se decide implementar en el futuro, usar el contenido guardado aquí como referencia
2. **Retailer tokens**: El diseño original contemplaba que Retailer pudiera crear tokens, pero se decidió simplificar el flujo
3. **Sistema de historial**: Se puede expandir en el futuro migrando de localStorage a base de datos

---

**Fin del documento DRAFT**


---

## CONTENIDO ELIMINADO EN REDUCCI�N DEL 01-DIC-2025

**Objetivo**: Reducir documento de 1596 l�neas en m�s del 20%


---

## CONTENIDO ELIMINADO EN REDUCCIÓN DEL 01-DIC-2025

**Objetivo**: Reducir documento de 1596 líneas en más del 20%
**Estrategia**: Eliminar secciones de debugging, testing interno, y código de implementación

---

### ELIMINADO: SECCIÓN 6 COMPLETA - Sistema de Historial

Ver líneas 550-630 del documento original. Detalle de implementación localStorage, no caso de uso.

### ELIMINADO: SECCIÓN 11 COMPLETA - Testing Manual  

Ver líneas 750-900 del documento original. Checklist de QA interno.

### ELIMINADO: SECCIONES 15.3 y 15.4 - Errores Técnicos

Ver líneas 1180-1280 del documento original. Bugs de desarrollo ya resueltos.

### ELIMINADO: SECCIÓN 16 COMPLETA - Errores y Soluciones

Ver líneas 1280-1520 del documento original. Debugging interno de 11 errores.

### ELIMINADO: SECCIÓN 17 COMPLETA - Checklist Testing

Ver líneas 1520-1596 del documento original. Checklist de QA.

### ELIMINADO: Múltiples snippets de código Solidity y TypeScript

Código de implementación removido de secciones 3.1, 3.3, 4.2, 5.1, 5.4, 5.5, 7.2, 14.4

---

**NOTA**: Todo el contenido eliminado está disponible en el historial de Git y puede restaurarse si es necesario.

---

## CONTENIDO ELIMINADO: Secciones 5.4 y 5.5 (01-DIC-2025)

**Razón**: No implementadas en frontend. Documentadas aquí para referencia futura.

---

### 5.4 Transferir Propiedad del Contrato (Ownership)

**Estado**: ✅ Implementado en contrato | ❌ NO implementado en frontend

#### Descripción
El admin actual puede transferir la propiedad del contrato a otra dirección mediante un proceso de dos pasos para mayor seguridad.

#### Funciones del Contrato Implementadas
```solidity
// SupplyChain.sol - Líneas 240-256
function transferOwnership(address _newOwner) external onlyAdmin {
    if (_newOwner == address(0)) revert InvalidAddress();
    if (_newOwner == admin) revert AlreadyAdmin();
    pendingAdmin = _newOwner;
}

function acceptOwnership() external {
    if (msg.sender != pendingAdmin) revert NotPendingAdmin();
    address previousOwner = admin;
    admin = pendingAdmin;
    pendingAdmin = address(0);
    emit OwnershipTransferred(previousOwner, admin);
}

function cancelOwnershipTransfer() external onlyAdmin {
    pendingAdmin = address(0);
}
```

#### Precondiciones
- Admin actual conectado
- Nueva dirección válida (no address(0) ni mismo admin)

#### Flujo: Transferir Propiedad
1. Admin → panel admin
2. Ingresa dirección nuevo admin
3. Clic "Transferir propiedad"
4. transferOwnership(newAddress)
5. Contrato: pendingAdmin = newAddress
6. Puede cancelar con cancelOwnershipTransfer()

#### Flujo: Aceptar Propiedad
1. Nuevo admin conecta wallet
2. Ve notificación transferencia pendiente
3. Clic "Aceptar propiedad"
4. acceptOwnership()
5. Actualiza: admin=nuevoAdmin, pendingAdmin=address(0)
6. Evento OwnershipTransferred

#### Mensajes
> **Admin actual:** ✅ Transferencia iniciada. Dirección 0x742d...3b8 debe aceptar.
> **Nuevo admin:** ⚠️ Transferencia pendiente. El admin actual te transfirió la propiedad. [Aceptar | Rechazar]

#### Implementación Pendiente en Frontend
- ❌ UI en frontend para iniciar transferencia
- ❌ Métodos en `contractService.ts`: `transferOwnership()`, `acceptOwnership()`, `cancelOwnershipTransfer()`
- ❌ Página o modal en `/admin` para gestionar ownership
- ❌ Notificación para pending admin
- ✅ Funciones en contrato completamente implementadas

---

### 5.5 Cambiar Rol de Usuario (Admin)

**Estado**: ✅ Implementado en contrato | ❌ NO implementado en frontend

#### Descripción
El admin puede cambiar el rol de un usuario aprobado a otro rol diferente.

#### Función del Contrato Implementada
```solidity
// SupplyChain.sol - Líneas 430-443
function changeUserRole(
    address userAddress,
    Roles newRole
) external onlyAdmin {
    uint256 id = addressToUserId[userAddress];
    if (id == 0) revert UserDoesNotExist();
    
    User storage user = users[id];
    if (user.status != UserStatus.Approved) revert UserNotApproved();
    
    user.rol = newRole;
    emit UserRoleChanged(userAddress, id, newRole);
}
```

#### Evento Emitido
```solidity
event UserRoleChanged(
    address indexed user,
    uint256 indexed id,
    Roles newRole
);
```

#### Precondiciones
- Admin conectado
- Usuario objetivo APPROVED
- Rol permitido (Producer/Factory/Retailer/Consumer)

#### Flujo
1. Admin → /admin/users
2. Selecciona usuario aprobado
3. Clic "Cambiar rol"
4. Selecciona nuevo rol
5. Confirma
6. changeUserRole(userAddress, newRole)
7. Evento UserRoleChanged
8. Usuario ve nuevo rol inmediatamente

#### Validaciones
- ✅ Solo APPROVED pueden cambiar rol
- ✅ No cambiar a Admin
- ✅ Mantiene historial/tokens
- ⚠️ Cambiar rol afecta permisos tokens/transferencias

#### Implementación Pendiente en Frontend
- ❌ Botón "Cambiar rol" en `/admin/users`
- ❌ Modal para seleccionar nuevo rol
- ❌ Método en `contractService.ts`: `changeUserRole(address, roleId)`
- ❌ Listener para evento `UserRoleChanged`
- ❌ Actualización automática de UI al cambiar rol
- ✅ Función en contrato completamente implementada
- ✅ Evento `UserRoleChanged` definido en contrato

---

## COBERTURA DE TESTING (Documentada pero no implementada)

**Estado**: 4 tests básicos implementados de 60+ documentados

### Tests Implementados (backend/test/SupplyChain.t.sol)
1. ✅ `test_AdminIsCorrectlySet` - Verifica admin es Account #0
2. ✅ `test_IsAdminReturnsTrue` - Verifica función isAdmin()
3. ✅ `test_AdminHasUserId` - Verifica userId = 1
4. ✅ `test_AdminHasAdminRole` - Verifica rol y estado

### Tests Pendientes (60+ casos documentados en sección final)

**Casos Positivos:**
- ❌ Usuario solicita rol → PENDING
- ❌ Admin aprueba → APPROVED
- ❌ Producer crea token raíz
- ❌ Factory crea token derivado
- ❌ Transferencias válidas (Producer→Factory→Retailer→Consumer)
- ❌ Aceptar/Rechazar transferencias

**Casos Negativos:**
- ❌ No-admin intenta aprobar → NotAdmin()
- ❌ Usuario PENDING re-registra → UserAlreadyRegistered()
- ❌ Solicitar rol Admin → AdminRoleNotAllowed()
- ❌ Admin cancela cuenta → AdminCannotCancelAccount()
- ❌ Consumer crea token → RoleNotAllowedToCreateToken()
- ❌ Factory sin balance → InsufficientBalance()
- ❌ Flujos inválidos → InvalidRoleTransfer()

**Casos de Borde:**
- ❌ REJECTED vuelve a solicitar
- ❌ CANCELED puede re-solicitar
- ❌ Múltiples rechazos (3+)
- ❌ Balance = 0 post-transferencia
- ❌ Árbol trazabilidad con ciclos

**Integración:**
- ❌ Eventos escuchados correctamente
- ❌ Cancelación MetaMask (error 4001)
- ❌ Actualización UI automática
- ❌ Persistencia localStorage

**Cobertura estimada:** ~7% (4 de 60+ casos)

---

**Última actualización**: 1 de diciembre de 2025
**Nota**: Este contenido está disponible para referencia futura si se decide implementar estas funcionalidades.

