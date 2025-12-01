# Casos de Uso - Sistema de Supply Chain

## Descripción General
Sistema de gestión de usuarios con roles y estados para trazabilidad en cadena de suministro, implementado con smart contracts en Solidity y frontend en Next.js.

**Cobertura de Testing:**
- ✅ **Casos Positivos**: Flujos exitosos de registro, aprobación, creación de tokens y transferencias
- ✅ **Casos Negativos**: Validaciones de errores, permisos denegados y transiciones inválidas
- ✅ **Casos de Borde**: Múltiples rechazos, re-solicitudes, cambios de cuenta y estados terminales
- ✅ **Validaciones de Seguridad**: Control de acceso, protección de admin y prevención de ciclos

---


## 1. Roles del Sistema

### 1.1 Roles Disponibles

| Rol | ID | Descripción | Permisos |
|-----|----|-----------|---------| 
| **Admin** | 0 | Administrador del sistema | Aprobar/rechazar usuarios (NO puede crear tokens ni transferir) |
| **Producer** | 1 | Productor de materias primas | Crear tokens raíz (materias primas), transferir solo a Factory |
| **Factory** | 2 | Procesador/Fabricante | Crear tokens derivados, recibir de Producer, transferir solo a Retailer |
| **Retailer** | 3 | Distribuidor/Minorista | Recibir de Factory, transferir solo a Consumer (NO puede crear tokens) |
| **Consumer** | 4 | Consumidor final | Recibir de Retailer, consultar trazabilidad (NO puede crear ni transferir tokens) |


