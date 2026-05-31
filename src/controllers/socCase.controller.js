const { sql, pool } = require("../config/db");
const {
  MAX_ANSWER_LENGTH,
  MAX_TITLE_LENGTH,
  normalizeOptionalString,
  normalizeString,
  isNonNegativeNumber,
  isValidDifficulty,
  parsePositiveInt,
} = require("../utils/validation");
const {
  warnMalformedInput,
  warnInvalidId,
  warnSuspiciousFields,
} = require("../utils/security");

// GET /api/soc-cases
const getAllSocCases = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          sc.soc_case_id,
          sc.title,
          sc.case_summary,
          sc.severity,
          sc.hostname,
          sc.affected_user,
          sc.source_ip,
          sc.points,
          sc.difficulty,
          sc.created_at,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM SOC_CASE_SUBMISSION scs
              WHERE scs.user_id = @user_id
                AND scs.soc_case_id = sc.soc_case_id
                AND scs.is_correct = 1
            )
            THEN 1
            ELSE 0
          END AS solved
        FROM SOC_CASE sc
        ORDER BY sc.soc_case_id ASC
      `);

    const socCases = result.recordset.map((socCase) => ({
      ...socCase,
      solved: socCase.solved === 1,
    }));

    res.status(200).json({
      success: true,
      data: socCases,
    });
  } catch (error) {
    console.error("Get all SOC cases error:", error);
    res.status(500).json({
      error: "Failed to fetch SOC cases",
    });
  }
};

// GET /api/soc-cases/admin
const getAllSocCasesAdmin = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        soc_case_id,
        title,
        description,
        case_summary,
        severity,
        hostname,
        affected_user,
        source_ip,
        analyst_objective,
        log_source,
        correct_answer,
        points,
        difficulty,
        explanation,
        created_at
      FROM SOC_CASE
      ORDER BY soc_case_id ASC
    `);

    res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("Get admin SOC cases error:", error);
    res.status(500).json({
      error: "Failed to fetch SOC cases",
    });
  }
};

