const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();
router.get('/', notificationController.listNotifications);

module.exports = router;
