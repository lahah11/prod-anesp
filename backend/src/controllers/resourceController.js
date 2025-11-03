const resourceService = require('../services/resourceService');

async function listVehicles(req, res) {
  const vehicles = await resourceService.listVehicles();
  res.json(vehicles);
}

async function listDrivers(req, res) {
  const drivers = await resourceService.listDrivers();
  res.json(drivers);
}

async function createVehicle(req, res) {
  try {
    const vehicle = await resourceService.createVehicle(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function createDriver(req, res) {
  try {
    const driver = await resourceService.createDriver(req.body);
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = { listVehicles, listDrivers, createVehicle, createDriver };
