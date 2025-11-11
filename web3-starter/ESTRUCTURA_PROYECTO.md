# 📁 Estructura del Proyecto - Guía de Navegación

**Proyecto:** Sistema de Trazabilidad con Blockchain  
**Tecnologías:** Next.js 16 + TypeScript + Web3 + Tailwind CSS  
**Última actualización:** Noviembre 2025

---

## 🗂️ Estructura General

```
web3-starter/
├── src/                    # Código fuente de la aplicación
│   ├── app/               # Rutas y páginas (Next.js App Router)
│   ├── components/        # Componentes React reutilizables
│   ├── contexts/          # Contextos de React (estado global)
│   ├── hooks/             # Custom Hooks
│   ├── lib/               # Servicios y utilidades
│   └── contracts/         # Configuración de contratos inteligentes
├── public/                # Archivos estáticos
├── node_modules/          # Dependencias (generadas automáticamente)
├── .next/                 # Build de Next.js (generado automáticamente)
└── [archivos config]      # Configuración del proyecto
```

---

## 📂 Detalle de Carpetas y Archivos

### 📍 `src/app/` - Sistema de Rutas (App Router)

**Propósito:** Define todas las páginas y rutas de la aplicación usando el sistema de App Router de Next.js.

#### Archivos Principales:

| Archivo | Ruta URL | Propósito |
|---------|----------|-----------|
| `page.tsx` | `/` | **Página de inicio** - Selector de roles y solicitud de registro |
| `layout.tsx` | Todas | **Layout principal** - Header, estructura común a todas las páginas |
| `globals.css` | N/A | **Estilos globales** - Configuración de Tailwind CSS |

#### Rutas Anidadas:

```
app/
├── page.tsx                        → / (Home - Selector de roles)
├── layout.tsx                      → Layout global con Header
├── dashboard/
│   └── page.tsx                    → /dashboard (Panel principal post-aprobación)
├── tokens/
│   ├── page.tsx                    → /tokens (Lista de tokens)
│   └── create/
│       └── page.tsx                → /tokens/create (Crear nuevo token)
├── transfers/
│   └── page.tsx                    → /transfers (Historial de transferencias)
├── admin/
│   └── users/
│       └── page.tsx                → /admin/users (Gestión de usuarios - Solo Admin)
└── profile/                        → /profile (Perfil de usuario - Futuro)
```

#### 🔍 Cuándo editar cada página:

- **`page.tsx` (Home):**
  - Modificar UI del selector de roles
  - Cambiar estados de solicitud (pending, approved, rejected, canceled)
  - Ajustar flujo de registro de usuarios

- **`dashboard/page.tsx`:**
  - Cambiar el panel principal después de login
  - Modificar secciones "Node Overview" y "Mission Brief"
  - Agregar nuevas funcionalidades post-aprobación

- **`tokens/page.tsx`:**
  - Modificar lista de tokens
  - Cambiar diseño de cards de tokens
  - Agregar filtros o búsqueda

- **`tokens/create/page.tsx`:**
  - Modificar formulario de creación de tokens
  - Cambiar validaciones
  - Agregar campos adicionales

- **`transfers/page.tsx`:**
  - Modificar historial de transferencias
  - Cambiar formato de visualización
  - Agregar filtros por fecha/usuario

- **`admin/users/page.tsx`:**
  - Gestionar aprobación/rechazo de usuarios
  - Ver solicitudes pendientes
  - Cambiar permisos de roles

---

### 🧩 `src/components/` - Componentes Reutilizables

**Propósito:** Componentes UI que se usan en múltiples páginas.

#### Componentes Principales:

| Archivo | Propósito | Usado en |
|---------|-----------|----------|
| `Header.tsx` | Barra de navegación con wallet y rol | Todas las páginas (via layout) |
| `TokenCard.tsx` | Card individual de token | `/tokens` |
| `TransferList.tsx` | Lista de transferencias | `/transfers` |
| `UserTable.tsx` | Tabla de usuarios pendientes | `/admin/users` |

#### Subcarpeta `ui/` (Componentes Primitivos):

| Archivo | Propósito | Características |
|---------|-----------|-----------------|
| `button.tsx` | Botones reutilizables | Variantes: default, destructive, outline, secondary, ghost, link |
| `card.tsx` | Contenedores tipo card | Header, Content, Footer |
| `input.tsx` | Campos de texto | Estilizado con Tailwind |
| `label.tsx` | Etiquetas para forms | Accesibilidad mejorada |
| `select.tsx` | Selectores dropdown | Estilizado consistente |
| `textarea.tsx` | Campos de texto largo | Para descripciones |

#### 🔍 Cuándo editar:

