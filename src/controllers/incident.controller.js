const { sql, pool } = require("../config/db");
const {
  MAX_ANSWER_LENGTH,
  MAX_TITLE_LENGTH,
  normalizeOptionalString,
  normalizeString,
  isNonNegativeNumber,
  isValidDifficulty,
  parsePositiveInt: parsePositiveIntParam,
} = require("../utils/validation");
const {
  warnMalformedInput,
  warnInvalidId,
  warnSuspiciousFields,
} = require("../utils/security");

const parsePositiveInt = (value) => {
  return parsePositiveIntParam(value);
};

const ALLOWED_STEP_TYPES = ["text", "mcq"];
const STANDARD_INCIDENT_WORKFLOW = [
  {
    stepNumber: 1,
    title: "Initial Triage",
    question: "Identify the first key suspicious artifact from the evidence.",
    correctAnswer: "replace_me",
    explanation: "Explain the initial triage clue from the evidence.",
    points: 100,
    stepType: "text",
    optionsJson: null,
  },
  {
    stepNumber: 2,
    title: "Technical Analysis",
    question: "Identify the technical behavior or tool used in the incident.",
    correctAnswer: "replace_me",
    explanation: "Explain the technical evidence that supports the answer.",
    points: 100,
    stepType: "text",
    optionsJson: null,
  },
  {
    stepNumber: 3,
    title: "Containment Decision",
    question: "What immediate containment action should be taken?",
    correctAnswer: "replace_me",
    explanation: "Explain why this containment action is appropriate.",
    points: 100,
    stepType: "text",
    optionsJson: null,
  },
];

const normalizeAnswer = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

const parseOptionsJson = (optionsJson) => {
  if (!optionsJson) {
    return null;
  }

  try {
    return JSON.parse(optionsJson);
  } catch (error) {
    return null;
  }
};

const normalizeStepType = (value) => {
  const normalizedValue = normalizeString(value).toLowerCase();
  return normalizedValue || "text";
};

const normalizeOptionsJsonInput = (value) => {
  if (value === undefined || value === null) {
    return {
      normalizedValue: null,
      parsedValue: null,
    };
  }

  if (typeof value !== "string") {
    return {
      error: "Options JSON must be a valid JSON string.",
    };
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {
      normalizedValue: null,
      parsedValue: null,
    };
  }

  try {
    return {
      normalizedValue,
      parsedValue: JSON.parse(normalizedValue),
    };
  } catch (error) {
    return {
      error: "Options JSON must be valid JSON.",
    };
  }
};

