const { sql, pool } = require("../config/db");
const {
  MAX_FLAG_LENGTH,
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

const CHALLENGE_TIMER_STATUS = {
  ACTIVE: "active",
  LOCKED: "locked",
  COMPLETED: "completed",
  EXPIRED: "expired",
};

const DEFAULT_CHALLENGE_TIME_LIMIT_MINUTES = 15;
const CHALLENGE_LOCKOUT_HOURS = 24;

const getChallengeTimeLimitMinutes = (difficulty) => {
  switch (normalizeString(difficulty)) {
    case "Medium":
      return 20;
    case "Hard":
      return 30;
    case "Easy":
    default:
      return DEFAULT_CHALLENGE_TIME_LIMIT_MINUTES;
  }
};

const getChallengeTimerResponse = ({
  status,
  timeLimitMinutes,
  timer = null,
}) => ({
  status,
  started_at: timer?.started_at || null,
  expires_at: timer?.expires_at || null,
  locked_until: timer?.locked_until || null,
  completed_at: timer?.completed_at || null,
  remaining_seconds:
    typeof timer?.remaining_seconds === "number"
      ? Math.max(timer.remaining_seconds, 0)
      : null,
  locked_remaining_seconds:
    typeof timer?.locked_remaining_seconds === "number"
      ? Math.max(timer.locked_remaining_seconds, 0)
      : null,
  time_limit_minutes: timeLimitMinutes,
});

const getChallengeForTimer = async (challengeId) => {
  const result = await pool.request()
    .input("challenge_id", sql.Int, challengeId)
    .query(`
      SELECT challenge_id, title, flag, difficulty, points
      FROM CHALLENGE
      WHERE challenge_id = @challenge_id
    `);

  return result.recordset[0] || null;
};

const getSolvedChallengeSubmission = async (userId, challengeId) => {
  const result = await pool.request()
    .input("user_id", sql.Int, userId)
    .input("challenge_id", sql.Int, challengeId)
    .query(`
      SELECT TOP 1 submitted_at
      FROM SUBMISSION
      WHERE user_id = @user_id
        AND challenge_id = @challenge_id
        AND is_correct = 1
      ORDER BY submitted_at DESC
    `);

  return result.recordset[0] || null;
};

const getLatestChallengeTimer = async (userId, challengeId) => {
  const result = await pool.request()
    .input("user_id", sql.Int, userId)
    .input("challenge_id", sql.Int, challengeId)
    .query(`
      SELECT TOP 1
        timer_id,
        user_id,
        challenge_id,
        started_at,
        expires_at,
        locked_until,
        completed_at,
        status,
        created_at,
        updated_at,
        CASE
          WHEN status = '${CHALLENGE_TIMER_STATUS.ACTIVE}'
          THEN DATEDIFF(SECOND, GETDATE(), expires_at)
          ELSE NULL
        END AS remaining_seconds,
        CASE
          WHEN locked_until IS NOT NULL
          THEN DATEDIFF(SECOND, GETDATE(), locked_until)
          ELSE NULL
        END AS locked_remaining_seconds
      FROM CHALLENGE_TIMER
      WHERE user_id = @user_id
        AND challenge_id = @challenge_id
      ORDER BY created_at DESC, timer_id DESC
    `);

  return result.recordset[0] || null;
};

const getChallengeTimerById = async (timerId) => {
  const result = await pool.request()
    .input("timer_id", sql.Int, timerId)
    .query(`
      SELECT
        timer_id,
        user_id,
        challenge_id,
        started_at,
        expires_at,
        locked_until,
        completed_at,
        status,
        created_at,
        updated_at,
        CASE
          WHEN status = '${CHALLENGE_TIMER_STATUS.ACTIVE}'
          THEN DATEDIFF(SECOND, GETDATE(), expires_at)
          ELSE NULL
        END AS remaining_seconds,
        CASE
          WHEN locked_until IS NOT NULL
          THEN DATEDIFF(SECOND, GETDATE(), locked_until)
          ELSE NULL
        END AS locked_remaining_seconds
      FROM CHALLENGE_TIMER
      WHERE timer_id = @timer_id
    `);

  return result.recordset[0] || null;
};

const lockChallengeTimer = async (timerId) => {
  await pool.request()
    .input("timer_id", sql.Int, timerId)
    .query(`
      UPDATE CHALLENGE_TIMER
      SET
        status = '${CHALLENGE_TIMER_STATUS.LOCKED}',
        locked_until = DATEADD(hour, ${CHALLENGE_LOCKOUT_HOURS}, GETDATE()),
        updated_at = GETDATE()
      WHERE timer_id = @timer_id
    `);

  return getChallengeTimerById(timerId);
};

const expireChallengeTimerRecord = async (timerId) => {
  await pool.request()
    .input("timer_id", sql.Int, timerId)
    .query(`
      UPDATE CHALLENGE_TIMER
      SET
        status = '${CHALLENGE_TIMER_STATUS.EXPIRED}',
        updated_at = GETDATE()
      WHERE timer_id = @timer_id
    `);
};

const completeActiveChallengeTimers = async (userId, challengeId) => {
  await pool.request()
    .input("user_id", sql.Int, userId)
    .input("challenge_id", sql.Int, challengeId)
    .query(`
      UPDATE CHALLENGE_TIMER
      SET
        status = '${CHALLENGE_TIMER_STATUS.COMPLETED}',
        completed_at = GETDATE(),
        updated_at = GETDATE()
      WHERE user_id = @user_id
        AND challenge_id = @challenge_id
        AND status = '${CHALLENGE_TIMER_STATUS.ACTIVE}'
    `);
};

const createChallengeTimer = async (userId, challengeId, timeLimitMinutes) => {
  const result = await pool.request()
    .input("user_id", sql.Int, userId)
    .input("challenge_id", sql.Int, challengeId)
    .input("time_limit_minutes", sql.Int, timeLimitMinutes)
    .query(`
      INSERT INTO CHALLENGE_TIMER (
        user_id,
        challenge_id,
        started_at,
        expires_at,
        status,
        created_at,
        updated_at
      )
      OUTPUT
        INSERTED.timer_id
      VALUES (
        @user_id,
        @challenge_id,
        GETDATE(),
        DATEADD(minute, @time_limit_minutes, GETDATE()),
        '${CHALLENGE_TIMER_STATUS.ACTIVE}',
        GETDATE(),
        GETDATE()
      )
    `);

  if (result.recordset.length === 0) {
    return null;
  }

  return getChallengeTimerById(result.recordset[0].timer_id);
};

const getChallengeTimerState = async ({
  userId,
  challengeId,
  difficulty,
  solved = null,
}) => {
  const timeLimitMinutes = getChallengeTimeLimitMinutes(difficulty);
  const solvedSubmission =
    solved === true
      ? { submitted_at: new Date() }
      : solved === false
      ? null
      : await getSolvedChallengeSubmission(userId, challengeId);

  if (solvedSubmission) {
    return {
      ...getChallengeTimerResponse({
        status: "solved",
        timeLimitMinutes,
      }),
      solved: true,
    };
  }

  const latestTimer = await getLatestChallengeTimer(userId, challengeId);

  if (!latestTimer) {
    return getChallengeTimerResponse({
      status: "not_started",
      timeLimitMinutes,
    });
  }

  if (latestTimer.status === CHALLENGE_TIMER_STATUS.ACTIVE) {
    if (typeof latestTimer.remaining_seconds === "number" && latestTimer.remaining_seconds > 0) {
      return getChallengeTimerResponse({
        status: CHALLENGE_TIMER_STATUS.ACTIVE,
        timeLimitMinutes,
        timer: latestTimer,
      });
    }

    const lockedTimer = await lockChallengeTimer(latestTimer.timer_id);

    return getChallengeTimerResponse({
      status: CHALLENGE_TIMER_STATUS.LOCKED,
      timeLimitMinutes,
      timer: lockedTimer || latestTimer,
    });
  }

  if (latestTimer.status === CHALLENGE_TIMER_STATUS.LOCKED) {
    if (
      typeof latestTimer.locked_remaining_seconds === "number" &&
      latestTimer.locked_remaining_seconds > 0
    ) {
      return getChallengeTimerResponse({
        status: CHALLENGE_TIMER_STATUS.LOCKED,
        timeLimitMinutes,
        timer: latestTimer,
      });
    }

    await expireChallengeTimerRecord(latestTimer.timer_id);

    return getChallengeTimerResponse({
      status: "not_started",
      timeLimitMinutes,
    });
  }

  if (latestTimer.status === CHALLENGE_TIMER_STATUS.COMPLETED) {
    return getChallengeTimerResponse({
      status: CHALLENGE_TIMER_STATUS.COMPLETED,
      timeLimitMinutes,
      timer: latestTimer,
    });
  }

  return getChallengeTimerResponse({
    status: "not_started",
    timeLimitMinutes,
  });
};

// GET /api/challenges
const getAllChallenges = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          c.challenge_id,
          c.title,
          c.description,
          c.points,
          c.difficulty,
          c.category_id,
          c.created_at,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM SUBMISSION s
              WHERE s.user_id = @user_id
                AND s.challenge_id = c.challenge_id
                AND s.is_correct = 1
            )
            THEN 1
            ELSE 0
          END AS solved
        FROM CHALLENGE c
        ORDER BY c.challenge_id ASC
      `);

    const challenges = result.recordset.map(challenge => ({
      ...challenge,
      solved: challenge.solved === 1
    }));

    res.status(200).json({
      success: true,
      data: challenges
    });
  } catch (error) {
    console.error("Get all challenges error:", error);
    res.status(500).json({
      error: "Failed to fetch challenges"
    });
  }
};

// GET /api/challenges/progress
const getChallengeProgress = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM CHALLENGE) AS total_challenges,
          (
            SELECT COUNT(DISTINCT s.challenge_id)
            FROM SUBMISSION s
            WHERE s.user_id = @user_id
              AND s.is_correct = 1
          ) AS solved_challenges,
          (
            SELECT ISNULL(SUM(c.points), 0)
            FROM CHALLENGE c
            WHERE c.challenge_id IN (
              SELECT DISTINCT s.challenge_id
              FROM SUBMISSION s
              WHERE s.user_id = @user_id
                AND s.is_correct = 1
            )
          ) AS total_score
      `);

    const progress = result.recordset[0];

    const totalChallenges = progress.total_challenges;
    const solvedChallenges = progress.solved_challenges;
    const unsolvedChallenges = totalChallenges - solvedChallenges;

    res.status(200).json({
      success: true,
      data: {
        total_challenges: totalChallenges,
        solved_challenges: solvedChallenges,
        unsolved_challenges: unsolvedChallenges,
        total_score: progress.total_score
      }
    });
  } catch (error) {
    console.error("Get challenge progress error:", error);
    res.status(500).json({
      error: "Failed to fetch challenge progress"
    });
  }
};

