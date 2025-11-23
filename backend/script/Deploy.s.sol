// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

/**
 * @title Deploy Script
 * @notice Script completo de despliegue y configuración inicial
 * @dev Despliega el contrato y registra usuarios de prueba automáticamente
 * 
 * Uso:
 * forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
 */
contract DeployScript is Script {
    // Direcciones de las cuentas de prueba de Anvil
    address constant PRODUCER_ACCOUNT = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;  // Account 1
    address constant FACTORY_ACCOUNT = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;   // Account 2
    address constant RETAILER_ACCOUNT = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // Account 3
    address constant CONSUMER_ACCOUNT = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;  // Account 4
    
    // Private key del admin (Account 0 de Anvil)
    uint256 constant ADMIN_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    
    function run() external {
        // 1. DESPLEGAR CONTRATO
        console.log("========================================");
        console.log("  DESPLEGANDO CONTRATO SUPPLYCHAIN");
        console.log("========================================");
        
        vm.startBroadcast(ADMIN_PRIVATE_KEY);
        SupplyChain supplyChain = new SupplyChain();
        vm.stopBroadcast();
        
        console.log("Contrato desplegado en:", address(supplyChain));
        console.log("Admin:", supplyChain.admin());
        console.log("");
        
        // 2. REGISTRAR USUARIOS DE PRUEBA
        console.log("========================================");
        console.log("  REGISTRANDO USUARIOS DE PRUEBA");
        console.log("========================================");
        
        // Registrar PRODUCER
        console.log("1. Registrando PRODUCER...");
        vm.startBroadcast(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d);
        supplyChain.requestUserRoleById(1); // 1 = Producer
        vm.stopBroadcast();
        console.log("   - Address:", PRODUCER_ACCOUNT);
        
        // Registrar FACTORY
        console.log("2. Registrando FACTORY...");
        vm.startBroadcast(0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a);
        supplyChain.requestUserRoleById(2); // 2 = Factory
        vm.stopBroadcast();
        console.log("   - Address:", FACTORY_ACCOUNT);
        
        // Registrar RETAILER
        console.log("3. Registrando RETAILER...");
        vm.startBroadcast(0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6);
        supplyChain.requestUserRoleById(3); // 3 = Retailer
        vm.stopBroadcast();
        console.log("   - Address:", RETAILER_ACCOUNT);
        
        // Registrar CONSUMER
        console.log("4. Registrando CONSUMER...");
        vm.startBroadcast(0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a);
        supplyChain.requestUserRoleById(4); // 4 = Consumer
        vm.stopBroadcast();
        console.log("   - Address:", CONSUMER_ACCOUNT);
        console.log("");
        
        // 3. RESUMEN FINAL
        console.log("========================================");
        console.log("  DESPLIEGUE COMPLETADO");
        console.log("========================================");
        console.log("Contrato:", address(supplyChain));
        console.log("");
        console.log("Usuarios registrados (estado PENDING):");
        console.log("  PRODUCER :", PRODUCER_ACCOUNT);
        console.log("  FACTORY  :", FACTORY_ACCOUNT);
        console.log("  RETAILER :", RETAILER_ACCOUNT);
        console.log("  CONSUMER :", CONSUMER_ACCOUNT);
        console.log("");
        console.log("IMPORTANTE: Los usuarios estan en estado PENDING");
        console.log("El admin debe aprobarlos desde la interfaz web");
        console.log("========================================");
    }
}
