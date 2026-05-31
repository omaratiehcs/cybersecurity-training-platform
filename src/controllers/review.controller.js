const { sql, pool } = require("../config/db");
const {
  normalizeOptionalString,
  parsePositiveInt,
} = require("../utils/validation");
const {
  warnInvalidId,
  warnMalformedInput,
  warnSuspiciousFields,
} = require("../utils/security");

const parseRating = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 5) {
    return null;
  }

  return parsedValue;
};

const getPlatformReview = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.user?.userId);

    if (!userId) {
      warnInvalidId(req, "review.getMy.userId", req.user?.userId);
      return res.status(401).json({
        success: false,
        message: "Invalid user session.",
      });
    }

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          review_id,
          user_id,
          rating,
          comment,
          created_at,
          updated_at
        FROM PLATFORM_REVIEW
        WHERE user_id = @user_id
      `);

    res.status(200).json({
      success: true,
      data: result.recordset[0] || null,
    });
  } catch (error) {
    console.error("Get platform review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform review.",
    });
  }
};

const savePlatformReview = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.user?.userId);

    if (!userId) {
      warnInvalidId(req, "review.save.userId", req.user?.userId);
      return res.status(401).json({
        success: false,
        message: "Invalid user session.",
      });
    }

    const rating = parseRating(req.body?.rating);
    const comment = normalizeOptionalString(req.body?.comment);

    warnSuspiciousFields(req, "review.save", {
      comment: req.body?.comment,
    });

    if (!rating) {
      warnMalformedInput(req, "review.save", {
        field: "rating",
        value: req.body?.rating,
      });
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer from 1 to 5.",
      });
    }

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .input("rating", sql.Int, rating)
      .input("comment", sql.NVarChar(sql.MAX), comment)
      .query(`
        IF EXISTS (
          SELECT 1
          FROM PLATFORM_REVIEW
          WHERE user_id = @user_id
        )
        BEGIN
          UPDATE PLATFORM_REVIEW
          SET
            rating = @rating,
            comment = @comment,
            updated_at = GETDATE()
          WHERE user_id = @user_id;

          SELECT
            review_id,
            user_id,
            rating,
            comment,
            created_at,
            updated_at,
            CAST(1 AS BIT) AS review_exists
          FROM PLATFORM_REVIEW
          WHERE user_id = @user_id;
        END
        ELSE
        BEGIN
          INSERT INTO PLATFORM_REVIEW (
            user_id,
            rating,
            comment,
            created_at,
            updated_at
          )
          VALUES (
            @user_id,
            @rating,
            @comment,
            GETDATE(),
            NULL
          );

          SELECT
            review_id,
            user_id,
            rating,
            comment,
            created_at,
            updated_at,
            CAST(0 AS BIT) AS review_exists
          FROM PLATFORM_REVIEW
          WHERE user_id = @user_id;
        END
      `);

    const savedReview = result.recordset[0];
    const reviewExisted = Boolean(savedReview?.review_exists);

    if (savedReview) {
      delete savedReview.review_exists;
    }

    res.status(200).json({
      success: true,
      message: reviewExisted
        ? "Platform review updated successfully."
        : "Platform review submitted successfully.",
      data: savedReview || null,
    });
  } catch (error) {
    console.error("Save platform review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save platform review.",
    });
  }
};

const getAdminPlatformReviews = async (_req, res) => {
  try {
    const reviewsResult = await pool.request().query(`
      SELECT
        pr.review_id,
        pr.user_id,
        u.full_name,
        u.email,
        pr.rating,
        pr.comment,
        pr.created_at,
        pr.updated_at
      FROM PLATFORM_REVIEW pr
      INNER JOIN [USER] u
        ON u.user_id = pr.user_id
      ORDER BY
        COALESCE(pr.updated_at, pr.created_at) DESC,
        pr.review_id DESC
    `);

    const summaryResult = await pool.request().query(`
      SELECT
        COUNT(*) AS total_reviews,
        CAST(COALESCE(AVG(CAST(rating AS DECIMAL(10, 2))), 0) AS DECIMAL(10, 2)) AS average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS five_star_count,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS four_star_count,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS three_star_count,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS two_star_count,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS one_star_count
      FROM PLATFORM_REVIEW
    `);

    res.status(200).json({
      success: true,
      data: {
        summary: summaryResult.recordset[0] || {
          total_reviews: 0,
          average_rating: 0,
          five_star_count: 0,
          four_star_count: 0,
          three_star_count: 0,
          two_star_count: 0,
          one_star_count: 0,
        },
        reviews: reviewsResult.recordset || [],
      },
    });
  } catch (error) {
    console.error("Get admin platform reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform reviews.",
    });
  }
};

const deleteMyPlatformReview = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.user?.userId);

    if (!userId) {
      warnInvalidId(req, "review.deleteMy.userId", req.user?.userId);
      return res.status(401).json({
        success: false,
        message: "Invalid user session.",
      });
    }

    const existingReviewResult = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT review_id
        FROM PLATFORM_REVIEW
        WHERE user_id = @user_id
      `);

    if (existingReviewResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "You do not have a platform review to delete.",
      });
    }

    await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        DELETE FROM PLATFORM_REVIEW
        WHERE user_id = @user_id
      `);

    res.status(200).json({
      success: true,
      message: "Your platform review was deleted successfully.",
    });
  } catch (error) {
    console.error("Delete my platform review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete your platform review.",
    });
  }
};

const deleteAdminPlatformReview = async (req, res) => {
  try {
    const reviewId = parsePositiveInt(req.params.reviewId);

    if (!reviewId) {
      warnInvalidId(req, "review.adminDelete", req.params.reviewId);
      return res.status(400).json({
        success: false,
        message: "Invalid review identifier.",
      });
    }

    const existingReviewResult = await pool.request()
      .input("review_id", sql.Int, reviewId)
      .query(`
        SELECT review_id
        FROM PLATFORM_REVIEW
        WHERE review_id = @review_id
      `);

    if (existingReviewResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Platform review not found.",
      });
    }

    await pool.request()
      .input("review_id", sql.Int, reviewId)
      .query(`
        DELETE FROM PLATFORM_REVIEW
        WHERE review_id = @review_id
      `);

    res.status(200).json({
      success: true,
      message: "Platform review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete admin platform review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete platform review.",
    });
  }
};

module.exports = {
  getPlatformReview,
  savePlatformReview,
  getAdminPlatformReviews,
  deleteMyPlatformReview,
  deleteAdminPlatformReview,
};
