# 🚀 Plan de Integración: Contratos → Frontend

## 📋 Estado Actual

### ✅ Completado en Smart Contract
- [x] Gestión de usuarios (registro, aprobación, rechazo, cancelación)
- [x] Enums: `UserStatus`, `Roles`
- [x] Struct `User`
- [x] Eventos de usuarios: `UserRegistered`, `UserRoleRequested`, `UserStatusChanged`, `UserRoleChanged`
- [x] Funciones: `requestUserRoleByEnum`, `approveUser`, `rejectUser`, `cancelMyAccount`, `changeStatusUser`, `changeUserRole`
- [x] Seguridad: Custom errors, storage packing, gas optimization
- [x] Transferencia de propiedad en dos pasos

### ✅ Completado en Frontend
- [x] Conexión MetaMask con Web3Context
- [x] Persistencia localStorage
- [x] Hook useWallet
- [x] Página landing (registro de usuarios)
- [x] Dashboard básico
- [x] Panel admin para aprobación de usuarios
- [x] Componentes UI base (Button, Card, Select, Label)
- [x] Header con navegación
- [x] UserTable

---

## 🔴 LO QUE FALTA IMPLEMENTAR

### FASE 1: Completar Smart Contract (CRÍTICO)

#### 1.1. Sistema de Tokens

**Agregar a `SupplyChain.sol`:**

```solidity
// ---- Tipos para Tokens ----
struct Token {
    uint256 id;
    address creator;
    string name;
    uint256 totalSupply;
    string features; // JSON metadata
    uint256 parentId; // 0 para materias primas, >0 para productos derivados
    uint256 dateCreated;
    // No usar nested mapping en struct, usar mapping separado
}

// ---- Storage para Tokens ----
mapping(uint256 => Token) public tokens;
mapping(uint256 => mapping(address => uint256)) public tokenBalances; // tokenId => (address => balance)
mapping(address => uint256[]) private userTokens; // address => tokenIds[]
uint256 public nextTokenId = 1;

// ---- Eventos de Tokens ----
event TokenCreated(
    uint256 indexed tokenId,
    address indexed creator,
    string name,
    uint256 totalSupply,
    uint256 parentId
);

// ---- Funciones de Tokens ----

/// @notice Crea un nuevo token (materia prima o producto derivado)
/// @dev Solo usuarios aprobados pueden crear tokens
/// @param name Nombre del token
/// @param totalSupply Cantidad total
/// @param features JSON con características del producto
/// @param parentId 0 para materias primas, ID del token padre para productos derivados
function createToken(
    string memory name,
    uint256 totalSupply,
    string memory features,
    uint256 parentId
) external returns (uint256) {
    uint256 userId = addressToUserId[msg.sender];
    if (userId == 0) revert UserDoesNotExist();
    
    User storage user = users[userId];
    if (user.status != UserStatus.Approved) revert UserNotApproved();
    
    // Validar parentId
    if (parentId > 0) {
        // Es un producto derivado, validar que existe el token padre
        require(tokens[parentId].id != 0, "Token padre no existe");
        // Factory y Retailer deben tener balance del token padre
        if (user.rol == Roles.Factory || user.rol == Roles.Retailer) {
            require(tokenBalances[parentId][msg.sender] > 0, "No tienes el token padre");
        }
    } else {
        // Es materia prima, solo Producer puede crear
        require(user.rol == Roles.Producer, "Solo Producer puede crear materias primas");
    }
    
    uint256 tokenId = nextTokenId;
    unchecked { ++nextTokenId; }
    
    tokens[tokenId] = Token({
        id: tokenId,
        creator: msg.sender,
        name: name,
        totalSupply: totalSupply,
        features: features,
        parentId: parentId,
        dateCreated: block.timestamp
    });
    
    // Asignar balance inicial al creador
    tokenBalances[tokenId][msg.sender] = totalSupply;
    userTokens[msg.sender].push(tokenId);
    
    emit TokenCreated(tokenId, msg.sender, name, totalSupply, parentId);
    return tokenId;
}

/// @notice Obtiene información de un token
function getToken(uint256 tokenId) external view returns (Token memory) {
    require(tokens[tokenId].id != 0, "Token no existe");
    return tokens[tokenId];
}

/// @notice Obtiene el balance de un usuario para un token específico
function getTokenBalance(uint256 tokenId, address userAddress) external view returns (uint256) {
    return tokenBalances[tokenId][userAddress];
}

/// @notice Obtiene todos los tokens que posee un usuario
function getUserTokens(address userAddress) external view returns (uint256[] memory) {
    return userTokens[userAddress];
}
```