// GET /api/soc-cases/progress
const getSocCaseProgress = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM SOC_CASE) AS total_soc_cases,
          (
            SELECT COUNT(DISTINCT scs.soc_case_id)
            FROM SOC_CASE_SUBMISSION scs
            WHERE scs.user_id = @user_id
              AND scs.is_correct = 1
          ) AS solved_soc_cases,
          (
            SELECT ISNULL(SUM(sc.points), 0)
            FROM SOC_CASE sc
            WHERE sc.soc_case_id IN (
              SELECT DISTINCT scs.soc_case_id
              FROM SOC_CASE_SUBMISSION scs
              WHERE scs.user_id = @user_id
                AND scs.is_correct = 1
            )
          ) AS total_score
      `);

    const progress = result.recordset[0];

    const totalSocCases = progress.total_soc_cases;
    const solvedSocCases = progress.solved_soc_cases;
    const unsolvedSocCases = totalSocCases - solvedSocCases;

    res.status(200).json({
      success: true,
      data: {
        total_soc_cases: totalSocCases,
        solved_soc_cases: solvedSocCases,
        unsolved_soc_cases: unsolvedSocCases,
        total_score: progress.total_score,
      },
    });
  } catch (error) {
    console.error("Get SOC case progress error:", error);
    res.status(500).json({
      error: "Failed to fetch SOC case progress",
    });
  }
};

// GET /api/soc-cases/:id
const getSocCaseById = async (req, res) => {
  try {
    const socCaseId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;

    if (!socCaseId) {
      warnInvalidId(req, "socCase.getById", req.params.id);
      return res.status(400).json({
        error: "Invalid input",
      });
    }

    // Preserve existing submissions when SOC content is edited.
    // In production, versioning could be added for major answer changes.
    const result = await pool
      .request()
      .input("soc_case_id", sql.Int, socCaseId)
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          sc.soc_case_id,
          sc.title,
          sc.case_summary,
          sc.severity,
          sc.hostname,
          sc.affected_user,
          sc.source_ip,
          sc.analyst_objective,
          sc.log_source,
          sc.explanation,
          sc.points,
          sc.difficulty,
          sc.created_at,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM SOC_CASE_SUBMISSION scs
              WHERE scs.user_id = @user_id
                AND scs.soc_case_id = sc.soc_case_id
                AND scs.is_correct = 1
            )
            THEN 1
            ELSE 0
          END AS solved
        FROM SOC_CASE sc
        WHERE sc.soc_case_id = @soc_case_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: "SOC case not found",
      });
    }

    const socCase = {
      ...result.recordset[0],
      solved: result.recordset[0].solved === 1,
    };

    res.status(200).json({
      success: true,
      data: socCase,
    });
  } catch (error) {
    console.error("Get SOC case by ID error:", error);
    res.status(500).json({
      error: "Failed to fetch SOC case",
    });
  }
};

// POST /api/soc-cases/:id/submit
const submitSocCase = async (req, res) => {
  try {
    const socCaseId = parsePositiveInt(req.params.id);
    const { answer } = req.body;
    const userId = req.user.userId;
    const submittedAnswer = normalizeString(answer);

    warnSuspiciousFields(req, "socCase.submit", {
      answer,
    });

    if (!socCaseId) {
      warnInvalidId(req, "socCase.submit", req.params.id);
      return res.status(400).json({
        error: "Valid SOC case ID is required",
      });
    }

    if (!submittedAnswer) {
      warnMalformedInput(req, "socCase.submit", {
        field: "answer",
      });
      return res.status(400).json({
        error: "Answer is required",
      });
    }

    if (submittedAnswer.length > MAX_ANSWER_LENGTH) {
      warnMalformedInput(req, "socCase.submit", {
        field: "answer",
        length: submittedAnswer.length,
      });
      return res.status(400).json({
        error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer`,
      });
    }

    const socCaseResult = await pool
      .request()
      .input("soc_case_id", sql.Int, socCaseId)
      .query(`
        SELECT soc_case_id, title, correct_answer, points
        FROM SOC_CASE
        WHERE soc_case_id = @soc_case_id
      `);

    if (socCaseResult.recordset.length === 0) {
      return res.status(404).json({
        error: "SOC case not found",
      });
    }

    const socCase = socCaseResult.recordset[0];
    const isCorrect = submittedAnswer === socCase.correct_answer;

    if (isCorrect) {
      const existing = await pool
        .request()
        .input("user_id", sql.Int, userId)
        .input("soc_case_id", sql.Int, socCaseId)
        .query(`
          SELECT *
          FROM SOC_CASE_SUBMISSION
          WHERE user_id = @user_id
            AND soc_case_id = @soc_case_id
            AND is_correct = 1
        `);

      if (existing.recordset.length > 0) {
        return res.status(400).json({
          message: "SOC case already solved",
        });
      }
    }

    await pool
      .request()
      .input("user_id", sql.Int, userId)
      .input("soc_case_id", sql.Int, socCaseId)
      .input("submitted_answer", sql.NVarChar, submittedAnswer)
      .input("is_correct", sql.Bit, isCorrect)
      .query(`
        INSERT INTO SOC_CASE_SUBMISSION (
          user_id,
          soc_case_id,
          submitted_answer,
          is_correct,
          submitted_at
        )
        VALUES (
          @user_id,
          @soc_case_id,
          @submitted_answer,
          @is_correct,
          GETDATE()
        )
      `);

    res.status(200).json({
      success: true,
      message: isCorrect ? "Correct answer!" : "Incorrect answer",
      result: {
        soc_case_id: socCase.soc_case_id,
        title: socCase.title,
        is_correct: isCorrect,
        points_awarded: isCorrect ? socCase.points : 0,
      },
    });
  } catch (error) {
    console.error("Submit SOC case error:", error);
    res.status(500).json({
      error: "Failed to submit answer",
    });
  }
};

