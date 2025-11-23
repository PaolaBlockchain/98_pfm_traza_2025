// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChainHelper
 * @dev Helper puro/reutilizable para reglas de negocio que no dependen de storage.
 * Usa uint8 para no acoplarse a enums específicos de otro contrato.
 *
 * Convenciones esperadas:
 * - UserStatus: 0=Pending, 1=Approved, 2=Rejected, 3=Canceled
 * - Roles:      0=Admin,   1=Producer, 2=Factory, 3=Retailer, 4=Consumer
 */
library SupplyChainHelper {
    /// @notice Valida si es válida la transición de estado (from → to)
    /// @param from  Código uint8 del estado actual
    /// @param to    Código uint8 del estado destino
    function canTransition(uint8 from, uint8 to) internal pure returns (bool) {
        // Pending -> Approved / Rejected / Canceled
        // Solo usuarios Pending pueden cancelar su solicitud
        if (from == 0) {
            return (to == 1 || to == 2 || to == 3);
        }
        // Approved -> Canceled
        if (from == 1) {
            return (to == 3);
        }
        // Rejected -> NO puede cancelar (debe esperar a volver a solicitar)
        if (from == 2) {
            return false;
        }
        // Canceled -> (terminal)
        if (from == 3) {
            return false;
        }
        return false;
    }

    /// @notice Impide que se solicite Admin desde la UI
    /// @param roleId Código uint8 del rol solicitado
    /// @dev 0 = Admin (no permitido en request de usuario)
    function isAllowedNonAdminRole(uint8 roleId) internal pure returns (bool) {
        return roleId != 0; // 0 = Roles.Admin
    }
}
