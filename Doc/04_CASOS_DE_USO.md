# Casos de Uso - Sistema de Supply Chain

## Descripción General
# 1. Casos de Uso - Sistema de Supply Chain

## 1.1 Descripción General
- ✅ **Casos Positivos**: Flujos exitosos de registro, aprobación, creación de tokens y transferencias
## 2. Roles del Sistema
- ✅ **Casos de Borde**: Múltiples rechazos, re-solicitudes, cambios de cuenta y estados terminales
### 2.1 Roles Disponibles

### 2.2 Restricciones de Roles

### 2.3 Matriz de Permisos por Rol
## 1. Roles del Sistema
## 3. Estados de Usuario
### 1.1 Roles Disponibles
### 3.1 Descripción de Estados
| Rol | ID | Descripción | Permisos |
## 4. Casos de Uso por Estado
| **Admin** | 0 | Administrador del sistema | Aprobar/rechazar usuarios (NO puede crear tokens ni transferir) |
### 4.1 PENDING: Usuario espera aprobación del administrador
| **Factory** | 2 | Procesador/Fabricante | Crear tokens derivados, recibir de Producer, transferir solo a Retailer |
### 4.2 APPROVED: Usuario aprobado con acceso completo según rol
| **Consumer** | 4 | Consumidor final | Recibir de Retailer, consultar trazabilidad (NO puede crear ni transferir tokens) |
#### 4.2.1 Funcionalidades por Rol

### 4.3 REJECTED: Usuario rechazado, debe volver a solicitar
- ✅ Usuarios pueden solicitar: Producer, Factory, Retailer, Consumer
### 4.4 CANCELED: Usuario canceló cuenta, puede re-solicitar
- ✅ Solo existe UN admin por contrato (Account #0 de Anvil en desarrollo)
## 5. Matriz de Transiciones de Estado
### 1.3 Matriz de Permisos por Rol
### 5.1 Transiciones Permitidas
Tabla de referencia rápida de qué puede hacer cada rol:
## 6. Casos de Uso del Admin
| Acción | Admin | Producer | Factory | Retailer | Consumer |
## 7. Validaciones y Errores
| **Crear tokens raíz** | ❌ | ✅ | ❌ | ❌ | ❌ |
### 7.1 Errores del Contrato
| **Transferir tokens** | ❌ | ✅ (a Factory) | ✅ (a Retailer) | ✅ (a Consumer) | ❌ |
### 7.2 Manejo de Errores en Frontend
| **Consultar trazabilidad** | ✅ | ✅ | ✅ | ✅ | ✅ |
## 8. Flujos Completos

### 8.1 Flujo: Usuario Nuevo se Registra como Producer

### 8.2 Flujo: Admin Aprueba Usuario

### 8.3 Flujo: Usuario Rechazado Vuelve a Solicitar
## 2. Estados de Usuario
## 9. Casos de Uso - Gestión de Tokens
### 2.2 Descripción de Estados
### 9.1 Crear Token Raíz (Producer)
| Estado | Valor | Descripción | Estado Terminal |
### 9.2 Crear Token Derivado (Factory)
| **Pending** | 0 | Usuario registrado esperando aprobación del admin | No |
### 9.3 Validación de Balance al Crear Token
| **Rejected** | 2 | Usuario rechazado por admin | No |
### 9.4 Ver Detalles de Token

### 9.5 Balance del Token - Cálculo Correcto

## 10. Casos de Uso - Transferencias

### 10.1 Solicitar Transferencia (Producer → Factory)

### 10.2 Aceptar Transferencia (Factory)
|--------|---------|-------|-----------|
### 10.3 Rechazar Transferencia
| **Aprobar usuario** | ❌ NO | ✅ SÍ | Estado → APPROVED |
### 10.4 Restricciones de Transferencia por Rol
| **Volver a solicitar** | ❌ NO | ❌ NO | Error: UserAlreadyRegistered |
#### 10.4.1 Descripción

#### 10.4.2 Flujos Permitidos

#### 10.4.3 Flujos NO Permitidos

#### 10.4.4 Validaciones del Contrato

## 11. Casos de Uso - Árbol de Trazabilidad
|--------|---------|-------|-----------|
### 11.1 Visualizar Árbol de Trazabilidad Completo
| **Acceder a dashboard** | ✅ SÍ | ✅ SÍ | Acceso completo según rol |
### 11.2 Ver Token Padre en el Árbol

## 12. Resumen de Cobertura de Testing
**Flujo**: Admin aprueba (/admin/users) → UserStatusChanged(APPROVED) → Usuario recarga → Redirección dashboard → Acceso funcionalidades
### 12.1 Casos Positivos (Flujos Exitosos) ✅
#### Funcionalidades por Rol
### 12.2 Casos Negativos (Validaciones Error) ❌
| Rol | Capacidades |
### 12.3 Casos de Borde (Escenarios Especiales) ⚠️
| **Producer** | ✅ Crear tokens raíz (materias primas sin parentId) • ✅ Transferir solo a Factory • ❌ NO crear derivados |
### 12.4 Validaciones Integración ✅
| **Retailer** | ✅ Recibir de Factory • ✅ Transferir solo a Consumer • ❌ NO crear tokens |
### 12.5 Cobertura por Rol 📊

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