#### 1.2. Sistema de Transferencias

```solidity
// ---- Tipos para Transferencias ----
enum TransferStatus { Pending, Accepted, Rejected }

struct Transfer {
    uint256 id;
    address from;
    address to;
    uint256 tokenId;
    uint256 amount;
    uint256 dateCreated;
    TransferStatus status;
}

// ---- Storage para Transferencias ----
mapping(uint256 => Transfer) public transfers;
mapping(address => uint256[]) private userTransfers; // address => transferIds[]
uint256 public nextTransferId = 1;

// ---- Eventos de Transferencias ----
event TransferRequested(
    uint256 indexed transferId,
    address indexed from,
    address indexed to,
    uint256 tokenId,
    uint256 amount
);
event TransferAccepted(uint256 indexed transferId);
event TransferRejected(uint256 indexed transferId);

// ---- Funciones Helper ----

/// @notice Valida si es posible transferir entre dos roles
function _canTransferBetweenRoles(Roles fromRole, Roles toRole) internal pure returns (bool) {
    // Producer → Factory
    if (fromRole == Roles.Producer && toRole == Roles.Factory) return true;
    // Factory → Retailer
    if (fromRole == Roles.Factory && toRole == Roles.Retailer) return true;
    // Retailer → Consumer
    if (fromRole == Roles.Retailer && toRole == Roles.Consumer) return true;
    // Consumer NO puede transferir (punto final)
    return false;
}

// ---- Funciones de Transferencias ----

/// @notice Inicia una transferencia de tokens
/// @dev Crea una transferencia pendiente que el receptor debe aceptar
function transfer(
    address to,
    uint256 tokenId,
    uint256 amount
) external returns (uint256) {
    if (to == address(0)) revert InvalidAddress();
    if (to == msg.sender) revert("No puedes transferir a ti mismo");
    if (amount == 0) revert("Cantidad debe ser mayor a 0");
    
    // Validar que el token existe
    require(tokens[tokenId].id != 0, "Token no existe");
    
    // Validar que sender tiene suficiente balance
    require(tokenBalances[tokenId][msg.sender] >= amount, "Balance insuficiente");
    
    // Validar que ambos usuarios existen y están aprobados
    uint256 fromUserId = addressToUserId[msg.sender];
    uint256 toUserId = addressToUserId[to];
    
    if (fromUserId == 0 || toUserId == 0) revert UserDoesNotExist();
    
    User storage fromUser = users[fromUserId];
    User storage toUser = users[toUserId];
    
    if (fromUser.status != UserStatus.Approved) revert UserNotApproved();
    if (toUser.status != UserStatus.Approved) revert("Destinatario no aprobado");
    
    // Validar flujo de roles
    require(
        _canTransferBetweenRoles(fromUser.rol, toUser.rol),
        "Transferencia no permitida entre estos roles"
    );
    
    // Crear transferencia pendiente
    uint256 transferId = nextTransferId;
    unchecked { ++nextTransferId; }
    
    transfers[transferId] = Transfer({
        id: transferId,
        from: msg.sender,
        to: to,
        tokenId: tokenId,
        amount: amount,
        dateCreated: block.timestamp,
        status: TransferStatus.Pending
    });
    
    userTransfers[msg.sender].push(transferId);
    userTransfers[to].push(transferId);
    
    emit TransferRequested(transferId, msg.sender, to, tokenId, amount);
    return transferId;
}

/// @notice Acepta una transferencia pendiente
function acceptTransfer(uint256 transferId) external {
    Transfer storage t = transfers[transferId];
    require(t.id != 0, "Transferencia no existe");
    require(t.to == msg.sender, "No eres el destinatario");
    require(t.status == TransferStatus.Pending, "Transferencia no esta pendiente");
    
    // Validar que el sender aún tiene balance suficiente
    require(tokenBalances[t.tokenId][t.from] >= t.amount, "Sender no tiene balance suficiente");
    
    // Ejecutar transferencia
    tokenBalances[t.tokenId][t.from] -= t.amount;
    tokenBalances[t.tokenId][t.to] += t.amount;
    
    // Agregar token a lista del destinatario si no lo tenía
    if (!_hasToken(t.to, t.tokenId)) {
        userTokens[t.to].push(t.tokenId);
    }
    
    t.status = TransferStatus.Accepted;
    emit TransferAccepted(transferId);
}

/// @notice Rechaza una transferencia pendiente
function rejectTransfer(uint256 transferId) external {
    Transfer storage t = transfers[transferId];
    require(t.id != 0, "Transferencia no existe");
    require(t.to == msg.sender, "No eres el destinatario");
    require(t.status == TransferStatus.Pending, "Transferencia no esta pendiente");
    
    t.status = TransferStatus.Rejected;
    emit TransferRejected(transferId);
}

/// @notice Obtiene información de una transferencia
function getTransfer(uint256 transferId) external view returns (Transfer memory) {
    require(transfers[transferId].id != 0, "Transferencia no existe");
    return transfers[transferId];
}

/// @notice Obtiene todas las transferencias de un usuario (enviadas y recibidas)
function getUserTransfers(address userAddress) external view returns (uint256[] memory) {
    return userTransfers[userAddress];
}

/// @dev Helper interno para verificar si un usuario tiene un token
function _hasToken(address user, uint256 tokenId) internal view returns (bool) {
    uint256[] storage tokens = userTokens[user];
    for (uint256 i = 0; i < tokens.length; i++) {
        if (tokens[i] == tokenId) return true;
    }
    return false;
}
```

