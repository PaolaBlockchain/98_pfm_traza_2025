// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

/**
 * @title Deploy Script
 * @notice Script de despliegue del contrato SupplyChain
 * @dev Usa la cuenta 0 de Anvil por defecto (admin)
 * 
 * Uso:
 * forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
 */
contract DeployScript is Script {
    function run() external {
        // Obtener private key de variable de entorno o usar la de Anvil por defecto
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );

        // Iniciar broadcast de transacciones
        vm.startBroadcast(deployerPrivateKey);

        // Desplegar contrato SupplyChain
        SupplyChain supplyChain = new SupplyChain();

        vm.stopBroadcast();

        // Imprimir dirección del contrato desplegado
        console.log("SupplyChain deployed to:", address(supplyChain));
        console.log("Admin address:", supplyChain.admin());
    }
}
