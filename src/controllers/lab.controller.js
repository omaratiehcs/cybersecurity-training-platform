const { spawn } = require("child_process");

const LAB_URL = "http://localhost:8088";
const LAB_CONTAINER_NAME = "hidden-comment-lab";
const LAB_IMAGE_NAME = "hidden-comment-lab";
const LAB_PORT_MAPPING = "8088:80";

function runDockerCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
        return;
      }

      const commandError = new Error(
        stderr.trim() || stdout.trim() || `Docker command failed with exit code ${code}`
      );

      commandError.exitCode = code;
      reject(commandError);
    });
  });
}

async function isHiddenCommentLabRunning() {
  const result = await runDockerCommand([
    "ps",
    "--filter",
    `name=^/${LAB_CONTAINER_NAME}$`,
    "--filter",
    "status=running",
    "--format",
    "{{.Names}}",
  ]);

  return result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .includes(LAB_CONTAINER_NAME);
}

async function hiddenCommentLabContainerExists() {
  const result = await runDockerCommand([
    "ps",
    "-a",
    "--filter",
    `name=^/${LAB_CONTAINER_NAME}$`,
    "--format",
    "{{.Names}}",
  ]);

  return result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .includes(LAB_CONTAINER_NAME);
}

const getHiddenCommentLabStatus = async (_req, res) => {
  try {
    const running = await isHiddenCommentLabRunning();

    res.status(200).json({
      running,
      labUrl: LAB_URL,
    });
  } catch (error) {
    console.error("Get hidden comment lab status error:", error);
    res.status(500).json({
      message: "Failed to check Docker lab status.",
      running: false,
      labUrl: LAB_URL,
    });
  }
};

const startHiddenCommentLab = async (_req, res) => {
  try {
    const running = await isHiddenCommentLabRunning();

    if (running) {
      return res.status(200).json({
        message: "Docker lab is already running.",
        labUrl: LAB_URL,
        running: true,
      });
    }

    const containerExists = await hiddenCommentLabContainerExists();

    if (containerExists) {
      await runDockerCommand(["rm", "-f", LAB_CONTAINER_NAME]);
    }

    await runDockerCommand([
      "run",
      "--rm",
      "-d",
      "-p",
      LAB_PORT_MAPPING,
      "--name",
      LAB_CONTAINER_NAME,
      LAB_IMAGE_NAME,
    ]);

    res.status(200).json({
      message: "Docker lab started successfully.",
      labUrl: LAB_URL,
      running: true,
    });
  } catch (error) {
    console.error("Start hidden comment lab error:", error);
    res.status(500).json({
      message: "Failed to start Docker lab.",
      labUrl: LAB_URL,
      running: false,
    });
  }
};

const stopHiddenCommentLab = async (_req, res) => {
  try {
    const running = await isHiddenCommentLabRunning();

    if (!running) {
      return res.status(200).json({
        message: "Docker lab is not running.",
        running: false,
      });
    }

    await runDockerCommand(["stop", LAB_CONTAINER_NAME]);

    res.status(200).json({
      message: "Docker lab stopped successfully.",
      running: false,
    });
  } catch (error) {
    console.error("Stop hidden comment lab error:", error);
    res.status(500).json({
      message: "Failed to stop Docker lab.",
      running: false,
    });
  }
};

module.exports = {
  getHiddenCommentLabStatus,
  startHiddenCommentLab,
  stopHiddenCommentLab,
};