---

### FASE 2: Integración Frontend con Contrato

#### 2.1. Actualizar configuración del contrato

**`web3-starter/src/contracts/config.ts`:**

```typescript
// Después de compilar y desplegar el contrato, actualizar:
export const CONTRACT_CONFIG = {
  address: '0x...', // Dirección del contrato desplegado con foundry
  abi: SupplyChainABI, // Importar el ABI generado por Foundry
  adminAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Primera cuenta de Anvil
};
```

#### 2.2. Crear servicio de interacción con el contrato

**`web3-starter/src/lib/contractService.ts`:**

```typescript
import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from '@/contracts/config';

export class ContractService {
  private provider: ethers.BrowserProvider;
  private contract: ethers.Contract;

  constructor() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask no encontrado');
    }
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.contract = new ethers.Contract(
      CONTRACT_CONFIG.address,
      CONTRACT_CONFIG.abi,
      this.provider
    );
  }

  // Obtener signer (para transacciones que modifican estado)
  async getSigner() {
    return await this.provider.getSigner();
  }

  // ==================== USUARIOS ====================

  async requestUserRole(role: number) {
    const signer = await this.getSigner();
    const contractWithSigner = this.contract.connect(signer);
    const tx = await contractWithSigner.requestUserRoleById(role);
    return await tx.wait();
  }

  async getUserInfo(address: string) {
    return await this.contract.getUserInfo(address);
  }

  async approveUser(address: string) {
    const signer = await this.getSigner();
    const contractWithSigner = this.contract.connect(signer);
    const tx = await contractWithSigner.approveUser(address);
    return await tx.wait();
  }

  async rejectUser(address: string) {
    const signer = await this.getSigner();
    const contractWithSigner = this.contract.connect(signer);
    const tx = await contractWithSigner.rejectUser(address);
    return await tx.wait();
  }

  // ==================== TOKENS ====================

  async createToken(name: string, totalSupply: number, features: string, parentId: number) {
    const signer = await this.getSigner();
    const contractWithSigner = this.contract.connect(signer);
    const tx = await contractWithSigner.createToken(name, totalSupply, features, parentId);
    return await tx.wait();
  }

  async getToken(tokenId: number) {
    return await this.contract.getToken(tokenId);
  }

  async getUserTokens(address: string) {
    return await this.contract.getUserTokens(address);
  }

  async getTokenBalance(tokenId: number, address: string) {
    return await this.contract.getTokenBalance(tokenId, address);
  }

  // ==================== TRANSFERENCIAS ====================

  async transfer(to: string, tokenId: number, amount: number) {
    const signer = await this.getSigner();
    const contractWithSigner = this.contract.connect(signer);
    const tx = await contractWithSigner.transfer(to, tokenId, amount);
    return await tx.wait();
  }

  async acceptTransfer(transferId: number) {
    const signer = await this.getSigner();
    const contractWithSigner = this.contract.connect(signer);
    const tx = await contractWithSigner.acceptTransfer(transferId);
    return await tx.wait();
  }

  async rejectTransfer(transferId: number) {
    const signer = await this.getSigner();
    const contractWithSigner = this.contract.connect(signer);
    const tx = await contractWithSigner.rejectTransfer(transferId);
    return await tx.wait();
  }

  async getUserTransfers(address: string) {
    return await this.contract.getUserTransfers(address);
  }

  async getTransfer(transferId: number) {
    return await this.contract.getTransfer(transferId);
  }

  // ==================== EVENTOS ====================

  onUserRegistered(callback: (user: string, id: number, role: number, status: number) => void) {
    this.contract.on('UserRegistered', callback);
  }

  onTokenCreated(callback: (tokenId: number, creator: string, name: string, totalSupply: number, parentId: number) => void) {
    this.contract.on('TokenCreated', callback);
  }

  onTransferRequested(callback: (transferId: number, from: string, to: string, tokenId: number, amount: number) => void) {
    this.contract.on('TransferRequested', callback);
  }
}
```

