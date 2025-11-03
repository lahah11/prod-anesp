const express = require('express');
const userController = require('../controllers/userController');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

router.get('/', requirePermission('user_admin_rh'), userController.listUsers);
router.post('/', requirePermission('user_admin_rh'), userController.createUser);
router.put('/:id', requirePermission('user_admin_rh'), userController.updateUser);

module.exports = router;
