// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SupplyChain} from "../src/SupplyChain.sol";

/**
 * @title SupplyChainTest
 * @notice Test suite completa para verificar toda la funcionalidad del contrato SupplyChain
 * @dev Tests para gestión de usuarios, tokens, transferencias y casos edge
 */
contract SupplyChainTest is Test {
    SupplyChain public supplyChain;
    
    // Dirección del admin esperada (cuenta 0 de Anvil)
    address public constant EXPECTED_ADMIN = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    
    // Usuarios de prueba
    address public producer;
    address public factory;
    address public retailer;
    address public consumer;
    address public nonRegisteredUser;
    
    // IDs de usuarios
    uint256 public producerId;
    uint256 public factoryId;
    uint256 public retailerId;
    uint256 public consumerId;
    
    // Tokens de prueba
    uint256 public rootTokenId;
    uint256 public derivedTokenId;
    
    // Transferencias de prueba
    uint256 public transferId1;
    uint256 public transferId2;
    
    /**
     * @notice Setup que se ejecuta antes de cada test
     * @dev Despliega el contrato y crea usuarios de prueba
     */
    function setUp() public {
        // Configurar la cuenta que desplegará el contrato
        vm.prank(EXPECTED_ADMIN);
        supplyChain = new SupplyChain();
        
        // Crear usuarios de prueba
        producer = address(0x1111);
        factory = address(0x2222);
        retailer = address(0x3333);
        consumer = address(0x4444);
        nonRegisteredUser = address(0x9999);
        
        // Registrar usuarios
        vm.prank(producer);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Producer);
        producerId = supplyChain.addressToUserId(producer);
        
        vm.prank(factory);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Factory);
        factoryId = supplyChain.addressToUserId(factory);
        
        vm.prank(retailer);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Retailer);
        retailerId = supplyChain.addressToUserId(retailer);
        
        vm.prank(consumer);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Consumer);
        consumerId = supplyChain.addressToUserId(consumer);
        
        // Aprobar todos los usuarios
        vm.prank(EXPECTED_ADMIN);
        supplyChain.approveUser(producer);
        
        vm.prank(EXPECTED_ADMIN);
        supplyChain.approveUser(factory);
        
        vm.prank(EXPECTED_ADMIN);
        supplyChain.approveUser(retailer);
        
        vm.prank(EXPECTED_ADMIN);
        supplyChain.approveUser(consumer);
    }

    // ============================================================
    //                    Tests de Gestión de Usuarios
    // ============================================================

    /**
     * @notice Test para verificar el registro de un nuevo usuario
     * @dev Verifica que un usuario puede solicitar un rol y obtener un ID asignado
     * @dev El usuario debe quedar en estado Pending después del registro
     */
    function testUserRegistration() public {
        address newUser = address(0xAAAA);
        
        vm.prank(newUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Producer);
        
        uint256 userId = supplyChain.addressToUserId(newUser);
        assertGt(userId, 0, "Usuario tener un ID asignado");
        
        SupplyChain.User memory user = supplyChain.getUserInfo(newUser);
        assertEq(uint8(user.rol), uint8(SupplyChain.Roles.Producer), "Rol debe ser Producer");
        assertEq(uint8(user.status), uint8(SupplyChain.UserStatus.Pending), "Estado debe ser Pending");
    }

    /**
     * @notice Test para verificar que el admin puede aprobar usuarios
     * @dev Verifica que un usuario en estado Pending puede ser aprobado por el admin
     * @dev El estado del usuario debe cambiar a Approved después de la aprobación
     */
    function testAdminApproveUser() public {
        address newUser = address(0xBBBB);
        
        vm.prank(newUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Factory);
        
        vm.prank(EXPECTED_ADMIN);
        supplyChain.approveUser(newUser);
        
        SupplyChain.User memory user = supplyChain.getUserInfo(newUser);
        assertEq(uint8(user.status), uint8(SupplyChain.UserStatus.Approved), "Estado debe ser Approved");
    }

    /**
     * @notice Test para verificar que el admin puede rechazar usuarios
     * @dev Verifica que un usuario en estado Pending puede ser rechazado por el admin
     * @dev El estado del usuario debe cambiar a Rejected después del rechazo
     */
    function testAdminRejectUser() public {
        address newUser = address(0xCCCC);
        
        vm.prank(newUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Retailer);
        
        vm.prank(EXPECTED_ADMIN);
        supplyChain.rejectUser(newUser);
        
        SupplyChain.User memory user = supplyChain.getUserInfo(newUser);
        assertEq(uint8(user.status), uint8(SupplyChain.UserStatus.Rejected), "Estado debe ser Rejected");
    }

    /**
     * @notice Test para verificar las transiciones de estado de un usuario
     * @dev Verifica el flujo completo: Pending -> Approved -> Canceled
     * @dev Comprueba que cada cambio de estado se refleja correctamente
     */
    function testUserStatusChanges() public {
        address newUser = address(0xDDDD);
        
        vm.prank(newUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Producer);
        
        SupplyChain.User memory user = supplyChain.getUserInfo(newUser);
        assertEq(uint8(user.status), uint8(SupplyChain.UserStatus.Pending), "Estado inicial debe ser Pending");
        
        vm.prank(EXPECTED_ADMIN);
        supplyChain.approveUser(newUser);
        
        user = supplyChain.getUserInfo(newUser);
        assertEq(uint8(user.status), uint8(SupplyChain.UserStatus.Approved), "Estado debe ser Approved");
        
        vm.prank(newUser);
        supplyChain.cancelMyAccount();
        
        user = supplyChain.getUserInfo(newUser);
        assertEq(uint8(user.status), uint8(SupplyChain.UserStatus.Canceled), "Estado debe ser Canceled");
    }

    /**
     * @notice Test para verificar que solo usuarios aprobados pueden operar
     * @dev Verifica que un usuario en estado Pending no puede crear tokens
     * @dev Debe revertir con CreatorNotApproved si el usuario no está aprobado
     */
    function testOnlyApprovedUsersCanOperate() public {
        address pendingUser = address(0xEEEE);
        
        vm.prank(pendingUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Producer);
        
        // Intentar crear token sin estar aprobado debe fallar
        vm.prank(pendingUser);
        vm.expectRevert(SupplyChain.CreatorNotApproved.selector);
        supplyChain.createToken("Test", 100, "{}", 0);
    }

    /**
     * @notice Test para verificar la obtención de información de usuario
     * @dev Verifica que getUserInfo devuelve correctamente todos los datos del usuario
     * @dev Comprueba dirección, rol, estado e ID del usuario
     */
    function testGetUserInfo() public {
        SupplyChain.User memory user = supplyChain.getUserInfo(producer);
        
        assertEq(user.userAddress, producer, "Direccion debe coincidir");
        assertEq(uint8(user.rol), uint8(SupplyChain.Roles.Producer), "Rol debe ser Producer");
        assertEq(uint8(user.status), uint8(SupplyChain.UserStatus.Approved), "Estado debe ser Approved");
        assertEq(user.id, producerId, "ID debe coincidir");
    }

    /**
     * @notice Test para verificar la función isAdmin
     * @dev Verifica que el admin es detectado correctamente como admin
     * @dev Verifica que usuarios no admin no son detectados como admin
     */
    function testIsAdmin() public {
        assertTrue(supplyChain.isAdmin(EXPECTED_ADMIN), "Admin debe ser detectado como admin");
        assertFalse(supplyChain.isAdmin(producer), "Producer no debe ser admin");
        assertFalse(supplyChain.isAdmin(nonRegisteredUser), "Usuario no registrado no debe ser admin");
    }

    // ============================================================
    //                    Tests de Creación de Tokens
    // ============================================================

    /**
     * @notice Test para verificar la creación de un token raíz por un Producer
     * @dev Verifica que un Producer puede crear un token con parentId = 0
     * @dev Comprueba que todos los datos del token se guardan correctamente
     * @dev Verifica que el parentId es 0 para tokens raíz
     */
    function testCreateTokenByProducer() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, '{"origen": "trigo"}', 0);
        
        rootTokenId = supplyChain.nextTokenId();
        assertEq(rootTokenId, 1, "Token ID debe ser 1");
        
        (
            uint256 id,
            address creator,
            string memory name,
            uint256 totalSupply,
            string memory _features,
            uint256 parentId,
            uint256 _dateCreated
        ) = supplyChain.getToken(rootTokenId);
        
        assertEq(id, rootTokenId, "ID debe coincidir");
        assertEq(creator, producer, "Creador debe ser producer");
        assertEq(name, "Harina", "Nombre debe coincidir");
        assertEq(totalSupply, 1000, "Total supply debe ser 1000");
        assertEq(parentId, 0, "Parent ID debe ser 0 (token raiz)");
    }

    /**
     * @notice Test para verificar la creación de un token derivado por un Factory
     * @dev Verifica que un Factory puede crear tokens derivados con un parentId válido
     * @dev Requiere que el Factory tenga balance del token padre
     * @dev Verifica que el parentId del token derivado apunta al token raíz
     */
    function testCreateTokenByFactory() public {
        // Primero crear token raíz
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        // Transferir token a factory
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        
        vm.prank(factory);
        supplyChain.acceptTransfer(1);
        
        // Factory crea token derivado
        vm.prank(factory);
        supplyChain.createToken("Pan", 200, '{"tipo": "integral"}', rootTokenId);
        
        derivedTokenId = supplyChain.nextTokenId();
        assertEq(derivedTokenId, 2, "Token ID debe ser 2");
        
        (,,, uint256 totalSupply,, uint256 parentId,) = supplyChain.getToken(derivedTokenId);
        assertEq(totalSupply, 200, "Total supply debe ser 200");
        assertEq(parentId, rootTokenId, "Parent ID debe ser el token raiz");
    }

    /**
     * @notice Test para verificar que un Retailer no puede crear tokens
     * @dev Verifica que un Retailer no tiene permisos para crear tokens
     * @dev Debe revertir con RoleNotAllowedToCreateToken
     */
    function testCreateTokenByRetailer() public {
        // Retailer NO puede crear tokens
        vm.prank(retailer);
        vm.expectRevert(SupplyChain.RoleNotAllowedToCreateToken.selector);
        supplyChain.createToken("Producto", 100, "{}", 0);
    }

    /**
     * @notice Test para verificar la creación de tokens con parentId
     * @dev Verifica que se puede crear un token derivado con un parentId válido
     * @dev Comprueba que el parentId se asigna correctamente al token derivado
     */
    function testTokenWithParentId() public {
        // Crear token raíz
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        // Transferir a factory
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);
        
        // Factory crea token derivado
        vm.prank(factory);
        supplyChain.createToken("Pan", 200, "{}", rootTokenId);
        
        derivedTokenId = supplyChain.nextTokenId();
        (,,, uint256 totalSupply,, uint256 parentId,) = supplyChain.getToken(derivedTokenId);
        assertEq(parentId, rootTokenId, "Parent ID debe ser correcto");
        assertEq(totalSupply, 200, "Total supply debe ser 200");
    }

    /**
     * @notice Test para verificar el almacenamiento de metadatos en tokens
     * @dev Verifica que los features (metadatos JSON) se guardan y recuperan correctamente
     * @dev Comprueba que los metadatos no se modifican durante el almacenamiento
     */
    function testTokenMetadata() public {
        string memory features = '{"origen": "trigo", "calidad": "A"}';
        
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, features, 0);
        
        rootTokenId = supplyChain.nextTokenId();
        (,,,, string memory returnedFeatures,,) = supplyChain.getToken(rootTokenId);
        
        assertEq(returnedFeatures, features, "Features deben coincidir");
    }

    /**
     * @notice Test para verificar el balance de tokens
     * @dev Verifica que el creador del token recibe el totalSupply como balance inicial
     * @dev Verifica que otros usuarios tienen balance 0 para el token recién creado
     */
    function testTokenBalance() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        uint256 balance = supplyChain.getTokenBalance(rootTokenId, producer);
        assertEq(balance, 1000, "Balance inicial debe ser 1000");
        
        uint256 balanceFactory = supplyChain.getTokenBalance(rootTokenId, factory);
        assertEq(balanceFactory, 0, "Balance de factory debe ser 0");
    }

    /**
     * @notice Test para verificar la función getToken
     * @dev Verifica que getToken devuelve correctamente todos los datos del token
     * @dev Comprueba ID, creador, nombre, totalSupply, features, parentId y fecha de creación
     */
    function testGetToken() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, '{"origen": "trigo"}', 0);
        rootTokenId = supplyChain.nextTokenId();
        
        (uint256 id, address creator, string memory name, uint256 totalSupply, string memory features, uint256 parentId, uint256 dateCreated) = 
            supplyChain.getToken(rootTokenId);
        
        assertEq(id, rootTokenId, "ID debe coincidir");
        assertEq(creator, producer, "Creator debe ser producer");
        assertEq(name, "Harina", "Nombre debe coincidir");
        assertEq(totalSupply, 1000, "Total supply debe ser 1000");
        assertEq(features, '{"origen": "trigo"}', "Features deben coincidir");
        assertEq(parentId, 0, "Parent ID debe ser 0");
        assertGt(dateCreated, 0, "Date created debe ser mayor a 0");
    }

    /**
     * @notice Test para verificar la función getUserTokens
     * @dev Verifica que getUserTokens devuelve todos los tokens donde el usuario tiene balance
     * @dev Comprueba que solo se devuelven tokens con balance > 0
     */
    function testGetUserTokens() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        uint256[] memory tokens = supplyChain.getUserTokens(producer);
        assertEq(tokens.length, 1, "Debe tener 1 token");
        assertEq(tokens[0], rootTokenId, "Token ID debe coincidir");
    }

    // ============================================================
    //                    Tests de Transferencias
    // ============================================================

    /**
     * @notice Test para verificar transferencia de Producer a Factory
     * @dev Verifica que un Producer puede iniciar una transferencia a un Factory
     * @dev Comprueba que la transferencia se crea con estado Pending
     * @dev Verifica que todos los datos de la transferencia son correctos
     */
    function testTransferFromProducerToFactory() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        
        transferId1 = supplyChain.nextTransferId();
        (uint256 id, address from, address to, uint256 tokenId, uint256 amount, SupplyChain.TransferStatus status) = 
            _getTransfer(transferId1);
        
        assertEq(from, producer, "From debe ser producer");
        assertEq(to, factory, "To debe ser factory");
        assertEq(tokenId, rootTokenId, "Token ID debe coincidir");
        assertEq(amount, 500, "Amount debe ser 500");
        assertEq(uint8(status), uint8(SupplyChain.TransferStatus.Pending), "Status debe ser Pending");
    }

    /**
     * @notice Test para verificar transferencia de Factory a Retailer
     * @dev Verifica el flujo completo: Producer -> Factory -> Retailer
     * @dev Comprueba que Factory puede transferir después de aceptar una transferencia
     * @dev Verifica que se respeta el flujo de roles en la cadena de suministro
     */
    function testTransferFromFactoryToRetailer() public {
        // Setup: Producer crea token y lo transfiere a Factory
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);
        
        // Factory transfiere a Retailer
        vm.prank(factory);
        supplyChain.transfer(retailer, rootTokenId, 200);
        
        transferId2 = supplyChain.nextTransferId();
        (address from, address to,,,) = _getTransferBasic(transferId2);
        
        assertEq(from, factory, "From debe ser factory");
        assertEq(to, retailer, "To debe ser retailer");
    }

    /**
     * @notice Test para verificar transferencia de Retailer a Consumer
     * @dev Verifica el flujo completo de la cadena: Producer -> Factory -> Retailer -> Consumer
     * @dev Comprueba que Retailer puede transferir a Consumer
     * @dev Verifica que todas las transferencias intermedias se aceptan correctamente
     */
    function testTransferFromRetailerToConsumer() public {
        // Setup completo
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);
        
        vm.prank(factory);
        supplyChain.transfer(retailer, rootTokenId, 200);
        vm.prank(retailer);
        supplyChain.acceptTransfer(2);
        
        // Retailer transfiere a Consumer
        vm.prank(retailer);
        supplyChain.transfer(consumer, rootTokenId, 100);
        
        uint256 transferId = supplyChain.nextTransferId();
        (address from, address to,,,) = _getTransferBasic(transferId);
        
        assertEq(from, retailer, "From debe ser retailer");
        assertEq(to, consumer, "To debe ser consumer");
    }

    /**
     * @notice Test para verificar la aceptación de una transferencia
     * @dev Verifica que el receptor puede aceptar una transferencia pendiente
     * @dev Comprueba que los balances se actualizan correctamente después de aceptar
     * @dev Verifica que el estado de la transferencia cambia a Accepted
     */
    function testAcceptTransfer() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        
        uint256 balanceBefore = supplyChain.getTokenBalance(rootTokenId, factory);
        assertEq(balanceBefore, 0, "Balance antes debe ser 0");
        
        vm.prank(factory);
        supplyChain.acceptTransfer(transferId1);
        
        uint256 balanceAfter = supplyChain.getTokenBalance(rootTokenId, factory);
        assertEq(balanceAfter, 500, "Balance despues debe ser 500");
        
        uint256 balanceProducer = supplyChain.getTokenBalance(rootTokenId, producer);
        assertEq(balanceProducer, 500, "Balance de producer debe ser 500");
        
        (,,,,, SupplyChain.TransferStatus status) = _getTransfer(transferId1);
        assertEq(uint8(status), uint8(SupplyChain.TransferStatus.Accepted), "Status debe ser Accepted");
    }

    /**
     * @notice Test para verificar el rechazo de una transferencia
     * @dev Verifica que el receptor puede rechazar una transferencia pendiente
     * @dev Comprueba que los balances NO se modifican al rechazar
     * @dev Verifica que el estado de la transferencia cambia a Rejected
     */
    function testRejectTransfer() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        
        vm.prank(factory);
        supplyChain.rejectTransfer(transferId1);
        
        (,,,,, SupplyChain.TransferStatus status) = _getTransfer(transferId1);
        assertEq(uint8(status), uint8(SupplyChain.TransferStatus.Rejected), "Status debe ser Rejected");
        
        uint256 balanceFactory = supplyChain.getTokenBalance(rootTokenId, factory);
        assertEq(balanceFactory, 0, "Balance de factory debe seguir siendo 0");
    }

    /**
     * @notice Test para verificar que no se puede transferir más balance del disponible
     * @dev Verifica que intentar transferir más tokens de los que se tienen falla
     * @dev Debe revertir con InsufficientBalance cuando el balance es insuficiente
     */
    function testTransferInsufficientBalance() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        vm.expectRevert(SupplyChain.InsufficientBalance.selector);
        supplyChain.transfer(factory, rootTokenId, 2000);
    }

    /**
     * @notice Test para verificar la función getTransfer
     * @dev Verifica que getTransfer devuelve correctamente todos los datos de una transferencia
     * @dev Comprueba ID, from, to, tokenId, amount, status y dateCreated
     */
    function testGetTransfer() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        
        (uint256 id, address from, address to, uint256 tokenId, uint256 dateCreated, uint256 amount, SupplyChain.TransferStatus status) = 
            supplyChain.getTransfer(transferId1);
        
        assertEq(id, transferId1, "ID debe coincidir");
        assertEq(from, producer, "From debe ser producer");
        assertEq(to, factory, "To debe ser factory");
        assertEq(tokenId, rootTokenId, "Token ID debe coincidir");
        assertEq(amount, 500, "Amount debe ser 500");
        assertEq(uint8(status), uint8(SupplyChain.TransferStatus.Pending), "Status debe ser Pending");
        assertGt(dateCreated, 0, "Date created debe ser mayor a 0");
    }

    /**
     * @notice Test para verificar la función getUserTransfers
     * @dev Verifica que getUserTransfers devuelve todas las transferencias de un usuario
     * @dev Comprueba que se incluyen tanto transferencias enviadas como recibidas
     */
    function testGetUserTransfers() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        
        uint256[] memory transfers = supplyChain.getUserTransfers(producer);
        assertGt(transfers.length, 0, "Debe tener al menos 1 transferencia");
    }

    // ============================================================
    //              Tests de Validaciones y Permisos
    // ============================================================

    /**
     * @notice Test para verificar que no se puede transferir saltando roles en la cadena
     * @dev Verifica que Producer no puede transferir directamente a Retailer
     * @dev Debe seguir el flujo: Producer -> Factory -> Retailer -> Consumer
     * @dev Debe revertir con InvalidRoleTransfer si se intenta saltar un paso
     */
    function testInvalidRoleTransfer() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        // Producer no puede transferir directamente a Retailer
        vm.prank(producer);
        vm.expectRevert(SupplyChain.InvalidRoleTransfer.selector);
        supplyChain.transfer(retailer, rootTokenId, 500);
    }

    /**
     * @notice Test para verificar que usuarios no aprobados no pueden crear tokens
     * @dev Verifica que un usuario en estado Pending no puede crear tokens
     * @dev Debe revertir con CreatorNotApproved si el usuario no está aprobado
     */
    function testUnapprovedUserCannotCreateToken() public {
        address pendingUser = address(0xFFFF);
        
        vm.prank(pendingUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Producer);
        
        vm.prank(pendingUser);
        vm.expectRevert(SupplyChain.CreatorNotApproved.selector);
        supplyChain.createToken("Test", 100, "{}", 0);
    }

    /**
     * @notice Test para verificar que usuarios no aprobados no pueden transferir
     * @dev Verifica que un usuario en estado Pending no puede iniciar transferencias
     * @dev Debe revertir con UserNotApproved si el usuario no está aprobado
     */
    function testUnapprovedUserCannotTransfer() public {
        address pendingUser = address(0xEEEE);
        
        vm.prank(pendingUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Producer);
        
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(pendingUser);
        vm.expectRevert(SupplyChain.UserNotApproved.selector);
        supplyChain.transfer(factory, rootTokenId, 100);
    }

    /**
     * @notice Test para verificar que solo el admin puede cambiar estados de usuarios
     * @dev Verifica que un usuario no admin no puede aprobar otros usuarios
     * @dev Debe revertir con NotAdmin si un usuario no admin intenta aprobar
     */
    function testOnlyAdminCanChangeStatus() public {
        address newUser = address(0xAAAA);
        
        vm.prank(newUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Producer);
        
        // Usuario no admin no puede aprobar
        vm.prank(producer);
        vm.expectRevert(SupplyChain.NotAdmin.selector);
        supplyChain.approveUser(newUser);
    }

    /**
     * @notice Test para verificar que Consumer no puede transferir tokens
     * @dev Verifica que Consumer es el último eslabón de la cadena y no puede transferir
     * @dev Debe revertir con InvalidRoleTransfer si Consumer intenta transferir
     */
    function testConsumerCannotTransfer() public {
        // Setup: token llega a consumer
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        vm.prank(factory);
        supplyChain.acceptTransfer(1);
        
        vm.prank(factory);
        supplyChain.transfer(retailer, rootTokenId, 200);
        vm.prank(retailer);
        supplyChain.acceptTransfer(2);
        
        vm.prank(retailer);
        supplyChain.transfer(consumer, rootTokenId, 100);
        vm.prank(consumer);
        supplyChain.acceptTransfer(3);
        
        // Consumer no puede transferir
        vm.prank(consumer);
        vm.expectRevert(SupplyChain.InvalidRoleTransfer.selector);
        supplyChain.transfer(producer, rootTokenId, 50);
    }

    /**
     * @notice Test para verificar que no se puede transferir a la misma dirección
     * @dev Verifica que intentar transferir tokens a uno mismo falla
     * @dev Debe revertir con CannotTransferToSelf
     */
    function testTransferToSameAddress() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        vm.expectRevert(SupplyChain.CannotTransferToSelf.selector);
        supplyChain.transfer(producer, rootTokenId, 100);
    }

    // ============================================================
    //                    Tests de Casos Edge
    // ============================================================

    /**
     * @notice Test para verificar que no se puede transferir cantidad cero
     * @dev Verifica que intentar transferir 0 tokens falla
     * @dev Debe revertir con InvalidAmount cuando amount es 0
     */
    function testTransferZeroAmount() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        vm.expectRevert(SupplyChain.InvalidAmount.selector);
        supplyChain.transfer(factory, rootTokenId, 0);
    }

    /**
     * @notice Test para verificar que no se puede transferir un token inexistente
     * @dev Verifica que intentar transferir un token que no existe falla
     * @dev Debe revertir con TokenDoesNotExist cuando el tokenId no existe
     */
    function testTransferNonExistentToken() public {
        vm.prank(producer);
        vm.expectRevert(SupplyChain.TokenDoesNotExist.selector);
        supplyChain.transfer(factory, 999, 100);
    }

    /**
     * @notice Test para verificar que no se puede aceptar una transferencia inexistente
     * @dev Verifica que intentar aceptar un transferId que no existe falla
     * @dev Debe revertir con TransferDoesNotExist cuando el transferId no existe
     */
    function testAcceptNonExistentTransfer() public {
        vm.expectRevert(SupplyChain.TransferDoesNotExist.selector);
        supplyChain.acceptTransfer(999);
    }

    /**
     * @notice Test para verificar que no se puede aceptar una transferencia dos veces
     * @dev Verifica que una transferencia ya procesada no puede ser aceptada nuevamente
     * @dev Debe revertir con TransferAlreadyProcessed al intentar aceptar dos veces
     */
    function testDoubleAcceptTransfer() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        
        vm.prank(factory);
        supplyChain.acceptTransfer(transferId1);
        
        // Intentar aceptar de nuevo debe fallar
        vm.prank(factory);
        vm.expectRevert(SupplyChain.TransferAlreadyProcessed.selector);
        supplyChain.acceptTransfer(transferId1);
    }

    /**
     * @notice Test para verificar que no se puede aceptar una transferencia después de rechazarla
     * @dev Verifica que una transferencia rechazada no puede ser aceptada posteriormente
     * @dev Debe revertir con TransferAlreadyProcessed al intentar aceptar después de rechazar
     */
    function testTransferAfterRejection() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        
        vm.prank(factory);
        supplyChain.rejectTransfer(transferId1);
        
        // Intentar aceptar despues de rechazar debe fallar
        vm.prank(factory);
        vm.expectRevert(SupplyChain.TransferAlreadyProcessed.selector);
        supplyChain.acceptTransfer(transferId1);
    }

    // ============================================================
    //                    Tests de Eventos
    // ============================================================

    /**
     * @notice Test para verificar que se emite el evento UserRegistered
     * @dev Verifica que al registrar un usuario se emite el evento con los datos correctos
     * @dev Comprueba que el evento incluye address, id, rol y status
     */
    function testUserRegisteredEvent() public {
        address newUser = address(0xAAAA);
        
        // Obtener el ID esperado (siguiente después de los usuarios del setUp)
        uint256 expectedId = supplyChain.nextUserId() + 1;
        
        vm.expectEmit(true, true, false, true);
        emit SupplyChain.UserRegistered(newUser, expectedId, SupplyChain.Roles.Producer, SupplyChain.UserStatus.Pending);
        
        vm.prank(newUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Producer);
    }

    /**
     * @notice Test para verificar que se emite el evento UserStatusChanged
     * @dev Verifica que al cambiar el estado de un usuario se emite el evento
     * @dev Comprueba que el evento incluye address, id y nuevo status
     */
    function testUserStatusChangedEvent() public {
        address newUser = address(0xBBBB);
        
        vm.prank(newUser);
        supplyChain.requestUserRoleByEnum(SupplyChain.Roles.Factory);
        uint256 userId = supplyChain.addressToUserId(newUser);
        
        vm.expectEmit(true, true, false, true);
        emit SupplyChain.UserStatusChanged(newUser, userId, SupplyChain.UserStatus.Approved);
        
        vm.prank(EXPECTED_ADMIN);
        supplyChain.approveUser(newUser);
    }

    /**
     * @notice Test para verificar que se emite el evento TokenCreated
     * @dev Verifica que al crear un token se emite el evento con los datos correctos
     * @dev Comprueba que el evento incluye tokenId, creator, name, totalSupply, parentId y features
     */
    function testTokenCreatedEvent() public {
        vm.expectEmit(true, true, false, true);
        emit SupplyChain.TokenCreated(1, producer, "Harina", 1000, 0, "{}");
        
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
    }

    /**
     * @notice Test para verificar que se emite el evento TransferRequested
     * @dev Verifica que al iniciar una transferencia se emite el evento
     * @dev Comprueba que el evento incluye transferId, from, to, tokenId y amount
     */
    function testTransferInitiatedEvent() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.expectEmit(true, true, true, true);
        emit SupplyChain.TransferRequested(1, producer, factory, rootTokenId, 500);
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
    }

    /**
     * @notice Test para verificar que se emite el evento TransferAccepted
     * @dev Verifica que al aceptar una transferencia se emite el evento
     * @dev Comprueba que el evento incluye el transferId
     */
    function testTransferAcceptedEvent() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        
        vm.expectEmit(true, false, false, false);
        emit SupplyChain.TransferAccepted(transferId1);
        
        vm.prank(factory);
        supplyChain.acceptTransfer(transferId1);
    }

    /**
     * @notice Test para verificar que se emite el evento TransferRejected
     * @dev Verifica que al rechazar una transferencia se emite el evento
     * @dev Comprueba que el evento incluye el transferId
     */
    function testTransferRejectedEvent() public {
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        
        vm.expectEmit(true, false, false, false);
        emit SupplyChain.TransferRejected(transferId1);
        
        vm.prank(factory);
        supplyChain.rejectTransfer(transferId1);
    }

    // ============================================================
    //                    Tests de Flujo Completo
    // ============================================================

    /**
     * @notice Test para verificar el flujo completo de la cadena de suministro
     * @dev Verifica el flujo completo: Producer crea token -> Factory -> Retailer -> Consumer
     * @dev Comprueba que Factory puede crear tokens derivados consumiendo tokens padre
     * @dev Verifica que todos los balances se actualizan correctamente en cada paso
     * @dev Este test valida la funcionalidad end-to-end del sistema
     */
    function testCompleteSupplyChainFlow() public {
        // 1. Producer crea token raiz
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, '{"origen": "trigo"}', 0);
        rootTokenId = supplyChain.nextTokenId();
        
        uint256 balance = supplyChain.getTokenBalance(rootTokenId, producer);
        assertEq(balance, 1000, "Producer debe tener 1000 unidades");
        
        // 2. Producer transfiere a Factory
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        
        vm.prank(factory);
        supplyChain.acceptTransfer(transferId1);
        
        balance = supplyChain.getTokenBalance(rootTokenId, factory);
        assertEq(balance, 500, "Factory debe tener 500 unidades");
        balance = supplyChain.getTokenBalance(rootTokenId, producer);
        assertEq(balance, 500, "Producer debe tener 500 unidades restantes");
        
        // 3. Factory crea token derivado
        vm.prank(factory);
        supplyChain.createToken("Pan", 200, '{"tipo": "integral"}', rootTokenId);
        derivedTokenId = supplyChain.nextTokenId();
        
        balance = supplyChain.getTokenBalance(rootTokenId, factory);
        assertEq(balance, 300, "Factory debe tener 300 unidades restantes (500 - 200)");
        
        // 4. Factory transfiere a Retailer
        vm.prank(factory);
        supplyChain.transfer(retailer, rootTokenId, 200);
        transferId2 = supplyChain.nextTransferId();
        
        vm.prank(retailer);
        supplyChain.acceptTransfer(transferId2);
        
        balance = supplyChain.getTokenBalance(rootTokenId, retailer);
        assertEq(balance, 200, "Retailer debe tener 200 unidades");
        
        // 5. Retailer transfiere a Consumer
        vm.prank(retailer);
        supplyChain.transfer(consumer, rootTokenId, 100);
        uint256 transferId3 = supplyChain.nextTransferId();
        
        vm.prank(consumer);
        supplyChain.acceptTransfer(transferId3);
        
        balance = supplyChain.getTokenBalance(rootTokenId, consumer);
        assertEq(balance, 100, "Consumer debe tener 100 unidades");
        balance = supplyChain.getTokenBalance(rootTokenId, retailer);
        assertEq(balance, 100, "Retailer debe tener 100 unidades restantes");
    }

    /**
     * @notice Test para verificar la creación y gestión de múltiples tokens
     * @dev Verifica que un Producer puede crear múltiples tokens raíz
     * @dev Comprueba que cada token recibe un ID único e incremental
     * @dev Verifica que getUserTokens devuelve todos los tokens del usuario
     */
    function testMultipleTokensFlow() public {
        // Crear múltiples tokens
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        uint256 token1 = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.createToken("Azucar", 500, "{}", 0);
        uint256 token2 = supplyChain.nextTokenId();
        
        assertEq(token1, 1, "Primer token debe ser ID 1");
        assertEq(token2, 2, "Segundo token debe ser ID 2");
        
        uint256[] memory tokens = supplyChain.getUserTokens(producer);
        assertEq(tokens.length, 2, "Producer debe tener 2 tokens");
    }

    /**
     * @notice Test para verificar la trazabilidad completa de transferencias
     * @dev Verifica que se puede rastrear el historial completo de transferencias
     * @dev Comprueba que cada usuario puede ver sus transferencias enviadas y recibidas
     * @dev Valida que la información de trazabilidad es completa y correcta
     */
    function testTraceabilityFlow() public {
        // Crear token y hacer transferencias
        vm.prank(producer);
        supplyChain.createToken("Harina", 1000, "{}", 0);
        rootTokenId = supplyChain.nextTokenId();
        
        vm.prank(producer);
        supplyChain.transfer(factory, rootTokenId, 500);
        transferId1 = supplyChain.nextTransferId();
        vm.prank(factory);
        supplyChain.acceptTransfer(transferId1);
        
        vm.prank(factory);
        supplyChain.transfer(retailer, rootTokenId, 200);
        transferId2 = supplyChain.nextTransferId();
        vm.prank(retailer);
        supplyChain.acceptTransfer(transferId2);
        
        // Verificar trazabilidad
        uint256[] memory producerTransfers = supplyChain.getUserTransfers(producer);
        uint256[] memory factoryTransfers = supplyChain.getUserTransfers(factory);
        uint256[] memory retailerTransfers = supplyChain.getUserTransfers(retailer);
        
        assertGt(producerTransfers.length, 0, "Producer debe tener transferencias");
        assertGt(factoryTransfers.length, 0, "Factory debe tener transferencias");
        assertGt(retailerTransfers.length, 0, "Retailer debe tener transferencias");
        
        // Verificar detalles de transferencias
        (uint256 id, address from, address to, uint256 tokenId, uint256 amount, SupplyChain.TransferStatus status) = 
            _getTransfer(transferId1);
        assertEq(from, producer, "Primera transferencia: from debe ser producer");
        assertEq(to, factory, "Primera transferencia: to debe ser factory");
        assertEq(uint8(status), uint8(SupplyChain.TransferStatus.Accepted), "Status debe ser Accepted");
    }

    // ============================================================
    //                    Helper Functions
    // ============================================================

    /**
     * @notice Función helper para obtener datos de una transferencia
     * @dev Extrae los campos principales de una transferencia omitiendo dateCreated
     * @param transferId ID de la transferencia a consultar
     * @return id ID de la transferencia
     * @return from Dirección del emisor
     * @return to Dirección del receptor
     * @return tokenId ID del token transferido
     * @return amount Cantidad transferida
     * @return status Estado de la transferencia
     */
    function _getTransfer(uint256 transferId) internal view returns (
        uint256 id,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        SupplyChain.TransferStatus status
    ) {
        (id, from, to, tokenId,, amount, status) = supplyChain.getTransfer(transferId);
    }

    /**
     * @notice Función helper para obtener datos básicos de una transferencia
     * @dev Extrae solo los campos esenciales de una transferencia omitiendo id y dateCreated
     * @param transferId ID de la transferencia a consultar
     * @return from Dirección del emisor
     * @return to Dirección del receptor
     * @return tokenId ID del token transferido
     * @return amount Cantidad transferida
     * @return status Estado de la transferencia
     */
    function _getTransferBasic(uint256 transferId) internal view returns (
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        SupplyChain.TransferStatus status
    ) {
        (, from, to, tokenId,, amount, status) = supplyChain.getTransfer(transferId);
    }
}
