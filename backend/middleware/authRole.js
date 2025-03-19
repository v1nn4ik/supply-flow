const ROLES = require('../constants/roles');

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Не авторизован' });
        }

        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'Нет доступа' });
        }

        next();
    };
};

const isAdmin = checkRole([ROLES.ADMIN]);
const isLevel2OrAdmin = checkRole([ROLES.LEVEL_2, ROLES.ADMIN]);
const isAnyRole = checkRole([ROLES.LEVEL_1, ROLES.LEVEL_2, ROLES.ADMIN]);

module.exports = {
    checkRole,
    isAdmin,
    isLevel2OrAdmin,
    isAnyRole
}; 