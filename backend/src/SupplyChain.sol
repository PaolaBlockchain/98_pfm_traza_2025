// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SupplyChainHelper} from "./SupplyChainHelper.sol";

/**
 * @title SupplyChain
 * @author PaolaBlockchain
 * @notice Sistema de gestión de usuarios, tokens y transferencias con trazabilidad
 * @dev Contrato principal con:
 * - Gestión de usuarios (roles, estados y ownership seguro)
 * - Sistema de tokens tipo mini-ERC1155 para productos/materias primas
 * - Capa de transferencias con aprobación por el receptor y flujo Producer→Factory→Retailer→Consumer
 * - Reglas de negocio centralizadas y validadas vía helpers
 */
contract SupplyChain {
    using SupplyChainHelper for uint8;

    // ------------------------------------------------------------------------
    //                              Custom Errors
    // ------------------------------------------------------------------------
    // Usuarios / roles
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

    // Transferencias
    error TransferDoesNotExist();
    error TransferAlreadyProcessed();
    error NotTransferRecipient();
    error InvalidAmount();
    error InsufficientBalance();
    error InvalidRoleTransfer();
    error CannotTransferToSelf();

    // ------------------------------------------------------------------------
    //                              Tipos / Enums
    // ------------------------------------------------------------------------

    /// @notice Estados posibles de un usuario en el sistema
    enum UserStatus {
        Pending,
        Approved,
        Rejected,
        Canceled
    }

    /// @notice Estados posibles de una transferencia
    enum TransferStatus {
        Pending,
        Accepted,
        Rejected
    }

    /// @notice Roles disponibles en la cadena de suministro
    enum Roles {
        Admin,
        Producer,
        Factory,
        Retailer,
        Consumer
    }

    /// @notice Estructura de datos de usuario
    struct User {
        address userAddress;
        Roles rol;
        UserStatus status;
        uint256 id;
    }

    /// @notice Estructura de token (mini ERC-1155)
    struct Token {
        uint256 id;
        address creator;
        string name;
        uint256 totalSupply;
        string features; // JSON con metadatos
        uint256 parentId; // token padre (0 si es raíz)
        uint256 dateCreated;
        mapping(address => uint256) balance; // balances por usuario
    }

    /// @notice Estructura de transferencia de tokens
    struct Transfer {
        uint256 id;
        address from;
        address to;
        uint256 tokenId;
        uint256 dateCreated;
        uint256 amount;
        TransferStatus status;
    }

    // ------------------------------------------------------------------------
    //                              Propiedad
    // ------------------------------------------------------------------------

    address public admin;
    address public pendingAdmin;

    // ------------------------------------------------------------------------
    //                              Storage Usuarios
    // ------------------------------------------------------------------------

    mapping(uint256 => User) public users;           // id → User
    mapping(address => uint256) public addressToUserId; // address → id (0 = no existe)
    uint256 public nextUserId;                       // contador de usuarios

    // ------------------------------------------------------------------------
    //                              Storage Tokens
    // ------------------------------------------------------------------------

    uint256 public nextTokenId;
    mapping(uint256 => Token) private tokens;        // tokenId → Token
    mapping(address => uint256[]) private tokensByUser; // usuario → lista de tokenIds (no es crítica, pero útil)

    // ------------------------------------------------------------------------
    //                              Storage Transferencias
    // ------------------------------------------------------------------------

    uint256 public nextTransferId;
    mapping(uint256 => Transfer) private transfers;        // transferId → Transfer
    mapping(address => uint256[]) private transfersByUser; // usuario → lista de transferIds

    // ------------------------------------------------------------------------
    //                                 Eventos
    // ------------------------------------------------------------------------

    // Usuarios
    event UserRegistered(
        address indexed user,
        uint256 indexed id,
        Roles role,
        UserStatus status
    );

    event UserRoleRequested(address indexed user, Roles requestedRole);

    event UserRoleChanged(
        address indexed user,
        uint256 indexed id,
        Roles newRole
    );

    event UserStatusChanged(
        address indexed user,
        uint256 indexed id,
        UserStatus newStatus
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Tokens
    event TokenCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string name,
        uint256 totalSupply,
        uint256 parentId,
        string features
    );

    // Transferencias
    event TransferRequested(
        uint256 indexed transferId,
        address indexed from,
        address indexed to,
        uint256 tokenId,
        uint256 amount
    );
    event TransferAccepted(uint256 indexed transferId);
    event TransferRejected(uint256 indexed transferId);

    // ------------------------------------------------------------------------
    //                             Constructor
    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------
    //                            Modificadores
    // ------------------------------------------------------------------------

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier notAdminTarget(address a) {
        uint256 id = addressToUserId[a];
        if (id == 0) revert UserDoesNotExist();
        
        Roles userRole = users[id].rol;
        if (!_isAllowedNonAdminRole(userRole)) revert OperationNotAllowedOnAdmin();
        _;
    }

    // ------------------------------------------------------------------------
    //                        Gestión de Propiedad
    // ------------------------------------------------------------------------

    function transferOwnership(address _newOwner) external onlyAdmin {
        if (_newOwner == address(0)) revert InvalidAddress();
        if (_newOwner == admin) revert AlreadyAdmin();
        pendingAdmin = _newOwner;
    }

    function acceptOwnership() external {
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        address previousOwner = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit OwnershipTransferred(previousOwner, admin);
    }

    function cancelOwnershipTransfer() external onlyAdmin {
        pendingAdmin = address(0);
    }

    // ------------------------------------------------------------------------
    //                       Helpers internos (type-safe)
    // ------------------------------------------------------------------------

    function _canTransition(
        UserStatus from,
        UserStatus to
    ) internal pure returns (bool) {
        return SupplyChainHelper.canTransition(uint8(from), uint8(to));
    }

    function _isAllowedNonAdminRole(Roles r) internal pure returns (bool) {
        return SupplyChainHelper.isAllowedNonAdminRole(uint8(r));
    }

    /// @dev Valida el flujo de roles para transferencias (Producer→Factory→Retailer→Consumer).
    function _validateTransferRoles(
        Roles fromRole,
        Roles toRole
    ) internal pure returns (bool) {
        if (fromRole == Roles.Producer) {
            return toRole == Roles.Factory;
        }
        if (fromRole == Roles.Factory) {
            return toRole == Roles.Retailer;
        }
        if (fromRole == Roles.Retailer) {
            return toRole == Roles.Consumer;
        }
        // Admin y Consumer NO pueden transferir
        return false;
    }

    // ============================================================
    //                    Gestión de Usuarios / Roles
    // ============================================================

    /**
     * @notice Función interna para registrar o actualizar un usuario
     * @dev Extrae la lógica común de requestUserRoleByEnum y requestUserRoleById
     */
    function _registerOrUpdateUser(Roles rol_) internal {
        uint256 existingId = addressToUserId[msg.sender];
        
        if (existingId != 0) {
            UserStatus currentStatus = users[existingId].status;
            if (currentStatus != UserStatus.Rejected && currentStatus != UserStatus.Canceled) {
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

    function requestUserRoleByEnum(Roles rol_) external {
        _registerOrUpdateUser(rol_);
    }

    function requestUserRoleById(uint8 rolId) external {
        if (rolId > uint8(type(Roles).max)) revert RoleOutOfRange();
        _registerOrUpdateUser(Roles(rolId));
    }

    function getUserInfo(
        address userAddress
    ) public view returns (User memory) {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) revert UserDoesNotExist();
        return users[id];
    }

    function isAdmin(address userAddress) public view returns (bool) {
        uint256 id = addressToUserId[userAddress];
        if (id == 0) return false;
        return users[id].rol == Roles.Admin;
    }

    function approveUser(
        address userAddress
    ) external onlyAdmin notAdminTarget(userAddress) {
        uint256 id = addressToUserId[userAddress];
        
        User storage user = users[id];
        if (!_canTransition(user.status, UserStatus.Approved)) revert InvalidTransition();
        
        user.status = UserStatus.Approved;
        emit UserStatusChanged(userAddress, id, UserStatus.Approved);
    }

    function rejectUser(
        address userAddress
    ) external onlyAdmin notAdminTarget(userAddress) {
        uint256 id = addressToUserId[userAddress];
        
        User storage user = users[id];
        if (!_canTransition(user.status, UserStatus.Rejected)) revert InvalidTransition();
        
        user.status = UserStatus.Rejected;
        emit UserStatusChanged(userAddress, id, UserStatus.Rejected);
    }

    function cancelMyAccount() external {
        uint256 id = addressToUserId[msg.sender];
        if (id == 0) revert UserDoesNotExist();

        User storage user = users[id];
        
        if (!_isAllowedNonAdminRole(user.rol)) revert AdminCannotCancelAccount();
        if (!_canTransition(user.status, UserStatus.Canceled)) revert InvalidTransition();

        user.status = UserStatus.Canceled;
        emit UserStatusChanged(msg.sender, id, UserStatus.Canceled);
    }

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

    // ============================================================
    //                      TOKEN SYSTEM (MINI ERC-1155)
    // ============================================================

    /**
     * @notice Crea un token tipo mini-ERC1155 (producto o materia prima)
     * @dev Reglas:
     * - Solo usuarios Approved pueden crear
     * - Admin NO puede crear
     * - Producer crea tokens raíz (parentId = 0)
     * - Factory y Retailer crean tokens derivados (parentId != 0)
     */
    function createToken(
        string memory name,
        uint256 totalSupply,
        string memory features,
        uint256 parentId
    ) external {
        uint256 userId = addressToUserId[msg.sender];
        if (userId == 0) revert UserDoesNotExist();

        User storage u = users[userId];

        if (u.status != UserStatus.Approved) revert CreatorNotApproved();
        if (u.rol == Roles.Admin) revert RoleNotAllowedToCreateToken();
        if (u.rol == Roles.Consumer) revert RoleNotAllowedToCreateToken();
        if (u.rol == Roles.Retailer) revert RoleNotAllowedToCreateToken();
        if (totalSupply == 0) revert ZeroSupply();

        if (parentId != 0) {
            if (u.rol == Roles.Producer) revert InvalidParent();
            if (parentId > nextTokenId) revert InvalidParent();
            
            // Validar que el usuario tenga suficiente balance del token padre
            // Para crear tokens derivados, el usuario debe tener balance del token padre
            if (tokens[parentId].balance[msg.sender] < totalSupply) {
                revert InsufficientBalance();
            }
        } else {
            if (u.rol != Roles.Producer) revert InvalidParent();
        }

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

        t.balance[msg.sender] = totalSupply;
        tokensByUser[msg.sender].push(tokenId);

        // Si es un token derivado (tiene padre), restar el balance del token padre
        // Esto representa que se "consumió" el token padre para crear el derivado
        if (parentId != 0) {
            tokens[parentId].balance[msg.sender] -= totalSupply;
        }

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
     * @notice Devuelve los metadatos de un token (no incluye balances)
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
     * @notice Devuelve el balance de un usuario para un token concreto
     */
    function getTokenBalance(
        uint256 tokenId,
        address user
    ) external view returns (uint256) {
        if (tokenId == 0 || tokenId > nextTokenId) revert TokenDoesNotExist();
        return tokens[tokenId].balance[user];
    }

    /**
     * @notice Devuelve todos los tokenIds donde el usuario tiene balance > 0
     * @dev Optimizado para reducir operaciones de memoria
     */
    function getUserTokens(
        address user
    ) external view returns (uint256[] memory) {
        if (nextTokenId == 0) {
            return new uint256[](0);
        }

        uint256[] memory temp = new uint256[](nextTokenId);
        uint256 count = 0;

        for (uint256 i = 1; i <= nextTokenId; ++i) {
            if (tokens[i].balance[user] > 0) {
                temp[count] = i;
                unchecked {
                    ++count;
                }
            }
        }

        if (count == 0) {
            return new uint256[](0);
        }

        // Redimensionar array al tamaño exacto
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; ++i) {
            result[i] = temp[i];
        }

        return result;
    }

    // ============================================================
    //                 TRANSFERENCIAS + TRAZABILIDAD
    // ============================================================

    /**
     * @notice Solicita una transferencia de tokens (Producer→Factory→Retailer→Consumer)
     * @dev
     * - No mueve balances todavía (status = Pending)
     * - El receptor debe llamar acceptTransfer o rejectTransfer
     * - Valida:
     *   - Usuarios existen y están Approved
     *   - Flujo de roles correcto
     *   - Token existe
     *   - amount > 0
     */
    function transfer(
        address to,
        uint256 tokenId,
        uint256 amount
    ) external {
        if (to == address(0)) revert InvalidAddress();
        if (msg.sender == to) revert CannotTransferToSelf();
        if (amount == 0) revert InvalidAmount();
        if (tokenId == 0 || tokenId > nextTokenId) revert TokenDoesNotExist();

        uint256 fromId = addressToUserId[msg.sender];
        uint256 toId = addressToUserId[to];

        if (fromId == 0 || toId == 0) revert UserDoesNotExist();

        User storage fromUser = users[fromId];
        User storage toUser = users[toId];

        if (fromUser.status != UserStatus.Approved) revert UserNotApproved();
        if (toUser.status != UserStatus.Approved) revert UserNotApproved();

        // Admin NO puede crear transferencias
        if (fromUser.rol == Roles.Admin) revert InvalidRoleTransfer();

        if (!_validateTransferRoles(fromUser.rol, toUser.rol)) {
            revert InvalidRoleTransfer();
        }

        // Nota: aquí NO restamos balance todavía. Se hará al aceptar.
        // Pero validamos que, en este momento, el sender tiene balance suficiente.
        if (tokens[tokenId].balance[msg.sender] < amount) {
            revert InsufficientBalance();
        }

        // Crear transferencia
        unchecked {
            ++nextTransferId;
        }
        uint256 transferId = nextTransferId;

        Transfer storage tr = transfers[transferId];
        tr.id = transferId;
        tr.from = msg.sender;
        tr.to = to;
        tr.tokenId = tokenId;
        tr.dateCreated = block.timestamp;
        tr.amount = amount;
        tr.status = TransferStatus.Pending;

        transfersByUser[msg.sender].push(transferId);
        transfersByUser[to].push(transferId);

        emit TransferRequested(transferId, msg.sender, to, tokenId, amount);
    }

    /**
     * @notice El receptor acepta una transferencia pendiente
     * @dev
     * - Solo puede llamar el receptor (msg.sender == transfer.to)
     * - Mueve balances: from → to
     * - Cambia estado a Accepted
     */
    function acceptTransfer(uint256 transferId) external {
        if (transferId == 0 || transferId > nextTransferId) revert TransferDoesNotExist();

        Transfer storage tr = transfers[transferId];

        if (tr.status != TransferStatus.Pending) revert TransferAlreadyProcessed();
        if (msg.sender != tr.to) revert NotTransferRecipient();

        // Revalidar usuarios y roles
        uint256 fromId = addressToUserId[tr.from];
        uint256 toId = addressToUserId[tr.to];
        if (fromId == 0 || toId == 0) revert UserDoesNotExist();

        User storage fromUser = users[fromId];
        User storage toUser = users[toId];

        if (fromUser.status != UserStatus.Approved) revert UserNotApproved();
        if (toUser.status != UserStatus.Approved) revert UserNotApproved();

        // Admin NO puede aceptar transferencias
        if (toUser.rol == Roles.Admin) revert InvalidRoleTransfer();

        if (!_validateTransferRoles(fromUser.rol, toUser.rol)) {
            revert InvalidRoleTransfer();
        }

        // Revalidar balance en el momento de aceptar
        if (tokens[tr.tokenId].balance[tr.from] < tr.amount) {
            revert InsufficientBalance();
        }

        // Mover balance
        tokens[tr.tokenId].balance[tr.from] -= tr.amount;
        tokens[tr.tokenId].balance[tr.to] += tr.amount;

        // Actualizar estado
        tr.status = TransferStatus.Accepted;
        emit TransferAccepted(transferId);
    }

    /**
     * @notice El receptor rechaza una transferencia pendiente
     * @dev
     * - No se modifican balances
     * - Solo el receptor puede rechazar
     * - Cambia estado a Rejected
     */
    function rejectTransfer(uint256 transferId) external {
        if (transferId == 0 || transferId > nextTransferId) revert TransferDoesNotExist();

        Transfer storage tr = transfers[transferId];

        if (tr.status != TransferStatus.Pending) revert TransferAlreadyProcessed();
        if (msg.sender != tr.to) revert NotTransferRecipient();

        // Verificar que el usuario receptor no sea Admin
        uint256 toId = addressToUserId[tr.to];
        if (toId == 0) revert UserDoesNotExist();
        User storage toUser = users[toId];
        
        // Admin NO puede rechazar transferencias
        if (toUser.rol == Roles.Admin) revert InvalidRoleTransfer();

        tr.status = TransferStatus.Rejected;
        emit TransferRejected(transferId);
    }

    /**
     * @notice Devuelve los datos de una transferencia (trazabilidad puntual)
     */
    function getTransfer(
        uint256 transferId
    )
        external
        view
        returns (
            uint256 id,
            address from,
            address to,
            uint256 tokenId,
            uint256 dateCreated,
            uint256 amount,
            TransferStatus status
        )
    {
        if (transferId == 0 || transferId > nextTransferId) revert TransferDoesNotExist();

        Transfer storage tr = transfers[transferId];
        return (
            tr.id,
            tr.from,
            tr.to,
            tr.tokenId,
            tr.dateCreated,
            tr.amount,
            tr.status
        );
    }

    /**
     * @notice Devuelve todos los transferIds en los que participa el usuario (como emisor o receptor)
     * @dev Esto permite reconstruir la trazabilidad desde el frontend
     */
    function getUserTransfers(
        address user
    ) external view returns (uint256[] memory) {
        return transfersByUser[user];
    }
}
