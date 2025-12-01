
# 02. Proyecto Implementado y Análisis

## 2.1 Supply Chain Tracker - Proyecto de Desarrollo Blockchain

Bienvenido/a a la documentación técnica y personal del sistema Supply Chain Tracker. Aquí comparto algunas ideas sobre cómo pensé, estructuré e implementé el proyecto, incluyendo los retos, soluciones y decisiones tomadas durante el desarrollo de esta DApp de trazabilidad basada en blockchain.

## 2.2 Inicio Rápido

Al principio, me di cuenta que ejecutar los mismos pasos para iniciar el sistema se volvió repetitivo. Por eso, decidí automatizarlos y, por cuestiones de tiempo, implementé el script `RESTART-ALL.ps1` para reiniciar todo el sistema automáticamente en Windows . Si desea saber como se utiliza el scrip de inicio  rapido o para una instalación completa y detallada, del entorno consulta la **[Guía Técnica de Instalación](./03_GUIA_TECNICA_INSTALACION.md)**.


## 2.3 Estructura Real del Proyecto y Páginas Principales

### 2.3.1 Backend (Smart Contracts)
```
backend/
├── src/
│   ├── SupplyChain.sol
│   └── SupplyChainHelper.sol
├── script/
│   └── Deploy.s.sol
├── test/
│   └── SupplyChain.t.sol
├── foundry.toml
├── broadcast/
├── cache/
├── out/
```

### 2.3.2 Frontend (Next.js)
```
web3-starter/
├── src/
│   ├── app/
│   │   ├── page.tsx                # Landing/Login/Register
│   │   ├── layout.tsx              # Layout principal con Web3Provider
│   │   ├── dashboard/page.tsx      # Dashboard según rol
│   │   ├── tokens/
│   │   │   ├── page.tsx            # Lista de tokens del usuario
│   │   │   ├── create/page.tsx     # Crear nuevo token
│   │   │   └── [id]/page.tsx       # Detalles del token
│   │   ├── transfers/page.tsx      # Gestión de transferencias
│   │   ├── admin/
│   │   │   └── users/page.tsx      # Gestión de usuarios (solo admin)
│   │   ├── reset/page.tsx          # Reset de sistema (opcional)
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TokenCard.tsx
│   │   ├── TokenTraceabilityTree.tsx
│   │   ├── TokenTraceabilityLinear.tsx
│   │   ├── TransferList.tsx
│   │   ├── UserTable.tsx
│   │   └── ui/                     # Componentes base (shadcn/ui)
│   ├── contexts/Web3Context.tsx
│   ├── hooks/useWallet.ts
│   ├── lib/contractService.ts
│   ├── lib/requestHistoryService.ts
│   ├── lib/web3.ts
│   ├── contracts/config.ts
│   ├── contracts/SupplyChain.json
│   ├── types/
├── package.json
├── tailwind.config.js
├── .env.example
├── public/
```

### 2.3.3 Documentación y Presentación
```
Doc/
├── 01_PROYECTO_A_IMPLEMENTAR.md
├── 02_PROYECTO_IMPLEMENTADO_Y_ANALISIS.md
├── 03_GUIA_TECNICA_INSTALACION.md
├── 04_CASOS_DE_USO.md
├── 05_IA.md
├── PresentacionProyectoFinalSolidity.pptx
```

### 2.3.4 Otros
```
RESTART-ALL.ps1   # Script para reiniciar todo el sistema
README.md         # Guía principal del proyecto
```

#### 2.3.5 Páginas principales implementadas
```
- `/` (Landing, login y registro de usuario)
- `/dashboard` (Panel principal según rol)
- `/tokens` (Listado de tokens del usuario)
- `/tokens/create` (Creación de tokens)
- `/tokens/[id]` (Detalle de token)
- `/transfers` (Gestión y aceptación/rechazo de transferencias)
- `/admin/users` (Gestión de usuarios, solo admin)
- `/reset` (Reset del sistema, opcional)
```
#### 2.3.6 Componentes clave
```
- Header, TokenCard, TokenTraceabilityTree, TokenTraceabilityLinear, TransferList, UserTable, Web3Context, useWallet, contractService
```
#### 2.3.7 Presentación
```
- Archivo PPTX en la carpeta Doc: `PresentacionProyectoFinalSolidity.pptx`
```

## 2.4 Roles del Sistema
```
Confieso que implementar la lógica de roles y permisos en el frontend fue uno de los mayores retos. Por eso, incluyo aquí el análisis que realicé y cómo lo resolví.
```