const validateIncidentStepPayload = (req, payload, context) => {
  const stepNumber = parsePositiveInt(payload.step_number);
  const normalizedTitle = normalizeString(payload.title);
  const normalizedQuestion = normalizeString(payload.question);
  const normalizedCorrectAnswer = normalizeString(payload.correct_answer);
  const normalizedExplanation = normalizeString(payload.explanation);
  const normalizedStepType = normalizeStepType(payload.step_type);
  const parsedPoints = Number(payload.points);
  const optionsJsonResult = normalizeOptionsJsonInput(payload.options_json);

  warnSuspiciousFields(req, context, {
    title: payload.title,
    question: payload.question,
    options_json: payload.options_json,
    correct_answer: payload.correct_answer,
    explanation: payload.explanation,
  });

  if (!stepNumber) {
    warnMalformedInput(req, context, {
      field: "step_number",
      value: payload.step_number,
    });
    return {
      error: "Step number must be a positive integer.",
    };
  }

  if (!normalizedTitle) {
    warnMalformedInput(req, context, {
      field: "title",
    });
    return {
      error: "Step title is required.",
    };
  }

  if (normalizedTitle.length > MAX_TITLE_LENGTH) {
    return {
      error: `Step title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
    };
  }

  if (!normalizedQuestion) {
    warnMalformedInput(req, context, {
      field: "question",
    });
    return {
      error: "Question is required.",
    };
  }

  if (!normalizedCorrectAnswer) {
    warnMalformedInput(req, context, {
      field: "correct_answer",
    });
    return {
      error: "Correct answer is required.",
    };
  }

  if (normalizedCorrectAnswer.length > MAX_ANSWER_LENGTH) {
    return {
      error: `Correct answer must be ${MAX_ANSWER_LENGTH} characters or fewer.`,
    };
  }

  if (!normalizedExplanation) {
    warnMalformedInput(req, context, {
      field: "explanation",
    });
    return {
      error: "Explanation is required.",
    };
  }

  if (!isNonNegativeNumber(payload.points)) {
    warnMalformedInput(req, context, {
      field: "points",
      value: payload.points,
    });
    return {
      error: "Points must be a non-negative integer.",
    };
  }

  if (!ALLOWED_STEP_TYPES.includes(normalizedStepType)) {
    warnMalformedInput(req, context, {
      field: "step_type",
      value: normalizedStepType,
    });
    return {
      error: "Step type must be text or mcq.",
    };
  }

  if (optionsJsonResult.error) {
    warnMalformedInput(req, context, {
      field: "options_json",
    });
    return {
      error: optionsJsonResult.error,
    };
  }

  return {
    value: {
      stepNumber,
      normalizedTitle,
      normalizedQuestion,
      normalizedCorrectAnswer,
      normalizedExplanation,
      normalizedStepType,
      normalizedOptionsJson: optionsJsonResult.normalizedValue,
      parsedPoints,
    },
  };
};

const formatIncidentSteps = (steps, solvedStepIds) => {
  let previousStepSolved = true;
  let solvedSteps = 0;

  const formattedSteps = steps.map((step, index) => {
    const solved = solvedStepIds.has(step.incident_step_id);
    const unlocked = index === 0 ? true : previousStepSolved;

    if (solved) {
      solvedSteps += 1;
    }

    previousStepSolved = solved;

    const formattedStep = {
      ...step,
      solved,
      unlocked,
      options: parseOptionsJson(step.options_json),
      explanation: solved ? step.explanation : null,
    };

    delete formattedStep.correct_answer;
    delete formattedStep.options_json;

    return formattedStep;
  });

  return {
    steps: formattedSteps,
    solvedSteps,
  };
};

const buildIncidentProgressData = ({
  totalSteps,
  solvedSteps,
  totalPoints = 0,
  earnedPoints = 0,
  legacySolved = false,
  legacyPoints = 0,
}) => {
  const hasSteps = totalSteps > 0;

  return {
    total_steps: totalSteps,
    solved_steps: solvedSteps,
    completed: hasSteps ? solvedSteps === totalSteps : legacySolved,
    total_points: hasSteps ? totalPoints : legacyPoints,
    earned_points: hasSteps ? earnedPoints : legacySolved ? legacyPoints : 0,
  };
};

const syncLegacyIncidentCompletion = async (incidentId, userId, submittedAnswer) => {
  const progressResult = await pool.request()
    .input("incident_id", sql.Int, incidentId)
    .input("user_id", sql.Int, userId)
    .query(`
      SELECT
        (SELECT COUNT(*) FROM INCIDENT_STEP WHERE incident_id = @incident_id) AS total_steps,
        (
          SELECT COUNT(*)
          FROM INCIDENT_STEP s
          WHERE s.incident_id = @incident_id
            AND EXISTS (
              SELECT 1
              FROM INCIDENT_STEP_SUBMISSION iss
              WHERE iss.user_id = @user_id
                AND iss.incident_step_id = s.incident_step_id
                AND iss.is_correct = 1
            )
        ) AS solved_steps,
        (
          SELECT COUNT(*)
          FROM INCIDENT_SCENARIO_SUBMISSION iss
          WHERE iss.user_id = @user_id
            AND iss.incident_id = @incident_id
            AND iss.is_correct = 1
        ) AS existing_submission
    `);

  const progress = progressResult.recordset[0];

  if (
    progress &&
    progress.total_steps > 0 &&
    progress.total_steps === progress.solved_steps &&
    progress.existing_submission === 0
  ) {
    await pool.request()
      .input("user_id", sql.Int, userId)
      .input("incident_id", sql.Int, incidentId)
      .input("submitted_answer", sql.NVarChar(sql.MAX), submittedAnswer)
      .query(`
        INSERT INTO INCIDENT_SCENARIO_SUBMISSION (
          user_id,
          incident_id,
          submitted_answer,
          is_correct,
          submitted_at
        )
        VALUES (
          @user_id,
          @incident_id,
          @submitted_answer,
          1,
          GETDATE()
        )
      `);
  }
};

// GET /api/incidents
const getAllIncidents = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          i.incident_id,
          i.title,
          i.case_summary,
          i.severity,
          i.hostname,
          i.affected_user,
          i.source_ip,
          i.points,
          i.difficulty,
          i.created_at,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM INCIDENT_SCENARIO_SUBMISSION s
              WHERE s.user_id = @user_id
                AND s.incident_id = i.incident_id
                AND s.is_correct = 1
            )
            THEN 1
            ELSE 0
          END AS solved
        FROM INCIDENT_SCENARIO i
        ORDER BY i.incident_id ASC
      `);

    const incidents = result.recordset.map((incident) => ({
      ...incident,
      solved: incident.solved === 1,
    }));

    res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    console.error("Get all incidents error:", error);
    res.status(500).json({
      error: "Failed to fetch incidents",
    });
  }
};

// GET /api/incidents/progress
const getIncidentProgress = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM INCIDENT_SCENARIO) AS total_incidents,
          (
            SELECT COUNT(DISTINCT s.incident_id)
            FROM INCIDENT_SCENARIO_SUBMISSION s
            WHERE s.user_id = @user_id
              AND s.is_correct = 1
          ) AS solved_incidents,
          (
            SELECT ISNULL(SUM(i.points), 0)
            FROM INCIDENT_SCENARIO i
            WHERE i.incident_id IN (
              SELECT DISTINCT s.incident_id
              FROM INCIDENT_SCENARIO_SUBMISSION s
              WHERE s.user_id = @user_id
                AND s.is_correct = 1
            )
          ) AS total_score
      `);

    const progress = result.recordset[0];

    const totalIncidents = progress.total_incidents;
    const solvedIncidents = progress.solved_incidents;
    const unsolvedIncidents = totalIncidents - solvedIncidents;

    res.status(200).json({
      success: true,
      data: {
        total_incidents: totalIncidents,
        solved_incidents: solvedIncidents,
        unsolved_incidents: unsolvedIncidents,
        total_score: progress.total_score,
      },
    });
  } catch (error) {
    console.error("Get incident progress error:", error);
    res.status(500).json({
      error: "Failed to fetch incident progress",
    });
  }
};

// GET /api/incidents/:id
const getIncidentById = async (req, res) => {
  try {
    const incidentId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;

    if (!incidentId) {
      warnInvalidId(req, "incident.getById", req.params.id);
      return res.status(400).json({
        error: "Valid incident ID is required",
      });
    }

    const result = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          i.incident_id,
          i.title,
          i.case_summary,
          i.severity,
          i.hostname,
          i.affected_user,
          i.source_ip,
          i.analyst_objective,
          i.evidence_file,
          i.explanation,
          i.points,
          i.difficulty,
          i.created_at,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM INCIDENT_SCENARIO_SUBMISSION s
              WHERE s.user_id = @user_id
                AND s.incident_id = i.incident_id
                AND s.is_correct = 1
            )
            THEN 1
            ELSE 0
          END AS solved
        FROM INCIDENT_SCENARIO i
        WHERE i.incident_id = @incident_id;

        SELECT *
        FROM INCIDENT_STEP
        WHERE incident_id = @incident_id
        ORDER BY step_number ASC;

        SELECT DISTINCT iss.incident_step_id
        FROM INCIDENT_STEP_SUBMISSION iss
        INNER JOIN INCIDENT_STEP ist
          ON ist.incident_step_id = iss.incident_step_id
        WHERE iss.user_id = @user_id
          AND iss.is_correct = 1
          AND ist.incident_id = @incident_id;
      `);

    if (result.recordsets[0].length === 0) {
      return res.status(404).json({
        error: "Incident scenario not found",
      });
    }

    const incidentRow = result.recordsets[0][0];
    const incidentSteps = result.recordsets[1] || [];
    const solvedStepIds = new Set(
      (result.recordsets[2] || []).map((submission) => submission.incident_step_id)
    );

    const { steps, solvedSteps } = formatIncidentSteps(incidentSteps, solvedStepIds);
    const totalSteps = steps.length;
    const legacySolved = incidentRow.solved === 1;

    const progress = buildIncidentProgressData({
      totalSteps,
      solvedSteps,
      legacySolved,
      legacyPoints: Number(incidentRow.points) || 0,
    });

    const incident = {
      ...incidentRow,
      solved: progress.completed,
      explanation: progress.completed ? incidentRow.explanation : null,
    };

    res.status(200).json({
      success: true,
      data: {
        incident,
        steps,
        progress: {
          total_steps: progress.total_steps,
          solved_steps: progress.solved_steps,
          completed: progress.completed,
        },
      },
    });
  } catch (error) {
    console.error("Get incident by ID error:", error);
    res.status(500).json({
      error: "Failed to fetch incident scenario",
    });
  }
};

