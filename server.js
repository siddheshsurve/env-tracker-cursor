/**
 * EnvSync API server – fetches used space from Unix hosts via SSH.
 * Set SSH_USER and SSH_PASSWORD in .env (see .env.example).
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client } = require("ssh2");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const SSH_USER = process.env.SSH_USER || "";
const SSH_PASSWORD = process.env.SSH_PASSWORD || "";
const DF_COMMAND = "df -h . | awk 'NR==2 {print $5}'";
const LOGICAL_DATE_SQL = "select logical_date from logical_date where expiration_date is null and logical_date_type = 'B';";
const LOGICAL_DATE_REGEX = /(\d{2}-[A-Z]{3}-\d{2})/;

/**
 * Run sqla in a login shell so the remote .profile is sourced and the alias
 * sqla='sqlplus $APP_DB_USER/$APP_DB_PASS@$APP_DB_INST' (and env vars) are available.
 */
function getLogicalDateCommand() {
  const escapedSql = LOGICAL_DATE_SQL.replace(/'/g, "'\\''");
  return `ksh -l -c 'printf "%s\\n" "${escapedSql}" | sqla'`;
}

function getUsedSpace(host) {
  return new Promise((resolve, reject) => {
    if (!host || typeof host !== "string") {
      return reject(new Error("Host (environment name) is required"));
    }
    if (!SSH_USER || !SSH_PASSWORD) {
      return reject(new Error("SSH_USER and SSH_PASSWORD must be set in .env"));
    }

    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(DF_COMMAND, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          let output = "";
          stream
            .on("close", (code, signal) => {
              conn.end();
              const trimmed = output.trim();
              if (code !== 0) {
                return reject(new Error(trimmed || `Command exited with code ${code}`));
              }
              resolve(trimmed || "—");
            })
            .on("data", (data) => {
              output += data.toString();
            })
            .stderr.on("data", (data) => {
              output += data.toString();
            });
        });
      })
      .on("error", (err) => reject(err))
      .connect({
        host: host.trim(),
        port: 22,
        username: SSH_USER,
        password: SSH_PASSWORD,
        readyTimeout: 15000,
        connectTimeout: 15000,
      });
  });
}

function getLogicalDate(host) {
  return new Promise((resolve, reject) => {
    if (!host || typeof host !== "string") {
      return reject(new Error("Host (environment name) is required"));
    }
    if (!SSH_USER || !SSH_PASSWORD) {
      return reject(new Error("SSH_USER and SSH_PASSWORD must be set in .env"));
    }

    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(getLogicalDateCommand(), (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          let output = "";
          stream
            .on("close", (code, signal) => {
              conn.end();
              const trimmed = output.trim();
              const match = trimmed.match(LOGICAL_DATE_REGEX);
              if (match) {
                return resolve(match[1].trim());
              }
              if (code !== 0) {
                return reject(new Error(trimmed || `Command exited with code ${code}`));
              }
              resolve(trimmed || "—");
            })
            .on("data", (data) => {
              output += data.toString();
            })
            .stderr.on("data", (data) => {
              output += data.toString();
            });
        });
      })
      .on("error", (err) => reject(err))
      .connect({
        host: host.trim(),
        port: 22,
        username: SSH_USER,
        password: SSH_PASSWORD,
        readyTimeout: 15000,
        connectTimeout: 15000,
      });
  });
}

app.post("/api/used-space", async (req, res) => {
  const host = req.body?.host;
  try {
    const usedSpace = await getUsedSpace(host);
    res.json({ usedSpace });
  } catch (err) {
    console.error(`[${host}]`, err.message);
    res.status(500).json({
      error: err.message || "Failed to fetch used space",
      usedSpace: null,
    });
  }
});

app.post("/api/logical-date", async (req, res) => {
  const host = req.body?.host;
  try {
    const logicalDate = await getLogicalDate(host);
    res.json({ logicalDate });
  } catch (err) {
    console.error(`[${host}] logical-date`, err.message);
    res.status(500).json({
      error: err.message || "Failed to fetch logical date",
      logicalDate: null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`EnvSync server at http://localhost:${PORT}`);
  if (!SSH_USER || !SSH_PASSWORD) {
    console.warn("Warning: SSH_USER or SSH_PASSWORD not set. Create .env from .env.example");
  }
});
