const { sql, pool } = require("../config/db");
const {
  MAX_TITLE_LENGTH,
  normalizeString,
  parsePositiveInt,
} = require("../utils/validation");
const {
  warnInvalidId,
  warnMalformedInput,
  warnSuspiciousFields,
} = require("../utils/security");

const MAX_CONTACT_MESSAGE_LENGTH = 3000;
const MAX_CONTACT_REPLY_LENGTH = 3000;
const CONTACT_DATETIME_DISPLAY_FORMAT = "MMM dd, yyyy, h:mm tt";

const buildContactDateDisplayColumns = (alias) => `
  ${alias}.created_at,
  CASE
    WHEN ${alias}.created_at IS NULL THEN NULL
    ELSE FORMAT(${alias}.created_at, '${CONTACT_DATETIME_DISPLAY_FORMAT}', 'en-US')
  END AS created_at_display,
  ${alias}.read_at,
  CASE
    WHEN ${alias}.read_at IS NULL THEN NULL
    ELSE FORMAT(${alias}.read_at, '${CONTACT_DATETIME_DISPLAY_FORMAT}', 'en-US')
  END AS read_at_display,
  ${alias}.replied_at,
  CASE
    WHEN ${alias}.replied_at IS NULL THEN NULL
    ELSE FORMAT(${alias}.replied_at, '${CONTACT_DATETIME_DISPLAY_FORMAT}', 'en-US')
  END AS replied_at_display
`;

const createContactMessage = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.user?.userId);
    const subject = normalizeString(req.body?.subject);
    const message = normalizeString(req.body?.message);

    if (!userId) {
      warnInvalidId(req, "contact.create.userId", req.user?.userId);
      return res.status(401).json({
        success: false,
        message: "Invalid user session.",
      });
    }

    warnSuspiciousFields(req, "contact.create", {
      subject: req.body?.subject,
      message: req.body?.message,
    });

    if (!subject) {
      warnMalformedInput(req, "contact.create", { field: "subject" });
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (subject.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Subject must be ${MAX_TITLE_LENGTH} characters or fewer.`,
      });
    }

    if (!message) {
      warnMalformedInput(req, "contact.create", { field: "message" });
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    if (message.length > MAX_CONTACT_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message must be ${MAX_CONTACT_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .input("subject", sql.NVarChar(150), subject)
      .input("message", sql.NVarChar(sql.MAX), message)
      .query(`
        INSERT INTO CONTACT_MESSAGE (
          user_id,
          subject,
          message,
          status,
          created_at,
          read_at
        )
        OUTPUT
          INSERTED.message_id,
          INSERTED.user_id,
          INSERTED.subject,
          INSERTED.message,
          INSERTED.status,
          INSERTED.created_at,
          INSERTED.read_at
        VALUES (
          @user_id,
          @subject,
          @message,
          N'new',
          GETDATE(),
          NULL
        )
      `);

    res.status(201).json({
      success: true,
      message: "Your message was sent successfully.",
      data: result.recordset[0] || null,
    });
  } catch (error) {
    console.error("Create contact message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send contact message.",
    });
  }
};

const getAdminContactMessages = async (_req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        cm.message_id,
        cm.user_id,
        u.full_name,
        u.email,
        cm.subject,
        cm.message,
        cm.status,
        ${buildContactDateDisplayColumns("cm")},
        cm.admin_reply,
        cm.replied_by
      FROM CONTACT_MESSAGE cm
      INNER JOIN [USER] u
        ON u.user_id = cm.user_id
      ORDER BY
        CASE WHEN cm.status = N'new' THEN 0 ELSE 1 END ASC,
        cm.created_at DESC,
        cm.message_id DESC
    `);

    res.status(200).json({
      success: true,
      data: result.recordset || [],
    });
  } catch (error) {
    console.error("Get admin contact messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact messages.",
    });
  }
};