// GET /api/incidents/:id/progress
const getIncidentStepProgress = async (req, res) => {
  try {
    const incidentId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;

    if (!incidentId) {
      warnInvalidId(req, "incident.getProgress", req.params.id);
      return res.status(400).json({
        error: "Valid incident ID is required",
      });
    }

    const result = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          i.incident_id,
          i.points,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM INCIDENT_SCENARIO_SUBMISSION s
              WHERE s.user_id = @user_id
                AND s.incident_id = i.incident_id
                AND s.is_correct = 1
            )
            THEN 1
            ELSE 0
          END AS solved
        FROM INCIDENT_SCENARIO i
        WHERE i.incident_id = @incident_id;

        SELECT
          COUNT(*) AS total_steps,
          ISNULL(SUM(ISNULL(points, 0)), 0) AS total_points
        FROM INCIDENT_STEP
        WHERE incident_id = @incident_id;

        SELECT
          COUNT(*) AS solved_steps,
          ISNULL(SUM(ISNULL(s.points, 0)), 0) AS earned_points
        FROM INCIDENT_STEP s
        WHERE s.incident_id = @incident_id
          AND EXISTS (
            SELECT 1
            FROM INCIDENT_STEP_SUBMISSION iss
            WHERE iss.user_id = @user_id
              AND iss.incident_step_id = s.incident_step_id
              AND iss.is_correct = 1
          );
      `);

    if (result.recordsets[0].length === 0) {
      return res.status(404).json({
        error: "Incident scenario not found",
      });
    }

    const incidentRow = result.recordsets[0][0];
    const totalsRow = result.recordsets[1][0];
    const earnedRow = result.recordsets[2][0];

    const progress = buildIncidentProgressData({
      totalSteps: totalsRow.total_steps,
      solvedSteps: earnedRow.solved_steps,
      totalPoints: Number(totalsRow.total_points) || 0,
      earnedPoints: Number(earnedRow.earned_points) || 0,
      legacySolved: incidentRow.solved === 1,
      legacyPoints: Number(incidentRow.points) || 0,
    });

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("Get incident step progress error:", error);
    res.status(500).json({
      error: "Failed to fetch incident progress",
    });
  }
};

// POST /api/incidents/steps/:stepId/submit
const submitIncidentStep = async (req, res) => {
  try {
    const stepId = parsePositiveInt(req.params.stepId);
    const { answer } = req.body;
    const userId = req.user.userId;

    warnSuspiciousFields(req, "incident.stepSubmit", {
      answer,
    });

    if (!stepId) {
      warnInvalidId(req, "incident.stepSubmit", req.params.stepId);
      return res.status(400).json({
        error: "Valid step ID is required",
      });
    }

    const stepResult = await pool.request()
      .input("step_id", sql.Int, stepId)
      .query(`
        SELECT TOP 1 *
        FROM INCIDENT_STEP
        WHERE incident_step_id = @step_id
      `);

    if (stepResult.recordset.length === 0) {
      return res.status(404).json({
        error: "Incident step not found",
      });
    }

    const step = stepResult.recordset[0];

    const previousStepResult = await pool.request()
      .input("incident_id", sql.Int, step.incident_id)
      .input("step_number", sql.Int, step.step_number)
      .query(`
        SELECT TOP 1 incident_step_id, step_number
        FROM INCIDENT_STEP
        WHERE incident_id = @incident_id
          AND step_number < @step_number
        ORDER BY step_number DESC
      `);

    if (previousStepResult.recordset.length > 0) {
      const previousStep = previousStepResult.recordset[0];

      const previousSolvedResult = await pool.request()
        .input("user_id", sql.Int, userId)
        .input("step_id", sql.Int, previousStep.incident_step_id)
        .query(`
          SELECT TOP 1 incident_step_id
          FROM INCIDENT_STEP_SUBMISSION
          WHERE user_id = @user_id
            AND incident_step_id = @step_id
            AND is_correct = 1
        `);

      if (previousSolvedResult.recordset.length === 0) {
        return res.status(403).json({
          error: "Previous step must be solved before submitting this step",
        });
      }
    }

    const submittedAnswer = normalizeString(answer);

    if (!submittedAnswer) {
      warnMalformedInput(req, "incident.stepSubmit", {
        field: "answer",
      });
      return res.status(400).json({
        error: "Answer is required",
      });
    }

    if (submittedAnswer.length > MAX_ANSWER_LENGTH) {
      warnMalformedInput(req, "incident.stepSubmit", {
        field: "answer",
        length: submittedAnswer.length,
      });
      return res.status(400).json({
        error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer`,
      });
    }

    const existingSolvedResult = await pool.request()
      .input("user_id", sql.Int, userId)
      .input("step_id", sql.Int, stepId)
      .query(`
        SELECT TOP 1 incident_step_id
        FROM INCIDENT_STEP_SUBMISSION
        WHERE user_id = @user_id
          AND incident_step_id = @step_id
          AND is_correct = 1
      `);

    if (existingSolvedResult.recordset.length > 0) {
      return res.status(200).json({
        success: true,
        correct: true,
        message: "Step already solved",
        explanation: step.explanation || null,
        points: 0,
      });
    }

    const isCorrect =
      normalizeAnswer(submittedAnswer) === normalizeAnswer(step.correct_answer);

    await pool.request()
      .input("user_id", sql.Int, userId)
      .input("step_id", sql.Int, stepId)
      .input("submitted_answer", sql.NVarChar(sql.MAX), submittedAnswer)
      .input("is_correct", sql.Bit, isCorrect)
      .query(`
        INSERT INTO INCIDENT_STEP_SUBMISSION (
          user_id,
          incident_step_id,
          submitted_answer,
          is_correct,
          submitted_at
        )
        VALUES (
          @user_id,
          @step_id,
          @submitted_answer,
          @is_correct,
          GETDATE()
        )
      `);

    if (isCorrect) {
      await syncLegacyIncidentCompletion(step.incident_id, userId, submittedAnswer);
    }

    const responseBody = {
      success: true,
      correct: isCorrect,
      message: isCorrect ? "Correct answer!" : "Incorrect answer",
      points: isCorrect ? Number(step.points) || 0 : 0,
    };

    if (isCorrect) {
      responseBody.explanation = step.explanation || null;
    }

    res.status(200).json(responseBody);
  } catch (error) {
    console.error("Submit incident step error:", error);
    res.status(500).json({
      error: "Failed to submit incident step",
    });
  }
};

