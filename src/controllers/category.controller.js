const { sql, pool } = require("../config/db");
const { warnMalformedInput, warnSuspiciousFields } = require("../utils/security");

// POST /api/categories/admin
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    warnSuspiciousFields(req, "category.create", {
      name,
      description,
    });

    if (!name || !name.trim()) {
      warnMalformedInput(req, "category.create", {
        field: "name",
      });
      return res.status(400).json({
        error: "Category name is required"
      });
    }

    const existing = await pool.request()
      .input("name", sql.NVarChar, name.trim())
      .query(`
        SELECT category_id
        FROM CATEGORY
        WHERE name = @name
      `);

    if (existing.recordset.length > 0) {
      return res.status(400).json({
        error: "Category already exists"
      });
    }

    const result = await pool.request()
      .input("name", sql.NVarChar, name.trim())
      .input("description", sql.NVarChar, description ? description.trim() : null)
      .query(`
        INSERT INTO CATEGORY (name, description)
        OUTPUT INSERTED.category_id,
               INSERTED.name,
               INSERTED.description
        VALUES (@name, @description)
      `);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: result.recordset[0]
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      error: "Failed to create category"
    });
  }
};

// GET /api/categories
const getAllCategories = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        category_id,
        name,
        description
      FROM CATEGORY
      ORDER BY category_id ASC
    `);

    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({
      error: "Failed to fetch categories"
    });
  }
};

module.exports = {
  createCategory,
  getAllCategories
};
