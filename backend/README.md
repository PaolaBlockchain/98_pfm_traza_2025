# Backend - Smart Contracts

## 📦 Estructura

```
backend/
├── src/
│   ├── SupplyChain.sol          # Contrato principal
│   └── SupplyChainHelper.sol    # Librería helper para validaciones
├── script/
│   └── Deploy.s.sol             # Script de deployment completo
├── test/
│   └── SupplyChain.t.sol        # Tests unitarios
└── foundry.toml                 # Configuración de Foundry
```

## 🚀 Deployment

### Script Unificado de Deployment

El script `Deploy.s.sol` realiza el proceso de inicialización:
1. ✅ Despliega el contrato SupplyChain
2. ✅ Registra 4 usuarios de prueba (PRODUCER, FACTORY, RETAILER, CONSUMER)
3. ⏳ Los usuarios quedan en estado **PENDING** (requieren aprobación del admin)

```bash
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

**IMPORTANTE:** Los usuarios NO se aprueban automáticamente. El admin debe aprobarlos manualmente desde la interfaz web (`/admin/users`).

### Usuarios de Prueba Pre-Configurados

| Rol | Dirección | Account # | Estado Inicial |
|-----|-----------|-----------|----------------|
| PRODUCER | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | 1 | ⏳ PENDING |
| FACTORY | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | 2 | ⏳ PENDING |
| RETAILER | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | 3 | ⏳ PENDING |
| CONSUMER | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | 4 | ⏳ PENDING |

---

## 🧪 Testing

### Ejecutar todos los tests
```bash
forge test
```

### Ejecutar con verbosidad
```bash
forge test -vvv
```

### Ver cobertura de tests
```bash
forge coverage
```

---

## 🔧 Comandos Útiles

### Compilar contratos
```bash
forge build
```

### Formatear código
```bash
forge fmt
```

### Interactuar con el contrato desplegado

```bash
# Ver admin
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "admin()(address)" --rpc-url http://localhost:8545

# Ver número de usuarios registrados
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 "nextUserId()(uint256)" --rpc-url http://localhost:8545
```

---

## 📋 Contratos

### SupplyChain.sol
Contrato principal que gestiona:
- 👥 Registro y aprobación de usuarios
- 🎭 Sistema de roles (Admin, Producer, Factory, Retailer, Consumer)
- 🔄 Máquina de estados (Pending, Approved, Rejected, Canceled)
- 🔐 Control de acceso basado en roles

### SupplyChainHelper.sol
Librería auxiliar para validaciones y conversiones de estado/rol.

---

## 🛠️ Foundry Toolkit

**Foundry** es un toolkit modular y rápido para desarrollo en Ethereum escrito en Rust.

Componentes:
- **Forge**: Framework de testing
- **Cast**: Herramienta CLI para interactuar con contratos
- **Anvil**: Nodo local de Ethereum
- **Chisel**: REPL de Solidity

**Documentación:** https://book.getfoundry.sh/

---

## 🔐 Notas de Seguridad

El contrato implementa:
- Custom errors para optimización de gas
- Modificadores de control de acceso
- Validaciones de transiciones de estado
- Protección contra operaciones sobre el admin
- Transferencia de propiedad en dos pasos
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
