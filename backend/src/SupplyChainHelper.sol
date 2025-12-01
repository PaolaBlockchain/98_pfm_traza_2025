// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChainHelper
 * @notice Helper puro/reutilizable para reglas de negocio que NO dependen de storage.
 *
 * @dev Este contrato asume las siguientes convenciones en el contrato principal:
 * - UserStatus: 0 = Pending, 1 = Approved, 2 = Rejected, 3 = Canceled
 * - Roles:      0 = Admin,   1 = Producer, 2 = Factory, 3 = Retailer, 4 = Consumer
 *
 * La idea es separar:
 * - La lógica de máquina de estados y validaciones simples (aquí, funciones pure)
 * - Del almacenamiento real y la lógica de acceso (en el contrato SupplyChain)
 */
library SupplyChainHelper {
    /**
     * @notice Valida si es válida la transición de estado (from → to)
     * @dev Máquina de estados para usuarios:
     * - Pending (0)  → Approved (1) / Rejected (2) / Canceled (3)
     * - Approved (1) → Canceled (3)
     * - Rejected (2) → No permite cambiar (versión simple)
     * - Canceled (3) → Estado terminal
     *
     * @param from Código uint8 del estado actual
     * @param to   Código uint8 del estado destino
     * @return bool true si la transición está permitida, false en caso contrario
     */
    function canTransition(uint8 from, uint8 to) internal pure returns (bool) {
        // Pending -> Approved / Rejected / Canceled
        if (from == 0) {
            return (to == 1 || to == 2 || to == 3);
        }
        // Approved -> Canceled
        if (from == 1) {
            return (to == 3);
        }
        // Rejected -> no cambia en esta versión
        if (from == 2) {
            return false;
        }
        // Canceled -> (terminal)
        if (from == 3) {
            return false;
        }
        return false;
    }

    /**
     * @notice Indica si un rol NO es Admin (es decir, si es un rol "público" permitido).
     * @dev Se usa en el contrato principal para:
     * - Bloquear que un usuario se auto-asigne Admin desde la UI.
     * - Impedir que ciertas operaciones se apliquen sobre el Admin.
     *
     * @param roleId Código uint8 del rol solicitado
     * @return bool true si el rol NO es Admin (0), false si es Admin
     */
    function isAllowedNonAdminRole(uint8 roleId) internal pure returns (bool) {
        // 0 = Roles.Admin → no permitido para requests públicos
        return roleId != 0;
    }

}