// GET /api/challenges/:id
const getChallengeById = async (req, res) => {
  try {
    const challengeId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;

    if (!challengeId) {
      warnInvalidId(req, "challenge.getById", req.params.id);
      return res.status(400).json({
        error: "Invalid input"
      });
    }

    const result = await pool.request()
      .input("challenge_id", sql.Int, challengeId)
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT 
          c.challenge_id,
          c.title,
          c.description,
          c.explanation,
          c.points,
          c.difficulty,
          c.category_id,
          c.created_at,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM SUBMISSION s
              WHERE s.user_id = @user_id
                AND s.challenge_id = c.challenge_id
                AND s.is_correct = 1
            )
            THEN 1
            ELSE 0
          END AS solved
        FROM CHALLENGE c
        WHERE c.challenge_id = @challenge_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: "Challenge not found"
      });
    }

    const challenge = {
      ...result.recordset[0],
      solved: result.recordset[0].solved === 1
    };

    res.status(200).json({
      success: true,
      data: challenge
    });
  } catch (error) {
    console.error("Get challenge by ID error:", error);
    res.status(500).json({
      error: "Failed to fetch challenge"
    });
  }
};

// POST /api/challenges/:id/start
const startChallenge = async (req, res) => {
  try {
    const challengeId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;

    if (!challengeId) {
      warnInvalidId(req, "challenge.start", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Valid challenge ID is required",
      });
    }

    const challenge = await getChallengeForTimer(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    const timerState = await getChallengeTimerState({
      userId,
      challengeId,
      difficulty: challenge.difficulty,
    });

    if (timerState.status === "solved") {
      return res.status(200).json({
        success: true,
        message: "Challenge already solved.",
        data: timerState,
      });
    }

    if (
      timerState.status === CHALLENGE_TIMER_STATUS.ACTIVE ||
      timerState.status === CHALLENGE_TIMER_STATUS.LOCKED ||
      timerState.status === CHALLENGE_TIMER_STATUS.COMPLETED
    ) {
      return res.status(200).json({
        success: true,
        message:
          timerState.status === CHALLENGE_TIMER_STATUS.ACTIVE
            ? "Challenge timer already running."
            : timerState.status === CHALLENGE_TIMER_STATUS.LOCKED
            ? "Challenge is currently locked."
            : "Challenge timer already completed.",
        data: timerState,
      });
    }

    const newTimer = await createChallengeTimer(
      userId,
      challengeId,
      timerState.time_limit_minutes
    );

    res.status(200).json({
      success: true,
      message: "Challenge timer started successfully.",
      data: getChallengeTimerResponse({
        status: CHALLENGE_TIMER_STATUS.ACTIVE,
        timeLimitMinutes: timerState.time_limit_minutes,
        timer: newTimer,
      }),
    });
  } catch (error) {
    console.error("Start challenge timer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start challenge timer.",
    });
  }
};