#### 2.3. Reemplazar localStorage por llamadas al contrato

**En `web3-starter/src/app/page.tsx`:**

```typescript
// Cambiar la función de registro para llamar al contrato
const handleRegister = async () => {
  try {
    const contractService = new ContractService();
    const roleMap = { admin: 0, producer: 1, factory: 2, retailer: 3, consumer: 4 };
    await contractService.requestUserRole(roleMap[selectedRole]);
    
    // El estado ahora viene del contrato, no de localStorage
    setStatus('pending');
    alert('Solicitud enviada a la blockchain');
  } catch (error) {
    console.error('Error al registrar:', error);
    alert('Error al registrar en el contrato');
  }
};
```

**En `web3-starter/src/app/admin/users/page.tsx`:**

```typescript
// Cambiar para obtener usuarios del contrato en vez de localStorage
const [pendingUsers, setPendingUsers] = useState([]);

useEffect(() => {
  async function loadPendingUsers() {
    const contractService = new ContractService();
    // Escuchar evento UserRegistered y filtrar por status Pending
    contractService.onUserRegistered((user, id, role, status) => {
      if (status === 0) { // 0 = Pending
        setPendingUsers(prev => [...prev, { address: user, id, role, status }]);
      }
    });
  }
  loadPendingUsers();
}, []);

const handleApprove = async (address: string) => {
  try {
    const contractService = new ContractService();
    await contractService.approveUser(address);
    alert('Usuario aprobado en blockchain');
  } catch (error) {
    console.error('Error al aprobar:', error);
  }
};
```

---

### FASE 3: Crear Páginas Faltantes

#### 3.1. `/tokens/page.tsx` - Lista de tokens

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ContractService } from '@/lib/contractService';
import { TokenCard } from '@/components/TokenCard';

export default function TokensPage() {
  const { account } = useWallet();
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    async function loadTokens() {
      if (!account) return;
      
      const contractService = new ContractService();
      const tokenIds = await contractService.getUserTokens(account);
      
      const tokensData = await Promise.all(
        tokenIds.map(id => contractService.getToken(id))
      );
      
      setTokens(tokensData);
    }
    loadTokens();
  }, [account]);

  return (
    <div>
      <h1>Mis Tokens</h1>
      {tokens.map(token => (
        <TokenCard key={token.id} token={token} />
      ))}
    </div>
  );
}
```

#### 3.2. `/tokens/create/page.tsx` - Crear token

```typescript
'use client';
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ContractService } from '@/lib/contractService';

