// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SupplyChainHelper} from "./SupplyChainHelper.sol";

/**
 * @title SupplyChain
 * @author PaolaBlockchain
 * @notice Sistema de gestión de usuarios con roles y estados + capa básica de tokens.
 *
 * @dev Contrato principal con:
 * - Control de acceso basado en roles (Admin, Producer, Factory, Retailer, Consumer)
 * - Máquina de estados validada para usuarios (Pending, Approved, Rejected, Canceled)
 * - Transferencia de propiedad en dos pasos (admin → pendingAdmin → acceptOwnership)
 * - Protección contra operaciones sobre el admin (no se rechaza/cancela al admin)
 * - Capa de tokens tipo mini-ERC1155 para productos / materias primas
 * - Eventos para auditoría y sincronización off-chain (frontend, indexers, etc.)
 */
contract SupplyChain {
    using SupplyChainHelper for uint8;

    // =====================================================================
    //                             CUSTOM ERRORS
    // =====================================================================

    // User / ownership
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

    // Tokens
    error TokenDoesNotExist();
    error ZeroSupply();
    error InvalidParent();
    error RoleNotAllowedToCreateToken();
    error CreatorNotApproved();

    // =====================================================================
    //                                ENUMS
    // =====================================================================

    /**
     * @notice Estados posibles de un usuario en el sistema.
     *
     * @dev Máquina de estados:
     * - Pending:  Usuario registrado esperando aprobación del admin.
     * - Approved: Usuario activo con permisos completos.
     * - Rejected: Usuario rechazado (en esta versión no cambia a otros estados).
     * - Canceled: Usuario fuera del sistema (estado terminal).
     */
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }

    /**
     * @notice Roles disponibles en el sistema.
     *
     * @dev Mapeo semántico:
     * - Admin    (0): Control total del sistema (solo se asigna por changeUserRole).
     * - Producer (1): Productor de materias primas.
     * - Factory  (2): Transformación / procesamiento.
     * - Retailer (3): Distribuidor / minorista.
     * - Consumer (4): Consumidor final.
     */
    enum Roles {
        Admin,
        Producer,
        Factory,
        Retailer,
        Consumer
    }

    // =====================================================================
    //                               STRUCTS
    // =====================================================================

    /**
     * @notice Representa un usuario registrado en la cadena de suministro.
     *
     * @dev Storage packing:
     * - slot 0: address (20 bytes) + Roles (1 byte) + UserStatus (1 byte)
     * - slot 1: uint256 id
     */
    struct User {
        address userAddress;
        Roles rol;
        UserStatus status;
        uint256 id;
    }

    /**
     * @notice Representa un token tipo mini-ERC1155 (producto/lote).
     *
     * @dev
     * - id:          Identificador único del token.
     * - creator:     Quién creó el lote/producto.
     * - name:        Nombre descriptivo.
     * - totalSupply: Cantidad total emitida (se asigna al creador inicialmente).
     * - features:    Metadatos (por ejemplo JSON con características).
     * - parentId:    Relación con otro token (0 = raíz).
     * - dateCreated: Marca de tiempo de creación (block.timestamp).
     * - balance:     mapping address → unidades que posee cada usuario.
     */
    struct Token {
        uint256 id;
        address creator;
        string name;
        uint256 totalSupply;
        string features;
        uint256 parentId;
        uint256 dateCreated;
        mapping(address => uint256) balance;
    }

    // =====================================================================
    //                               STORAGE
    // =====================================================================

    // ---- Propiedad ----
    /// @notice Administrador actual del contrato.
    address public admin;

    /// @notice Admin pendiente (para transferencia de propiedad en dos pasos).
    address public pendingAdmin;

    // ---- Usuarios ----
    /// @notice Mapeo de ID de usuario a datos de usuario.
    mapping(uint256 => User) public users;

    /// @notice Mapeo de address a ID de usuario (0 = no existe).
    mapping(address => uint256) public addressToUserId;

    /// @notice Contador incremental de IDs de usuario (admin será ID=1).
    uint256 public nextUserId;

    // ---- Tokens ----
    /// @notice Contador incremental de tokens.
    uint256 public nextTokenId;

    /// @notice Mapeo de tokenId a Token (struct con metadatos y balances).
    mapping(uint256 => Token) private tokens;

    /// @notice Índice simple de tokens por usuario (no usado en getUserTokens en esta versión).
    mapping(address => uint256[]) private tokensByUser;

    // =====================================================================
    //                                EVENTS
    // =====================================================================

    /**
     * @notice Emitido cuando un nuevo usuario se registra.
     * @param user   Dirección del usuario registrado.
     * @param id     ID único asignado.
     * @param role   Rol solicitado/asignado.
     * @param status Estado inicial.
     */
    event UserRegistered(
        address indexed user,
        uint256 indexed id,
        Roles role,
        UserStatus status
    );

    /**
     * @notice Emitido cuando se cambia el rol de un usuario.
     * @param user    Dirección del usuario.
     * @param id      ID del usuario.
     * @param newRole Nuevo rol.
     */
    event UserRoleChanged(
        address indexed user,
        uint256 indexed id,
        Roles newRole
    );

    /**
     * @notice Emitido cuando cambia el estado de un usuario.
     * @param user      Dirección del usuario.
     * @param id        ID del usuario.
     * @param newStatus Nuevo estado.
     */
    event UserStatusChanged(
        address indexed user,
        uint256 indexed id,
        UserStatus newStatus
    );

    /**
     * @notice Emitido cuando se transfiere la propiedad del contrato.
     * @param previousOwner Admin anterior.
     * @param newOwner      Nuevo admin.
     */
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @notice Emitido cuando se crea un nuevo token/lote.
     * @param tokenId     ID del token creado.
     * @param creator     Creador del token.
     * @param name        Nombre del producto/lote.
     * @param totalSupply Cantidad total emitida.
     * @param parentId    Id del token padre (0 si es raíz).
     * @param features    Metadatos (ej. JSON).
     */
    event TokenCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string name,
        uint256 totalSupply,
        uint256 parentId,
        string features
    );

    // =====================================================================
    //                              CONSTRUCTOR
    // =====================================================================

    /**
     * @notice Inicializa el contrato con el deployer como admin.
     * @dev Efectos:
     * - admin = msg.sender
     * - Se registra como usuario ID=1 con rol Admin y estado Approved.
     * - Emite UserRegistered para dejar trazado el setup inicial.
     */
    constructor() {
        admin = msg.sender;

        nextUserId = 1;
        addressToUserId[admin] = nextUserId;

        users[nextUserId] = User({
            userAddress: admin,
            rol: Roles.Admin,
            status: UserStatus.Approved,
            id: nextUserId
        });

        emit UserRegistered(
            admin,
            nextUserId,
            Roles.Admin,
            UserStatus.Approved
        );
    }

    // =====================================================================
    //                              MODIFIERS
    // =====================================================================

    /**
     * @notice Restringe el acceso a solo el administrador actual.
     */
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    /**
     * @notice Previene operaciones sobre el admin como "target".
     * @dev Se usa en approveUser, rejectUser y changeStatusUser.
     *
     * Reglas:
     * - El usuario debe existir.
     * - No se permite operar si su rol es Admin.
     *
     * @param a Dirección del usuario objetivo.
     */
    modifier notAdminTarget(address a) {
        uint256 id = addressToUserId[a];
        if (id == 0) revert UserDoesNotExist();

        Roles userRole = users[id].rol;
        if (!_isAllowedNonAdminRole(userRole)) revert OperationNotAllowedOnAdmin();
        _;
    }

    // =====================================================================
    //                        OWNER / OWNERSHIP LOGIC
    // =====================================================================

    /**
     * @notice Inicia la transferencia de propiedad del contrato (paso 1 de 2).
     * @param _newOwner Dirección del nuevo admin propuesto.
     */
    function transferOwnership(address _newOwner) external onlyAdmin {
        if (_newOwner == address(0)) revert InvalidAddress();
        if (_newOwner == admin) revert AlreadyAdmin();
        pendingAdmin = _newOwner;
    }

    /**
     * @notice Acepta la propiedad del contrato (paso 2 de 2).
     * @dev Solo el pendingAdmin puede llamarla.
     */
    function acceptOwnership() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        address previousOwner = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit OwnershipTransferred(previousOwner, admin);
    }

    /**
     * @notice Cancela una transferencia de propiedad pendiente.
     */
    function cancelOwnershipTransfer() external onlyAdmin {
        pendingAdmin = address(0);
    }

    // =====================================================================
    //                         HELPERS INTERNOS (pure)
    // =====================================================================

    /**
     * @dev Wrapper type-safe de la máquina de estados.
     */
    function _canTransition(
        UserStatus from,
        UserStatus to
    ) internal pure returns (bool) {
        return SupplyChainHelper.canTransition(uint8(from), uint8(to));
    }

    /**
     * @dev Wrapper type-safe para validar que un rol NO sea Admin.
     */
    function _isAllowedNonAdminRole(Roles r) internal pure returns (bool) {
        return SupplyChainHelper.isAllowedNonAdminRole(uint8(r));
    }

    // =====================================================================
    //                         USER MANAGEMENT (ROLES)
    // =====================================================================

    /**
     * @notice Solicitar rol usando el enum Roles directamente.
     *
     * @dev Reglas:
     * - Si el usuario NO existe → se crea con estado Pending.
     * - Si existe y está Rejected/Canceled → puede re-registrarse.
     * - Si existe y NO está Rejected/Canceled → revierte.
     * - No se permite solicitar rol Admin (lo asigna el Admin con changeUserRole).
     */
    function requestUserRoleByEnum(Roles rol_) external {
        uint256 existingId = addressToUserId[msg.sender];

        if (existingId != 0) {
            UserStatus currentStatus = users[existingId].status;
            if (
                currentStatus != UserStatus.Rejected &&
                currentStatus != UserStatus.Canceled
            ) {
                revert UserAlreadyRegistered();
            }

            if (!_isAllowedNonAdminRole(rol_)) revert AdminRoleNotAllowed();

            users[existingId].rol = rol_;
            users[existingId].status = UserStatus.Pending;

            emit UserRegistered(msg.sender, existingId, rol_, UserStatus.Pending);
            return;
        }

        if (!_isAllowedNonAdminRole(rol_)) revert AdminRoleNotAllowed();

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

        emit UserRegistered(msg.sender, nextUserId, rol_, UserStatus.Pending);
    }

    /**
     * @notice Solicitar rol usando un índice (uint8) del enum Roles.
     * @param rolId Índice del rol (0..4).
     *
     * @dev Mismas reglas de negocio que requestUserRoleByEnum.
     */
    function requestUserRoleById(uint8 rolId) external {
        uint256 existingId = addressToUserId[msg.sender];

        if (existingId != 0) {
            UserStatus currentStatus = users[existingId].status;
            if (
                currentStatus != UserStatus.Rejected &&
                currentStatus != UserStatus.Canceled
            ) {
                revert UserAlreadyRegistered();
            }

            if (rolId > uint8(type(Roles).max)) revert RoleOutOfRange();
            if (!SupplyChainHelper.isAllowedNonAdminRole(rolId)) {
                revert AdminRoleNotAllowed();
            }

            users[existingId].rol = Roles(rolId);
            users[existingId].status = UserStatus.Pending;

            emit UserRegistered(
                msg.sender,
                existingId,
                Roles(rolId),
                UserStatus.Pending
            );
            return;
        }

        if (rolId > uint8(type(Roles).max)) revert RoleOutOfRange();
        if (!SupplyChainHelper.isAllowedNonAdminRole(rolId)) {
            revert AdminRoleNotAllowed();
        }

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

        emit UserRegistered(
            msg.sender,
            nextUserId,
            Roles(rolId),
            UserStatus.Pending
        );
    }

    /**
     * @notice Devuelve toda la información de un usuario.
     * @param userAddress Dirección del usuario.
     */
    function getUserInfo(
        address userAddress
    ) public view returns (User memory) {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) revert UserDoesNotExist();
        return users[id];
    }

    /**
     * @notice Verifica si una address tiene rol Admin (y está registrada).
     * @param userAddress Dirección a verificar.
     */
    function isAdmin(address userAddress) public view returns (bool) {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) return false;
        return users[id].rol == Roles.Admin;
    }

    /**
     * @notice Aprueba al usuario `userAddress` si la transición es válida.
     */
    function approveUser(
        address userAddress
    ) external onlyAdmin notAdminTarget(userAddress) {
        uint256 id = addressToUserId[userAddress];
        User storage user = users[id];

        if (!_canTransition(user.status, UserStatus.Approved)) {
            revert InvalidTransition();
        }

        user.status = UserStatus.Approved;
        emit UserStatusChanged(userAddress, id, UserStatus.Approved);
    }

    /**
     * @notice Rechaza al usuario `userAddress` si la transición es válida.
     */
    function rejectUser(
        address userAddress
    ) external onlyAdmin notAdminTarget(userAddress) {
        uint256 id = addressToUserId[userAddress];
        User storage user = users[id];

        if (!_canTransition(user.status, UserStatus.Rejected)) {
            revert InvalidTransition();
        }

        user.status = UserStatus.Rejected;
        emit UserStatusChanged(userAddress, id, UserStatus.Rejected);
    }

    /**
     * @notice El propio usuario puede cancelar su cuenta (excepto el admin).
     */
    function cancelMyAccount() external {
        uint256 id = addressToUserId[msg.sender];
        if (id == 0) revert UserDoesNotExist();

        User storage user = users[id];

        if (!_isAllowedNonAdminRole(user.rol)) revert AdminCannotCancelAccount();
        if (!_canTransition(user.status, UserStatus.Canceled)) {
            revert InvalidTransition();
        }

        user.status = UserStatus.Canceled;
        emit UserStatusChanged(msg.sender, id, UserStatus.Canceled);
    }

    /**
     * @notice Cambia el estado de un usuario (solo admin).
     */
    function changeStatusUser(
        address userAddress,
        UserStatus newStatus
    ) public onlyAdmin notAdminTarget(userAddress) {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) revert UserDoesNotExist();

        User storage user = users[id];

        if (!_canTransition(user.status, newStatus)) revert InvalidTransition();

        user.status = newStatus;
        emit UserStatusChanged(userAddress, id, newStatus);
    }

    /**
     * @notice Cambia el rol de un usuario (solo admin). Requiere estado Approved.
     * @dev Esta es la ÚNICA forma de asignar rol Admin a alguien más.
     */
    function changeUserRole(
        address userAddress,
        Roles newRole
    ) external onlyAdmin {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) revert UserDoesNotExist();

        User storage user = users[id];
        if (user.status != UserStatus.Approved) revert UserNotApproved();

        user.rol = newRole;
        emit UserRoleChanged(userAddress, id, newRole);
    }

    // =====================================================================
    //                     TOKEN SYSTEM (MINI ERC-1155)
    // =====================================================================

    /**
     * @notice Crea un token tipo mini-ERC1155 (producto/lote).
     *
     * @dev Reglas:
     * - El msg.sender debe estar registrado y Approved.
     * - Admin NO puede crear tokens.
     * - totalSupply > 0.
     * - Regla de parentId:
     *      * parentId == 0 → solo Producer puede crear raíz.
     *      * parentId != 0 → debe existir y Producer no puede usarlo.
     *
     * A nivel de negocio: dar de alta un producto/lote en la cadena + asignar supply al creador.
     */
    function createToken(
        string memory name,
        uint256 totalSupply,
        string memory features,
        uint256 parentId
    ) external {
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

        // 5) Validar relación rol + parentId usando helper
        bool ok = SupplyChainHelper.isValidTokenParent(
            uint8(u.rol),
            parentId,
            nextTokenId
        );
        if (!ok) revert InvalidParent();

        // 6) Crear token en storage
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

        // Asignar todo el supply al creador
        t.balance[msg.sender] = totalSupply;
        tokensByUser[msg.sender].push(tokenId);

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
     * @notice Consulta los metadatos de un token (sin balances).
     * @param tokenId Id del token.
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
     * @notice Devuelve cuántas unidades de un token tiene un usuario concreto.
     * @param tokenId Id del token.
     * @param user    Address del usuario.
     */
    function getTokenBalance(
        uint256 tokenId,
        address user
    ) external view returns (uint256) {
        if (tokenId == 0 || tokenId > nextTokenId) revert TokenDoesNotExist();
        return tokens[tokenId].balance[user];
    }

    /**
     * @notice Devuelve la lista de tokenIds donde el usuario tiene balance > 0.
     * @dev Implementación simple O(N) sobre todos los tokens.
     */
    function getUserTokens(
        address user
    ) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](nextTokenId);
        uint256 count = 0;

        for (uint256 i = 1; i <= nextTokenId; i++) {
            if (tokens[i].balance[user] > 0) {
                temp[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            result[j] = temp[j];
        }

        return result;
    }
}
