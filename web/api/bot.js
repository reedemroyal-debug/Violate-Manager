const express = require("express");
const router = express.Router();

const {
  getConfig,
  updateConfig,
  resetConfig
} = require("../../src/automod/config");

function botStatus(client) {
  return {
    online: Boolean(client?.isReady?.()),
    name: client?.user?.tag || "VIOLATE MANAGER"
  };
}

function getGuildConfig(guildId) {
  return getConfig(guildId);
}

router.get("/status", (req, res) => {
  res.json({
    success: true,
    online: true,
    name: "VIOLATE MANAGER"
  });
});

router.get("/config/:guildId", (req, res) => {
  try {
    const config = getGuildConfig(req.params.guildId);

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("WEB CONFIG GET:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load server configuration."
    });
  }
});

router.post("/config/:guildId", express.json(), (req, res) => {
  try {
    const guildId = req.params.guildId;
    const config = req.body?.config;

    if (!config || typeof config !== "object") {
      return res.status(400).json({
        success: false,
        error: "Invalid configuration."
      });
    }

    const saved = updateConfig(guildId, config);

    res.json({
      success: true,
      config: saved
    });
  } catch (error) {
    console.error("WEB CONFIG UPDATE:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save server configuration."
    });
  }
});

router.post("/config/:guildId/reset", (req, res) => {
  try {
    const config = resetConfig(req.params.guildId);

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error("WEB CONFIG RESET:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset server configuration."
    });
  }
});

module.exports = {
  router,
  botStatus,
  getGuildConfig
};
