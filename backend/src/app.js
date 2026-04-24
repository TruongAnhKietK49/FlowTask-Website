const compression = require("compression");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const config = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const projectInvitationRoutes = require("./routes/projectInvitationRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const app = express();
app.use(cors());

app.use(helmet());
app.use(compression());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    environment: config.nodeEnv,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/project-invitations", projectInvitationRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