// POST /api/soc-cases/admin
const createSocCase = async (req, res) => {
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
      log_source,
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
    const normalizedLogSource = normalizeOptionalString(log_source);
    const normalizedExplanation = normalizeOptionalString(explanation);
    const parsedPoints = Number(points);

    warnSuspiciousFields(req, "socCase.create", {
      title,
      description,
      case_summary,
      analyst_objective,
      log_source,
      correct_answer,
      explanation,
    });

    if (!normalizedTitle) {
      warnMalformedInput(req, "socCase.create", {
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
      warnMalformedInput(req, "socCase.create", {
        field: "description",
      });
      return res.status(400).json({
        error: "Description is required",
      });
    }

    if (!normalizedCorrectAnswer) {
      warnMalformedInput(req, "socCase.create", {
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
      warnMalformedInput(req, "socCase.create", {
        field: "points",
        value: points,
      });
      return res.status(400).json({
        error: "Valid points are required",
      });
    }

    if (normalizedDifficulty && !isValidDifficulty(normalizedDifficulty)) {
      warnMalformedInput(req, "socCase.create", {
        field: "difficulty",
        value: normalizedDifficulty,
      });
      return res.status(400).json({
        error: "Difficulty must be Easy, Medium, or Hard",
      });
    }

    const result = await pool
      .request()
      .input("title", sql.NVarChar(150), normalizedTitle)
      .input("description", sql.NVarChar(sql.MAX), normalizedDescription)
      .input("case_summary", sql.NVarChar(sql.MAX), normalizedCaseSummary)
      .input("severity", sql.NVarChar(20), normalizedSeverity)
      .input("hostname", sql.NVarChar(100), normalizedHostname)
      .input("affected_user", sql.NVarChar(100), normalizedAffectedUser)
      .input("source_ip", sql.NVarChar(50), normalizedSourceIp)
      .input("analyst_objective", sql.NVarChar(sql.MAX), normalizedObjective)
      .input("log_source", sql.NVarChar(sql.MAX), normalizedLogSource)
      .input("correct_answer", sql.NVarChar(255), normalizedCorrectAnswer)
      .input("points", sql.Int, parsedPoints)
      .input("difficulty", sql.NVarChar(20), normalizedDifficulty || null)
      .input("explanation", sql.NVarChar(sql.MAX), normalizedExplanation)
      .query(`
        INSERT INTO SOC_CASE (
          title,
          description,
          case_summary,
          severity,
          hostname,
          affected_user,
          source_ip,
          analyst_objective,
          log_source,
          correct_answer,
          points,
          difficulty,
          explanation,
          created_at
        )
        OUTPUT
          INSERTED.soc_case_id,
          INSERTED.title,
          INSERTED.description,
          INSERTED.case_summary,
          INSERTED.severity,
          INSERTED.hostname,
          INSERTED.affected_user,
          INSERTED.source_ip,
          INSERTED.analyst_objective,
          INSERTED.log_source,
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
          @log_source,
          @correct_answer,
          @points,
          @difficulty,
          @explanation,
          GETDATE()
        )
      `);

    res.status(201).json({
      success: true,
      message: "SOC case created successfully",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Create SOC case error:", error);
    res.status(500).json({
      error: "Failed to create SOC case",
    });
  }
};

// PUT /api/soc-cases/admin/:id
const updateSocCase = async (req, res) => {
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
      log_source,
      correct_answer,
      points,
      difficulty,
      explanation,
    } = req.body;
    const socCaseId = parsePositiveInt(id);
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
    const normalizedLogSource = normalizeOptionalString(log_source);
    const normalizedExplanation = normalizeOptionalString(explanation);
    const parsedPoints = Number(points);

    warnSuspiciousFields(req, "socCase.update", {
      title,
      description,
      case_summary,
      analyst_objective,
      log_source,
      correct_answer,
      explanation,
    });

    if (!socCaseId) {
      warnInvalidId(req, "socCase.update", id);
      return res.status(400).json({
        success: false,
        message: "Valid SOC case ID is required",
      });
    }

    if (!normalizedTitle) {
      warnMalformedInput(req, "socCase.update", {
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
      warnMalformedInput(req, "socCase.update", {
        field: "description",
      });
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    if (!normalizedCorrectAnswer) {
      warnMalformedInput(req, "socCase.update", {
        field: "correct_answer",
      });
      return res.status(400).json({
        success: false,
        message: "Correct answer is required",
      });
    }

    if (!isNonNegativeNumber(points)) {
      warnMalformedInput(req, "socCase.update", {
        field: "points",
        value: points,
      });
      return res.status(400).json({
        success: false,
        message: "Points must be a non-negative number",
      });
    }

    if (normalizedDifficulty && !isValidDifficulty(normalizedDifficulty)) {
      warnMalformedInput(req, "socCase.update", {
        field: "difficulty",
        value: normalizedDifficulty,
      });
      return res.status(400).json({
        success: false,
        message: "Difficulty must be Easy, Medium, or Hard",
      });
    }

    const checkResult = await pool
      .request()
      .input("soc_case_id", sql.Int, socCaseId)
      .query(`
        SELECT soc_case_id
        FROM SOC_CASE
        WHERE soc_case_id = @soc_case_id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "SOC case not found",
      });
    }

    const result = await pool
      .request()
      .input("soc_case_id", sql.Int, socCaseId)
      .input("title", sql.NVarChar(150), normalizedTitle)
      .input("description", sql.NVarChar(sql.MAX), normalizedDescription)
      .input("case_summary", sql.NVarChar(sql.MAX), normalizedCaseSummary)
      .input("severity", sql.NVarChar(20), normalizedSeverity)
      .input("hostname", sql.NVarChar(100), normalizedHostname)
      .input("affected_user", sql.NVarChar(100), normalizedAffectedUser)
      .input("source_ip", sql.NVarChar(50), normalizedSourceIp)
      .input("analyst_objective", sql.NVarChar(sql.MAX), normalizedObjective)
      .input("log_source", sql.NVarChar(sql.MAX), normalizedLogSource)
      .input("correct_answer", sql.NVarChar(255), normalizedCorrectAnswer)
      .input("points", sql.Int, parsedPoints)
      .input("difficulty", sql.NVarChar(20), normalizedDifficulty || null)
      .input("explanation", sql.NVarChar(sql.MAX), normalizedExplanation)
      .query(`
        UPDATE SOC_CASE
        SET
          title = @title,
          description = @description,
          case_summary = @case_summary,
          severity = @severity,
          hostname = @hostname,
          affected_user = @affected_user,
          source_ip = @source_ip,
          analyst_objective = @analyst_objective,
          log_source = @log_source,
          correct_answer = @correct_answer,
          points = @points,
          difficulty = @difficulty,
          explanation = @explanation
        WHERE soc_case_id = @soc_case_id;

        SELECT
          soc_case_id,
          title,
          description,
          case_summary,
          severity,
          hostname,
          affected_user,
          source_ip,
          analyst_objective,
          log_source,
          correct_answer,
          points,
          difficulty,
          explanation,
          created_at
        FROM SOC_CASE
        WHERE soc_case_id = @soc_case_id;
      `);

    res.status(200).json({
      success: true,
      message: "SOC case updated successfully",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Update SOC case error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update SOC case",
    });
  }
};

// DELETE /api/soc-cases/admin/:id
const deleteSocCase = async (req, res) => {
  let transaction = null;
  let transactionActive = false;

  try {
    const socCaseId = parsePositiveInt(req.params.id);

    if (!socCaseId) {
      warnInvalidId(req, "socCase.delete", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionActive = true;

    const checkResult = await transaction
      .request()
      .input("soc_case_id", sql.Int, socCaseId)
      .query(`
        SELECT soc_case_id
        FROM SOC_CASE
        WHERE soc_case_id = @soc_case_id
      `);

    if (checkResult.recordset.length === 0) {
      await transaction.rollback();
      transaction = null;
      transactionActive = false;

      return res.status(404).json({
        success: false,
        message: "SOC case not found",
      });
    }

    await transaction
      .request()
      .input("soc_case_id", sql.Int, socCaseId)
      .query(`
        DELETE FROM SOC_CASE_SUBMISSION
        WHERE soc_case_id = @soc_case_id;

        DELETE FROM SOC_CASE
        WHERE soc_case_id = @soc_case_id;
      `);

    await transaction.commit();
    transaction = null;
    transactionActive = false;

    res.status(200).json({
      success: true,
      message: "SOC case deleted successfully.",
    });
  } catch (error) {
    if (transaction && transactionActive) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback SOC case delete error:", rollbackError);
      }
    }

    console.error("Delete SOC case error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete SOC case.",
    });
  }
};

module.exports = {
  getAllSocCases,
  getAllSocCasesAdmin,
  getSocCaseProgress,
  getSocCaseById,
  submitSocCase,
  createSocCase,
  updateSocCase,
  deleteSocCase,
};