- **`Header.tsx`:**
  - Cambiar navegación
  - Modificar botón de wallet
  - Ajustar visualización de rol/status

- **`ui/*`:**
  - Cambiar estilos globales de componentes
  - Agregar nuevas variantes
  - Modificar comportamiento común

---

### 🌐 `src/contexts/` - Estado Global

**Propósito:** Manejo de estado global que se comparte entre componentes.

#### `Web3Context.tsx`

**Responsabilidades:**
1. **Conexión con MetaMask** - Gestiona `window.ethereum`
2. **Estado de wallet** - `account`, `role`, `status`
3. **Persistencia** - Guarda/restaura estado en `localStorage`
4. **Lógica de autenticación** - Verifica admin, restaura solicitudes

**Variables de Estado:**
- `account`: Dirección de la wallet conectada
- `role`: Rol del usuario (Admin, Producer, Transporter, Retailer)
- `status`: Estado de registro (unregistered, pending, approved, rejected, canceled)
- `isConnected`: Boolean de conexión

**Funciones Principales:**
- `connect()`: Conecta wallet y restaura estado desde localStorage
- `disconnect()`: Desconecta wallet y limpia estado
- `setRole()`: Establece rol del usuario
- `setStatus()`: Actualiza estado de registro

#### 🔍 Cuándo editar:

- Agregar nuevos roles
- Modificar lógica de autenticación
- Cambiar dirección del admin
- Ajustar comportamiento de localStorage
- Agregar nuevos estados o variables globales

---

### 🎣 `src/hooks/` - Custom Hooks

**Propósito:** Lógica reutilizable encapsulada en hooks personalizados.

#### `useWallet.ts`

**Función:** Hook simplificado que consume `Web3Context`

**Retorna:**
```typescript
{
  account,      // Dirección de wallet
  role,         // Rol del usuario
  status,       // Estado de registro
  isConnected,  // Si está conectado
  connect,      // Función para conectar
  disconnect,   // Función para desconectar
  setRole,      // Función para cambiar rol
  setStatus     // Función para cambiar estado
}
```

**Uso en componentes:**
```typescript
const { account, role, connect } = useWallet();
```

#### 🔍 Cuándo editar:

- Agregar nuevas propiedades al hook
- Crear nuevos custom hooks
- Modificar la interface del hook

---

### 🔧 `src/lib/` - Servicios y Utilidades

**Propósito:** Servicios externos y funciones utilitarias.

#### `web3.ts`

**Responsabilidades:**
1. **Detección de MetaMask** - Verifica `window.ethereum`
2. **Conexión a wallet** - `requestAccounts()`
3. **Cambio de red** - Solicita cambio a Anvil Local (chainId: 31337)
4. **Manejo de eventos** - `accountsChanged`, `chainChanged`

**Funciones Principales:**
- `connectWallet()`: Conecta MetaMask y retorna cuenta
- `switchToAnvilNetwork()`: Cambia a red local Anvil
- `getCurrentAccount()`: Obtiene cuenta actual
- `setupListeners()`: Configura listeners de eventos

#### 🔍 Cuándo editar:

- Cambiar configuración de red
- Agregar interacción con contratos inteligentes
- Modificar lógica de conexión Web3
- Agregar nuevos listeners de eventos

---

### 📜 `src/contracts/` - Configuración Blockchain

**Propósito:** Configuración de contratos inteligentes y redes.

#### `config.ts`

**Contiene:**
1. **ADMIN_ADDRESS** - Dirección del administrador del sistema
2. **NETWORK_CONFIG** - Configuración de red Anvil Local
3. **CONTRACT_CONFIG** - Direcciones y ABIs de contratos (futuro)

**Constantes:**
```typescript
ADMIN_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
NETWORK_CONFIG = {
  chainId: "0x7a69",  // 31337 en hex
  chainName: "Anvil Local",
  rpcUrls: ["http://127.0.0.1:8545"]
}
```

#### 🔍 Cuándo editar:

- Cambiar dirección del admin
- Agregar ABIs de contratos inteligentes
- Modificar configuración de red
- Agregar nuevas direcciones de contratos

---

## 🎨 Archivos de Configuración (Raíz)

### `package.json`
**Propósito:** Dependencias y scripts del proyecto

**Scripts importantes:**
- `npm run dev` - Inicia servidor de desarrollo (localhost:3000)
- `npm run build` - Compila para producción
- `npm start` - Inicia servidor de producción

### `tsconfig.json`
**Propósito:** Configuración de TypeScript

**Configuraciones clave:**
- `"@/*"` → Alias para `./src/*`
- Modo estricto activado

### `tailwind.config.ts`
**Propósito:** Configuración de Tailwind CSS

**Personalizaciones:**
- Temas de colores
- Breakpoints responsive
- Plugins y extensiones

