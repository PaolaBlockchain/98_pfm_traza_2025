// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

/**
 * @title SupplyChainTest
 * @notice Test suite para verificar la funcionalidad básica del contrato SupplyChain
 * @dev Tests simples para validar que el admin está correctamente configurado
 */
contract SupplyChainTest is Test {
    SupplyChain public supplyChain;
    
    // Dirección del admin esperada (cuenta 0 de Anvil)
    address public constant EXPECTED_ADMIN = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    
    /**
     * @notice Setup que se ejecuta antes de cada test
     * @dev Despliega el contrato usando la cuenta de admin de Anvil
     */
    function setUp() public {
        // Configurar la cuenta que desplegará el contrato
        vm.prank(EXPECTED_ADMIN);
        
        // Desplegar el contrato SupplyChain
        supplyChain = new SupplyChain();
    }
    
    /**
     * @notice Test para verificar que el admin está configurado correctamente
     * @dev Verifica que la dirección del admin coincide con la cuenta 0 de Anvil (2266)
     */
    function test_AdminIsCorrectlySet() public view {
        // Obtener el admin del contrato
        address contractAdmin = supplyChain.admin();
        
        // Verificar que el admin es la cuenta esperada
        assertEq(contractAdmin, EXPECTED_ADMIN, "El admin no es la cuenta esperada (2266)");
        
        // Log para confirmar
        console.log("Admin configurado correctamente:");
        console.log("Direccion del admin:", contractAdmin);
    }
    
    /**
     * @notice Test para verificar que el admin es detectado como admin por isAdmin()
     * @dev Verifica que la función isAdmin() retorna true para la cuenta admin
     */
    function test_IsAdminReturnsTrue() public view {
        // Verificar que isAdmin retorna true para el admin
        bool isAdminResult = supplyChain.isAdmin(EXPECTED_ADMIN);
        
        assertTrue(isAdminResult, "isAdmin() deberia retornar true para el admin");
        
        // Log para confirmar
        console.log("Verificacion de isAdmin() exitosa para:", EXPECTED_ADMIN);
    }
    
    /**
     * @notice Test para verificar que el admin está registrado como usuario
     * @dev Verifica que el admin tiene un ID de usuario válido en el mapeo
     */
    function test_AdminHasUserId() public view {
        // Obtener el ID de usuario del admin
        uint256 adminUserId = supplyChain.addressToUserId(EXPECTED_ADMIN);
        
        // El admin debería tener ID = 1 (primer usuario registrado)
        assertEq(adminUserId, 1, "El admin deberia tener userId = 1");
        
        // Log para confirmar
        console.log("Admin registrado con userId:", adminUserId);
    }
    
    /**
     * @notice Test para verificar que el admin tiene el rol correcto
     * @dev Verifica que el usuario admin tiene Roles.Admin asignado
     */
    function test_AdminHasAdminRole() public view {
        // Obtener información del usuario admin
        SupplyChain.User memory adminUser = supplyChain.getUserInfo(EXPECTED_ADMIN);
        
        // Verificar que el rol es Admin (enum value = 0)
        assertEq(uint8(adminUser.rol), 0, "El admin deberia tener Roles.Admin");
        
        // Verificar que el estado es Approved (enum value = 1)
        assertEq(uint8(adminUser.status), 1, "El admin deberia tener status Approved");
        
        // Log para confirmar
        console.log("Admin tiene rol correcto: Admin");
        console.log("Admin tiene estado correcto: Approved");
    }
}
