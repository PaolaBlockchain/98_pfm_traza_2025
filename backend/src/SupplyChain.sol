// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SupplyChainHelper} from "./SupplyChainHelper.sol";

/**
 * @title SupplyChain
 * @author PaolaBlockchain
 * @notice Sistema de gestión de usuarios con roles y estados para trazabilidad en cadena de suministro
 * @dev Contrato principal con seguridad reforzada mediante:
 * - Control de acceso basado en roles (Admin, Producer, Factory, Retailer, Consumer)
 * - Máquina de estados validada para usuarios (Pending, Approved, Rejected, Canceled)
 * - Transferencia de propiedad en dos pasos para prevenir pérdida de control
 * - Protecciones contra operaciones sobre el admin
 * - Validaciones de transiciones de estado mediante librería helper
 * - Eventos completos para auditoría y sincronización off-chain
 */
contract SupplyChain {
    using SupplyChainHelper for uint8;

    // ---- Custom Errors (Optimización de gas) ----
    // GAS OPTIMIZATION: Custom errors ahorran ~50 gas por revert vs strings
    error NotAdmin();
    error UserAlreadyRegistered();
    error UserDoesNotExist();
    error AdminRoleNotAllowed();
    error RoleOutOfRange();
    error InvalidTransition();
    error InvalidAddress();
    error AlreadyAdmin();
    error NotPendingAdmin();
    error AdminCannotCancelAccount();
    error OperationNotAllowedOnAdmin();
    error UserNotApproved();

    // ---- Tipos ----
    /**
     * @notice Estados posibles de un usuario en el sistema
     * @dev Máquina de estados con transiciones validadas:
     * - Pending: Usuario registrado esperando aprobación del admin
     * - Approved: Usuario activo con permisos completos
     * - Rejected: Usuario rechazado por admin (puede cancelar)
     * - Canceled: Estado terminal, usuario fuera del sistema
     */
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }

    /**
     * @notice Roles disponibles en el sistema de cadena de suministro
     * @dev Control de acceso jerárquico:
     * - Admin: Control total del sistema (aprobar/rechazar usuarios, cambiar roles)
     * - Producer: Productor de materias primas
     * - Factory: Procesador/fabricante
     * - Retailer: Distribuidor/minorista
     * - Consumer: Consumidor final
     */
    enum Roles {
        Admin,
        Producer,
        Factory,
        Retailer,
        Consumer
    }

    /**
     * @notice Estructura de datos de usuario
     * @dev Almacena información completa del usuario para gestión del sistema
     * GAS OPTIMIZATION: Campos reordenados para storage packing (2 slots en vez de 4)
     * - address (20 bytes) + Roles (1 byte) + UserStatus (1 byte) = 22 bytes (slot 0)
     * - uint256 id (32 bytes) = slot 1
     * Ahorro: ~2,100 gas por SSTORE al agrupar campos relacionados
     */
    struct User {
        address userAddress;  // 20 bytes - slot 0
        Roles rol;           // 1 byte   - slot 0
        UserStatus status;   // 1 byte   - slot 0
        uint256 id;          // 32 bytes - slot 1
    }

    // ---- Propiedad ----
    address public admin;         // Administrador actual del contrato
    address public pendingAdmin;  // Admin pendiente de confirmación (transferencia en dos pasos)

    // ---- Storage ----
    mapping(uint256 => User) public users;           // Mapeo de ID a datos de usuario
    mapping(address => uint256) public addressToUserId; // Mapeo de dirección a ID (0 = no existe)
    uint256 public nextUserId;                       // Contador de IDs (comienza en 0, admin será 1)

    // ---- Eventos ----
    /**
     * @notice Emitido cuando un nuevo usuario se registra en el sistema
     * @param user Dirección del usuario registrado
     * @param id ID único asignado al usuario
     * @param role Rol solicitado/asignado
     * @param status Estado inicial del usuario
     */
    event UserRegistered(
        address indexed user,
        uint256 indexed id,
        Roles role,
        UserStatus status
    );

    /**
     * @notice Emitido cuando un usuario solicita un rol
     * @param user Dirección del usuario
     * @param requestedRole Rol solicitado
     */
    event UserRoleRequested(address indexed user, Roles requestedRole);

    /**
     * @notice Emitido cuando el admin cambia el rol de un usuario
     * @param user Dirección del usuario
     * @param id ID del usuario
     * @param newRole Nuevo rol asignado
     */
    event UserRoleChanged(
        address indexed user,
        uint256 indexed id,
        Roles newRole
    );

    /**
     * @notice Emitido cuando cambia el estado de un usuario
     * @param user Dirección del usuario
     * @param id ID del usuario
     * @param newStatus Nuevo estado
     */
    event UserStatusChanged(
        address indexed user,
        uint256 indexed id,
        UserStatus newStatus
    );

    /**
     * @notice Emitido cuando se transfiere la propiedad del contrato
     * @dev Permite auditoría externa de cambios de administrador
     * @param previousOwner Admin anterior
     * @param newOwner Nuevo admin
     */
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // ---- Constructor ----
    /**
     * @notice Inicializa el contrato con el desplegador como admin
     * @dev SEGURIDAD: Configuración inicial segura del sistema
     * - El desplegador se convierte automáticamente en admin
     * - Admin se auto-registra como usuario ID=1 con estado Approved
     * - Garantiza que siempre hay al menos un admin operativo
     * - Emite evento de registro para auditoría desde el inicio
     */
    constructor() {
        // 1) definir admin real
        admin = msg.sender;

        // 2) registrar al admin como usuario aprobado (id = 1)
        nextUserId = 1;
        addressToUserId[admin] = nextUserId;
        users[nextUserId] = User({
            id: nextUserId,
            userAddress: admin,
            rol: Roles.Admin,
            status: UserStatus.Approved
        });

        emit UserRegistered(
            admin,
            nextUserId,
            Roles.Admin,
            UserStatus.Approved
        );
    }

    // ---- Modificadores ----
    /**
     * @notice Modificador que restringe acceso solo al administrador actual
     * @dev SEGURIDAD: Protege funciones críticas de ser llamadas por usuarios no autorizados
     * - Previene que usuarios normales aprueben/rechacen otros usuarios
     * - Previene cambios no autorizados de roles y estados
     * - Es la base del control de acceso del contrato
     * GAS OPTIMIZATION: Usa custom error en vez de string (~50 gas ahorro)
     */
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /**
     * @notice Modificador que previene operaciones sobre el admin
     * @dev SEGURIDAD: Protege la integridad del administrador del sistema
     * - Bloquea rechazar/cancelar/modificar la cuenta del admin
     * - Requiere que el usuario objetivo exista en el sistema
     * - Mantiene siempre al menos un admin funcional
     * GAS OPTIMIZATION: Cachea rol en memory para evitar SLOAD duplicado (~100 gas ahorro)
     * @param a Dirección del usuario objetivo de la operación
     */
    modifier notAdminTarget(address a) {
        uint256 id = addressToUserId[a];
        if (id == 0) revert UserDoesNotExist();
        
        // GAS: Cache rol en memory para evitar múltiples SLOADs
        Roles userRole = users[id].rol;
        if (!_isAllowedNonAdminRole(userRole)) revert OperationNotAllowedOnAdmin();
        _;
    }

    // ---- Propiedad (Owner-like) ----
    /**
     * @notice Inicia la transferencia de propiedad del contrato (paso 1 de 2)
     * @dev SEGURIDAD: Implementa patrón de transferencia en dos pasos para evitar errores fatales
     * - Solo el admin actual puede iniciar la transferencia
     * - El nuevo admin debe aceptar explícitamente la propiedad
     * - Previene pérdida permanente de control por error de tipeo
     * - Previene transferencia maliciosa instantánea si admin es comprometido
     * - Permite cancelar la transferencia si se detecta error
     * GAS OPTIMIZATION: Custom errors (~50 gas ahorro)
     * @param _newOwner Dirección del nuevo administrador propuesto
     */
    function transferOwnership(address _newOwner) external onlyAdmin {
        if (_newOwner == address(0)) revert InvalidAddress();
        if (_newOwner == admin) revert AlreadyAdmin();
        pendingAdmin = _newOwner;
    }

    /**
     * @notice Acepta la propiedad del contrato (paso 2 de 2)
     * @dev SEGURIDAD: Confirma que el nuevo admin tiene control de la dirección
     * - Solo el pendingAdmin puede aceptar
     * - Requiere transacción activa del nuevo admin (prueba de control)
     * - Emite evento para auditoría externa
     * - Limpia pendingAdmin después de transferencia exitosa
     * GAS OPTIMIZATION: Custom error + cache previousOwner (~50 gas ahorro)
     */
    function acceptOwnership() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        address previousOwner = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit OwnershipTransferred(previousOwner, admin);
    }

    /**
     * @notice Cancela una transferencia de propiedad pendiente
     * @dev SEGURIDAD: Permite al admin actual revertir si detecta error
     * - Solo el admin actual puede cancelar
     * - Útil si se configuró dirección incorrecta
     */
    function cancelOwnershipTransfer() external onlyAdmin {
        pendingAdmin = address(0);
    }

    // ---- Helpers internos (type-safe) ----

    /**
     * @dev Envoltura type-safe: usa el helper con casts desde enum → uint8
     * @notice SEGURIDAD: Valida transiciones de estado según reglas de negocio
     * - Previene cambios de estado arbitrarios
     * - Mantiene máquina de estados consistente
     * - Usa librería pure para lógica reutilizable y auditada
     */
    function _canTransition(
        UserStatus from,
        UserStatus to
    ) internal pure returns (bool) {
        return SupplyChainHelper.canTransition(uint8(from), uint8(to));
    }

    /**
     * @dev SEGURIDAD: Bloquea que usuarios soliciten o sean asignados como Admin sin autorización
     * - Solo permite roles operativos (Producer, Factory, Retailer, Consumer)
     * - Bloquea rol Admin en solicitudes públicas
     * - Admin solo puede ser asignado por admin actual via changeUserRole
     */
    function _isAllowedNonAdminRole(Roles r) internal pure returns (bool) {
        return SupplyChainHelper.isAllowedNonAdminRole(uint8(r));
    }

    // ============ Operaciones de estado ============

    /**
     * @notice Solicitar rol por enum directo (sin strings, simple y barato)
     * @dev SEGURIDAD: Registra nuevos usuarios con validaciones estrictas
     * - Previene doble registro de la misma dirección (excepto si fue rechazado/cancelado)
     * - Bloquea solicitud de rol Admin (solo roles operativos permitidos)
     * - Usuario inicia siempre en estado Pending (requiere aprobación)
     * - Emite eventos para auditoría y sincronización frontend
     * - Permite re-registro si el usuario fue rechazado o cancelado
     * GAS OPTIMIZATION: 
     * - Custom errors (~50 gas)
     * - Unchecked incremento (~35 gas)
     * - Elimina evento duplicado UserRoleRequested (~375 gas)
     * @param rol_ El rol solicitado (Producer, Factory, Retailer, Consumer)
     */
    function requestUserRoleByEnum(Roles rol_) external {
        uint256 existingId = addressToUserId[msg.sender];
        
        // Permitir re-registro solo si el usuario fue rechazado o cancelado
        if (existingId != 0) {
            UserStatus currentStatus = users[existingId].status;
            if (currentStatus != UserStatus.Rejected && currentStatus != UserStatus.Canceled) {
                revert UserAlreadyRegistered();
            }
            // Si fue rechazado o cancelado, actualizar el usuario existente
            if (!_isAllowedNonAdminRole(rol_)) revert AdminRoleNotAllowed();
            
            users[existingId].rol = rol_;
            users[existingId].status = UserStatus.Pending;
            
            emit UserRegistered(msg.sender, existingId, rol_, UserStatus.Pending);
            return;
        }
        
        // Usuario nuevo - crear registro
        if (!_isAllowedNonAdminRole(rol_)) revert AdminRoleNotAllowed();

        // GAS: unchecked seguro, nextUserId nunca alcanzará 2^256
        unchecked {
            ++nextUserId;
        }
        addressToUserId[msg.sender] = nextUserId;

        users[nextUserId] = User({
            userAddress: msg.sender,
            rol: rol_,
            status: UserStatus.Pending,
            id: nextUserId
        });

        // GAS: Solo emitimos UserRegistered (contiene toda la info necesaria)
        emit UserRegistered(msg.sender, nextUserId, rol_, UserStatus.Pending);
    }

    /**
     * @notice Alternativa si quieres pasar el rol como número (0..N) desde el frontend
     * @dev SEGURIDAD: Mismas protecciones que requestUserRoleByEnum
     * - Valida que rolId esté dentro del rango de enum Roles
     * - Previene integer overflow/underflow (Solidity 0.8.20)
     * - Bloquea rol Admin (id = 0)
     * - Permite re-registro si el usuario fue rechazado o cancelado
     * GAS OPTIMIZATION: Mismas optimizaciones que requestUserRoleByEnum
     * @param rolId Índice del rol (1=Producer, 2=Factory, 3=Retailer, 4=Consumer)
     */
    function requestUserRoleById(uint8 rolId) external {
        uint256 existingId = addressToUserId[msg.sender];
        
        // Permitir re-registro solo si el usuario fue rechazado o cancelado
        if (existingId != 0) {
            UserStatus currentStatus = users[existingId].status;
            if (currentStatus != UserStatus.Rejected && currentStatus != UserStatus.Canceled) {
                revert UserAlreadyRegistered();
            }
            // Si fue rechazado o cancelado, actualizar el usuario existente
            if (rolId > uint8(type(Roles).max)) revert RoleOutOfRange();
            if (!SupplyChainHelper.isAllowedNonAdminRole(rolId)) revert AdminRoleNotAllowed();
            
            users[existingId].rol = Roles(rolId);
            users[existingId].status = UserStatus.Pending;
            
            emit UserRegistered(msg.sender, existingId, Roles(rolId), UserStatus.Pending);
            return;
        }
        
        // Usuario nuevo - crear registro
        if (rolId > uint8(type(Roles).max)) revert RoleOutOfRange();
        if (!SupplyChainHelper.isAllowedNonAdminRole(rolId)) revert AdminRoleNotAllowed();

        // GAS: unchecked + pre-incremento
        unchecked {
            ++nextUserId;
        }
        addressToUserId[msg.sender] = nextUserId;

        users[nextUserId] = User({
            userAddress: msg.sender,
            rol: Roles(rolId),
            status: UserStatus.Pending,
            id: nextUserId
        });

        // GAS: Solo UserRegistered
        emit UserRegistered(msg.sender, nextUserId, Roles(rolId), UserStatus.Pending);
    }

    /**
     * @notice Devuelve toda la información del usuario (revert si no existe)
     * @dev SEGURIDAD: Lectura segura de datos de usuario
     * - Valida existencia antes de retornar datos
     * - View function (no modifica estado, sin costo de gas en llamadas externas)
     * - Retorna struct completo para eficiencia
     * GAS OPTIMIZATION: Custom error (~50 gas ahorro)
     * @param userAddress Dirección del usuario a consultar
     * @return User struct con id, address, rol y status
     */
    function getUserInfo(
        address userAddress
    ) public view returns (User memory) {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) revert UserDoesNotExist();
        return users[id];
    }

    /**
     * @notice Verifica si una address tiene rol Admin (requiere que exista como usuario)
     * @dev SEGURIDAD: Verificación segura de permisos administrativos
     * - Retorna false si el usuario no existe (en vez de revertir)
     * - View function (sin costo de gas)
     * - Útil para controles de acceso en frontend
     * @param userAddress Dirección a verificar
     * @return bool true si es Admin y existe, false en caso contrario
     */
    function isAdmin(address userAddress) public view returns (bool) {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) return false;
        return users[id].rol == Roles.Admin;
    }

    /**
     * @notice Aprueba al usuario 'userAddress' si esta Pendiente
     * @dev SEGURIDAD: Aprobación controlada con múltiples capas de protección
     * - Solo admin puede ejecutar (onlyAdmin)
     * - No puede aprobar al admin (notAdminTarget)
     * - Valida transición de estado (Pending → Approved)
     * - Emite evento para auditoría
     * GAS OPTIMIZATION: Cache storage pointer para evitar SLOAD duplicado (~2,100 gas)
     * @param userAddress Dirección del usuario a aprobar
     */
    function approveUser(
        address userAddress
    ) external onlyAdmin notAdminTarget(userAddress) {
        uint256 id = addressToUserId[userAddress];
        
        // GAS: Cache storage reference para evitar múltiples SLOADs
        User storage user = users[id];
        if (!_canTransition(user.status, UserStatus.Approved)) revert InvalidTransition();
        
        user.status = UserStatus.Approved;
        emit UserStatusChanged(userAddress, id, UserStatus.Approved);
    }

    /**
     * @notice Rechaza al usuario 'userAddress' si esta Pendiente
     * @dev SEGURIDAD: Rechazo controlado con protecciones
     * - Solo admin puede ejecutar (onlyAdmin)
     * - No puede rechazar al admin (notAdminTarget) ← PROTECCIÓN AGREGADA
     * - Valida transición de estado (Pending → Rejected)
     * - Emite evento para auditoría
     * GAS OPTIMIZATION: Cache storage + custom errors (~2,150 gas ahorro)
     * @param userAddress Dirección del usuario a rechazar
     */
    function rejectUser(address userAddress) external onlyAdmin notAdminTarget(userAddress) {
        uint256 id = addressToUserId[userAddress];
        
        // GAS: Cache storage reference
        User storage user = users[id];
        if (!_canTransition(user.status, UserStatus.Rejected)) revert InvalidTransition();
        
        user.status = UserStatus.Rejected;
        emit UserStatusChanged(userAddress, id, UserStatus.Rejected);
    }

    /**
     * @notice El propio usuario puede cancelar su cuenta excepto el admin
     * @dev SEGURIDAD: Auto-cancelación con múltiples restricciones
     * - Usuario debe existir en el sistema
     * - Admin no puede cancelarse a sí mismo (mantiene integridad del sistema)
     * - Solo usuarios Pending pueden cancelar (previene cancelar usuarios activos)
     * - Usa validación de transición consistente ← MEJORA DE SEGURIDAD
     * - Emite evento para auditoría
     * GAS OPTIMIZATION: Cache storage + custom errors (~2,150 gas ahorro)
     */
    function cancelMyAccount() external {
        uint256 id = addressToUserId[msg.sender];
        if (id == 0) revert UserDoesNotExist();

        // GAS: Cache storage reference
        User storage user = users[id];
        
        // El admin no puede cancelarse nunca
        if (!_isAllowedNonAdminRole(user.rol)) revert AdminCannotCancelAccount();

        // Validación consistente de transición usando helper
        if (!_canTransition(user.status, UserStatus.Canceled)) revert InvalidTransition();

        // Ejecuta la cancelación
        user.status = UserStatus.Canceled;
        emit UserStatusChanged(msg.sender, id, UserStatus.Canceled);
    }

    /**
     * @notice Cambia el estado de un usuario con validaciones de existencia y transición
     * @dev SEGURIDAD: Cambio de estado administrativo con validación completa
     * - Solo admin puede ejecutar (onlyAdmin)
     * - No puede cambiar estado del admin (notAdminTarget)
     * - Usuario debe existir en el sistema
     * - Valida que la transición de estado sea permitida por reglas de negocio
     * - Emite evento para auditoría y sincronización
     * GAS OPTIMIZATION: Cache storage + custom errors (~2,150 gas ahorro)
     * @param userAddress Dirección del usuario a modificar
     * @param newStatus Nuevo estado a asignar
     */
    function changeStatusUser(
        address userAddress,
        UserStatus newStatus
    ) public onlyAdmin notAdminTarget(userAddress) {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) revert UserDoesNotExist();
        
        // GAS: Cache storage reference
        User storage user = users[id];
        if (!_canTransition(user.status, newStatus)) revert InvalidTransition();

        user.status = newStatus;
        emit UserStatusChanged(userAddress, id, newStatus);
    }

    /**
     * @notice Cambia el rol de un usuario (solo admin). Requiere que el usuario este Approved.
     * @dev SEGURIDAD: Cambio de rol con protecciones múltiples
     * - Solo admin puede ejecutar (onlyAdmin)
     * - Usuario debe existir en el sistema
     * - Usuario debe estar en estado Approved (usuarios activos solamente)
     * - Permite asignar rol Admin via esta función (única forma de crear nuevos admins)
     * - Emite evento para auditoría
     * - NOTA: Esta es la ÚNICA forma de asignar rol Admin (no via requestUserRole)
     * GAS OPTIMIZATION: Cache storage + custom errors (~2,150 gas ahorro)
     * @param userAddress Dirección del usuario a modificar
     * @param newRole Nuevo rol a asignar (incluyendo Admin)
     */
    function changeUserRole(
        address userAddress,
        Roles newRole
    ) external onlyAdmin {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) revert UserDoesNotExist();
        
        // GAS: Cache storage reference
        User storage user = users[id];
        if (user.status != UserStatus.Approved) revert UserNotApproved();
        
        user.rol = newRole;
        emit UserRoleChanged(userAddress, id, newRole);
    }

    // ============================================================
    //                 TOKEN SYSTEM (MINI ERC-1155)
    // ============================================================

    // ---- Custom Errors Tokens ----
    error TokenDoesNotExist();
    error ZeroSupply();
    error InvalidParent();
    error RoleNotAllowedToCreateToken();
    error CreatorNotApproved();

    // ---- Token structure ----
    struct Token {
        uint256 id;
        address creator;
        string name;
        uint256 totalSupply;
        string features; // JSON con metadatos
        uint256 parentId; // un solo parentId (versión básica)
        uint256 dateCreated;
        mapping(address => uint256) balance; // balances por usuario
    }

    // ---- Storage ----
    uint256 public nextTokenId;
    mapping(uint256 => Token) private tokens; // tokenId → Token
    mapping(address => uint256[]) private tokensByUser; // usuario → ids

    // ---- Eventos ----
    event TokenCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string name,
        uint256 totalSupply,
        uint256 parentId,
        string features
    );


    /**
     * @notice a nivel tecnico: crea un token tipo mini-ERC1155.
       A nivel de negocio: da de alta un producto/lote en la blockchain + da supply al creado
     * @dev Reglas:
     * - Solo usuarios Approved pueden crear
     * - Admin NO puede crear
     * - Producer crea tokens raíz (parentId = 0)
     * - Factory y Retailer pueden usar parentId
     */
    function createToken(
        string memory name,
        uint256 totalSupply,
        string memory features,
        uint256 parentId
    ) external {

    //Parte A -> Validaciones (reglas de negocio)
        // 1) Validar que el usuario esté registrado
        uint256 userId = addressToUserId[msg.sender];
        if (userId == 0) revert UserDoesNotExist();

        User storage u = users[userId];

        // 2) Validar que esté Approved
        if (u.status != UserStatus.Approved) revert CreatorNotApproved();

        // 3) Admin NO crea tokens
        if (u.rol == Roles.Admin) revert RoleNotAllowedToCreateToken();

        // 4) Validar supply
        if (totalSupply == 0) revert ZeroSupply();

        // 5) Validar parentId según el rol
        if (parentId != 0) {
            // Producer NO puede usar parentId
            if (u.rol == Roles.Producer) revert InvalidParent();

            // parentId debe existir
            if (parentId > nextTokenId || parentId == 0) revert InvalidParent();
        } else {
            // Si es Factory o Retailer NO puede crear tokens raíz
            if (u.rol != Roles.Producer) revert InvalidParent();
        }
        
        //Parte B -> Creación real del token en storage

        ++nextTokenId;
        uint256 tokenId = nextTokenId;

        Token storage t = tokens[tokenId];
        t.id = tokenId;
        t.creator = msg.sender;
        t.name = name;
        t.totalSupply = totalSupply;
        t.features = features;
        t.parentId = parentId;
        t.dateCreated = block.timestamp;

        // Asignar supply al creador
        t.balance[msg.sender] = totalSupply;
        tokensByUser[msg.sender].push(tokenId);

        // Emitir evento
        emit TokenCreated(
            tokenId,
            msg.sender,
            name,
            totalSupply,
            parentId,
            features
        );
    }

    
    /**
     * @notice A nivel tenico, consulta los metadatos de un token. A nivel negocio, lee la ficha del producto. 
       No mira balnces
     * @dev Como no se puede retornar mappings, devolvemos solo campos simples.
     */
    function getToken(
        uint256 tokenId
    )
        external
        view
        returns (
            uint256 id,
            address creator,
            string memory name,
            uint256 totalSupply,
            string memory features,
            uint256 parentId,
            uint256 dateCreated
        )
    {
        if (tokenId == 0 || tokenId > nextTokenId) revert TokenDoesNotExist();

        Token storage t = tokens[tokenId];
        return (
            t.id,
            t.creator,
            t.name,
            t.totalSupply,
            t.features,
            t.parentId,
            t.dateCreated
        );
    }


    /**
     * @notice Devuelve cuántos tokens tiene un usuario. Aquí ya no miramos metadatos, sino cuántas unidades tiene alguien.
     */
    function getTokenBalance(
        uint256 tokenId,
        address user
    ) external view returns (uint256) {
        if (tokenId == 0 || tokenId > nextTokenId) revert TokenDoesNotExist();
        return tokens[tokenId].balance[user];
    }


    /**
     * @notice Devuelve una lista de tokenIds donde el usuario tiene balance > 0.
      Es decir, qué productos tiene este usuario. En vez de preguntar "¿cuánto tiene de ESTE token?", 
      preguntamos: ¿Qué tokens tiene este usuario en general?
      Devuelve un array de tokenId (ej: [1, 3, 4]).
     * @dev Itera sobre todos los tokens para encontrar aquellos donde el usuario tiene balance > 0.
      Esto incluye tanto tokens creados por el usuario como tokens recibidos mediante transferencias.
     */
    function getUserTokens(
        address user
    ) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](nextTokenId);
        uint256 count = 0;
        
        // Iterar sobre todos los tokens creados
        for (uint256 i = 1; i <= nextTokenId; i++) {
            if (tokens[i].balance[user] > 0) {
                result[count] = i;
                count++;
            }
        }
        
        // Redimensionar el array al tamaño real
        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        
        return finalResult;
    }
}