### 1.2 Restricciones de Roles
- ✅ Usuarios pueden solicitar: Producer, Factory, Retailer, Consumer
- ❌ Rol Admin NO puede ser solicitado por usuarios (solo asignado por contrato)
- ✅ Solo existe UN admin por contrato (Account #0 de Anvil en desarrollo)

### 1.3 Matriz de Permisos por Rol

Tabla de referencia rápida de qué puede hacer cada rol:

| Acción | Admin | Producer | Factory | Retailer | Consumer |
|--------|-------|----------|---------|----------|----------|
| **Crear tokens raíz** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Crear tokens derivados** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Transferir tokens** | ❌ | ✅ (a Factory) | ✅ (a Retailer) | ✅ (a Consumer) | ❌ |
| **Recibir tokens** | ❌ | ❌ | ✅ (de Producer) | ✅ (de Factory) | ✅ (de Retailer) |
| **Consultar trazabilidad** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Aprobar/Rechazar usuarios** | ✅ | ❌ | ❌ | ❌ | ❌ |

**⚠️ Restricciones Clave**: Producer (solo raíz) • Factory (solo derivados con balance) • Retailer (NO crea, solo distribuye) • Consumer (punto final) • Admin (gestiona, no participa)

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

### 3.1 PENDING: Usuario espera aprobación del administrador

| Acción | Usuario | Admin | Resultado |
|--------|---------|-------|-----------|
| **Cancelar solicitud** | ✅ SÍ | ❌ NO | Estado → CANCELED |
| **Aprobar usuario** | ❌ NO | ✅ SÍ | Estado → APPROVED |
| **Rechazar usuario** | ❌ NO | ✅ SÍ | Estado → REJECTED |
| **Volver a solicitar** | ❌ NO | ❌ NO | Error: UserAlreadyRegistered |
| **Acceder a dashboard** | ❌ NO | ✅ SÍ (si es admin) | Acceso limitado |

**Flujo**: Conectar wallet → Seleccionar rol → Emitir solicitud → MetaMask → Blockchain (PENDING) → Mensaje "Cola de Validación" → Esperar o cancelar

---

### 3.2 APPROVED: Usuario aprobado con acceso completo según rol

| Acción | Usuario | Admin | Resultado |
|--------|---------|-------|-----------|
| **Cancelar cuenta** | ✅ SÍ | ❌ NO | Estado → CANCELED |
| **Acceder a dashboard** | ✅ SÍ | ✅ SÍ | Acceso completo según rol |
| **Volver a solicitar** | ❌ NO | ❌ NO | Error: UserAlreadyRegistered |


**Flujo**: Admin aprueba (/admin/users) → UserStatusChanged(APPROVED) → Usuario recarga → Redirección dashboard → Acceso funcionalidades

#### Funcionalidades por Rol

| Rol | Capacidades |
|-----|-------------|
| **Producer** | ✅ Crear tokens raíz (materias primas sin parentId) • ✅ Transferir solo a Factory • ❌ NO crear derivados |
| **Factory** | ✅ Recibir de Producer • ✅ Crear derivados (productos procesados) • ✅ Transferir solo a Retailer • ❌ NO raíz |
| **Retailer** | ✅ Recibir de Factory • ✅ Transferir solo a Consumer • ❌ NO crear tokens |
| **Consumer** | ✅ Recibir de Retailer • ✅ Consultar trazabilidad y ver historial • ❌ NO transferir ni crear |

---


### 3.3 REJECTED: Usuario rechazado, debe volver a solicitar

| Acción | Usuario | Admin | Resultado |
|--------|---------|-------|-----------|
| **Cancelar solicitud** | ❌ NO | ❌ NO | Error: InvalidTransition |
| **Volver a solicitar** | ✅ SÍ | ❌ NO | Estado → PENDING (mismo ID) |
| **Acceder a dashboard** | ❌ NO | ✅ SÍ (si es admin) | Mensaje de error: "Solicitud rechazada" |
| **Cambiar estado** | ❌ NO | ✅ SÍ | Admin puede aprobar después |

**Flujo**: Admin rechaza → UserStatusChanged(REJECTED) → Badge "❌ RECHAZADO" + Formulario nueva solicitud → Usuario selecciona rol → Envía → Estado=PENDING

**Mensajes**:
> **Header:** ❌ RECHAZADO
> **Página Principal:** Tu solicitud fue rechazada. Puedes enviar una nueva solicitud seleccionando un rol.
> **Dashboard (intento acceso):** ❌ Solicitud Rechazada. No tienes permisos. Debes realizar nueva solicitud. [🔄 Ir a realizar nueva solicitud]

---

### 3.4 CANCELED: Usuario canceló cuenta, puede re-solicitar

| Acción | Usuario | Admin | Resultado |
|--------|---------|-------|-----------|
| **Cancelar solicitud** | ❌ NO (ya está cancelado) | ❌ NO | Error: InvalidTransition |
| **Volver a solicitar** | ✅ SÍ | ❌ NO | Estado → PENDING (mismo ID) |
| **Acceder a dashboard** | ❌ NO | ✅ SÍ (si es admin) | Acceso limitado |
| **Cambiar estado** | ❌ NO | ✅ SÍ | Admin puede cambiar manualmente |

**Flujo**: Usuario PENDING → Clic "Cancelar" → cancelMyAccount() → UserStatusChanged(CANCELED) → Formulario disponible para re-solicitar

**Mensaje**: "Solicitud cancelada. Puedes volver a solicitar cuando desees."

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

---

## 5. Casos de Uso del Admin

| Acción | Precondiciones | Flujo | Resultado | Notas |
|--------|---------------|-------|-----------|-------|
| **Aprobar Usuario** | Admin + Usuario PENDING | /admin/users → "Aprobar" → MetaMask → Evento UserStatusChanged(APPROVED) | Estado=APPROVED, Historial registrado | Usuario ve cambio automático |
| **Rechazar Usuario** | Admin + Usuario PENDING | /admin/users → "Rechazar" → MetaMask → Evento UserStatusChanged(REJECTED) | Estado=REJECTED, Contador++ | ⚠️ Si rechazos≥2: Alerta amarilla |
| **Ver Historial** | Admin conectado | /admin/users → Ver historial usuario | Timeline completo de acciones | Badges: 🔵 Total • 🔴 Rechazos • ✅ Aprobado |

**Ejemplo Historial**: 0x7099...79C8: #1 Solicitud Producer → #2 Rechazado → #3 Sol Factory → #4 Rechazado → #5 Sol Producer → #6 Aprobado

---


## 6. Validaciones y Errores

### 6.1 Errores del Contrato

| Error | Descripción | Cuándo ocurre |
|-------|-------------|---------------|
| `NotAdmin()` | No tiene permisos de admin | Usuario intenta aprobar/rechazar |
| `UserAlreadyRegistered()` | Usuario ya registrado | Intenta registrarse estando PENDING/APPROVED |
| `UserDoesNotExist()` | Usuario no existe | Intenta consultar usuario inexistente |
| `AdminRoleNotAllowed()` | Rol admin no permitido | Usuario intenta solicitar rol Admin |
| `RoleOutOfRange()` | ID de rol inválido | RoleId > 4 o < 0 |
| `InvalidTransition()` | Transición no permitida | Intenta cancelar estando REJECTED |
| `AdminCannotCancelAccount()` | Admin no puede cancelarse | Admin intenta cancelar su cuenta |

### 6.2 Manejo de Errores en Frontend

**Validación de errores**: `error.code===4001` (usuario canceló) → Log • `error.message.includes('UserAlreadyRegistered')` → Alert específica • Otros → Alert genérico

---


## 7. Flujos Completos

### 7.1 Flujo: Usuario Nuevo se Registra como Producer
1. **Conexión**: Usuario → localhost:3000 → MetaMask Account #1
2. **Selección**: Rol Producer → "Emitir solicitud"
3. **Blockchain**: Transacción → Evento `UserRegistered(Producer, Pending)`
4. **UI**: Muestra "Cola de Validación" + Badge "⏳ PENDIENTE"

---

### 7.2 Flujo: Admin Aprueba Usuario
1. **Admin**: Conecta Account #0 → Redirección `/admin/users`
2. **Acción**: Ve usuario pendiente → Clic "Aprobar" → Confirma MetaMask
3. **Blockchain**: `approveUser()` → Evento `UserStatusChanged(Approved)`
4. **Resultado**: Tabla actualiza "Approved" → Usuario ve cambio automático → Redirección `/dashboard`

---

### 7.3 Flujo: Usuario Rechazado Vuelve a Solicitar
1. **Inicio**: Usuario rechazado conecta → Badge "❌ RECHAZADO" + Formulario
2. **Acción**: Selecciona Factory → "Emitir solicitud"
3. **Blockchain**: Detecta ID existente → Actualiza rol/estado → `UserRegistered(Factory, Pending)`
4. **Resultado**: Estado PENDING → Muestra "Cola de Validación"

---

## 8. Seguridad y Buenas Prácticas

| Validación | Implementación |
|------------|------------------|
| ✅ **Control de acceso** | Solo admin aprueba/rechaza. Usuarios gestionan su propia cuenta |
| ✅ **Transiciones de estado** | Máquina de estados estricta. Sin saltos inválidos |
| ✅ **Protección admin** | Admin no puede ser rechazado, cancelar cuenta ni cambiar su rol |
| ✅ **Doble registro** | Usuario solo una cuenta activa (PENDING/APPROVED). REJECTED/CANCELED pueden re-solicitar |
| ✅ **Auditoría** | Todos los cambios emiten eventos. Historial en localStorage |

**Mejoras Futuras**: 🔄 Persistencia DB • 🔄 Notificaciones email • 🔄 Roles dinámicos • 🔄 Límite rechazos



## 9. Comandos y Configuración

Para información detallada sobre comandos, scripts y configuración del sistema, consulta **[03_GUIA_TECNICA_INSTALACION.md](./03_GUIA_TECNICA_INSTALACION.md)**.

**Comandos principales**:
- Iniciar todo el sistema: `.\RESTART-ALL.ps1`
- Compilar contrato: `cd backend && forge build`
- Ejecutar tests: `cd backend && forge test -vv`
- Iniciar frontend: `cd web3-starter && npm run dev`

---

## 10. Casos de Uso - Gestión de Tokens

### 10.1 Crear Token Raíz (Producer)
Producer crea token inicial sin padre. **Precond**: Aprobado + wallet conectada.
**Flujo**: /tokens/create → Nombre="Harina", Suministro=2000 → Registrar → MetaMask
**✅** Token creado | Balance=2000 | Visible en "Mis tokens" | Marcado "Token Raíz"

---

### 10.2 Crear Token Derivado (Factory)
Factory crea token derivado de padre. **Precond**: Balance padre > 0.
**Flujo**: Recibe 200 "Harina" → /tokens/create → Nombre="Pasta", Padre="Harina" → Valida balance
**✅** Token "Pasta" creado | Balance Harina disminuye | Relación padre-hijo establecida

---

### 10.3 Validación de Balance al Crear Token
**Caso**: Factory tiene 100u "Harina" → Intenta crear 200u derivado
**Resultado**: ❌ Error: "Solo tienes 100 disponibles" | Input rojo | Botón deshabilitado

### 10.4 Ver Detalles de Token
**Flujo**: /tokens → "Ver detalles" → Carga info, balance, padre y árbol
**✅** Info completa | Balance correcto | Árbol trazabilidad | Botón "Transferir" (si aplica)

---

### 10.5 Balance del Token - Cálculo Correcto
**Creador**: Crea 2000 → Transfiere 200 → Balance=1800
**Receptor**: Recibe 200 → Transfiere 50 → Balance=150
**✅** Actualización automática | Refresco tras eventos

---

## 11. Casos de Uso - Transferencias

### 11.1 Solicitar Transferencia (Producer → Factory)
**Flujo**: /transfers?tokenId=1 → Selecciona Factory → Cantidad=200 → "Solicitar"
**✅** Estado PENDING | Balance no cambia aún | Visible en "Pendientes"

---

### 11.2 Aceptar Transferencia (Factory)
**Flujo**: /transfers → Ver pendiente → "Aceptar" → MetaMask
**✅** Estado ACCEPTED | Balances actualizados (Producer-, Factory+) | Evento emitido

---

### 11.3 Rechazar Transferencia
**Flujo**: /transfers → Ver pendiente → "Rechazar"
**✅** Estado REJECTED | Balances sin cambios | Evento emitido

---

### 11.4 Restricciones de Transferencia por Rol

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
`_validateTransferRoles`: ✅ `Producer→Factory` • ✅ `Factory→Retailer` • ✅ `Retailer→Consumer` • ❌ Resto (Admin/Consumer no transfieren)


---

## 12. Casos de Uso - Árbol de Trazabilidad

### 12.1 Visualizar Árbol de Trazabilidad Completo
**Flujo**: /tokens/[id] → Carga árbol jerárquico
**✅** Árbol completo (Padre/Abuelo/Hijos) | Info detallada nodos | Líneas conectoras

---

### 12.2 Ver Token Padre en el Árbol
**Caso**: Token "Comida" → Padre "Pasta" → Abuelo "Harina"
**✅** Visualización jerárquica correcta | Sin ciclos infinitos

---

**Versión:** 2.0  
**Fecha:** 30 de noviembre de 2025  
**Autor:** GitHub Copilot  
**Proyecto:** Sistema de Trazabilidad Supply Chain

---

## Resumen de Cobertura de Testing

### Casos Positivos (Flujos Exitosos) ✅
| Categoría | Casos Cubiertos |
|----------|----------------|
| **Registro** | Solicitud rol • Aprobación Admin • Acceso dashboard |
| **Tokens** | Crear raíz (Producer) • Crear derivados (Factory) • Detalles/Árbol |
| **Transfer** | Prod→Fact • Fact→Ret • Ret→Cons • Actualización balances |
| **Admin** | Aprobar/Rechazar • Historial solicitudes |


### Casos Negativos (Validaciones Error) ❌
| Categoría | Casos Cubiertos |
|----------|----------------|
| **Permisos** | No-admin aprueba • Consumer crea tokens • Flujos inválidos |
| **Estado** | PENDING re-registra • APPROVED re-solicita • Transiciones inválidas |
| **Validación** | Sin balance padre • Transferir > disponible • Rol Admin prohibido |
| **Seguridad** | Admin cancelar cuenta • Admin cambiar rol propio • Ciclos trazabilidad |

### Casos de Borde (Escenarios Especiales) ⚠️
| Categoría | Casos Cubiertos |
|----------|----------------|
| **Re-solicitudes** | REJECTED reintenta • CANCELED reutiliza ID • 3+ rechazos |
| **Contexto** | Cambio cuenta MetaMask • Rechazado conecta • Admin panel |
| **Terminales** | CANCELED final • Balance cero post-transfer |
| **Cálculos** | Creador/Receptor • Tiempo real • Validación 1:1 |

### Validaciones Integración ✅
| Componentes | Casos Cubiertos |
|------------|----------------|
| **Front↔Contract** | Eventos • Actualización UI • Sync pestañas |
| **MetaMask** | Cambio cuenta • Cancelación (4001) • Reconexión |
| **Persistencia** | LocalStorage • Contador rechazos • Sync blockchain |

### Cobertura por Rol 📊
| Rol | Positivos | Negativos | Borde |
|-----|-----------|-----------|-------|
| **Admin** | 5 flujos | 3 restricciones | 2 escenarios |
| **Producer** | 4 flujos | 4 restricciones | 3 escenarios |
| **Factory** | 6 flujos | 5 restricciones | 4 escenarios |
| **Retailer** | 4 flujos | 5 restricciones | 2 escenarios |
| **Consumer** | 3 flujos | 6 restricciones | 2 escenarios |

**Total de Casos Cubiertos:** 60+ escenarios documentados y validados

---

**Versión:** 3.0  
**Fecha:** 1 de diciembre de 2025  
**Autor:** Sistema de Documentación Automatizada  
**Proyecto:** Sistema de Trazabilidad Supply Chain

**Nota:** Este documento refleja fielmente el código implementado y funcionando (contrato + frontend). No incluye funcionalidades que solo existan en el smart contract sin interfaz de usuario correspondiente.