### 2.4.1 Roles Disponibles
```
| Rol          | ID | Descripción               | Permisos                                                 |
|--------------|----|---------------------------|----------------------------------------------------------|
| **Admin**    | 0  | Administrador del sistema | Control total: aprobar/rechazar usuarios, cambiar roles, |
                      gestionar permisos                                                                   |
| **Producer** | 1  | Productor de materias primas | Crear y gestionar productos iniciales en la cadena    |
| **Factory**  | 2  | Procesador/Fabricante | Transformar materias primas en productos                     |
| **Retailer** | 3  | Distribuidor/Minorista | Distribución y venta de productos                           |
| **Consumer** | 4  | Consumidor final | Consultar trazabilidad de productos                               |
```

### 2.4.2 Restricciones de Roles
```
- ✅ Usuarios pueden solicitar: Producer, Factory, Retailer, Consumer
- ❌ Rol Admin NO puede ser solicitado por usuarios (solo asignado por contrato)
- ✅ Solo existe UN admin por contrato (Account #0 de Anvil en desarrollo)
```
### 2.5 Máquina de Estados de Usuario
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

### 2.5.1 Descripción de Estados
```

| Estado       | Valor | Descripción                                       | Estado Terminal |
|------------  |-------|---------------------------------------------------|-----------------|
| **Pending**  | 0     | Usuario registrado esperando aprobación del admin | No              |
| **Approved** | 1     | Usuario activo con permisos completos             | No              |
| **Rejected** | 2     | Usuario rechazado por admin                       | No              |
| **Canceled** | 3     | Usuario canceló su cuenta o fue dado de baja      | Sí              |
```

## 2.6 Prerrequisitos e Instalación
```

Para información detallada sobre prerequisitos, instalación y configuración del sistema, consulta la **[Guía Técnica de Instalación](./03_GUIA_TECNICA_INSTALACION.md)**:

- **[📋 Requisitos previos](./03_GUIA_TECNICA_INSTALACION.md#1-requisitos-previos)** - Node.js, Git, Foundry, MetaMask
- **[📦 Clonar proyecto](./03_GUIA_TECNICA_INSTALACION.md#2-clonar-proyecto)** - Clonar repositorio
- **[⚙️ Configuración Backend](./03_GUIA_TECNICA_INSTALACION.md#3-configuración-backend)** - Configurar smart contracts y ejecutar tests
- **[🎨 Configuración Frontend](./03_GUIA_TECNICA_INSTALACION.md#4-configuración-frontend)** - Configurar frontend, variables de entorno
- **[🦊 MetaMask](./03_GUIA_TECNICA_INSTALACION.md#5-metamask)** - Configurar MetaMask con Anvil
- **[🚀 Arranque completo](./03_GUIA_TECNICA_INSTALACION.md#6-arranque-completo)** - Inicio rápido con script automatizado
```

## 2.7 Flujos de Trabajo

### 2.7.1 Validación de Flujos Implementados
```

Se realizó una comparación exhaustiva entre los flujos de trabajo solicitados y los flujos implementados en el sistema. El resultado es el siguiente:

**1. Registro de Usuario:**
El flujo implementado es igual al solicitado. Incluye conexión de wallet, selección de rol (sin posibilidad de solicitar Admin), envío de solicitud, estado "pending", revisión por el admin y acceso al sistema tras aprobación.

**2. Creación de Token:**
El flujo implementado es igual al solicitado. Los usuarios pueden crear tokens según su rol, con validación de balance y metadatos. Producer crea tokens raíz, Factory crea derivados seleccionando token padre. Retailer y Consumer no pueden crear tokens.

**3. Transferencia:**
El flujo implementado es igual al solicitado. El propietario inicia la transferencia, selecciona destinatario y cantidad, la transferencia queda pendiente y el destinatario puede aceptar o rechazar desde la interfaz.

**4. Aprobación/Rechazo de Usuarios (Admin):**
El flujo implementado es igual al solicitado. El admin gestiona solicitudes pendientes, aprueba/rechaza usuarios y el historial de eventos queda registrado.

**5. Reset del Sistema:**
El flujo implementado es igual al solicitado. El usuario puede limpiar el estado local y reiniciar el sistema desde la interfaz.

**Conclusión:**
Todos los flujos de trabajo solicitados están correctamente implementados y validados en el sistema. No se requieren cambios adicionales.
```

## 2.8 Errores Comunes y Soluciones