export default function CreateTokenPage() {
  const { role } = useWallet();
  const [name, setName] = useState('');
  const [supply, setSupply] = useState('');
  const [features, setFeatures] = useState('');
  const [parentId, setParentId] = useState('0');

  const handleCreate = async () => {
    try {
      const contractService = new ContractService();
      await contractService.createToken(
        name,
        parseInt(supply),
        JSON.stringify({ description: features }),
        parseInt(parentId)
      );
      alert('Token creado exitosamente');
    } catch (error) {
      console.error('Error al crear token:', error);
    }
  };

  return (
    <div>
      <h1>Crear Token</h1>
      {/* Formulario para crear token */}
    </div>
  );
}
```

#### 3.3. `/transfers/page.tsx` - Transferencias

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ContractService } from '@/lib/contractService';

export default function TransfersPage() {
  const { account } = useWallet();
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    async function loadTransfers() {
      if (!account) return;
      
      const contractService = new ContractService();
      const transferIds = await contractService.getUserTransfers(account);
      
      const transfersData = await Promise.all(
        transferIds.map(id => contractService.getTransfer(id))
      );
      
      // Filtrar solo pendientes donde soy el destinatario
      const pending = transfersData.filter(
        t => t.to.toLowerCase() === account.toLowerCase() && t.status === 0
      );
      
      setTransfers(pending);
    }
    loadTransfers();
  }, [account]);

  const handleAccept = async (transferId: number) => {
    const contractService = new ContractService();
    await contractService.acceptTransfer(transferId);
    alert('Transferencia aceptada');
  };

  const handleReject = async (transferId: number) => {
    const contractService = new ContractService();
    await contractService.rejectTransfer(transferId);
    alert('Transferencia rechazada');
  };

  return (
    <div>
      <h1>Transferencias Pendientes</h1>
      {/* Lista de transferencias con botones aceptar/rechazar */}
    </div>
  );
}
```

---

## ✅ CHECKLIST DE INTEGRACIÓN

### Smart Contract
- [ ] Agregar struct Token
- [ ] Agregar enum TransferStatus
- [ ] Agregar struct Transfer
- [ ] Implementar createToken()
- [ ] Implementar transfer()
- [ ] Implementar acceptTransfer() / rejectTransfer()
- [ ] Implementar getters (getToken, getUserTokens, etc.)
- [ ] Implementar validación de flujo de roles (_canTransferBetweenRoles)
- [ ] Agregar eventos de tokens y transferencias
- [ ] Compilar con Foundry: `forge build`
- [ ] Desplegar en Anvil: `forge script script/Deploy.s.sol --broadcast`
- [ ] Copiar dirección del contrato y ABI

### Frontend
- [ ] Actualizar CONTRACT_CONFIG con dirección y ABI
- [ ] Crear ContractService.ts
- [ ] Instalar ethers.js: `npm install ethers`
- [ ] Reemplazar localStorage por llamadas al contrato en `/app/page.tsx`
- [ ] Reemplazar localStorage en `/app/admin/users/page.tsx`
- [ ] Crear `/tokens/page.tsx`
- [ ] Crear `/tokens/create/page.tsx`
- [ ] Crear `/tokens/[id]/page.tsx`
- [ ] Crear `/tokens/[id]/transfer/page.tsx`
- [ ] Crear `/transfers/page.tsx`
- [ ] Crear componente TokenCard
- [ ] Crear componente TransferList
- [ ] Actualizar Header con navegación a nuevas páginas

---

## 🎯 PRÓXIMOS PASOS

1. **Completar el contrato con tokens y transferencias**
2. **Compilar y desplegar con Foundry**
3. **Integrar frontend con el contrato**
4. **Crear páginas faltantes**
5. **Testing completo del flujo**

¿Quieres que empiece a implementar las funcionalidades faltantes en el contrato?