### `next.config.ts`
**Propósito:** Configuración de Next.js

**Configuraciones:**
- Optimizaciones
- Variables de entorno
- Rutas personalizadas

---

## 🔄 Flujo de Datos

```
┌─────────────────────────────────────────────────┐
│  Usuario conecta wallet (MetaMask)              │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Web3Context.connect()                          │
│  - Conecta MetaMask (lib/web3.ts)              │
│  - Verifica si es Admin (contracts/config.ts)  │
│  - Restaura estado desde localStorage          │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Componentes consumen useWallet()               │
│  - Header muestra cuenta y rol                  │
│  - Pages ajustan UI según role/status          │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Usuario interactúa con la aplicación           │
│  - Solicita rol → localStorage                  │
│  - Admin aprueba → localStorage                 │
│  - Usuario accede a dashboard                   │
└─────────────────────────────────────────────────┘
```

---

## 🗺️ Guía Rápida: "¿Dónde Hago X?"

| Necesito... | Ir a... |
|-------------|---------|
| Cambiar página de inicio | `src/app/page.tsx` |
| Modificar el header/navegación | `src/components/Header.tsx` |
| Agregar nueva ruta | Crear carpeta en `src/app/` con `page.tsx` |
| Cambiar conexión Web3 | `src/lib/web3.ts` |
| Modificar roles disponibles | `src/app/page.tsx` (selector) |
| Cambiar dirección del admin | `src/contracts/config.ts` |
| Ajustar estado global | `src/contexts/Web3Context.tsx` |
| Modificar localStorage | `src/contexts/Web3Context.tsx` (connect/disconnect) |
| Cambiar estilos de botones | `src/components/ui/button.tsx` |
| Agregar página de admin | `src/app/admin/[nombre]/page.tsx` |
| Modificar dashboard principal | `src/app/dashboard/page.tsx` |
| Cambiar gestión de tokens | `src/app/tokens/page.tsx` |
| Modificar formulario de creación | `src/app/tokens/create/page.tsx` |
| Ver transferencias | `src/app/transfers/page.tsx` |
| Gestionar usuarios pendientes | `src/app/admin/users/page.tsx` |

---

## 🔐 Sistema de Autenticación (localStorage)

### Claves de localStorage:

| Clave | Contenido | Usado para |
|-------|-----------|------------|
| `walletAccount` | Dirección de wallet | Restaurar sesión |
| `userRole` | Rol del usuario | Mostrar en header |
| `registrationStatus` | Estado (pending, approved, etc.) | Mostrar UI apropiada |
| `pendingUserRequests` | Array de solicitudes | Panel de admin |

### Estados posibles:

- `unregistered` - Usuario nuevo sin solicitud
- `pending` - Solicitud enviada, esperando aprobación
- `approved` - Usuario aprobado, acceso completo
- `rejected` - Solicitud rechazada
- `canceled` - Usuario canceló su solicitud

---

## 📱 Diseño Responsive

El proyecto usa Tailwind CSS con breakpoints:

- **Mobile:** < 640px (sin prefijo)
- **Tablet:** ≥ 640px (`sm:`)
- **Desktop:** ≥ 768px (`md:`)
- **Large:** ≥ 1024px (`lg:`)
- **XL:** ≥ 1280px (`xl:`)

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo

# Build
npm run build        # Compilar para producción
npm start            # Ejecutar versión de producción

# Linting
npm run lint         # Verificar código

# Limpiar caché
rm -rf .next         # Eliminar build cache
```

---

## 📝 Notas Importantes

1. **NO editar archivos en `node_modules/` o `.next/`** - Son generados automáticamente

2. **Path alias `@/`** - Equivale a `src/`, úsalo en imports:
   ```typescript
   import { useWallet } from '@/hooks/useWallet';
   ```

3. **Client Components** - Si usas hooks o interactividad, usa `"use client"` al inicio del archivo

4. **localStorage** - Actualmente almacena estado, será reemplazado por blockchain

5. **Admin hardcodeado** - La dirección admin está en `contracts/config.ts`, cámbiala según necesidad

---

## 🎯 Próximos Pasos (TODO)

- [ ] Integrar contratos inteligentes reales
- [ ] Reemplazar localStorage por blockchain
- [ ] Agregar sistema de tokens NFT
- [ ] Implementar transferencias on-chain
- [ ] Agregar carpeta `types/` para interfaces TypeScript
- [ ] Crear tests unitarios
- [ ] Agregar documentación de componentes

---

**Última actualización:** Noviembre 10, 2025  
**Versión:** 1.0  
**Autor:** PaolaBlockchain  
**Repositorio:** 98_pfm_traza_2025
