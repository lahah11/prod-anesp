const express = require('express');
const resourceController = require('../controllers/resourceController');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

router.get('/vehicles', requirePermission('mission_assign_logistics'), resourceController.listVehicles);
router.post('/vehicles', requirePermission('mission_assign_logistics'), resourceController.createVehicle);
router.get('/drivers', requirePermission('mission_assign_logistics'), resourceController.listDrivers);
router.post('/drivers', requirePermission('mission_assign_logistics'), resourceController.createDriver);

module.exports = router;
