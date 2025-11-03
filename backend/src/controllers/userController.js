const userService = require('../services/userService');

async function listUsers(req, res) {
  try {
    const data = await userService.listUsers(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer les utilisateurs' });
  }
}

async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function updateUser(req, res) {
  try {
    await userService.updateUser(req.params.id, req.body);
    res.json({ message: 'Utilisateur mis à jour' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = { listUsers, createUser, updateUser };
