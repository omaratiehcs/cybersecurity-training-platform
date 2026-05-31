const express = require("express");
const router = express.Router();

const {
  getAllIncidents,
  getIncidentProgress,
  getIncidentById,
  getIncidentStepProgress,
  getIncidentStepsAdmin,
  createDefaultIncidentSteps,
  submitIncidentStep,
  submitIncident,
  createIncidentStep,
  updateIncidentStep,
  deleteIncidentStep,
  createIncident,
  updateIncident,
  deleteIncident,
  getAllIncidentsAdmin,
} = require("../controllers/incident.controller");

const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

router.get("/", verifyToken, getAllIncidents);
router.get("/progress", verifyToken, getIncidentProgress);
router.get("/admin", verifyToken, requireAdmin, getAllIncidentsAdmin);
router.get("/admin/:incidentId/steps", verifyToken, requireAdmin, getIncidentStepsAdmin);
router.post("/admin", verifyToken, requireAdmin, createIncident);
router.post("/admin/:incidentId/steps/default", verifyToken, requireAdmin, createDefaultIncidentSteps);
router.post("/admin/:incidentId/steps", verifyToken, requireAdmin, createIncidentStep);
router.put("/admin/steps/:stepId", verifyToken, requireAdmin, updateIncidentStep);
router.delete("/admin/steps/:stepId", verifyToken, requireAdmin, deleteIncidentStep);
router.put("/admin/:id", verifyToken, requireAdmin, updateIncident);
router.delete("/admin/:id", verifyToken, requireAdmin, deleteIncident);
router.post("/steps/:stepId/submit", verifyToken, submitIncidentStep);
router.get("/:id/progress", verifyToken, getIncidentStepProgress);
router.get("/:id", verifyToken, getIncidentById);
router.post("/:id/submit", verifyToken, submitIncident);

module.exports = router;
