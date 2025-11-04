const express = require('express');
const missionController = require('../controllers/missionController');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

router.post('/', requirePermission('mission_create'), missionController.createMission);
// Allow any authenticated user to view missions (for dashboard access)
// authMiddleware is already applied globally, so no need to add it here
router.get('/', missionController.listMissions);
router.get('/available/internal-agents', requirePermission('mission_create'), missionController.availableAgents);
// Allow any authenticated user to view a specific mission
router.get('/:id', missionController.getMission);
router.post('/:id/validate', missionController.validateMission);

module.exports = router;
