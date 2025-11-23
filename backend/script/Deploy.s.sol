// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

/**
 * @title Deploy Script
 * @notice Script de despliegue del contrato SupplyChain
 * @dev Solo despliega el contrato. Los usuarios deben registrarse desde la interfaz web.
 * 
 * Uso:
 * forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
 */
contract DeployScript is Script {
    // Private key del admin (Account 0 de Anvil)
    uint256 constant ADMIN_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    
    function run() external {
        console.log("========================================");
        console.log("  DESPLEGANDO CONTRATO SUPPLYCHAIN");
        console.log("========================================");
        
        vm.startBroadcast(ADMIN_PRIVATE_KEY);
        SupplyChain supplyChain = new SupplyChain();
        vm.stopBroadcast();
        
        console.log("Contrato desplegado en:", address(supplyChain));
        console.log("Admin:", supplyChain.admin());
        console.log("");
        console.log("========================================");
        console.log("  DESPLIEGUE COMPLETADO");
        console.log("========================================");
        console.log("");
        console.log("Los usuarios deben registrarse desde la interfaz web");
        console.log("usando la funcion requestUserRoleByEnum() del contrato.");
        console.log("========================================");
    }
}