// POST /api/incidents/:id/submit
const submitIncident = async (req, res) => {
  try {
    const incidentId = parsePositiveInt(req.params.id);
    const { answer } = req.body;
    const userId = req.user.userId;

    warnSuspiciousFields(req, "incident.submit", {
      answer,
    });

    if (!incidentId) {
      warnInvalidId(req, "incident.submit", req.params.id);
      return res.status(400).json({
        error: "Valid incident ID is required",
      });
    }

    const submittedAnswer = normalizeString(answer);

    if (!submittedAnswer) {
      warnMalformedInput(req, "incident.submit", {
        field: "answer",
      });
      return res.status(400).json({
        error: "Answer is required",
      });
    }

    if (submittedAnswer.length > MAX_ANSWER_LENGTH) {
      warnMalformedInput(req, "incident.submit", {
        field: "answer",
        length: submittedAnswer.length,
      });
      return res.status(400).json({
        error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer`,
      });
    }

    const stepCountResult = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .query(`
        SELECT COUNT(*) AS step_count
        FROM INCIDENT_STEP
        WHERE incident_id = @incident_id
      `);

    if (stepCountResult.recordset[0].step_count > 0) {
      return res.status(400).json({
        error: "This incident uses step-based submissions. Submit answers to the unlocked step endpoint instead.",
      });
    }

    const incidentResult = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .query(`
        SELECT incident_id, title, correct_answer, points
        FROM INCIDENT_SCENARIO
        WHERE incident_id = @incident_id
      `);

    if (incidentResult.recordset.length === 0) {
      return res.status(404).json({
        error: "Incident scenario not found",
      });
    }

    const incident = incidentResult.recordset[0];
    const isCorrect =
      normalizeAnswer(submittedAnswer) === normalizeAnswer(incident.correct_answer);

    if (isCorrect) {
      const existing = await pool.request()
        .input("user_id", sql.Int, userId)
        .input("incident_id", sql.Int, incidentId)
        .query(`
          SELECT *
          FROM INCIDENT_SCENARIO_SUBMISSION
          WHERE user_id = @user_id
            AND incident_id = @incident_id
            AND is_correct = 1
        `);

      if (existing.recordset.length > 0) {
        return res.status(400).json({
          message: "Incident scenario already solved",
        });
      }
    }

    await pool.request()
      .input("user_id", sql.Int, userId)
      .input("incident_id", sql.Int, incidentId)
      .input("submitted_answer", sql.NVarChar(sql.MAX), submittedAnswer)
      .input("is_correct", sql.Bit, isCorrect)
      .query(`
        INSERT INTO INCIDENT_SCENARIO_SUBMISSION (
          user_id,
          incident_id,
          submitted_answer,
          is_correct,
          submitted_at
        )
        VALUES (
          @user_id,
          @incident_id,
          @submitted_answer,
          @is_correct,
          GETDATE()
        )
      `);

    res.status(200).json({
      success: true,
      message: isCorrect ? "Correct answer!" : "Incorrect answer",
      result: {
        incident_id: incident.incident_id,
        title: incident.title,
        is_correct: isCorrect,
        points_awarded: isCorrect ? incident.points : 0,
      },
    });
  } catch (error) {
    console.error("Submit incident error:", error);
    res.status(500).json({
      error: "Failed to submit answer",
    });
  }
};

// GET /api/incidents/admin/:incidentId/steps
const getIncidentStepsAdmin = async (req, res) => {
  try {
    const incidentId = parsePositiveInt(req.params.incidentId);

    if (!incidentId) {
      warnInvalidId(req, "incident.adminSteps.get", req.params.incidentId);
      return res.status(400).json({
        success: false,
        message: "Valid incident ID is required.",
      });
    }

    const result = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .query(`
        SELECT incident_id
        FROM INCIDENT_SCENARIO
        WHERE incident_id = @incident_id;

        SELECT
          incident_step_id,
          incident_id,
          step_number,
          title,
          question,
          step_type,
          options_json,
          correct_answer,
          explanation,
          points,
          created_at
        FROM INCIDENT_STEP
        WHERE incident_id = @incident_id
        ORDER BY step_number ASC, incident_step_id ASC;
      `);

    if ((result.recordsets[0] || []).length === 0) {
      return res.status(404).json({
        success: false,
        message: "Incident scenario not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: result.recordsets[1] || [],
    });
  } catch (error) {
    console.error("Get incident admin steps error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load incident steps.",
    });
  }
};

// POST /api/incidents/admin/:incidentId/steps/default
const createDefaultIncidentSteps = async (req, res) => {
  let transaction = null;
  let transactionActive = false;

  try {
    const incidentId = parsePositiveInt(req.params.incidentId);

    if (!incidentId) {
      warnInvalidId(req, "incident.adminSteps.createDefault", req.params.incidentId);
      return res.status(400).json({
        success: false,
        message: "Valid incident ID is required.",
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionActive = true;

    const checkResult = await transaction.request()
      .input("incident_id", sql.Int, incidentId)
      .query(`
        SELECT incident_id
        FROM INCIDENT_SCENARIO
        WHERE incident_id = @incident_id;

        SELECT COUNT(*) AS step_count
        FROM INCIDENT_STEP
        WHERE incident_id = @incident_id;
      `);

    if ((checkResult.recordsets[0] || []).length === 0) {
      await transaction.rollback();
      transaction = null;
      transactionActive = false;

      return res.status(404).json({
        success: false,
        message: "Incident scenario not found.",
      });
    }

    const existingStepCount = Number(checkResult.recordsets[1]?.[0]?.step_count) || 0;

    if (existingStepCount > 0) {
      await transaction.rollback();
      transaction = null;
      transactionActive = false;

      return res.status(400).json({
        success: false,
        message: "This incident already has investigation steps.",
      });
    }

    const createdSteps = [];

    for (const step of STANDARD_INCIDENT_WORKFLOW) {
      const insertResult = await transaction.request()
        .input("incident_id", sql.Int, incidentId)
        .input("step_number", sql.Int, step.stepNumber)
        .input("title", sql.NVarChar(150), step.title)
        .input("question", sql.NVarChar(sql.MAX), step.question)
        .input("step_type", sql.NVarChar(20), step.stepType)
        .input("options_json", sql.NVarChar(sql.MAX), step.optionsJson)
        .input("correct_answer", sql.NVarChar(255), step.correctAnswer)
        .input("explanation", sql.NVarChar(sql.MAX), step.explanation)
        .input("points", sql.Int, step.points)
        .query(`
          INSERT INTO INCIDENT_STEP (
            incident_id,
            step_number,
            title,
            question,
            step_type,
            options_json,
            correct_answer,
            explanation,
            points,
            created_at
          )
          OUTPUT
            INSERTED.incident_step_id,
            INSERTED.incident_id,
            INSERTED.step_number,
            INSERTED.title,
            INSERTED.question,
            INSERTED.step_type,
            INSERTED.options_json,
            INSERTED.correct_answer,
            INSERTED.explanation,
            INSERTED.points,
            INSERTED.created_at
          VALUES (
            @incident_id,
            @step_number,
            @title,
            @question,
            @step_type,
            @options_json,
            @correct_answer,
            @explanation,
            @points,
            GETDATE()
          )
        `);

      createdSteps.push(insertResult.recordset[0]);
    }

    await transaction.commit();
    transaction = null;
    transactionActive = false;

    res.status(201).json({
      success: true,
      message: "Standard investigation workflow added successfully.",
      data: createdSteps,
    });
  } catch (error) {
    if (transaction && transactionActive) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback default incident steps error:", rollbackError);
      }
    }

    console.error("Create default incident steps error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create the standard investigation workflow.",
    });
  }
};

// POST /api/incidents/admin/:incidentId/steps
const createIncidentStep = async (req, res) => {
  try {
    const incidentId = parsePositiveInt(req.params.incidentId);

    if (!incidentId) {
      warnInvalidId(req, "incident.adminSteps.create", req.params.incidentId);
      return res.status(400).json({
        success: false,
        message: "Valid incident ID is required.",
      });
    }

    const validationResult = validateIncidentStepPayload(
      req,
      req.body,
      "incident.adminSteps.create"
    );

    if (validationResult.error) {
      return res.status(400).json({
        success: false,
        message: validationResult.error,
      });
    }

    const {
      stepNumber,
      normalizedTitle,
      normalizedQuestion,
      normalizedCorrectAnswer,
      normalizedExplanation,
      normalizedStepType,
      normalizedOptionsJson,
      parsedPoints,
    } = validationResult.value;

    const incidentCheckResult = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .query(`
        SELECT incident_id
        FROM INCIDENT_SCENARIO
        WHERE incident_id = @incident_id
      `);

    if (incidentCheckResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Incident scenario not found.",
      });
    }

    const result = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .input("step_number", sql.Int, stepNumber)
      .input("title", sql.NVarChar(150), normalizedTitle)
      .input("question", sql.NVarChar(sql.MAX), normalizedQuestion)
      .input("step_type", sql.NVarChar(20), normalizedStepType)
      .input("options_json", sql.NVarChar(sql.MAX), normalizedOptionsJson)
      .input("correct_answer", sql.NVarChar(255), normalizedCorrectAnswer)
      .input("explanation", sql.NVarChar(sql.MAX), normalizedExplanation)
      .input("points", sql.Int, parsedPoints)
      .query(`
        INSERT INTO INCIDENT_STEP (
          incident_id,
          step_number,
          title,
          question,
          step_type,
          options_json,
          correct_answer,
          explanation,
          points,
          created_at
        )
        OUTPUT
          INSERTED.incident_step_id,
          INSERTED.incident_id,
          INSERTED.step_number,
          INSERTED.title,
          INSERTED.question,
          INSERTED.step_type,
          INSERTED.options_json,
          INSERTED.correct_answer,
          INSERTED.explanation,
          INSERTED.points,
          INSERTED.created_at
        VALUES (
          @incident_id,
          @step_number,
          @title,
          @question,
          @step_type,
          @options_json,
          @correct_answer,
          @explanation,
          @points,
          GETDATE()
        )
      `);

    res.status(201).json({
      success: true,
      message: "Incident step created successfully.",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Create incident step error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create incident step.",
    });
  }
};

// PUT /api/incidents/admin/steps/:stepId
const updateIncidentStep = async (req, res) => {
  try {
    const stepId = parsePositiveInt(req.params.stepId);

    if (!stepId) {
      warnInvalidId(req, "incident.adminSteps.update", req.params.stepId);
      return res.status(400).json({
        success: false,
        message: "Valid step ID is required.",
      });
    }

    const validationResult = validateIncidentStepPayload(
      req,
      req.body,
      "incident.adminSteps.update"
    );

    if (validationResult.error) {
      return res.status(400).json({
        success: false,
        message: validationResult.error,
      });
    }

    const {
      stepNumber,
      normalizedTitle,
      normalizedQuestion,
      normalizedCorrectAnswer,
      normalizedExplanation,
      normalizedStepType,
      normalizedOptionsJson,
      parsedPoints,
    } = validationResult.value;

    const checkResult = await pool.request()
      .input("step_id", sql.Int, stepId)
      .query(`
        SELECT incident_step_id
        FROM INCIDENT_STEP
        WHERE incident_step_id = @step_id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Incident step not found.",
      });
    }

    // Preserve existing step submissions when step content is edited.
    // In production, versioning could be added for major answer changes.
    const result = await pool.request()
      .input("step_id", sql.Int, stepId)
      .input("step_number", sql.Int, stepNumber)
      .input("title", sql.NVarChar(150), normalizedTitle)
      .input("question", sql.NVarChar(sql.MAX), normalizedQuestion)
      .input("step_type", sql.NVarChar(20), normalizedStepType)
      .input("options_json", sql.NVarChar(sql.MAX), normalizedOptionsJson)
      .input("correct_answer", sql.NVarChar(255), normalizedCorrectAnswer)
      .input("explanation", sql.NVarChar(sql.MAX), normalizedExplanation)
      .input("points", sql.Int, parsedPoints)
      .query(`
        UPDATE INCIDENT_STEP
        SET
          step_number = @step_number,
          title = @title,
          question = @question,
          step_type = @step_type,
          options_json = @options_json,
          correct_answer = @correct_answer,
          explanation = @explanation,
          points = @points
        WHERE incident_step_id = @step_id;

        SELECT
          incident_step_id,
          incident_id,
          step_number,
          title,
          question,
          step_type,
          options_json,
          correct_answer,
          explanation,
          points,
          created_at
        FROM INCIDENT_STEP
        WHERE incident_step_id = @step_id;
      `);

    res.status(200).json({
      success: true,
      message: "Incident step updated successfully.",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Update incident step error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update incident step.",
    });
  }
};