const getMyContactMessages = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.user?.userId);

    if (!userId) {
      warnInvalidId(req, "contact.getMy.userId", req.user?.userId);
      return res.status(401).json({
        success: false,
        message: "Invalid user session.",
      });
    }

    const result = await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          message_id,
          subject,
          message,
          status,
          ${buildContactDateDisplayColumns("CONTACT_MESSAGE")},
          admin_reply,
          replied_by
        FROM CONTACT_MESSAGE
        WHERE user_id = @user_id
        ORDER BY created_at DESC, message_id DESC
      `);

    res.status(200).json({
      success: true,
      data: result.recordset || [],
    });
  } catch (error) {
    console.error("Get my contact messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your contact messages.",
    });
  }
};

const updateMyContactMessage = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.user?.userId);
    const messageId = parsePositiveInt(req.params.messageId);
    const subject = normalizeString(req.body?.subject);
    const message = normalizeString(req.body?.message);

    if (!userId) {
      warnInvalidId(req, "contact.updateMy.userId", req.user?.userId);
      return res.status(401).json({
        success: false,
        message: "Invalid user session.",
      });
    }

    if (!messageId) {
      warnInvalidId(req, "contact.updateMy.messageId", req.params.messageId);
      return res.status(400).json({
        success: false,
        message: "Invalid contact message identifier.",
      });
    }

    warnSuspiciousFields(req, "contact.updateMy", {
      subject: req.body?.subject,
      message: req.body?.message,
    });

    if (!subject) {
      warnMalformedInput(req, "contact.updateMy", { field: "subject" });
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (subject.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Subject must be ${MAX_TITLE_LENGTH} characters or fewer.`,
      });
    }

    if (!message) {
      warnMalformedInput(req, "contact.updateMy", { field: "message" });
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    if (message.length > MAX_CONTACT_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message must be ${MAX_CONTACT_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    const existingResult = await pool.request()
      .input("message_id", sql.Int, messageId)
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          message_id,
          status,
          admin_reply
        FROM CONTACT_MESSAGE
        WHERE message_id = @message_id
          AND user_id = @user_id
      `);

    if (existingResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    const existingMessage = existingResult.recordset[0];

    if (existingMessage.status !== "new" || existingMessage.admin_reply) {
      return res.status(403).json({
        success: false,
        message:
          "This message can no longer be changed because it was already reviewed by admin.",
      });
    }

    const result = await pool.request()
      .input("message_id", sql.Int, messageId)
      .input("user_id", sql.Int, userId)
      .input("subject", sql.NVarChar(150), subject)
      .input("message", sql.NVarChar(sql.MAX), message)
      .query(`
        UPDATE CONTACT_MESSAGE
        SET
          subject = @subject,
          message = @message
        WHERE message_id = @message_id
          AND user_id = @user_id;

        SELECT
          message_id,
          subject,
          message,
          status,
          ${buildContactDateDisplayColumns("CONTACT_MESSAGE")},
          admin_reply,
          replied_by
        FROM CONTACT_MESSAGE
        WHERE message_id = @message_id
          AND user_id = @user_id
      `);

    res.status(200).json({
      success: true,
      message: "Contact message updated successfully.",
      data: result.recordset[0] || null,
    });
  } catch (error) {
    console.error("Update my contact message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contact message.",
    });
  }
};

const deleteMyContactMessage = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.user?.userId);
    const messageId = parsePositiveInt(req.params.messageId);

    if (!userId) {
      warnInvalidId(req, "contact.deleteMy.userId", req.user?.userId);
      return res.status(401).json({
        success: false,
        message: "Invalid user session.",
      });
    }

    if (!messageId) {
      warnInvalidId(req, "contact.deleteMy.messageId", req.params.messageId);
      return res.status(400).json({
        success: false,
        message: "Invalid contact message identifier.",
      });
    }

    const existingResult = await pool.request()
      .input("message_id", sql.Int, messageId)
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT
          message_id,
          status,
          admin_reply
        FROM CONTACT_MESSAGE
        WHERE message_id = @message_id
          AND user_id = @user_id
      `);

    if (existingResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    const existingMessage = existingResult.recordset[0];

    if (existingMessage.status !== "new" || existingMessage.admin_reply) {
      return res.status(403).json({
        success: false,
        message:
          "This message can no longer be changed because it was already reviewed by admin.",
      });
    }

    await pool.request()
      .input("message_id", sql.Int, messageId)
      .input("user_id", sql.Int, userId)
      .query(`
        DELETE FROM CONTACT_MESSAGE
        WHERE message_id = @message_id
          AND user_id = @user_id
      `);

    res.status(200).json({
      success: true,
      message: "Contact message deleted successfully.",
    });
  } catch (error) {
    console.error("Delete my contact message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete contact message.",
    });
  }
};

