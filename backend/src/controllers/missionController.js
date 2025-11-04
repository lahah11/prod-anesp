const missionService = require('../services/missionService');
const logisticsService = require('../services/logisticsService');
const workflowService = require('../services/workflowService');

const STEP_PERMISSIONS = {
  technical: 'mission_validate_technical',
  logistics: 'mission_assign_logistics',
  finance: 'mission_validate_finance',
  dg: 'mission_validate_final',
  closure: 'mission_close'
};

const STATUS_TO_STEP = {
  pending_technical_validation: 'technical',
  pending_logistics: 'logistics',
  pending_finance: 'finance',
  pending_dg: 'dg',
  pending_archive_validation: 'closure'
};

function userHasPermission(user, permissionCode) {
  if (!permissionCode) {
    return true;
  }
  if (!user) {
    return false;
  }
  if (user.roleCode === 'super_admin') {
    return true;
  }
  return Array.isArray(user.permissions) && user.permissions.includes(permissionCode);
}

function resolveWorkflowStep(explicitStep, mission) {
  if (explicitStep) {
    return explicitStep;
  }
  if (!mission) {
    return null;
  }
  return STATUS_TO_STEP[mission.status] || null;
}

async function createMission(req, res) {
  try {
    const result = await missionService.createMission(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    console.error('createMission error', error);
    res.status(400).json({ message: error.message || 'Impossible de créer la mission' });
  }
}

async function listMissions(req, res) {
  try {
    const missions = await missionService.listMissions(req.user, {
      status: req.query.status,
      search: req.query.search
    });
    res.json(missions);
  } catch (error) {
    console.error('listMissions error', error);
    res.status(500).json({ message: 'Impossible de lister les missions' });
  }
}

async function getMission(req, res) {
  try {
    const mission = await missionService.getMissionById(req.params.id);
    if (!mission) {
      return res.status(404).json({ message: 'Mission introuvable' });
    }
    res.json(mission);
  } catch (error) {
    console.error('getMission error', error);
    res.status(500).json({ message: 'Impossible de charger la mission' });
  }
}

async function validateMission(req, res) {
  const missionId = req.params.id;
  const { decision, comment, logistics } = req.body || {};
  const explicitStep = req.body?.step;

  if (!decision) {
    return res.status(400).json({ message: 'La décision est obligatoire' });
  }
  if (decision === 'reject' && !comment) {
    return res.status(400).json({ message: 'Un motif est obligatoire en cas de rejet' });
  }

  let mission;
  try {
    mission = await missionService.getMissionById(missionId);
  } catch (error) {
    console.error('validateMission load error', error);
    return res.status(500).json({ message: 'Impossible de charger la mission' });
  }

  if (!mission) {
    return res.status(404).json({ message: 'Mission introuvable' });
  }

  const step = resolveWorkflowStep(explicitStep, mission);
  if (!step || !STEP_PERMISSIONS[step]) {
    return res.status(400).json({ message: 'Étape inconnue' });
  }

  if (!userHasPermission(req.user, STEP_PERMISSIONS[step])) {
    return res.status(403).json({ message: 'Permission insuffisante pour cette étape' });
  }

  try {
    switch (step) {
      case 'technical':
        if (decision === 'approve') {
          await workflowService.advanceToNext(missionId, 'pending_logistics', comment, req.user);
        } else {
          await workflowService.rejectMission(missionId, comment, req.user);
        }
        break;
      case 'logistics':
        if (decision === 'approve') {
          await logisticsService.assignLogistics(missionId, logistics || {}, req.user);
        } else {
          await workflowService.rejectMission(missionId, comment, req.user);
        }
        break;
      case 'finance':
        if (decision === 'approve') {
          await workflowService.advanceToNext(missionId, 'pending_dg', comment, req.user);
        } else {
          await workflowService.rejectMission(missionId, comment, req.user);
        }
        break;
      case 'dg':
        if (decision === 'approve') {
          await workflowService.advanceToNext(missionId, 'approved', comment, req.user);
        } else {
          await workflowService.rejectMission(missionId, comment, req.user);
        }
        break;
      case 'closure':
        if (decision === 'approve') {
          await workflowService.advanceToNext(missionId, 'archived', comment, req.user, {
            historyAction: 'mission_archived'
          });
        } else {
          await workflowService.returnToDocumentSubmission(missionId, comment, req.user);
        }
        break;
      default:
        return res.status(400).json({ message: 'Étape inconnue' });
    }
    const mission = await missionService.getMissionById(missionId);
    res.json({ message: 'Workflow mis à jour avec succès', mission });
  } catch (error) {
    console.error('validateMission error', error);
    let mission = null;
    try {
      mission = await missionService.getMissionById(missionId);
    } catch (fetchError) {
      console.error('Unable to fetch mission after workflow error', fetchError);
    }
    res.status(400).json({ message: error.message || 'Impossible de traiter la validation', mission });
  }
}

async function availableAgents(req, res) {
  try {
    const agents = await missionService.listAvailableAgents();
    res.json(agents);
  } catch (error) {
    console.error('availableAgents error', error);
    res.status(500).json({ message: 'Impossible de récupérer les agents disponibles' });
  }
}

module.exports = {
  createMission,
  listMissions,
  getMission,
  validateMission,
  availableAgents
};