// GET /api/challenges/:id/timer
const getChallengeTimer = async (req, res) => {
  try {
    const challengeId = parsePositiveInt(req.params.id);
    const userId = req.user.userId;

    if (!challengeId) {
      warnInvalidId(req, "challenge.timer", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Valid challenge ID is required",
      });
    }

    const challenge = await getChallengeForTimer(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    const timerState = await getChallengeTimerState({
      userId,
      challengeId,
      difficulty: challenge.difficulty,
    });

    res.status(200).json({
      success: true,
      data: timerState,
    });
  } catch (error) {
    console.error("Get challenge timer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch challenge timer.",
    });
  }
};

// POST /api/challenges/:id/submit
const submitChallenge = async (req, res) => {
  try {
    const challengeId = parsePositiveInt(req.params.id);
    const { flag } = req.body;
    const userId = req.user.userId;
    const submittedFlag = normalizeString(flag);

    warnSuspiciousFields(req, "challenge.submit", {
      flag,
    });

    if (!challengeId) {
      warnInvalidId(req, "challenge.submit", req.params.id);
      return res.status(400).json({
        error: "Valid challenge ID is required"
      });
    }

    if (!submittedFlag) {
      warnMalformedInput(req, "challenge.submit", {
        field: "flag",
      });
      return res.status(400).json({
        error: "Flag is required"
      });
    }

    if (submittedFlag.length > MAX_FLAG_LENGTH) {
      warnMalformedInput(req, "challenge.submit", {
        field: "flag",
        length: submittedFlag.length,
      });
      return res.status(400).json({
        error: `Flag must be ${MAX_FLAG_LENGTH} characters or fewer`
      });
    }

    const challenge = await getChallengeForTimer(challengeId);

    if (!challenge) {
      return res.status(404).json({
        error: "Challenge not found"
      });
    }

    const solvedSubmission = await getSolvedChallengeSubmission(userId, challengeId);

    if (!solvedSubmission) {
      const timerState = await getChallengeTimerState({
        userId,
        challengeId,
        difficulty: challenge.difficulty,
        solved: false,
      });

      if (timerState.status === "not_started") {
        return res.status(403).json({
          success: false,
          message: "Start the challenge timer before submitting.",
          data: timerState,
        });
      }

      if (timerState.status === CHALLENGE_TIMER_STATUS.LOCKED) {
        return res.status(423).json({
          success: false,
          message: timerState.locked_until
            ? `Challenge is locked until ${timerState.locked_until}.`
            : "Time expired. This challenge is locked for 24 hours.",
          data: timerState,
        });
      }

      if (timerState.status !== CHALLENGE_TIMER_STATUS.ACTIVE) {
        return res.status(403).json({
          success: false,
          message: "Start the challenge timer before submitting.",
          data: timerState,
        });
      }
    }

    const normalizedCorrectFlag = normalizeString(challenge.flag);
    const isCorrect = submittedFlag === normalizedCorrectFlag;

    if (isCorrect) {
      const existing = await pool.request()
        .input("user_id", sql.Int, userId)
        .input("challenge_id", sql.Int, challengeId)
        .query(`
          SELECT * FROM SUBMISSION
          WHERE user_id = @user_id
          AND challenge_id = @challenge_id
          AND is_correct = 1
        `);

      if (existing.recordset.length > 0) {
        return res.status(400).json({
          message: "Challenge already solved"
        });
      }
    }

    await pool.request()
      .input("user_id", sql.Int, userId)
      .input("challenge_id", sql.Int, challengeId)
      .input("submitted_flag", sql.NVarChar, submittedFlag)
      .input("is_correct", sql.Bit, isCorrect)
      .query(`
        INSERT INTO SUBMISSION (user_id, challenge_id, submitted_flag, is_correct, submitted_at)
        VALUES (@user_id, @challenge_id, @submitted_flag, @is_correct, GETDATE())
      `);

    if (isCorrect) {
      await completeActiveChallengeTimers(userId, challengeId);
    }

    res.status(200).json({
      success: true,
      message: isCorrect ? "Correct flag!" : "Incorrect flag",
      result: {
        challenge_id: challenge.challenge_id,
        title: challenge.title,
        is_correct: isCorrect,
        points_awarded: isCorrect ? challenge.points : 0
      }
    });
  } catch (error) {
    console.error("Submit challenge error:", error);
    res.status(500).json({
      error: "Failed to submit flag"
    });
  }
};
// POST /api/challenges/admin
const createChallenge = async (req, res) => {
  try {
    const {
      title,
      description,
      flag,
      points,
      difficulty,
      category_id,
      explanation
    } = req.body;
    const normalizedTitle = normalizeString(title);
    const normalizedDescription = normalizeString(description);
    const normalizedFlag = normalizeString(flag);
    const normalizedDifficulty = normalizeString(difficulty);
    const normalizedExplanation = normalizeOptionalString(explanation);
    const parsedCategoryId = parsePositiveInt(category_id);
    const parsedPoints = Number(points);

    warnSuspiciousFields(req, "challenge.create", {
      title,
      description,
      flag,
      explanation,
    });

    if (!normalizedTitle) {
      warnMalformedInput(req, "challenge.create", {
        field: "title",
      });
      return res.status(400).json({
        error: "Title is required"
      });
    }

    if (normalizedTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer`
      });
    }

    if (!normalizedDescription) {
      warnMalformedInput(req, "challenge.create", {
        field: "description",
      });
      return res.status(400).json({
        error: "Description is required"
      });
    }

    if (!normalizedFlag) {
      warnMalformedInput(req, "challenge.create", {
        field: "flag",
      });
      return res.status(400).json({
        error: "Flag is required"
      });
    }

    if (normalizedFlag.length > MAX_FLAG_LENGTH) {
      return res.status(400).json({
        error: `Flag must be ${MAX_FLAG_LENGTH} characters or fewer`
      });
    }

    if (!normalizedDifficulty) {
      warnMalformedInput(req, "challenge.create", {
        field: "difficulty",
      });
      return res.status(400).json({
        error: "Difficulty is required"
      });
    }

    if (!isValidDifficulty(normalizedDifficulty)) {
      warnMalformedInput(req, "challenge.create", {
        field: "difficulty",
        value: normalizedDifficulty,
      });
      return res.status(400).json({
        error: "Difficulty must be Easy, Medium, or Hard"
      });
    }

    if (points === undefined || points === null || !isNonNegativeNumber(points)) {
      warnMalformedInput(req, "challenge.create", {
        field: "points",
        value: points,
      });
      return res.status(400).json({
        error: "Valid points are required"
      });
    }

    if (!parsedCategoryId) {
      warnInvalidId(req, "challenge.create.category", category_id);
      return res.status(400).json({
        error: "Valid category_id is required"
      });
    }

    const categoryCheck = await pool.request()
      .input("category_id", sql.Int, parsedCategoryId)
      .query(`
        SELECT category_id
        FROM CATEGORY
        WHERE category_id = @category_id
      `);

    if (categoryCheck.recordset.length === 0) {
      return res.status(404).json({
        error: "Category not found"
      });
    }

    const result = await pool.request()
      .input("title", sql.NVarChar, normalizedTitle)
      .input("description", sql.NVarChar, normalizedDescription)
      .input("flag", sql.NVarChar, normalizedFlag)
      .input("points", sql.Int, parsedPoints)
      .input("difficulty", sql.NVarChar, normalizedDifficulty)
      .input("category_id", sql.Int, parsedCategoryId)
      .input("explanation", sql.NVarChar(sql.MAX), normalizedExplanation)
      .query(`
        INSERT INTO CHALLENGE (
          title,
          description,
          flag,
          points,
          difficulty,
          category_id,
          explanation,
          created_at
        )
        OUTPUT INSERTED.challenge_id,
               INSERTED.title,
               INSERTED.description,
               INSERTED.points,
               INSERTED.difficulty,
               INSERTED.category_id,
               INSERTED.explanation,
               INSERTED.created_at
        VALUES (
          @title,
          @description,
          @flag,
          @points,
          @difficulty,
          @category_id,
          @explanation,
          GETDATE()
        )
      `);

    res.status(201).json({
      success: true,
      message: "Challenge created successfully",
      data: result.recordset[0]
    });
  } catch (error) {
    console.error("Create challenge error:", error);
    res.status(500).json({
      error: "Failed to create challenge"
    });
  }
};
// PUT /api/challenges/admin/:id
const updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      flag,
      points,
      difficulty,
      category_id,
      explanation
    } = req.body;
    const challengeId = parsePositiveInt(id);
    const normalizedTitle = normalizeString(title);
    const normalizedDescription = normalizeString(description);
    const normalizedFlag = normalizeString(flag);
    const normalizedDifficulty = normalizeString(difficulty);
    const normalizedExplanation = normalizeOptionalString(explanation);
    const parsedCategoryId = parsePositiveInt(category_id);
    const parsedPoints = Number(points);

    warnSuspiciousFields(req, "challenge.update", {
      title,
      description,
      flag,
      explanation,
    });

    if (!challengeId) {
      warnInvalidId(req, "challenge.update", id);
      return res.status(400).json({
        success: false,
        message: "Valid challenge ID is required"
      });
    }

    if (!normalizedTitle) {
      warnMalformedInput(req, "challenge.update", {
        field: "title",
      });
      return res.status(400).json({
        success: false,
        message: "Title is required"
      });
    }

    if (normalizedTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer`
      });
    }

    if (!normalizedDescription) {
      warnMalformedInput(req, "challenge.update", {
        field: "description",
      });
      return res.status(400).json({
        success: false,
        message: "Description is required"
      });
    }

    if (!normalizedFlag) {
      warnMalformedInput(req, "challenge.update", {
        field: "flag",
      });
      return res.status(400).json({
        success: false,
        message: "Flag is required"
      });
    }

    if (normalizedFlag.length > MAX_FLAG_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Flag must be ${MAX_FLAG_LENGTH} characters or fewer`
      });
    }

    if (!normalizedDifficulty || !isValidDifficulty(normalizedDifficulty)) {
      warnMalformedInput(req, "challenge.update", {
        field: "difficulty",
        value: normalizedDifficulty,
      });
      return res.status(400).json({
        success: false,
        message: "Difficulty must be Easy, Medium, or Hard"
      });
    }

    if (!isNonNegativeNumber(points)) {
      warnMalformedInput(req, "challenge.update", {
        field: "points",
        value: points,
      });
      return res.status(400).json({
        success: false,
        message: "Points must be a non-negative number"
      });
    }

    if (!parsedCategoryId) {
      warnInvalidId(req, "challenge.update.category", category_id);
      return res.status(400).json({
        success: false,
        message: "Valid category_id is required"
      });
    }

    // check if exists
    const checkResult = await pool.request()
      .input("challenge_id", sql.Int, challengeId)
      .query(`
        SELECT challenge_id
        FROM CHALLENGE
        WHERE challenge_id = @challenge_id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found"
      });
    }

    const categoryCheck = await pool.request()
      .input("category_id", sql.Int, parsedCategoryId)
      .query(`
        SELECT category_id
        FROM CATEGORY
        WHERE category_id = @category_id
      `);

    if (categoryCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Preserve existing submissions when challenge content is edited.
    // In production, versioning could be added for major flag changes.
    const result = await pool.request()
      .input("challenge_id", sql.Int, challengeId)
      .input("title", sql.NVarChar(150), normalizedTitle)
      .input("description", sql.NVarChar(sql.MAX), normalizedDescription)
      .input("flag", sql.NVarChar(255), normalizedFlag)
      .input("points", sql.Int, parsedPoints)
      .input("difficulty", sql.NVarChar(20), normalizedDifficulty)
      .input("category_id", sql.Int, parsedCategoryId)
      .input("explanation", sql.NVarChar(sql.MAX), normalizedExplanation)
      .query(`
        UPDATE CHALLENGE
        SET
          title = @title,
          description = @description,
          flag = @flag,
          points = @points,
          difficulty = @difficulty,
          category_id = @category_id,
          explanation = @explanation
        WHERE challenge_id = @challenge_id;

        SELECT
          challenge_id,
          title,
          description,
          points,
          difficulty,
          category_id,
          explanation,
          created_at
        FROM CHALLENGE
        WHERE challenge_id = @challenge_id;
      `);

    res.status(200).json({
      success: true,
      message: "Challenge updated successfully",
      data: result.recordset[0]
    });

  } catch (error) {
    console.error("Update challenge error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update challenge"
    });
  }
};

