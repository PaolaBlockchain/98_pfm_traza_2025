# 🚀 Guía Técnica de Instalación — Supply Chain Web3 Tracker
**Versión:** 1.1  
**Última actualización:** 2025-01-30  
**Estado:** 🟢 Estable

# 1. 📋 Requisitos previos

## 1.1 Node.js & NPM
```bash
node --version   # >= 18
npm --version
```

## 1.2 Git
```bash
git --version
```

## 1.3 Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge --version
anvil --version
```

## 1.4 MetaMask
https://metamask.io/download/

# 2. 📦 Clonar proyecto
```bash
git clone Uhttps://github.com/PaolaBlockchain/proyectoFinalSolity
cd proyectoFinalSolity
```

# 3. ⚙️ Configuración Backend
```bash
cd backend
forge install
forge build
forge test
anvil
```

# 4. 🎨 Configuración Frontend
```bash
cd web3-starter
npm install
cp .env.example .env
```

Contenido `.env`:
```
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS=<SE_AUTOGENERA>
```
Compilar:
```bash
npm run build
```

# 5. 🦊 MetaMask
Agregar red:
- RPC: http://localhost:8545
- Chain ID: 31337

Importar cuentas desde claves privadas de Anvil.

# 6. 🚀 Arranque completo
```powershell
.\RESTART-ALL.ps1
```

# 7. 🖥️ Acceso
http://localhost:3000

# 8. 🔍 Verificaciones
```bash
cast call <CONTRACT> "nextUserId()(uint256)" --rpc-url http://localhost:8545
```

# 9. 🩺 Troubleshooting
- Resetear MetaMask si saldo aparece en 0
- Usuario debe estar Approved para operar
- Verificar Node >= 18

# Documentación Adicional
- [01_PROYECTO_A_IMPLEMENTAR.md](./01_PROYECTO_A_IMPLEMENTAR.md)
- [02_PROYECTO_IMPLEMENTADO_Y_ANALISIS.md](./02_PROYECTO_IMPLEMENTADO_Y_ANALISIS.md)
- [04_CASOS_DE_USO.md](./04_CASOS_DE_USO.md)
- [05_IA.md](./05_IA.md)
