require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dbRoutes = require("./routes/db.routes");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const challengeRoutes = require("./routes/challenge.routes");
const leaderboardRoutes = require("./routes/leaderboard.routes");
const socCaseRoutes = require("./routes/socCase.routes");
const incidentRoutes = require("./routes/incident.routes");
const categoryRoutes = require("./routes/category.routes");
const adminInsightsRoutes = require("./routes/adminInsights.routes");
const labRoutes = require("./routes/lab.routes");
const learningRoutes = require("./routes/learning.routes");
const reviewRoutes = require("./routes/review.routes");
const contactRoutes = require("./routes/contact.routes");
const chatRoutes = require("./routes/chat.routes");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET environment variable is required");
  process.exit(1);
}

const app = express();
app.use(cors());

app.use(express.json());

app.use("/db", dbRoutes);
app.use("/", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/soc-cases", socCaseRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/insights", adminInsightsRoutes);
app.use("/api/labs", labRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;

const { pool } = require("./config/db");

pool.connect()
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB connection failed:", err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