const markContactMessageAsRead = async (req, res) => {
  try {
    const messageId = parsePositiveInt(req.params.messageId);

    if (!messageId) {
      warnInvalidId(req, "contact.markRead", req.params.messageId);
      return res.status(400).json({
        success: false,
        message: "Invalid contact message identifier.",
      });
    }

    const existingResult = await pool.request()
      .input("message_id", sql.Int, messageId)
      .query(`
        SELECT
          message_id,
          status,
          read_at
        FROM CONTACT_MESSAGE
        WHERE message_id = @message_id
      `);

    if (existingResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    const existingMessage = existingResult.recordset[0];

    if (existingMessage.status === "read") {
      return res.status(200).json({
        success: true,
        message: "Contact message marked as read.",
      });
    }

    await pool.request()
      .input("message_id", sql.Int, messageId)
      .query(`
        UPDATE CONTACT_MESSAGE
        SET
          status = N'read',
          read_at = GETDATE()
        WHERE message_id = @message_id
      `);

    res.status(200).json({
      success: true,
      message: "Contact message marked as read.",
    });
  } catch (error) {
    console.error("Mark contact message as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contact message.",
    });
  }
};

const replyToContactMessage = async (req, res) => {
  try {
    const messageId = parsePositiveInt(req.params.messageId);
    const adminUserId = parsePositiveInt(req.user?.userId);
    const reply = normalizeString(req.body?.reply);

    if (!adminUserId) {
      warnInvalidId(req, "contact.reply.userId", req.user?.userId);
      return res.status(401).json({
        success: false,
        message: "Invalid user session.",
      });
    }

    if (!messageId) {
      warnInvalidId(req, "contact.reply.messageId", req.params.messageId);
      return res.status(400).json({
        success: false,
        message: "Invalid contact message identifier.",
      });
    }

    warnSuspiciousFields(req, "contact.reply", {
      reply: req.body?.reply,
    });

    if (!reply) {
      warnMalformedInput(req, "contact.reply", {
        field: "reply",
      });
      return res.status(400).json({
        success: false,
        message: "Reply is required.",
      });
    }

    if (reply.length > MAX_CONTACT_REPLY_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Reply must be ${MAX_CONTACT_REPLY_LENGTH} characters or fewer.`,
      });
    }

    const existingResult = await pool.request()
      .input("message_id", sql.Int, messageId)
      .query(`
        SELECT message_id
        FROM CONTACT_MESSAGE
        WHERE message_id = @message_id
      `);

    if (existingResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    const result = await pool.request()
      .input("message_id", sql.Int, messageId)
      .input("reply", sql.NVarChar(sql.MAX), reply)
      .input("replied_by", sql.Int, adminUserId)
      .query(`
        UPDATE CONTACT_MESSAGE
        SET
          admin_reply = @reply,
          replied_at = GETDATE(),
          replied_by = @replied_by,
          status = N'read',
          read_at = CASE
            WHEN read_at IS NULL THEN GETDATE()
            ELSE read_at
          END
        WHERE message_id = @message_id;

        SELECT
          cm.message_id,
          cm.user_id,
          u.full_name,
          u.email,
          cm.subject,
          cm.message,
          cm.status,
          ${buildContactDateDisplayColumns("cm")},
          cm.admin_reply,
          cm.replied_by
        FROM CONTACT_MESSAGE cm
        INNER JOIN [USER] u
          ON u.user_id = cm.user_id
        WHERE cm.message_id = @message_id
      `);

    res.status(200).json({
      success: true,
      message: "Contact reply saved successfully.",
      data: result.recordset[0] || null,
    });
  } catch (error) {
    console.error("Reply to contact message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save contact reply.",
    });
  }
};

module.exports = {
  createContactMessage,
  getAdminContactMessages,
  getMyContactMessages,
  updateMyContactMessage,
  deleteMyContactMessage,
  markContactMessageAsRead,
  replyToContactMessage,
};
