const { connect, get } = require('../config/database');

function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (req.user.roleCode === 'super_admin') {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permissionCode)) {
      return next();
    }
    const db = await connect();
    try {
      const result = await get(
        db,
        `SELECT permissions.code
         FROM permissions
         JOIN role_permissions ON role_permissions.permission_id = permissions.id
         WHERE role_permissions.role_id = ? AND permissions.code = ?`,
        [req.user.roleId, permissionCode]
      );
      if (!result) {
        return res.status(403).json({ message: 'Permission denied' });
      }
      next();
    } catch (error) {
      console.error('Permission error', error);
      res.status(500).json({ message: 'Permission check failed' });
    } finally {
      db.release();
    }
  };
}

function requireWorkflowPermission() {
  const stepPermission = {
    technical: 'mission_validate_technical',
    logistics: 'mission_assign_logistics',
    finance: 'mission_validate_finance',
    dg: 'mission_validate_final',
    closure: 'mission_close'
  };
  return async (req, res, next) => {
    const permissionCode = stepPermission[req.body?.step];
    if (!permissionCode) {
      return res.status(400).json({ message: 'Étape de workflow invalide' });
    }
    return requirePermission(permissionCode)(req, res, next);
  };
}

function requireAnyPermission(permissionCodes) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (req.user.roleCode === 'super_admin') {
      return next();
    }
    const userPermissions = req.user.permissions || [];
    for (const code of permissionCodes) {
      if (userPermissions.includes(code)) {
        return next();
      }
    }
    const db = await connect();
    try {
      for (const code of permissionCodes) {
        const result = await get(
          db,
          `SELECT permissions.code
           FROM permissions
           JOIN role_permissions ON role_permissions.permission_id = permissions.id
           WHERE role_permissions.role_id = ? AND permissions.code = ?`,
          [req.user.roleId, code]
        );
        if (result) {
          return next();
        }
      }
      return res.status(403).json({ message: 'Permission denied' });
    } catch (error) {
      console.error('Permission error', error);
      return res.status(500).json({ message: 'Permission check failed' });
    } finally {
      db.release();
    }
  };
}

module.exports = { requirePermission, requireWorkflowPermission, requireAnyPermission };
