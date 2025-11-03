const notificationService = require('../services/notificationService');

async function listNotifications(req, res) {
  try {
    const notifications = await notificationService.fetchNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer les notifications' });
  }
}

module.exports = { listNotifications };
