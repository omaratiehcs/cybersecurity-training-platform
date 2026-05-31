const { pool } = require("../config/db");

const getSingleRecord = (recordsets, index) => {
  const records = recordsets[index] || [];
  return records.length > 0 ? records[0] : null;
};

const normalizeCountValue = (value) => {
  return Number(value) || 0;
};

const getAdminInsights = async (req, res) => {
  try {
    const overviewResult = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM [USER]) AS totalUsers,
        (SELECT COUNT(*) FROM CHALLENGE) AS totalChallenges,
        (SELECT COUNT(*) FROM SOC_CASE) AS totalSocCases,
        (SELECT COUNT(*) FROM INCIDENT_SCENARIO) AS totalIncidents,
        (SELECT COUNT(*) FROM SUBMISSION) AS totalCtfSubmissions,
        (SELECT COUNT(*) FROM SOC_CASE_SUBMISSION) AS totalSocSubmissions,
        (SELECT COUNT(*) FROM INCIDENT_STEP_SUBMISSION) AS totalIncidentStepSubmissions,
        (
          (SELECT COUNT(*) FROM SUBMISSION WHERE is_correct = 1) +
          (SELECT COUNT(*) FROM SOC_CASE_SUBMISSION WHERE is_correct = 1) +
          (SELECT COUNT(*) FROM INCIDENT_STEP_SUBMISSION WHERE is_correct = 1)
        ) AS totalCorrectSubmissions,
        (
          (SELECT COUNT(*) FROM SUBMISSION WHERE is_correct = 0) +
          (SELECT COUNT(*) FROM SOC_CASE_SUBMISSION WHERE is_correct = 0) +
          (SELECT COUNT(*) FROM INCIDENT_STEP_SUBMISSION WHERE is_correct = 0)
        ) AS totalWrongSubmissions
    `);

    const challengeInsightsResult = await pool.request().query(`
      SELECT TOP 1
        c.challenge_id,
        c.title,
        COUNT(*) AS solved_count
      FROM SUBMISSION s
      INNER JOIN CHALLENGE c
        ON c.challenge_id = s.challenge_id
      WHERE s.is_correct = 1
      GROUP BY c.challenge_id, c.title
      ORDER BY solved_count DESC, c.challenge_id ASC;

      SELECT TOP 1
        c.challenge_id,
        c.title,
        COUNT(*) AS wrong_attempts
      FROM SUBMISSION s
      INNER JOIN CHALLENGE c
        ON c.challenge_id = s.challenge_id
      WHERE s.is_correct = 0
      GROUP BY c.challenge_id, c.title
      ORDER BY wrong_attempts DESC, c.challenge_id ASC;

      SELECT TOP 1
        c.challenge_id,
        c.title,
        COUNT(*) AS total_attempts
      FROM SUBMISSION s
      INNER JOIN CHALLENGE c
        ON c.challenge_id = s.challenge_id
      GROUP BY c.challenge_id, c.title
      ORDER BY total_attempts DESC, c.challenge_id ASC;
    `);

    const socInsightsResult = await pool.request().query(`
      SELECT TOP 1
        sc.soc_case_id,
        sc.title,
        COUNT(*) AS solved_count
      FROM SOC_CASE_SUBMISSION scs
      INNER JOIN SOC_CASE sc
        ON sc.soc_case_id = scs.soc_case_id
      WHERE scs.is_correct = 1
      GROUP BY sc.soc_case_id, sc.title
      ORDER BY solved_count DESC, sc.soc_case_id ASC;

      SELECT TOP 1
        sc.soc_case_id,
        sc.title,
        COUNT(*) AS wrong_attempts
      FROM SOC_CASE_SUBMISSION scs
      INNER JOIN SOC_CASE sc
        ON sc.soc_case_id = scs.soc_case_id
      WHERE scs.is_correct = 0
      GROUP BY sc.soc_case_id, sc.title
      ORDER BY wrong_attempts DESC, sc.soc_case_id ASC;

      SELECT TOP 1
        sc.soc_case_id,
        sc.title,
        COUNT(*) AS total_attempts
      FROM SOC_CASE_SUBMISSION scs
      INNER JOIN SOC_CASE sc
        ON sc.soc_case_id = scs.soc_case_id
      GROUP BY sc.soc_case_id, sc.title
      ORDER BY total_attempts DESC, sc.soc_case_id ASC;
    `);

    const incidentInsightsResult = await pool.request().query(`
      WITH IncidentStepTotals AS (
        SELECT
          incident_id,
          COUNT(*) AS total_steps
        FROM INCIDENT_STEP
        GROUP BY incident_id
      ),
      UserSolvedIncidentSteps AS (
        SELECT
          st.incident_id,
          iss.user_id,
          COUNT(DISTINCT iss.incident_step_id) AS solved_steps
        FROM INCIDENT_STEP_SUBMISSION iss
        INNER JOIN INCIDENT_STEP st
          ON st.incident_step_id = iss.incident_step_id
        WHERE iss.is_correct = 1
        GROUP BY st.incident_id, iss.user_id
      ),
      CompletedIncidents AS (
        SELECT
          usis.incident_id,
          usis.user_id
        FROM UserSolvedIncidentSteps usis
        INNER JOIN IncidentStepTotals ist
          ON ist.incident_id = usis.incident_id
        WHERE ist.total_steps > 0
          AND usis.solved_steps = ist.total_steps
      )
      SELECT TOP 1
        i.incident_id,
        i.title,
        COUNT(DISTINCT ci.user_id) AS completed_count
      FROM CompletedIncidents ci
      INNER JOIN INCIDENT_SCENARIO i
        ON i.incident_id = ci.incident_id
      GROUP BY i.incident_id, i.title
      ORDER BY completed_count DESC, i.incident_id ASC;

      SELECT TOP 1
        st.incident_step_id,
        st.incident_id,
        i.title AS incident_title,
        st.title AS step_title,
        COUNT(*) AS wrong_attempts
      FROM INCIDENT_STEP_SUBMISSION iss
      INNER JOIN INCIDENT_STEP st
        ON st.incident_step_id = iss.incident_step_id
      INNER JOIN INCIDENT_SCENARIO i
        ON i.incident_id = st.incident_id
      WHERE iss.is_correct = 0
      GROUP BY st.incident_step_id, st.incident_id, i.title, st.title
      ORDER BY wrong_attempts DESC, st.incident_step_id ASC;

      SELECT TOP 1
        i.incident_id,
        i.title,
        COUNT(*) AS total_step_attempts
      FROM INCIDENT_STEP_SUBMISSION iss
      INNER JOIN INCIDENT_STEP st
        ON st.incident_step_id = iss.incident_step_id
      INNER JOIN INCIDENT_SCENARIO i
        ON i.incident_id = st.incident_id
      GROUP BY i.incident_id, i.title
      ORDER BY total_step_attempts DESC, i.incident_id ASC;
    `);

    const completionInsightsResult = await pool.request().query(`
      WITH IncidentStepTotals AS (
        SELECT
          incident_id,
          COUNT(*) AS total_steps
        FROM INCIDENT_STEP
        GROUP BY incident_id
      ),
      UserSolvedIncidentSteps AS (
        SELECT
          st.incident_id,
          iss.user_id,
          COUNT(DISTINCT iss.incident_step_id) AS solved_steps
        FROM INCIDENT_STEP_SUBMISSION iss
        INNER JOIN INCIDENT_STEP st
          ON st.incident_step_id = iss.incident_step_id
        WHERE iss.is_correct = 1
        GROUP BY st.incident_id, iss.user_id
      ),
      CompletedIncidents AS (
        SELECT
          usis.incident_id,
          usis.user_id
        FROM UserSolvedIncidentSteps usis
        INNER JOIN IncidentStepTotals ist
          ON ist.incident_id = usis.incident_id
        WHERE ist.total_steps > 0
          AND usis.solved_steps = ist.total_steps
      )
      SELECT
        (
          SELECT COUNT(*)
          FROM (
            SELECT DISTINCT user_id, challenge_id
            FROM SUBMISSION
            WHERE is_correct = 1
          ) AS solved_ctf
        ) AS totalCtfCompleted,
        (
          SELECT COUNT(*)
          FROM (
            SELECT DISTINCT user_id, soc_case_id
            FROM SOC_CASE_SUBMISSION
            WHERE is_correct = 1
          ) AS solved_soc
        ) AS totalSocCompleted,
        (
          SELECT COUNT(*)
          FROM CompletedIncidents
        ) AS totalIncidentCompleted
    `);

    const topTrainingItemsResult = await pool.request().query(`
      SELECT TOP 5
        c.challenge_id AS item_id,
        c.title,
        COUNT(*) AS total_attempts,
        SUM(CASE WHEN s.is_correct = 1 THEN 1 ELSE 0 END) AS successful_attempts
      FROM SUBMISSION s
      INNER JOIN CHALLENGE c
        ON c.challenge_id = s.challenge_id
      GROUP BY c.challenge_id, c.title
      ORDER BY total_attempts DESC, c.challenge_id ASC;

      SELECT TOP 5
        sc.soc_case_id AS item_id,
        sc.title,
        COUNT(*) AS total_attempts,
        SUM(CASE WHEN scs.is_correct = 1 THEN 1 ELSE 0 END) AS successful_attempts
      FROM SOC_CASE_SUBMISSION scs
      INNER JOIN SOC_CASE sc
        ON sc.soc_case_id = scs.soc_case_id
      GROUP BY sc.soc_case_id, sc.title
      ORDER BY total_attempts DESC, sc.soc_case_id ASC;

      SELECT TOP 5
        i.incident_id AS item_id,
        i.title,
        COUNT(*) AS total_attempts,
        SUM(CASE WHEN iss.is_correct = 1 THEN 1 ELSE 0 END) AS successful_attempts
      FROM INCIDENT_STEP_SUBMISSION iss
      INNER JOIN INCIDENT_STEP st
        ON st.incident_step_id = iss.incident_step_id
      INNER JOIN INCIDENT_SCENARIO i
        ON i.incident_id = st.incident_id
      GROUP BY i.incident_id, i.title
      ORDER BY total_attempts DESC, i.incident_id ASC;
    `);

    const activityInsightsResult = await pool.request().query(`
      WITH AllActivity AS (
        SELECT user_id, submitted_at FROM SUBMISSION
        UNION ALL
        SELECT user_id, submitted_at FROM SOC_CASE_SUBMISSION
        UNION ALL
        SELECT user_id, submitted_at FROM INCIDENT_STEP_SUBMISSION
      )
      SELECT TOP 1
        u.user_id,
        u.full_name,
        u.email,
        COUNT(*) AS total_attempts
      FROM AllActivity a
      INNER JOIN [USER] u
        ON u.user_id = a.user_id
      GROUP BY u.user_id, u.full_name, u.email
      ORDER BY total_attempts DESC, u.user_id ASC;

      WITH AllActivity AS (
        SELECT submitted_at FROM SUBMISSION
        UNION ALL
        SELECT submitted_at FROM SOC_CASE_SUBMISSION
        UNION ALL
        SELECT submitted_at FROM INCIDENT_STEP_SUBMISSION
      )
      SELECT TOP 1
        CAST(submitted_at AS date) AS activity_date,
        COUNT(*) AS total_attempts
      FROM AllActivity
      GROUP BY CAST(submitted_at AS date)
      ORDER BY total_attempts DESC, activity_date DESC;

      SELECT TOP 10
        activity.module,
        activity.user_name,
        activity.item_title,
        activity.submitted_answer,
        activity.is_correct,
        activity.submitted_at
      FROM (
        SELECT
          'CTF' AS module,
          u.full_name AS user_name,
          c.title AS item_title,
          s.submitted_flag AS submitted_answer,
          s.is_correct,
          s.submitted_at
        FROM SUBMISSION s
        INNER JOIN [USER] u
          ON u.user_id = s.user_id
        INNER JOIN CHALLENGE c
          ON c.challenge_id = s.challenge_id

        UNION ALL

        SELECT
          'SOC' AS module,
          u.full_name AS user_name,
          sc.title AS item_title,
          scs.submitted_answer,
          scs.is_correct,
          scs.submitted_at
        FROM SOC_CASE_SUBMISSION scs
        INNER JOIN [USER] u
          ON u.user_id = scs.user_id
        INNER JOIN SOC_CASE sc
          ON sc.soc_case_id = scs.soc_case_id

        UNION ALL

        SELECT
          'Incident' AS module,
          u.full_name AS user_name,
          CONCAT(i.title, ' - ', st.title) AS item_title,
          iss.submitted_answer,
          iss.is_correct,
          iss.submitted_at
        FROM INCIDENT_STEP_SUBMISSION iss
        INNER JOIN [USER] u
          ON u.user_id = iss.user_id
        INNER JOIN INCIDENT_STEP st
          ON st.incident_step_id = iss.incident_step_id
        INNER JOIN INCIDENT_SCENARIO i
          ON i.incident_id = st.incident_id
      ) AS activity
      ORDER BY activity.submitted_at DESC;

      WITH DailyModuleActivity AS (
        SELECT
          CAST(submitted_at AS date) AS activity_date,
          'CTF' AS module,
          COUNT(*) AS attempt_count
        FROM SUBMISSION
        GROUP BY CAST(submitted_at AS date)

        UNION ALL

        SELECT
          CAST(submitted_at AS date) AS activity_date,
          'SOC' AS module,
          COUNT(*) AS attempt_count
        FROM SOC_CASE_SUBMISSION
        GROUP BY CAST(submitted_at AS date)

        UNION ALL

        SELECT
          CAST(submitted_at AS date) AS activity_date,
          'Incident' AS module,
          COUNT(*) AS attempt_count
        FROM INCIDENT_STEP_SUBMISSION
        GROUP BY CAST(submitted_at AS date)
      )
      SELECT TOP 7
        activity_date,
        SUM(CASE WHEN module = 'CTF' THEN attempt_count ELSE 0 END) AS ctf_attempts,
        SUM(CASE WHEN module = 'SOC' THEN attempt_count ELSE 0 END) AS soc_attempts,
        SUM(CASE WHEN module = 'Incident' THEN attempt_count ELSE 0 END) AS incident_attempts,
        SUM(attempt_count) AS total_attempts
      FROM DailyModuleActivity
      GROUP BY activity_date
      ORDER BY activity_date DESC;
    `);

    const overviewRow = overviewResult.recordset[0] || {};
    const completionRow = completionInsightsResult.recordset[0] || {};

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers: normalizeCountValue(overviewRow.totalUsers),
          totalChallenges: normalizeCountValue(overviewRow.totalChallenges),
          totalSocCases: normalizeCountValue(overviewRow.totalSocCases),
          totalIncidents: normalizeCountValue(overviewRow.totalIncidents),
          totalCtfSubmissions: normalizeCountValue(overviewRow.totalCtfSubmissions),
          totalSocSubmissions: normalizeCountValue(overviewRow.totalSocSubmissions),
          totalIncidentStepSubmissions: normalizeCountValue(
            overviewRow.totalIncidentStepSubmissions
          ),
          totalCorrectSubmissions: normalizeCountValue(
            overviewRow.totalCorrectSubmissions
          ),
          totalWrongSubmissions: normalizeCountValue(overviewRow.totalWrongSubmissions),
        },
        ctfInsights: {
          mostSolvedChallenge: getSingleRecord(challengeInsightsResult.recordsets, 0),
          mostFailedChallenge: getSingleRecord(challengeInsightsResult.recordsets, 1),
          mostAttemptedChallenge: getSingleRecord(challengeInsightsResult.recordsets, 2),
        },
        socInsights: {
          mostSolvedSocCase: getSingleRecord(socInsightsResult.recordsets, 0),
          mostFailedSocCase: getSingleRecord(socInsightsResult.recordsets, 1),
          mostAttemptedSocCase: getSingleRecord(socInsightsResult.recordsets, 2),
        },
        incidentInsights: {
          mostSolvedIncident: getSingleRecord(incidentInsightsResult.recordsets, 0),
          mostFailedIncidentStep: getSingleRecord(incidentInsightsResult.recordsets, 1),
          mostAttemptedIncident: getSingleRecord(incidentInsightsResult.recordsets, 2),
        },
        completionInsights: {
          totalCtfCompleted: normalizeCountValue(completionRow.totalCtfCompleted),
          totalSocCompleted: normalizeCountValue(completionRow.totalSocCompleted),
          totalIncidentCompleted: normalizeCountValue(
            completionRow.totalIncidentCompleted
          ),
        },
        activityInsights: {
          mostActiveUser: getSingleRecord(activityInsightsResult.recordsets, 0),
          mostActiveDay: getSingleRecord(activityInsightsResult.recordsets, 1),
          recentActivity: activityInsightsResult.recordsets[2] || [],
          dailyActivity: activityInsightsResult.recordsets[3] || [],
        },
        topTrainingItems: {
          ctfTopChallenges: topTrainingItemsResult.recordsets[0] || [],
          socTopCases: topTrainingItemsResult.recordsets[1] || [],
          incidentTopItems: topTrainingItemsResult.recordsets[2] || [],
        },
      },
    });
  } catch (error) {
    console.error("Get admin insights error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load admin insights.",
    });
  }
};

module.exports = {
  getAdminInsights,
};