// DELETE /api/incidents/admin/steps/:stepId
const deleteIncidentStep = async (req, res) => {
  let transaction = null;
  let transactionActive = false;

  try {
    const stepId = parsePositiveInt(req.params.stepId);

    if (!stepId) {
      warnInvalidId(req, "incident.adminSteps.delete", req.params.stepId);
      return res.status(400).json({
        success: false,
        message: "Valid step ID is required.",
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionActive = true;

    const checkResult = await transaction.request()
      .input("step_id", sql.Int, stepId)
      .query(`
        SELECT incident_step_id
        FROM INCIDENT_STEP
        WHERE incident_step_id = @step_id
      `);

    if (checkResult.recordset.length === 0) {
      await transaction.rollback();
      transaction = null;
      transactionActive = false;

      return res.status(404).json({
        success: false,
        message: "Incident step not found.",
      });
    }

    await transaction.request()
      .input("step_id", sql.Int, stepId)
      .query(`
        DELETE FROM INCIDENT_STEP_SUBMISSION
        WHERE incident_step_id = @step_id;

        DELETE FROM INCIDENT_STEP
        WHERE incident_step_id = @step_id;
      `);

    await transaction.commit();
    transaction = null;
    transactionActive = false;

    res.status(200).json({
      success: true,
      message: "Incident step deleted successfully.",
    });
  } catch (error) {
    if (transaction && transactionActive) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback incident step delete error:", rollbackError);
      }
    }

    console.error("Delete incident step error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete incident step.",
    });
  }
};