// DELETE /api/challenges/admin/:id
const deleteChallenge = async (req, res) => {
  let transaction = null;
  let transactionActive = false;

  try {
    const challengeId = parsePositiveInt(req.params.id);

    if (!challengeId) {
      warnInvalidId(req, "challenge.delete", req.params.id);
      return res.status(400).json({
        success: false,
        message: "Invalid input"
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionActive = true;

    const checkResult = await transaction.request()
      .input("challenge_id", sql.Int, challengeId)
      .query(`
        SELECT challenge_id
        FROM CHALLENGE
        WHERE challenge_id = @challenge_id
      `);

    if (checkResult.recordset.length === 0) {
      await transaction.rollback();
      transaction = null;
      transactionActive = false;

      return res.status(404).json({
        success: false,
        message: "Challenge not found"
      });
    }

    await transaction.request()
      .input("challenge_id", sql.Int, challengeId)
      .query(`
        IF OBJECT_ID(N'dbo.CHALLENGE_TIMER', N'U') IS NOT NULL
        BEGIN
          DELETE FROM CHALLENGE_TIMER
          WHERE challenge_id = @challenge_id;
        END

        DELETE FROM SUBMISSION
        WHERE challenge_id = @challenge_id;

        DELETE FROM CHALLENGE
        WHERE challenge_id = @challenge_id;
      `);

    await transaction.commit();
    transaction = null;
    transactionActive = false;

    res.status(200).json({
      success: true,
      message: "Challenge deleted successfully."
    });
  } catch (error) {
    if (transaction && transactionActive) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback challenge delete error:", rollbackError);
      }
    }

    console.error("Delete challenge error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete challenge."
    });
  }
};
// GET /api/challenges/admin
const getAllChallengesAdmin = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        challenge_id,
        title,
        description,
        flag,
        points,
        difficulty,
        category_id,
        explanation,
        created_at
      FROM CHALLENGE
      ORDER BY challenge_id ASC
    `);

    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error("Get all admin challenges error:", error);
    res.status(500).json({
      error: "Failed to fetch admin challenges"
    });
  }
};
module.exports = {
  getAllChallengesAdmin,
  getAllChallenges,
  getChallengeProgress,
  getChallengeById,
  startChallenge,
  getChallengeTimer,
  submitChallenge,
  createChallenge,
  updateChallenge,
  deleteChallenge
};
