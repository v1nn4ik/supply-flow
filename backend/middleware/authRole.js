const ROLES = require('../constants/roles');

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Не авторизован' });
        }

        const userRole = req.user.role;
        
        // Если роль отсутствует, временно используем EMPLOYEE
        if (!userRole) {
            req.user.role = ROLES.EMPLOYEE;
            next();
            return;
        }
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'Нет доступа' });
        }

        next();
    };
};

const isAdmin = checkRole([ROLES.ADMIN]);
const isManager = checkRole([ROLES.MANAGER]);
const isManagerOrAdmin = checkRole([ROLES.MANAGER, ROLES.ADMIN]);
const isSupplySpecialist = checkRole([ROLES.SUPPLY_SPECIALIST]);
const isSupplySpecialistOrHigher = checkRole([ROLES.SUPPLY_SPECIALIST, ROLES.MANAGER, ROLES.ADMIN]);
const isAnyRole = checkRole([ROLES.EMPLOYEE, ROLES.SUPPLY_SPECIALIST, ROLES.MANAGER, ROLES.ADMIN]);

module.exports = {
    checkRole,
    isAdmin,
    isManager,
    isManagerOrAdmin,
    isSupplySpecialist,
    isSupplySpecialistOrHigher,
    isAnyRole
}; 