### 2.8.1 Errores relacionados con Forge / tests de Solidity
```
Este fue el grupo más frecuente:
- Tests fallaban porque `parentId` no coincidía con el esperado (tokens raíz vs tokens derivados).
- Confusiones entre `vm.prank` y `vm.startPrank`.
- `assertEq` comparando tipos distintos (`uint` vs `address`).
- Traces largos y difíciles de leer que llevaban a interpretaciones incorrectas.

📌 Ejemplo típico:
> "Parent ID debe ser 0 (token raíz): 1 != 0"

### 2.8.2 Errores de MetaMask / Redes Anvil / Saldos
Esto pasó varias veces:
- MetaMask no mostraba saldo aunque la cuenta sí tenía ETH.
- Confusión entre las cuentas pre-funded de Anvil.
- Permisos rotos → necesidad de revocar permisos + limpiar localStorage.
- Después de reinstalar MetaMask, seguía sin sincronizar con Anvil.

📌 Ejemplo típico:
> “Veo ETH pero balance es 0, no entiendo por qué”.
```

## 2.9 Testing y Validación
```

Se agregaron pruebas unitarias exhaustivas para el smart contract utilizando Foundry. Los tests cubren todos los casos de uso principales.
[PASS] testAcceptNonExistentTransfer() (gas: 11225)
[PASS] testAcceptTransfer() (gas: 619157)
[PASS] testAdminApproveUser() (gas: 96909)
[PASS] testAdminRejectUser() (gas: 96927)
[PASS] testCompleteSupplyChainFlow() (gas: 1441598)
[PASS] testConsumerCannotTransfer() (gas: 1123497)
[PASS] testCreateTokenByFactory() (gas: 848864)
[PASS] testCreateTokenByProducer() (gas: 282047)
[PASS] testCreateTokenByRetailer() (gas: 19219)
[PASS] testDoubleAcceptTransfer() (gas: 609319)
[PASS] testGetToken() (gas: 283491)
[PASS] testGetTransfer() (gas: 561741)
[PASS] testGetUserInfo() (gas: 20093)
[PASS] testGetUserTokens() (gas: 276944)
[PASS] testGetUserTransfers() (gas: 536069)
[PASS] testInvalidRoleTransfer() (gas: 283756)
[PASS] testIsAdmin() (gas: 25495)
[PASS] testMultipleTokensFlow() (gas: 449108)
[PASS] testOnlyAdminCanChangeStatus() (gas: 91231)
[PASS] testOnlyApprovedUsersCanOperate() (gas: 89688)
[PASS] testRejectTransfer() (gas: 589965)
[PASS] testTokenBalance() (gas: 281335)
[PASS] testTokenCreatedEvent() (gas: 254273)
[PASS] testTokenMetadata() (gas: 326138)
[PASS] testTokenWithParentId() (gas: 848626)
[PASS] testTraceabilityFlow() (gas: 913978)
[PASS] testTransferAcceptedEvent() (gas: 608450)
[PASS] testTransferAfterRejection() (gas: 583236)
[PASS] testTransferFromFactoryToRetailer() (gas: 828291)
[PASS] testTransferFromProducerToFactory() (gas: 561531)
[PASS] testTransferFromRetailerToConsumer() (gas: 1073400)
[PASS] testTransferInitiatedEvent() (gas: 536486)
[PASS] testTransferInsufficientBalance() (gas: 284052)
[PASS] testTransferNonExistentToken() (gas: 16850)
[PASS] testTransferRejectedEvent() (gas: 582434)
[PASS] testTransferToSameAddress() (gas: 275597)
[PASS] testTransferZeroAmount() (gas: 277530)
[PASS] testUnapprovedUserCannotCreateToken() (gas: 89666)
[PASS] testUnapprovedUserCannotTransfer() (gas: 357793)
[PASS] testUserRegisteredEvent() (gas: 89327)
[PASS] testUserRegistration() (gas: 91213)
[PASS] testUserStatusChangedEvent() (gas: 96909)
[PASS] testUserStatusChanges() (gas: 110784)
```

### 2.9.1 Casos de Prueba Implementados desde la UI
```
Consulta el archivo **[04_CASOS_DE_USO.md](./04_CASOS_DE_USO.md)** para ver los casos de prueba detallados.
```

## 2.10 Seguridad y Buenas Prácticas

### 2.10.1 Validaciones Implementadas
```

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
```

### 2.10.2 Mejoras Futuras
```

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
```

## 2.11 Documentación Disponible

- **[01_PROYECTO_A_IMPLEMENTAR.md](./01_PROYECTO_A_IMPLEMENTAR.md)** - Especificaciones del proyecto a implementar
- **[03_GUIA_TECNICA_INSTALACION.md](./03_GUIA_TECNICA_INSTALACION.md)** - Guía técnica de instalación
- **[04_CASOS_DE_USO.md](./04_CASOS_DE_USO.md)** - Casos de uso adicionales
- **[05_IA.md](./05_IA.md)** - Documentación sobre el uso de IA en el proyecto
---

*Documento actualizado el 1 de diciembre de 2025 por PaolaBlockchain y GitHub Copilot. Si tienes dudas, sugerencias o quieres compartir tu experiencia, ¡no dudes en contactarme!*
