import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import {
  ALLOWED_DIFFICULTIES,
  MAX_ANSWER_LENGTH,
  normalizeInput,
  isNonNegativeNumber,
} from "../utils/validation";

const INCIDENT_API_BASE_URL = "http://localhost:5000/api/incidents/admin";
const ALLOWED_STEP_TYPES = ["text", "mcq"];

const initialIncidentForm = {
  title: "",
  description: "",
  case_summary: "",
  severity: "",
  hostname: "",
  affected_user: "",
  source_ip: "",
  analyst_objective: "",
  evidence_file: "",
  correct_answer: "",
  points: "",
  difficulty: "Easy",
  explanation: "",
};

const initialStepForm = {
  step_number: "",
  title: "",
  question: "",
  step_type: "text",
  options_json: "",
  correct_answer: "",
  explanation: "",
  points: "",
};

const toOptionalValue = (value) => {
  const normalizedValue = normalizeInput(value);
  return normalizedValue || null;
};

const getIncidentStepCount = (incident) => {
  const parsedStepCount = Number(incident?.step_count);

  if (!Number.isFinite(parsedStepCount) || parsedStepCount < 0) {
    return 0;
  }

  return parsedStepCount;
};

function AdminIncidentPage() {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [incidentFormData, setIncidentFormData] = useState(initialIncidentForm);
  const [editingIncidentId, setEditingIncidentId] = useState(null);
  const [incidentMessage, setIncidentMessage] = useState("");
  const [incidentError, setIncidentError] = useState("");
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [submittingIncident, setSubmittingIncident] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stepFormData, setStepFormData] = useState(initialStepForm);
  const [editingStepId, setEditingStepId] = useState(null);
  const [stepMessage, setStepMessage] = useState("");
  const [stepError, setStepError] = useState("");
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [submittingStep, setSubmittingStep] = useState(false);
  const [addingStandardWorkflow, setAddingStandardWorkflow] = useState(false);

  const selectedIncidentStepCount = selectedIncident
    ? Math.max(getIncidentStepCount(selectedIncident), steps.length)
    : 0;
  const selectedIncidentHasNoSteps =
    Boolean(selectedIncident) && selectedIncidentStepCount === 0;

  const fetchIncidents = async () => {
    try {
      setLoadingIncidents(true);
      setIncidentError("");

      const response = await authFetch(INCIDENT_API_BASE_URL, {}, navigate);

      if (!response) {
        return [];
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to fetch incidents");
      }

      const nextIncidents = data.data || [];
      setIncidents(nextIncidents);

      if (selectedIncident) {
        const refreshedIncident = nextIncidents.find(
          (incident) => incident.incident_id === selectedIncident.incident_id
        );

        if (refreshedIncident) {
          setSelectedIncident(refreshedIncident);
        } else {
          setSelectedIncident(null);
          setSteps([]);
          setStepFormData(initialStepForm);
          setEditingStepId(null);
        }
      }

      return nextIncidents;
    } catch (err) {
      setIncidentError(
        err.message || "Something went wrong while fetching incidents"
      );
      return [];
    } finally {
      setLoadingIncidents(false);
    }
  };

  const fetchIncidentSteps = async (incident, options = {}) => {
    if (!incident) {
      return;
    }

    const { preserveFeedback = false } = options;

    try {
      setLoadingSteps(true);

      if (!preserveFeedback) {
        setStepError("");
        setStepMessage("");
      }

      const response = await authFetch(
        `${INCIDENT_API_BASE_URL}/${incident.incident_id}/steps`,
        {},
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch incident steps");
      }

      setSelectedIncident(incident);
      setSteps(data.data || []);
    } catch (err) {
      setStepError(
        err.message || "Something went wrong while fetching incident steps"
      );
    } finally {
      setLoadingSteps(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [navigate]);

  const resetIncidentForm = () => {
    setIncidentFormData(initialIncidentForm);
    setEditingIncidentId(null);
  };

  const resetStepForm = () => {
    setStepFormData(initialStepForm);
    setEditingStepId(null);
  };

  const openStepManager = async (incident, options = {}) => {
    if (!incident) {
      return;
    }

    setSelectedIncident(incident);
    setStepMessage("");
    setStepError("");
    resetStepForm();
    await fetchIncidentSteps(incident, options);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleIncidentChange = (e) => {
    const { name, value } = e.target;

    setIncidentFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStepChange = (e) => {
    const { name, value } = e.target;

    setStepFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateIncidentForm = () => {
    const correctAnswer = normalizeInput(incidentFormData.correct_answer);

    if (!normalizeInput(incidentFormData.title)) {
      return "Title is required";
    }

    if (!normalizeInput(incidentFormData.description)) {
      return "Description is required";
    }

    if (!correctAnswer) {
      return "Correct answer is required";
    }

    if (correctAnswer.length > MAX_ANSWER_LENGTH) {
      return `Correct answer must be ${MAX_ANSWER_LENGTH} characters or fewer`;
    }

    if (!isNonNegativeNumber(incidentFormData.points)) {
      return "Points must be a non-negative number";
    }

    if (!ALLOWED_DIFFICULTIES.includes(normalizeInput(incidentFormData.difficulty))) {
      return "Difficulty must be Easy, Medium, or Hard";
    }

    return "";
  };

  const validateStepForm = () => {
    const normalizedStepNumber = Number(stepFormData.step_number);
    const normalizedCorrectAnswer = normalizeInput(stepFormData.correct_answer);
    const normalizedStepType = normalizeInput(stepFormData.step_type).toLowerCase();
    const normalizedOptionsJson = normalizeInput(stepFormData.options_json);

    if (!Number.isInteger(normalizedStepNumber) || normalizedStepNumber <= 0) {
      return "Step number must be a positive integer";
    }

    if (!normalizeInput(stepFormData.title)) {
      return "Step title is required";
    }

    if (!normalizeInput(stepFormData.question)) {
      return "Question is required";
    }

    if (!normalizedCorrectAnswer) {
      return "Correct answer is required";
    }

    if (normalizedCorrectAnswer.length > MAX_ANSWER_LENGTH) {
      return `Correct answer must be ${MAX_ANSWER_LENGTH} characters or fewer`;
    }

    if (!normalizeInput(stepFormData.explanation)) {
      return "Explanation is required";
    }

    if (!isNonNegativeNumber(stepFormData.points)) {
      return "Points must be a non-negative number";
    }

    if (!ALLOWED_STEP_TYPES.includes(normalizedStepType)) {
      return "Step type must be text or mcq";
    }

    if (normalizedOptionsJson) {
      try {
        JSON.parse(normalizedOptionsJson);
      } catch (error) {
        return "Options JSON must be valid JSON";
      }
    }

    return "";
  };

  const handleIncidentEdit = (incident) => {
    setEditingIncidentId(incident.incident_id);
    setIncidentMessage("");
    setIncidentError("");

    setIncidentFormData({
      title: incident.title || "",
      description: incident.description || "",
      case_summary: incident.case_summary || "",
      severity: incident.severity || "",
      hostname: incident.hostname || "",
      affected_user: incident.affected_user || "",
      source_ip: incident.source_ip || "",
      analyst_objective: incident.analyst_objective || "",
      evidence_file: incident.evidence_file || "",
      correct_answer: incident.correct_answer || "",
      points: incident.points?.toString() || "",
      difficulty: incident.difficulty || "Easy",
      explanation: incident.explanation || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleIncidentDelete = async (incidentId) => {
    const confirmDelete = window.confirm(
      "Delete this incident scenario? Its steps and related submissions will also be removed."
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setIncidentMessage("");
      setIncidentError("");

      const response = await authFetch(
        `${INCIDENT_API_BASE_URL}/${incidentId}`,
        {
          method: "DELETE",
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete incident scenario.");
      }

      setIncidentMessage(
        data.message || "Incident scenario deleted successfully."
      );

      if (editingIncidentId === incidentId) {
        resetIncidentForm();
      }

      if (selectedIncident?.incident_id === incidentId) {
        setSelectedIncident(null);
        setSteps([]);
        resetStepForm();
        setStepMessage("");
        setStepError("");
      }

      await fetchIncidents();
    } catch (err) {
      setIncidentError(
        err.message || "Failed to delete incident scenario."
      );
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateIncidentForm();

    if (validationError) {
      setIncidentMessage("");
      setIncidentError(validationError);
      return;
    }

    try {
      setSubmittingIncident(true);
      setIncidentMessage("");
      setIncidentError("");

      const payload = {
        title: normalizeInput(incidentFormData.title),
        description: normalizeInput(incidentFormData.description),
        case_summary: toOptionalValue(incidentFormData.case_summary),
        severity: toOptionalValue(incidentFormData.severity),
        hostname: toOptionalValue(incidentFormData.hostname),
        affected_user: toOptionalValue(incidentFormData.affected_user),
        source_ip: toOptionalValue(incidentFormData.source_ip),
        analyst_objective: toOptionalValue(incidentFormData.analyst_objective),
        evidence_file: toOptionalValue(incidentFormData.evidence_file),
        correct_answer: normalizeInput(incidentFormData.correct_answer),
        points: Number(incidentFormData.points),
        difficulty: normalizeInput(incidentFormData.difficulty),
        explanation: toOptionalValue(incidentFormData.explanation),
      };

      const requestUrl = editingIncidentId
        ? `${INCIDENT_API_BASE_URL}/${editingIncidentId}`
        : INCIDENT_API_BASE_URL;
      const method = editingIncidentId ? "PUT" : "POST";

      const response = await authFetch(
        requestUrl,
        {
          method,
          body: JSON.stringify(payload),
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to save incident"
        );
      }

      setIncidentMessage(
        editingIncidentId
          ? "Incident updated successfully"
          : "Incident created successfully. Add investigation steps before publishing it to users."
      );

      if (
        editingIncidentId &&
        selectedIncident?.incident_id === editingIncidentId &&
        data.data
      ) {
        setSelectedIncident(data.data);
      }

      resetIncidentForm();
      const refreshedIncidents = await fetchIncidents();

      if (!editingIncidentId && data.data) {
        const createdIncident =
          refreshedIncidents.find(
            (incident) => incident.incident_id === data.data.incident_id
          ) || {
            ...data.data,
            step_count: 0,
          };

        await openStepManager(createdIncident);
      }
    } catch (err) {
      setIncidentError(
        err.message || "Something went wrong while saving incident"
      );
    } finally {
      setSubmittingIncident(false);
    }
  };

  const handleManageSteps = async (incident) => {
    await openStepManager(incident);
  };

  const handleStepEdit = (step) => {
    setEditingStepId(step.incident_step_id);
    setStepMessage("");
    setStepError("");

    setStepFormData({
      step_number: step.step_number?.toString() || "",
      title: step.title || "",
      question: step.question || "",
      step_type: step.step_type || "text",
      options_json: step.options_json || "",
      correct_answer: step.correct_answer || "",
      explanation: step.explanation || "",
      points: step.points?.toString() || "",
    });

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleStepDelete = async (stepId) => {
    const confirmDelete = window.confirm(
      "Delete this step? Related step submissions will also be removed."
    );

    if (!confirmDelete || !selectedIncident) {
      return;
    }

    try {
      setStepMessage("");
      setStepError("");

      const response = await authFetch(
        `${INCIDENT_API_BASE_URL}/steps/${stepId}`,
        {
          method: "DELETE",
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete incident step.");
      }

      setStepMessage(data.message || "Incident step deleted successfully.");

      if (editingStepId === stepId) {
        resetStepForm();
      }

      await fetchIncidentSteps(selectedIncident, { preserveFeedback: true });
      await fetchIncidents();
    } catch (err) {
      setStepError(
        err.message || "Failed to delete incident step."
      );
    }
  };

  const handleAddStandardWorkflow = async () => {
    if (!selectedIncident) {
      setStepMessage("");
      setStepError("Select an incident first.");
      return;
    }

    if (!selectedIncidentHasNoSteps) {
      setStepMessage("");
      setStepError(
        "Standard workflow can only be added when the incident has no steps."
      );
      return;
    }

    try {
      setAddingStandardWorkflow(true);
      setStepMessage("");
      setStepError("");

      const response = await authFetch(
        `${INCIDENT_API_BASE_URL}/${selectedIncident.incident_id}/steps/default`,
        {
          method: "POST",
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create the standard investigation workflow."
        );
      }

      setStepMessage(
        data.message || "Standard investigation workflow added successfully."
      );
      resetStepForm();
      await fetchIncidentSteps(selectedIncident, { preserveFeedback: true });
      await fetchIncidents();
    } catch (err) {
      setStepError(
        err.message || "Failed to create the standard investigation workflow."
      );
    } finally {
      setAddingStandardWorkflow(false);
    }
  };

  const handleStepSubmit = async (e) => {
    e.preventDefault();

    if (!selectedIncident) {
      setStepMessage("");
      setStepError("Select an incident first.");
      return;
    }

    const validationError = validateStepForm();

    if (validationError) {
      setStepMessage("");
      setStepError(validationError);
      return;
    }

    try {
      setSubmittingStep(true);
      setStepMessage("");
      setStepError("");

      const payload = {
        step_number: Number(stepFormData.step_number),
        title: normalizeInput(stepFormData.title),
        question: normalizeInput(stepFormData.question),
        step_type: normalizeInput(stepFormData.step_type).toLowerCase() || "text",
        options_json: toOptionalValue(stepFormData.options_json),
        correct_answer: normalizeInput(stepFormData.correct_answer),
        explanation: normalizeInput(stepFormData.explanation),
        points: Number(stepFormData.points),
      };

      const requestUrl = editingStepId
        ? `${INCIDENT_API_BASE_URL}/steps/${editingStepId}`
        : `${INCIDENT_API_BASE_URL}/${selectedIncident.incident_id}/steps`;
      const method = editingStepId ? "PUT" : "POST";

      const response = await authFetch(
        requestUrl,
        {
          method,
          body: JSON.stringify(payload),
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save incident step");
      }

      setStepMessage(
        editingStepId
          ? "Incident step updated successfully"
          : "Incident step created successfully"
      );

      resetStepForm();
      await fetchIncidentSteps(selectedIncident, { preserveFeedback: true });
      await fetchIncidents();
    } catch (err) {
      setStepError(
        err.message || "Something went wrong while saving incident step"
      );
    } finally {
      setSubmittingStep(false);
    }
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>Manage Incident Response Labs</h1>
          <p style={styles.subtitle}>
            Create, edit, and delete incident investigation scenarios and the
            steps that power the user-side Incident Response workflow.
          </p>

          <div style={styles.infoPanel}>
            <p style={styles.infoPanelTitle}>Step workflow guidance</p>
            <p style={styles.infoPanelText}>
              Step-based incidents use the answers defined inside each
              investigation step. The scenario-level correct answer is kept for
              legacy single-answer fallback.
            </p>
            <p style={styles.infoPanelSubtext}>
              Step submissions appear in Admin Insights. Legacy scenario-level
              submissions may not appear in the same incident step analytics.
            </p>
          </div>

          {incidentMessage && <div style={styles.successBox}>{incidentMessage}</div>}
          {incidentError && <div style={styles.errorBox}>{incidentError}</div>}

          <form onSubmit={handleIncidentSubmit} style={styles.formCard}>
            <h2 style={styles.sectionTitle}>
              {editingIncidentId
                ? "Edit Incident Scenario"
                : "Create Incident Scenario"}
            </h2>
            <p style={styles.formIntroText}>
              Create the scenario overview, evidence, and metadata here. For
              step-based incidents, user questions and answers are managed in
              Investigation Steps below.
            </p>

            <p style={styles.sectionDividerTitle}>Scenario Overview & Metadata</p>

            <div style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>Title</label>
                <input
                  type="text"
                  name="title"
                  value={incidentFormData.title}
                  onChange={handleIncidentChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Severity</label>
                <select
                  name="severity"
                  value={incidentFormData.severity}
                  onChange={handleIncidentChange}
                  required
                  style={styles.input}
                >
                  <option value="">Select severity</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Hostname</label>
                <input
                  type="text"
                  name="hostname"
                  value={incidentFormData.hostname}
                  onChange={handleIncidentChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Affected User</label>
                <input
                  type="text"
                  name="affected_user"
                  value={incidentFormData.affected_user}
                  onChange={handleIncidentChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Source IP</label>
                <input
                  type="text"
                  name="source_ip"
                  value={incidentFormData.source_ip}
                  onChange={handleIncidentChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Points</label>
                <input
                  type="number"
                  name="points"
                  value={incidentFormData.points}
                  onChange={handleIncidentChange}
                  required
                  min="0"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Difficulty</label>
                <select
                  name="difficulty"
                  value={incidentFormData.difficulty}
                  onChange={handleIncidentChange}
                  required
                  style={styles.input}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <p style={styles.sectionDividerTitle}>Scenario Narrative & Evidence</p>

            <div style={styles.field}>
              <label style={styles.label}>Short Description</label>
              <textarea
                name="description"
                value={incidentFormData.description}
                onChange={handleIncidentChange}
                required
                rows="3"
                style={styles.textarea}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Case Summary</label>
              <textarea
                name="case_summary"
                value={incidentFormData.case_summary}
                onChange={handleIncidentChange}
                required
                rows="4"
                style={styles.textarea}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Analyst Objective</label>
              <textarea
                name="analyst_objective"
                value={incidentFormData.analyst_objective}
                onChange={handleIncidentChange}
                required
                rows="3"
                style={styles.textarea}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Evidence / Timeline</label>
              <textarea
                name="evidence_file"
                value={incidentFormData.evidence_file}
                onChange={handleIncidentChange}
                required
                rows="8"
                style={styles.codeArea}
              />
            </div>

            <div style={styles.legacyPanel}>
              <p style={styles.legacyPanelTitle}>Legacy Fallback Compatibility</p>
              <p style={styles.legacyPanelText}>
                These fields are kept for older single-answer incidents without
                investigation steps. Modern incident response labs use the step
                questions and answers defined below.
              </p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Legacy Fallback Answer</label>
              <input
                type="text"
                name="correct_answer"
                value={incidentFormData.correct_answer}
                onChange={handleIncidentChange}
                required
                style={styles.input}
                maxLength={MAX_ANSWER_LENGTH}
              />
              <p style={styles.fieldHelperText}>
                Used only if this incident has no investigation steps.
                Step-based incidents use the answers defined in each step.
              </p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Scenario / Legacy Explanation</label>
              <textarea
                name="explanation"
                value={incidentFormData.explanation}
                onChange={handleIncidentChange}
                rows="4"
                style={styles.textarea}
                placeholder="Explain the scenario answer for legacy single-answer incidents"
              />
              <p style={styles.fieldHelperText}>
                Shown for legacy single-answer incidents. Step explanations are
                managed inside each investigation step.
              </p>
            </div>

            <div style={styles.buttonRow}>
              <button
                type="submit"
                disabled={submittingIncident}
                style={styles.primaryButton}
              >
                {submittingIncident
                  ? editingIncidentId
                    ? "Updating..."
                    : "Creating..."
                  : editingIncidentId
                  ? "Update Incident"
                  : "Create Incident"}
              </button>

              {editingIncidentId && (
                <button
                  type="button"
                  onClick={resetIncidentForm}
                  style={styles.secondaryButton}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div style={styles.listSection}>
            <h2 style={styles.sectionTitle}>Existing Incidents</h2>

            {loadingIncidents ? (
              <p style={styles.infoText}>Loading incidents...</p>
            ) : incidents.length === 0 ? (
              <p style={styles.infoText}>No incidents found.</p>
            ) : (
              <div style={styles.cardList}>
                {incidents.map((incident) => {
                  const isSelected = selectedIncident?.incident_id === incident.incident_id;
                  const stepCount = getIncidentStepCount(incident);
                  const stepCountLabel =
                    stepCount === 0
                      ? "0 steps - needs setup"
                      : `${stepCount} ${stepCount === 1 ? "step" : "steps"}`;

                  return (
                    <div key={incident.incident_id} style={styles.card}>
                      <div style={styles.cardHeader}>
                        <div>
                          <h3 style={styles.cardTitle}>{incident.title}</h3>
                          <p style={styles.cardMeta}>
                            {incident.difficulty} • {incident.points} pts •{" "}
                            {incident.severity || "No severity"}
                          </p>
                        </div>

                        <div style={styles.cardActions}>
                          <button
                            onClick={() => handleManageSteps(incident)}
                            style={
                              isSelected
                                ? styles.manageButtonActive
                                : styles.manageButton
                            }
                          >
                            {isSelected ? "Viewing Steps" : "Manage Steps"}
                          </button>
                          <span
                            style={
                              stepCount === 0
                                ? styles.stepCountBadgeWarning
                                : styles.stepCountBadge
                            }
                          >
                            {stepCountLabel}
                          </span>
                          <button
                            onClick={() => handleIncidentEdit(incident)}
                            style={styles.editButton}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleIncidentDelete(incident.incident_id)}
                            style={styles.deleteButton}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p style={styles.cardText}>
                        <strong>Host:</strong> {incident.hostname || "-"}
                      </p>
                      <p style={styles.cardText}>
                        <strong>User:</strong> {incident.affected_user || "-"}
                      </p>
                      <p style={styles.cardText}>
                        <strong>Source IP:</strong> {incident.source_ip || "-"}
                      </p>
                      <p style={styles.cardText}>
                        <strong>Summary:</strong> {incident.case_summary || "-"}
                      </p>
                      <p style={styles.cardText}>
                        <strong>Objective:</strong> {incident.analyst_objective || "-"}
                      </p>

                      {stepCount === 0 && (
                        <div style={styles.inlineWarningBox}>
                          This incident has no investigation steps yet. Add
                          steps before publishing it to users.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedIncident && (
            <div style={styles.stepsSection}>
              <div style={styles.stepPanelHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Investigation Steps</h2>
                  <p style={styles.stepPanelTitle}>
                    Selected Incident: {selectedIncident.title}
                  </p>
                  <p style={styles.stepNote}>
                    These are the questions users answer in the step-based
                    incident workflow. Each step has its own question, correct
                    answer, explanation, and points.
                  </p>
                  <p style={styles.stepHint}>
                    Recommended workflow: Step 1 Initial Triage, Step 2 Technical
                    Analysis, Step 3 Containment Decision.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedIncident(null);
                    setSteps([]);
                    resetStepForm();
                    setStepMessage("");
                    setStepError("");
                  }}
                  style={styles.secondaryButton}
                >
                  Close Step Manager
                </button>
              </div>

              {stepMessage && <div style={styles.successBox}>{stepMessage}</div>}
              {stepError && <div style={styles.errorBox}>{stepError}</div>}

              {selectedIncidentHasNoSteps && (
                <div style={styles.warningPanel}>
                  <p style={styles.warningPanelTitle}>
                    This scenario has no investigation steps yet.
                  </p>
                  <p style={styles.warningPanelText}>
                    Add steps or generate the standard 3-step workflow before
                    using it as a modern incident response lab.
                  </p>
                </div>
              )}

              <div style={styles.stepManagerGrid}>
                <div style={styles.stepFormCard}>
                  <h3 style={styles.sectionTitle}>
                    {editingStepId ? "Edit Step" : "Add New Step"}
                  </h3>

                  <form onSubmit={handleStepSubmit}>
                    <div style={styles.grid}>
                      <div style={styles.field}>
                        <label style={styles.label}>Step Number</label>
                        <input
                          type="number"
                          name="step_number"
                          value={stepFormData.step_number}
                          onChange={handleStepChange}
                          min="1"
                          required
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label style={styles.label}>Points</label>
                        <input
                          type="number"
                          name="points"
                          value={stepFormData.points}
                          onChange={handleStepChange}
                          min="0"
                          required
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.field}>
                        <label style={styles.label}>Step Type</label>
                        <select
                          name="step_type"
                          value={stepFormData.step_type}
                          onChange={handleStepChange}
                          style={styles.input}
                        >
                          <option value="text">text</option>
                          <option value="mcq">mcq</option>
                        </select>
                      </div>
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Step Title</label>
                      <input
                        type="text"
                        name="title"
                        value={stepFormData.title}
                        onChange={handleStepChange}
                        required
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Question</label>
                      <textarea
                        name="question"
                        value={stepFormData.question}
                        onChange={handleStepChange}
                        required
                        rows="4"
                        style={styles.textarea}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Correct Answer</label>
                      <input
                        type="text"
                        name="correct_answer"
                        value={stepFormData.correct_answer}
                        onChange={handleStepChange}
                        required
                        maxLength={MAX_ANSWER_LENGTH}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Explanation</label>
                      <textarea
                        name="explanation"
                        value={stepFormData.explanation}
                        onChange={handleStepChange}
                        required
                        rows="4"
                        style={styles.textarea}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Options JSON</label>
                      <textarea
                        name="options_json"
                        value={stepFormData.options_json}
                        onChange={handleStepChange}
                        rows="4"
                        style={styles.codeArea}
                        placeholder='["Option A", "Option B", "Option C"]'
                      />
                    </div>

                    <div style={styles.buttonRow}>
                      <button
                        type="submit"
                        disabled={submittingStep}
                        style={styles.primaryButton}
                      >
                        {submittingStep
                          ? editingStepId
                            ? "Updating..."
                            : "Creating..."
                          : editingStepId
                          ? "Update Step"
                          : "Create Step"}
                      </button>

                      {editingStepId && (
                        <button
                          type="button"
                          onClick={resetStepForm}
                          style={styles.secondaryButton}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div style={styles.stepListCard}>
                  <div style={styles.stepListHeader}>
                    <h3 style={styles.sectionTitle}>Existing Steps</h3>
                    <div style={styles.stepListActions}>
                      <button
                        type="button"
                        onClick={handleAddStandardWorkflow}
                        disabled={addingStandardWorkflow || !selectedIncidentHasNoSteps}
                        style={
                          addingStandardWorkflow || !selectedIncidentHasNoSteps
                            ? styles.secondaryButtonDisabled
                            : styles.primaryButton
                        }
                      >
                        {addingStandardWorkflow
                          ? "Adding Workflow..."
                          : "Add Standard 3-Step Workflow"}
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchIncidentSteps(selectedIncident)}
                        style={styles.secondaryButton}
                      >
                        Refresh Steps
                      </button>
                    </div>
                  </div>

                  {!selectedIncidentHasNoSteps && (
                    <p style={styles.stepWorkflowStatus}>
                      Standard workflow can only be added when the incident has
                      no steps.
                    </p>
                  )}

                  {loadingSteps ? (
                    <p style={styles.infoText}>Loading incident steps...</p>
                  ) : steps.length === 0 ? (
                    <div style={styles.emptyStepState}>
                      <p style={styles.emptyStepTitle}>No investigation steps yet.</p>
                      <p style={styles.emptyStepText}>
                        Add the first investigation step for this incident or
                        use the standard 3-step workflow to bootstrap it
                        quickly.
                      </p>
                      <p style={styles.emptyStepHint}>
                        Recommended workflow: Step 1 Initial Triage, Step 2
                        Technical Analysis, Step 3 Containment Decision.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddStandardWorkflow}
                        disabled={addingStandardWorkflow || !selectedIncidentHasNoSteps}
                        style={
                          addingStandardWorkflow || !selectedIncidentHasNoSteps
                            ? styles.secondaryButtonDisabled
                            : styles.primaryButton
                        }
                      >
                        {addingStandardWorkflow
                          ? "Adding Workflow..."
                          : "Add Standard 3-Step Workflow"}
                      </button>
                    </div>
                  ) : (
                    <div style={styles.stepCardsWrap}>
                      {steps.map((step) => (
                        <div key={step.incident_step_id} style={styles.stepCard}>
                          <div style={styles.stepCardHeader}>
                            <div>
                              <p style={styles.stepNumberLabel}>
                                Step {step.step_number}
                              </p>
                              <h4 style={styles.stepTitle}>{step.title}</h4>
                            </div>

                            <div style={styles.cardActions}>
                              <button
                                type="button"
                                onClick={() => handleStepEdit(step)}
                                style={styles.editButton}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStepDelete(step.incident_step_id)}
                                style={styles.deleteButton}
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div style={styles.stepMetaRow}>
                            <span style={styles.metaBadge}>
                              {step.points} pts
                            </span>
                            <span style={styles.metaBadgeMuted}>
                              {step.step_type || "text"}
                            </span>
                          </div>

                          <p style={styles.cardText}>
                            <strong>Question:</strong> {step.question}
                          </p>
                          <p style={styles.cardText}>
                            <strong>Correct Answer:</strong> {step.correct_answer}
                          </p>
                          <p style={styles.cardText}>
                            <strong>Explanation:</strong> {step.explanation}
                          </p>

                          {step.options_json && (
                            <div style={styles.optionsBlock}>
                              <strong style={styles.optionsLabel}>Options JSON</strong>
                              <pre style={styles.optionsCode}>{step.options_json}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: "-20px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    padding: "32px 20px 40px",
    paddingTop: "96px",
    color: "#e5e7eb",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "8px",
    color: "#ffffff",
  },
  subtitle: {
    color: "#cbd5e1",
    marginBottom: "24px",
    lineHeight: "1.7",
  },
  infoPanel: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(59, 130, 246, 0.24)",
    borderRadius: "14px",
    padding: "16px 18px",
    marginBottom: "18px",
  },
  infoPanelTitle: {
    margin: "0 0 8px",
    color: "#bfdbfe",
    fontWeight: "700",
  },
  infoPanelText: {
    margin: "0 0 8px",
    color: "#dbeafe",
    lineHeight: "1.7",
  },
  infoPanelSubtext: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  formCard: {
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "28px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  sectionTitle: {
    fontSize: "1.25rem",
    marginTop: 0,
    marginBottom: "18px",
    color: "#ffffff",
  },
  formIntroText: {
    margin: "0 0 18px",
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  sectionDividerTitle: {
    margin: "0 0 14px",
    color: "#93c5fd",
    fontWeight: "700",
    fontSize: "0.95rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "16px",
  },
  label: {
    marginBottom: "8px",
    fontWeight: "600",
    color: "#e2e8f0",
  },
  fieldHelperText: {
    margin: "8px 0 0",
    color: "#94a3b8",
    fontSize: "0.92rem",
    lineHeight: "1.6",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f8fafc",
    outline: "none",
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f8fafc",
    resize: "vertical",
    outline: "none",
  },
  codeArea: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#020617",
    color: "#dbeafe",
    resize: "vertical",
    outline: "none",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.95rem",
    lineHeight: "1.5",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  primaryButton: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: "700",
  },
  secondaryButton: {
    background: "transparent",
    color: "#e2e8f0",
    border: "1px solid #475569",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: "600",
  },
  successBox: {
    background: "rgba(34, 197, 94, 0.15)",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    color: "#bbf7d0",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  listSection: {
    marginTop: "10px",
  },
  legacyPanel: {
    background: "rgba(30, 41, 59, 0.55)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "14px",
    padding: "16px 18px",
    marginBottom: "18px",
  },
  legacyPanelTitle: {
    margin: "0 0 8px",
    color: "#cbd5e1",
    fontWeight: "700",
  },
  legacyPanelText: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: "1.7",
  },
  infoText: {
    color: "#cbd5e1",
  },
  cardList: {
    display: "grid",
    gap: "16px",
  },
  card: {
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "16px",
    padding: "20px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  cardTitle: {
    margin: 0,
    fontSize: "1.15rem",
    color: "#ffffff",
  },
  cardMeta: {
    marginTop: "6px",
    marginBottom: 0,
    color: "#94a3b8",
  },
  cardActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  stepCountBadge: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: "8px",
    background: "rgba(34, 197, 94, 0.14)",
    color: "#bbf7d0",
    border: "1px solid rgba(34, 197, 94, 0.22)",
    fontWeight: "700",
    fontSize: "0.82rem",
  },
  stepCountBadgeWarning: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: "8px",
    background: "rgba(245, 158, 11, 0.14)",
    color: "#fde68a",
    border: "1px solid rgba(245, 158, 11, 0.24)",
    fontWeight: "700",
    fontSize: "0.82rem",
  },
  manageButton: {
    background: "rgba(59, 130, 246, 0.18)",
    color: "#bfdbfe",
    border: "1px solid rgba(59, 130, 246, 0.34)",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },
  manageButtonActive: {
    background: "rgba(37, 99, 235, 0.24)",
    color: "#ffffff",
    border: "1px solid rgba(96, 165, 250, 0.5)",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "700",
  },
  editButton: {
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },
  deleteButton: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },
  cardText: {
    margin: "8px 0",
    color: "#e2e8f0",
    lineHeight: "1.6",
  },
  inlineWarningBox: {
    marginTop: "14px",
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.28)",
    color: "#fde68a",
    borderRadius: "12px",
    padding: "12px 14px",
    lineHeight: "1.6",
  },
  stepsSection: {
    marginTop: "28px",
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  stepPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  stepPanelTitle: {
    margin: "0 0 8px",
    color: "#ffffff",
    fontSize: "1rem",
    fontWeight: "700",
  },
  stepNote: {
    margin: "0 0 8px",
    color: "#cbd5e1",
    lineHeight: "1.6",
  },
  stepHint: {
    margin: 0,
    color: "#93c5fd",
    lineHeight: "1.6",
  },
  warningPanel: {
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.28)",
    borderRadius: "14px",
    padding: "16px 18px",
    marginBottom: "18px",
  },
  warningPanelTitle: {
    margin: "0 0 8px",
    color: "#fde68a",
    fontWeight: "700",
  },
  warningPanelText: {
    margin: 0,
    color: "#fef3c7",
    lineHeight: "1.7",
  },
  stepManagerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    alignItems: "start",
  },
  stepFormCard: {
    background: "rgba(2, 6, 23, 0.52)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "16px",
    padding: "20px",
  },
  stepListCard: {
    background: "rgba(2, 6, 23, 0.52)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "16px",
    padding: "20px",
  },
  stepListHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "8px",
  },
  stepListActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  stepWorkflowStatus: {
    margin: "0 0 12px",
    color: "#94a3b8",
    lineHeight: "1.6",
  },
  emptyStepState: {
    background: "rgba(15, 23, 42, 0.72)",
    border: "1px dashed rgba(148, 163, 184, 0.22)",
    borderRadius: "14px",
    padding: "18px",
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  emptyStepTitle: {
    margin: "0 0 10px",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "1rem",
  },
  emptyStepText: {
    margin: "0 0 10px",
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  emptyStepHint: {
    margin: "0 0 16px",
    color: "#93c5fd",
    lineHeight: "1.7",
  },
  secondaryButtonDisabled: {
    background: "rgba(51, 65, 85, 0.45)",
    color: "#94a3b8",
    border: "1px solid rgba(100, 116, 139, 0.28)",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "not-allowed",
    fontWeight: "600",
  },
  stepCardsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  stepCard: {
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "14px",
    padding: "18px",
  },
  stepCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  stepNumberLabel: {
    margin: "0 0 6px",
    color: "#93c5fd",
    fontSize: "0.9rem",
    fontWeight: "700",
  },
  stepTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.05rem",
  },
  stepMetaRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  metaBadge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(99, 102, 241, 0.15)",
    color: "#c7d2fe",
    border: "1px solid rgba(99, 102, 241, 0.22)",
    fontWeight: "700",
    fontSize: "0.85rem",
  },
  metaBadgeMuted: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(71, 85, 105, 0.24)",
    color: "#cbd5e1",
    border: "1px solid rgba(100, 116, 139, 0.22)",
    fontWeight: "700",
    fontSize: "0.85rem",
  },
  optionsBlock: {
    marginTop: "12px",
    background: "rgba(2, 6, 23, 0.72)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "12px",
    padding: "12px",
  },
  optionsLabel: {
    display: "block",
    marginBottom: "8px",
    color: "#93c5fd",
  },
  optionsCode: {
    margin: 0,
    color: "#dbeafe",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.9rem",
    lineHeight: "1.6",
  },
};

export default AdminIncidentPage;