// POST /api/incidents/admin
const createIncident = async (req, res) => {
  try {
    const {
      title,
      description,
      case_summary,
      severity,
      hostname,
      affected_user,
      source_ip,
      analyst_objective,
      evidence_file,
      correct_answer,
      points,
      difficulty,
      explanation,
    } = req.body;
    const normalizedTitle = normalizeString(title);
    const normalizedDescription = normalizeString(description);
    const normalizedCorrectAnswer = normalizeString(correct_answer);
    const normalizedDifficulty = normalizeString(difficulty);
    const normalizedCaseSummary = normalizeOptionalString(case_summary);
    const normalizedSeverity = normalizeOptionalString(severity);
    const normalizedHostname = normalizeOptionalString(hostname);
    const normalizedAffectedUser = normalizeOptionalString(affected_user);
    const normalizedSourceIp = normalizeOptionalString(source_ip);
    const normalizedObjective = normalizeOptionalString(analyst_objective);
    const normalizedEvidence = normalizeOptionalString(evidence_file);
    const normalizedExplanation = normalizeOptionalString(explanation);
    const parsedPoints = Number(points);

    warnSuspiciousFields(req, "incident.create", {
      title,
      description,
      case_summary,
      analyst_objective,
      evidence_file,
      correct_answer,
      explanation,
    });

    if (!normalizedTitle) {
      warnMalformedInput(req, "incident.create", {
        field: "title",
      });
      return res.status(400).json({
        error: "Title is required",
      });
    }

    if (normalizedTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer`,
      });
    }

    if (!normalizedDescription) {
      warnMalformedInput(req, "incident.create", {
        field: "description",
      });
      return res.status(400).json({
        error: "Description is required",
      });
    }

    if (!normalizedCorrectAnswer) {
      warnMalformedInput(req, "incident.create", {
        field: "correct_answer",
      });
      return res.status(400).json({
        error: "Correct answer is required",
      });
    }

    if (
      points === undefined ||
      points === null ||
      !isNonNegativeNumber(points)
    ) {
      warnMalformedInput(req, "incident.create", {
        field: "points",
        value: points,
      });
      return res.status(400).json({
        error: "Valid points are required",
      });
    }

    if (normalizedDifficulty && !isValidDifficulty(normalizedDifficulty)) {
      warnMalformedInput(req, "incident.create", {
        field: "difficulty",
        value: normalizedDifficulty,
      });
      return res.status(400).json({
        error: "Difficulty must be Easy, Medium, or Hard",
      });
    }

    const result = await pool.request()
      .input("title", sql.NVarChar, normalizedTitle)
      .input("description", sql.NVarChar, normalizedDescription)
      .input("case_summary", sql.NVarChar, normalizedCaseSummary)
      .input("severity", sql.NVarChar, normalizedSeverity)
      .input("hostname", sql.NVarChar, normalizedHostname)
      .input("affected_user", sql.NVarChar, normalizedAffectedUser)
      .input("source_ip", sql.NVarChar, normalizedSourceIp)
      .input("analyst_objective", sql.NVarChar, normalizedObjective)
      .input("evidence_file", sql.NVarChar, normalizedEvidence)
      .input("correct_answer", sql.NVarChar, normalizedCorrectAnswer)
      .input("points", sql.Int, parsedPoints)
      .input("difficulty", sql.NVarChar, normalizedDifficulty || null)
      .input("explanation", sql.NVarChar(sql.MAX), normalizedExplanation)
      .query(`
        INSERT INTO INCIDENT_SCENARIO (
          title,
          description,
          case_summary,
          severity,
          hostname,
          affected_user,
          source_ip,
          analyst_objective,
          evidence_file,
          correct_answer,
          points,
          difficulty,
          explanation,
          created_at
        )
        OUTPUT INSERTED.incident_id,
               INSERTED.title,
               INSERTED.description,
               INSERTED.case_summary,
               INSERTED.severity,
               INSERTED.hostname,
               INSERTED.affected_user,
               INSERTED.source_ip,
               INSERTED.analyst_objective,
               INSERTED.evidence_file,
               INSERTED.correct_answer,
               INSERTED.points,
               INSERTED.difficulty,
               INSERTED.explanation,
               INSERTED.created_at
        VALUES (
          @title,
          @description,
          @case_summary,
          @severity,
          @hostname,
          @affected_user,
          @source_ip,
          @analyst_objective,
          @evidence_file,
          @correct_answer,
          @points,
          @difficulty,
          @explanation,
          GETDATE()
        )
      `);

    res.status(201).json({
      success: true,
      message: "Incident scenario created successfully",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Create incident error:", error);
    res.status(500).json({
      error: "Failed to create incident scenario",
    });
  }
};

// PUT /api/incidents/admin/:id
const updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      case_summary,
      severity,
      hostname,
      affected_user,
      source_ip,
      analyst_objective,
      evidence_file,
      correct_answer,
      points,
      difficulty,
      explanation,
    } = req.body;
    const incidentId = parsePositiveInt(id);
    const normalizedTitle = normalizeString(title);
    const normalizedDescription = normalizeString(description);
    const normalizedCorrectAnswer = normalizeString(correct_answer);
    const normalizedDifficulty = normalizeString(difficulty);
    const normalizedCaseSummary = normalizeOptionalString(case_summary);
    const normalizedSeverity = normalizeOptionalString(severity);
    const normalizedHostname = normalizeOptionalString(hostname);
    const normalizedAffectedUser = normalizeOptionalString(affected_user);
    const normalizedSourceIp = normalizeOptionalString(source_ip);
    const normalizedObjective = normalizeOptionalString(analyst_objective);
    const normalizedEvidence = normalizeOptionalString(evidence_file);
    const normalizedExplanation = normalizeOptionalString(explanation);
    const parsedPoints = Number(points);

    warnSuspiciousFields(req, "incident.update", {
      title,
      description,
      case_summary,
      analyst_objective,
      evidence_file,
      correct_answer,
      explanation,
    });

    if (!incidentId) {
      warnInvalidId(req, "incident.update", id);
      return res.status(400).json({
        success: false,
        message: "Valid incident ID is required",
      });
    }

    if (!normalizedTitle) {
      warnMalformedInput(req, "incident.update", {
        field: "title",
      });
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (normalizedTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer`,
      });
    }

    if (!normalizedDescription) {
      warnMalformedInput(req, "incident.update", {
        field: "description",
      });
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    if (!normalizedCorrectAnswer) {
      warnMalformedInput(req, "incident.update", {
        field: "correct_answer",
      });
      return res.status(400).json({
        success: false,
        message: "Correct answer is required",
      });
    }

    if (!isNonNegativeNumber(points)) {
      warnMalformedInput(req, "incident.update", {
        field: "points",
        value: points,
      });
      return res.status(400).json({
        success: false,
        message: "Points must be a non-negative number",
      });
    }

    if (normalizedDifficulty && !isValidDifficulty(normalizedDifficulty)) {
      warnMalformedInput(req, "incident.update", {
        field: "difficulty",
        value: normalizedDifficulty,
      });
      return res.status(400).json({
        success: false,
        message: "Difficulty must be Easy, Medium, or Hard",
      });
    }

    const checkResult = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .query(`
        SELECT incident_id
        FROM INCIDENT_SCENARIO
        WHERE incident_id = @incident_id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Incident scenario not found",
      });
    }

    // Preserve existing submissions when incident content is edited.
    // In production, versioning could be added for major answer changes.
    const result = await pool.request()
      .input("incident_id", sql.Int, incidentId)
      .input("title", sql.NVarChar(150), normalizedTitle)
      .input("description", sql.NVarChar(sql.MAX), normalizedDescription)
      .input("case_summary", sql.NVarChar(500), normalizedCaseSummary)
      .input("severity", sql.NVarChar(20), normalizedSeverity)
      .input("hostname", sql.NVarChar(100), normalizedHostname)
      .input("affected_user", sql.NVarChar(100), normalizedAffectedUser)
      .input("source_ip", sql.NVarChar(50), normalizedSourceIp)
      .input("analyst_objective", sql.NVarChar(500), normalizedObjective)
      .input("evidence_file", sql.NVarChar(sql.MAX), normalizedEvidence)
      .input("correct_answer", sql.NVarChar(255), normalizedCorrectAnswer)
      .input("points", sql.Int, parsedPoints)
      .input("difficulty", sql.NVarChar(20), normalizedDifficulty || null)
      .input("explanation", sql.NVarChar(sql.MAX), normalizedExplanation)
      .query(`
        UPDATE INCIDENT_SCENARIO
        SET
          title = @title,
          description = @description,
          case_summary = @case_summary,
          severity = @severity,
          hostname = @hostname,
          affected_user = @affected_user,
          source_ip = @source_ip,
          analyst_objective = @analyst_objective,
          evidence_file = @evidence_file,
          correct_answer = @correct_answer,
          points = @points,
          difficulty = @difficulty,
          explanation = @explanation
        WHERE incident_id = @incident_id;

        SELECT
          incident_id,
          title,
          description,
          case_summary,
          severity,
          hostname,
          affected_user,
          source_ip,
          analyst_objective,
          evidence_file,
          correct_answer,
          points,
          difficulty,
          explanation,
          created_at
        FROM INCIDENT_SCENARIO
        WHERE incident_id = @incident_id;
      `);

    res.status(200).json({
      success: true,
      message: "Incident scenario updated successfully",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Update incident error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update incident scenario",
    });
  }
};

// DELETE /api/incidents/admin/:id
const deleteIncident = async (req, res) => {
  let transaction = null;
  let transactionActive = false;

  try {
    const incidentId = parsePositiveInt(req.params.id);

    if (!incidentId) {
      warnInvalidId(req, "incident.delete", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionActive = true;

    const checkResult = await transaction.request()
      .input("incident_id", sql.Int, incidentId)
      .query(`
        SELECT incident_id
        FROM INCIDENT_SCENARIO
        WHERE incident_id = @incident_id
      `);

    if (checkResult.recordset.length === 0) {
      await transaction.rollback();
      transaction = null;
      transactionActive = false;

      return res.status(404).json({
        success: false,
        message: "Incident scenario not found",
      });
    }

    await transaction.request()
      .input("incident_id", sql.Int, incidentId)
      .query(`
        DELETE iss
        FROM INCIDENT_STEP_SUBMISSION iss
        INNER JOIN INCIDENT_STEP s
          ON iss.incident_step_id = s.incident_step_id
        WHERE s.incident_id = @incident_id;

        DELETE FROM INCIDENT_STEP
        WHERE incident_id = @incident_id;

        DELETE FROM INCIDENT_SCENARIO_SUBMISSION
        WHERE incident_id = @incident_id;

        DELETE FROM INCIDENT_SCENARIO
        WHERE incident_id = @incident_id;
      `);

    await transaction.commit();
    transaction = null;
    transactionActive = false;

    res.status(200).json({
      success: true,
      message: "Incident scenario deleted successfully.",
    });
  } catch (error) {
    if (transaction && transactionActive) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback incident delete error:", rollbackError);
      }
    }

    console.error("Delete incident error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete incident scenario.",
    });
  }
};

// GET /api/incidents/admin
const getAllIncidentsAdmin = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        i.incident_id,
        i.title,
        i.description,
        i.case_summary,
        i.severity,
        i.hostname,
        i.affected_user,
        i.source_ip,
        i.analyst_objective,
        i.evidence_file,
        i.correct_answer,
        i.points,
        i.difficulty,
        i.explanation,
        i.created_at,
        (
          SELECT COUNT(*)
          FROM INCIDENT_STEP s
          WHERE s.incident_id = i.incident_id
        ) AS step_count
      FROM INCIDENT_SCENARIO i
      ORDER BY i.incident_id ASC
    `);

    res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("Get admin incidents error:", error);
    res.status(500).json({
      error: "Failed to fetch incidents",
    });
  }
};

module.exports = {
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
};
