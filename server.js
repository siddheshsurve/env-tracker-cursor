/**
 * EnvSync API server – fetches used space, logical date, and JNext plan from Unix via SSH.
 * Set SSH_USER / SSH_PASSWORD and optionally JNEXTPLAN_USER / JNEXTPLAN_PASSWORD in .env.
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

/** JNext plan (`planman showinfo`) — separate SSH user from used space / logical date. */
const JNEXTPLAN_USER = process.env.JNEXTPLAN_USER || "";
const JNEXTPLAN_PASSWORD = process.env.JNEXTPLAN_PASSWORD || "";
const JNEXTPLAN_CMD = "bash -l -c 'planman showinfo'";

/** Jenkins ENV_CLEANUP job – log cleanup (build with parameters). */
const JENKINS_URL = (process.env.JENKINS_URL || "").replace(/\/$/, "");
const JENKINS_USER = process.env.JENKINS_USER || "";
const JENKINS_TOKEN = process.env.JENKINS_TOKEN || "";
const JENKINS_JOB = process.env.JENKINS_JOB || "ENV_CLEANUP";
/** e.g. "jenkins" if Jenkins is at http://host:8080/jenkins/ */
const JENKINS_CONTEXT = (process.env.JENKINS_CONTEXT || "").replace(/^\/|\/$/g, "");

/** Full bounce — J-Boot-PMX (separate Jenkins host from ENV_CLEANUP). */
const JENKINS_FULL_BOUNCE_URL = (process.env.JENKINS_FULL_BOUNCE_URL || "").replace(/\/$/, "");
const JENKINS_FULL_BOUNCE_JOB = process.env.JENKINS_FULL_BOUNCE_JOB || "J-Boot-PMX";
const JENKINS_FULL_BOUNCE_TOKEN = process.env.JENKINS_FULL_BOUNCE_TOKEN || "";
const JENKINS_FULL_BOUNCE_CONTEXT = (process.env.JENKINS_FULL_BOUNCE_CONTEXT || "").replace(/^\/|\/$/g, "");
/** Must match the job’s parameter name for the OnFailure radio (default: skip). */
const JENKINS_FULL_BOUNCE_ON_FAILURE_NAME =
  process.env.JENKINS_FULL_BOUNCE_ON_FAILURE_NAME || "OnFailure";
const JENKINS_FULL_BOUNCE_ON_FAILURE_VALUE =
  process.env.JENKINS_FULL_BOUNCE_ON_FAILURE_VALUE || "skip";

const DF_COMMAND = "df -h . | awk 'NR==2 {print $5}'";
const LOGICAL_DATE_SQL = "select logical_date from logical_date where expiration_date is null and logical_date_type = 'B';";
const LOGICAL_DATE_REGEX = /(\d{2}-[A-Z]{3}-\d{2})/;

/** Maestro not installed / PATH — planman missing (show "NA" in UI, not raw stderr). */
const PLANMAN_COMMAND_NOT_FOUND = /planman:\s*command not found|bash:\s*planman:\s*command not found/i;
/** Non-interactive SSH — profile runs stty; harmless noise, treat as no usable JNext info. */
const STTY_IOCTL_INAPPROPRIATE =
  /stty:\s*standard input:\s*Inappropriate ioctl for device/i;
/** Date portion in "Production plan end time: MM/DD/YYYY ..." */
const JNEXT_PRODUCTION_DATE_REGEX = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/;

/** Daemon name -> grep pattern for ps -ef | grep (same as psu | grep pattern). */
const DAEMON_PATTERNS = {
  mro: "mro",
  rqs: "rqs",
  BTLSOR: "SOR",
  BTLQUOTE: "QUOTE",
  TLS1APINV_2_1: "APInvoker_2",
  TLS1APINV_1_1: "APInvoker_1",
  TLS1APINV_10_1: "APInvoker_10",
  AR1PYMRCT: "AR1PYMRCT_01",
  AR1PYMPOST: "AR1PYMPOST_01",
  AR1INVRCT: "AR1INVRCT_01",
  AR1DDREQCRE: "AR1DDREQCRE",
  AR1DDFEDBCK: "AR1DDFEDBCK_01",
  AR1BILINTER: "AR1BILINTER_01",
  AC1MANAGER: "Ac1FtcManager",
  AR9DDNOTIF: "AR9DDFNOTIF_1",
  AR9PYMCAPTRCN: "AR9PYMCAPTRCN_01",
  AR9RFNDCAPT: "AR9RFNDCAPT_01",
  AR9SUBKAFKA_1: "AR9SUBKAFKA_01",
  AR9UPDPAYMEN: "AR9UPDPAYMEN_01",
  BL9PUBKAFKA: "BL9PUBKAFKA_1",
};

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

/**
 * SSH as JNext plan user, run planman showinfo.
 * Returns "NA" if Maestro/planman is not installed; otherwise the date only (MM/DD/YYYY)
 * parsed from "Production plan end time: ...".
 */
function getJnextPlanProductionEndLine(host) {
  return new Promise((resolve, reject) => {
    const h = String(host || "").trim().toLowerCase();
    if (!h) {
      return reject(new Error("Host (environment name) is required"));
    }
    if (!JNEXTPLAN_USER || !JNEXTPLAN_PASSWORD) {
      return reject(
        new Error("JNEXTPLAN_USER and JNEXTPLAN_PASSWORD must be set in .env")
      );
    }

    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(JNEXTPLAN_CMD, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          let output = "";
          stream
            .on("close", (code) => {
              conn.end();
              const full = output;
              const trimmed = full.trim();

              let productionEndLine = null;
              for (const line of full.split(/\r?\n/)) {
                const t = line.trim();
                if (t.startsWith("Production plan end time:")) {
                  productionEndLine = t;
                  break;
                }
              }
              if (productionEndLine) {
                const m = productionEndLine.match(JNEXT_PRODUCTION_DATE_REGEX);
                if (m && m[1]) {
                  return resolve(m[1]);
                }
                return reject(
                  new Error(
                    "Could not parse date from Production plan end time line."
                  )
                );
              }

              if (PLANMAN_COMMAND_NOT_FOUND.test(trimmed)) {
                return resolve("NA");
              }
              if (STTY_IOCTL_INAPPROPRIATE.test(trimmed)) {
                return resolve("NA");
              }

              if (code !== 0) {
                return reject(
                  new Error(
                    trimmed || `planman showinfo exited with code ${code}`
                  )
                );
              }
              const snippet = trimmed.slice(0, 500);
              return reject(
                new Error(
                  snippet
                    ? `Could not find 'Production plan end time' in output. Snippet: ${snippet}`
                    : "Could not find 'Production plan end time' in planman output."
                )
              );
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
        host: h,
        port: 22,
        username: JNEXTPLAN_USER,
        password: JNEXTPLAN_PASSWORD,
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

app.post("/api/jnext-plan", async (req, res) => {
  const host = req.body?.host;
  try {
    const jnextPlanLine = await getJnextPlanProductionEndLine(host);
    res.json({ jnextPlanLine });
  } catch (err) {
    console.error(`[${host}] jnext-plan`, err.message);
    res.status(500).json({
      error: err.message || "Failed to fetch JNext plan info",
      jnextPlanLine: null,
    });
  }
});

function getDaemonStatusOnHost(host, daemon) {
  return new Promise((resolve, reject) => {
    if (!host || typeof host !== "string") {
      return reject(new Error("Host (environment name) is required"));
    }
    if (!SSH_USER || !SSH_PASSWORD) {
      return reject(new Error("SSH_USER and SSH_PASSWORD must be set in .env"));
    }
    const pattern = DAEMON_PATTERNS[daemon];
    if (!pattern) {
      return reject(new Error("Unknown daemon: " + daemon));
    }
    const escaped = String(pattern).replace(/'/g, "'\\''");
    const cmd = `ps -ef | grep -v grep | grep '${escaped}' > /dev/null && echo "Up" || echo "Down"`;

    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(cmd, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          let output = "";
          stream
            .on("close", (code) => {
              conn.end();
              const trimmed = output.trim();
              if (trimmed === "Up" || trimmed === "Down") return resolve(trimmed);
              resolve(trimmed.toLowerCase().includes("up") ? "Up" : "Down");
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

app.post("/api/daemon-status", async (req, res) => {
  const host = req.body?.host;
  const daemon = req.body?.daemon;
  try {
    const status = await getDaemonStatusOnHost(host, daemon);
    res.json({ status });
  } catch (err) {
    console.error(`[${host}] daemon ${daemon}`, err.message);
    res.status(500).json({
      error: err.message || "Failed to check daemon status",
      status: null,
    });
  }
});

/**
 * e.g. illnqw8358 → 8358, illnqw-7937 → 7937 (trailing digits).
 */
function extractEnvironmentNumber(envName) {
  if (!envName || typeof envName !== "string") return null;
  const m = String(envName).trim().match(/(\d+)$/);
  return m ? m[1] : null;
}

/** vApp id → ENV dropdown value e.g. Vapp_81 / vapp-81 → VAPP_81 */
function normalizeVappForJenkins(vappId) {
  if (vappId == null || String(vappId).trim() === "") return null;
  const s = String(vappId).trim();
  const m = s.match(/(\d+)/);
  if (m) return `VAPP_${m[1]}`;
  const u = s.replace(/-/g, "_").toUpperCase();
  if (/^VAPP_\d+$/.test(u)) return u;
  return null;
}

/**
 * @param {"cleanup"|"fullBounce"} profileName
 */
function getJenkinsProfile(profileName) {
  const p = String(profileName || "cleanup")
    .toLowerCase()
    .replace(/_/g, "");
  if (p === "fullbounce") {
    const base = JENKINS_FULL_BOUNCE_URL.replace(/\/$/, "");
    const token = JENKINS_FULL_BOUNCE_TOKEN || JENKINS_TOKEN;
    if (!base || !JENKINS_USER || !token) {
      throw new Error(
        "Full bounce Jenkins not configured. Set JENKINS_FULL_BOUNCE_URL, JENKINS_USER, and JENKINS_FULL_BOUNCE_TOKEN (or JENKINS_TOKEN) in .env"
      );
    }
    return {
      key: "fullBounce",
      base,
      job: JENKINS_FULL_BOUNCE_JOB,
      context: JENKINS_FULL_BOUNCE_CONTEXT,
      user: JENKINS_USER,
      token,
    };
  }
  const base = JENKINS_URL.replace(/\/$/, "");
  if (!base || !JENKINS_USER || !JENKINS_TOKEN) {
    throw new Error("Jenkins not configured. Set JENKINS_URL, JENKINS_USER, and JENKINS_TOKEN in .env");
  }
  return {
    key: "cleanup",
    base,
    job: JENKINS_JOB,
    context: JENKINS_CONTEXT,
    user: JENKINS_USER,
    token: JENKINS_TOKEN,
  };
}

function jobUrlParts(cfg) {
  const ctx = cfg.context ? `/${cfg.context}` : "";
  const parts = String(cfg.job || "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  const middle = parts.map((p) => `job/${encodeURIComponent(p)}`).join("/");
  const base = cfg.base.replace(/\/$/, "");
  return {
    buildWithParameters: () => `${base}${ctx}/${middle}/buildWithParameters`,
    buildResource: (num, resource) =>
      `${base}${ctx}/${middle}/${encodeURIComponent(String(num))}/${resource}`,
    lastBuildApi: () => `${base}${ctx}/${middle}/lastBuild/api/json`,
  };
}

async function getJenkinsCrumbCfg(cfg) {
  const authHeader =
    "Basic " + Buffer.from(`${cfg.user}:${cfg.token}`, "utf8").toString("base64");
  const ctx = cfg.context ? `/${cfg.context}` : "";
  const crumbUrl = `${cfg.base}${ctx}/crumbIssuer/api/json`;
  try {
    const r = await fetch(crumbUrl, { headers: { Authorization: authHeader } });
    if (!r.ok) return {};
    const data = await r.json();
    const field = data.crumbRequestField || "Jenkins-Crumb";
    return { [field]: data.crumb };
  } catch {
    return {};
  }
}

function jenkinsFetchCfg(cfg, url, options = {}) {
  const authHeader =
    "Basic " + Buffer.from(`${cfg.user}:${cfg.token}`, "utf8").toString("base64");
  return fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader,
      "User-Agent": "EnvSync-Jenkins/1.0",
      ...options.headers,
    },
  });
}

/**
 * Jenkins CSRF crumb (required on many servers for POST).
 */
async function getJenkinsCrumb(baseUrl, authHeader) {
  const ctx = JENKINS_CONTEXT ? `/${JENKINS_CONTEXT}` : "";
  const crumbUrl = `${baseUrl}${ctx}/crumbIssuer/api/json`;
  try {
    const r = await fetch(crumbUrl, {
      headers: { Authorization: authHeader },
    });
    if (!r.ok) return {};
    const data = await r.json();
    const field = data.crumbRequestField || "Jenkins-Crumb";
    return { [field]: data.crumb };
  } catch {
    return {};
  }
}

/**
 * Build URL: .../job/A/job/B/job/C/buildWithParameters from "A/B/C" or "ENV_CLEANUP".
 */
function buildWithParametersUrl(base, jobSpec) {
  const ctx = JENKINS_CONTEXT ? `/${JENKINS_CONTEXT}` : "";
  const parts = String(jobSpec || "ENV_CLEANUP")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  const middle = parts.map((p) => `job/${encodeURIComponent(p)}`).join("/");
  return `${base}${ctx}/${middle}/buildWithParameters`;
}

/** e.g. .../job/ENV_CLEANUP/40845/api/json or .../40845/consoleText */
function jobBuildResourceUrl(base, jobSpec, buildNumber, resource) {
  const ctx = JENKINS_CONTEXT ? `/${JENKINS_CONTEXT}` : "";
  const parts = String(jobSpec || "ENV_CLEANUP")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  const middle = parts.map((p) => `job/${encodeURIComponent(p)}`).join("/");
  return `${base}${ctx}/${middle}/${encodeURIComponent(String(buildNumber))}/${resource}`;
}

/** .../job/ENV_CLEANUP/lastBuild/api/json */
function jobLastBuildApiUrl(base, jobSpec) {
  const ctx = JENKINS_CONTEXT ? `/${JENKINS_CONTEXT}` : "";
  const parts = String(jobSpec || "ENV_CLEANUP")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  const middle = parts.map((p) => `job/${encodeURIComponent(p)}`).join("/");
  return `${base}${ctx}/${middle}/lastBuild/api/json`;
}

function jenkinsAuthHeader() {
  return (
    "Basic " + Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`, "utf8").toString("base64")
  );
}

function jenkinsFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: jenkinsAuthHeader(),
      "User-Agent": "EnvSync-Jenkins/1.0",
      ...options.headers,
    },
  });
}

/** Latest build # for ENV_CLEANUP (cleanup profile). */
async function fetchLastBuildNumber() {
  return fetchLastBuildNumberForProfile("cleanup");
}

async function fetchLastBuildNumberForProfile(profileName) {
  let cfg;
  try {
    cfg = getJenkinsProfile(profileName);
  } catch (e) {
    return null;
  }
  const urls = jobUrlParts(cfg);
  try {
    const r = await jenkinsFetchCfg(cfg, urls.lastBuildApi());
    if (r.status === 404) return null;
    if (!r.ok) {
      console.warn("[jenkins] lastBuild api", profileName, r.status);
      return null;
    }
    const data = await r.json();
    return data.number != null ? Number(data.number) : null;
  } catch (e) {
    console.warn("[jenkins] lastBuild", profileName, e.message);
    return null;
  }
}

function toAbsoluteJenkinsUrl(base, location) {
  if (!location) return null;
  const b = base.replace(/\/$/, "");
  if (location.startsWith("http")) return location;
  return new URL(location, b + "/").href;
}

/** Only allow queue URLs on our Jenkins origin (SSRF guard). */
function assertQueueItemUrl(allowedBase, queueUrl) {
  const base = allowedBase.replace(/\/$/, "");
  const abs = toAbsoluteJenkinsUrl(base, queueUrl);
  const u = new URL(abs);
  const b = new URL(base);
  if (u.origin !== b.origin) {
    throw new Error("Invalid queue URL");
  }
  if (!/\/queue\/item\/\d+/i.test(u.pathname)) {
    throw new Error("Invalid Jenkins queue item URL");
  }
  return abs.replace(/\/?$/, "/");
}

/** Jenkins queued a build: 201 Created, or 302/303 to queue (Build History will show the run). */
function isJenkinsQueueSuccess(status, location) {
  if (status === 201) return true;
  if ((status === 302 || status === 303) && location) return true;
  if (status === 200 && location && /queue|item/i.test(String(location))) return true;
  return false;
}

/**
 * Triggers ENV_CLEANUP: ENV=<number>, LIBS_CLEANUP checked, KILL_ENV unchecked (same as UI).
 */
async function triggerJenkinsEnvCleanup(envNumber) {
  if (!JENKINS_URL || !JENKINS_USER || !JENKINS_TOKEN) {
    throw new Error(
      "Jenkins is not configured. Set JENKINS_URL, JENKINS_USER, and JENKINS_TOKEN in .env"
    );
  }

  const base = JENKINS_URL.replace(/\/$/, "");
  const buildUrl = buildWithParametersUrl(base, JENKINS_JOB);

  const authHeader =
    "Basic " + Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`, "utf8").toString("base64");

  const crumbHeaders = await getJenkinsCrumb(base, authHeader);

  const commonHeaders = {
    Authorization: authHeader,
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "EnvSync-Jenkins/1.0",
    ...crumbHeaders,
  };

  // Match the UI: ENV set, LIBS_CLEANUP checked; KILL_ENV left unchecked (omit — Jenkins defaults to false)
  const params = new URLSearchParams();
  params.set("ENV", String(envNumber));
  params.set("LIBS_CLEANUP", "true");

  let response = await fetch(buildUrl, {
    method: "POST",
    headers: commonHeaders,
    body: params.toString(),
    redirect: "manual",
  });

  let status = response.status;
  let location = response.headers.get("Location");

  // Fallback: Jenkins remote API "json" form field (some servers reject plain params)
  if (!isJenkinsQueueSuccess(status, location)) {
    const jsonBody = {
      parameter: [
        { name: "ENV", value: String(envNumber) },
        { name: "LIBS_CLEANUP", value: true },
      ],
    };
    const jsonParams = new URLSearchParams();
    jsonParams.set("json", JSON.stringify(jsonBody));

    console.log(
      `[jenkins] Plain POST returned ${status}; retrying with json= parameter (${buildUrl})`
    );
    response = await fetch(buildUrl, {
      method: "POST",
      headers: commonHeaders,
      body: jsonParams.toString(),
      redirect: "manual",
    });
    status = response.status;
    location = response.headers.get("Location");
  }

  console.log(`[jenkins] POST ${buildUrl} -> HTTP ${status} Location: ${location || "(none)"}`);

  if (isJenkinsQueueSuccess(status, location)) {
    const queueItemUrl = toAbsoluteJenkinsUrl(base, location);
    return {
      ok: true,
      location: location || null,
      queueItemUrl,
      status,
    };
  }

  const text = await response.text();
  let detail = text.replace(/\s+/g, " ").trim().slice(0, 500);
  if (status === 401 || status === 403) {
    detail =
      (detail || "Forbidden") +
      " — Check JENKINS_USER / JENKINS_TOKEN, job name (JENKINS_JOB), and CSRF. If the job is in a folder, set JENKINS_JOB=Folder/ENV_CLEANUP.";
  }
  throw new Error(`Jenkins returned ${status}${detail ? ": " + detail : ""}`);
}

/**
 * J-Boot-PMX — Build with parameters matching manual flow (ST, VAPP_*, ReStart, FULL, etc.).
 */
function buildFullBounceParameterJson(envStr) {
  const onName = JENKINS_FULL_BOUNCE_ON_FAILURE_NAME;
  const onVal = JENKINS_FULL_BOUNCE_ON_FAILURE_VALUE;
  return {
    parameter: [
      { name: "ENV_TYPE", value: "ST" },
      { name: "ENV", value: envStr },
      { name: "Action", value: "ReStart" },
      { name: "ComponentType", value: "FULL" },
      { name: "Component", value: "FULL" },
      { name: "IncludeDependencyDS", value: false },
      { name: "CleanLogs", value: true },
      { name: "CleanCache", value: true },
      /** Choice/radio — must be string (e.g. skip), same as UI. */
      { name: onName, value: onVal },
    ],
  };
}

async function triggerJenkinsFullBounce(envVappValue) {
  const envStr = String(envVappValue == null ? "" : envVappValue).trim();
  if (!envStr) {
    throw new Error("ENV (vApp) value is empty — check vApp ID on this row.");
  }

  const cfg = getJenkinsProfile("fullBounce");
  const urls = jobUrlParts(cfg);
  const buildUrl = urls.buildWithParameters();
  const authHeader =
    "Basic " + Buffer.from(`${cfg.user}:${cfg.token}`, "utf8").toString("base64");
  const crumbHeaders = await getJenkinsCrumbCfg(cfg);
  const commonHeaders = {
    Authorization: authHeader,
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "EnvSync-Jenkins/1.0",
    ...crumbHeaders,
  };

  const onName = JENKINS_FULL_BOUNCE_ON_FAILURE_NAME;
  const onVal = JENKINS_FULL_BOUNCE_ON_FAILURE_VALUE;

  /**
   * json= carries OnFailure (radio) and booleans reliably; some Jenkins drop ENV/Component from json.
   * Duplicate only the text/choice fields as form keys — do NOT duplicate OnFailure in the form:
   * duplicate OnFailure + json together has been seen to leave OnFailure empty.
   * Put json= last so Pipeline parameters merge with form overrides for ENV/Component.
   */
  const jsonBody = buildFullBounceParameterJson(envStr);
  const combined = new URLSearchParams();
  combined.set("ENV_TYPE", "ST");
  combined.set("ENV", envStr);
  combined.set("Action", "ReStart");
  combined.set("ComponentType", "FULL");
  combined.set("Component", "FULL");
  combined.set("IncludeDependencyDS", "false");
  combined.set("CleanLogs", "true");
  combined.set("CleanCache", "true");
  combined.set("json", JSON.stringify(jsonBody));

  let response = await fetch(buildUrl, {
    method: "POST",
    headers: commonHeaders,
    body: combined.toString(),
    redirect: "manual",
  });

  let status = response.status;
  let location = response.headers.get("Location");

  if (!isJenkinsQueueSuccess(status, location)) {
    const params = new URLSearchParams();
    params.set("ENV_TYPE", "ST");
    params.set("ENV", envStr);
    params.set("Action", "ReStart");
    params.set("ComponentType", "FULL");
    params.set("Component", "FULL");
    params.set("IncludeDependencyDS", "false");
    params.set("CleanLogs", "true");
    params.set("CleanCache", "true");
    params.set(onName, onVal);

    console.log(
      `[jenkins full-bounce] combined POST returned ${status}; retrying form-only (${buildUrl})`
    );
    response = await fetch(buildUrl, {
      method: "POST",
      headers: commonHeaders,
      body: params.toString(),
      redirect: "manual",
    });
    status = response.status;
    location = response.headers.get("Location");
  }

  console.log(`[jenkins full-bounce] POST ${buildUrl} -> HTTP ${status} Location: ${location || "(none)"}`);

  if (isJenkinsQueueSuccess(status, location)) {
    const queueItemUrl = toAbsoluteJenkinsUrl(cfg.base, location);
    return {
      ok: true,
      location: location || null,
      queueItemUrl,
      status,
    };
  }

  const text = await response.text();
  let detail = text.replace(/\s+/g, " ").trim().slice(0, 500);
  if (status === 401 || status === 403) {
    detail = (detail || "Forbidden") + " — Check JENKINS_USER / JENKINS_FULL_BOUNCE_TOKEN and job name.";
  }
  throw new Error(`Jenkins returned ${status}${detail ? ": " + detail : ""}`);
}

app.post("/api/clean-space", async (req, res) => {
  const envName = req.body?.envName ?? req.body?.host;
  try {
    const envNum = extractEnvironmentNumber(envName);
    if (!envNum) {
      return res.status(400).json({
        error:
          'Could not derive environment number from name. Use a name ending in digits (e.g. illnqw8358 → 8358).',
        queued: false,
      });
    }
    /** Snapshot before trigger — used if queue item disappears before we poll (common on fast Jenkins). */
    let previousBuildNumber = await fetchLastBuildNumber();
    if (previousBuildNumber == null) {
      await new Promise((r) => setTimeout(r, 400));
      previousBuildNumber = await fetchLastBuildNumber();
    }
    const triggeredAtMs = Date.now();
    const result = await triggerJenkinsEnvCleanup(envNum);
    res.json({
      ok: true,
      envNumber: envNum,
      location: result.location,
      queueItemUrl: result.queueItemUrl || null,
      previousBuildNumber,
      /** Client uses this with lastBuild.timestamp to find the new run when queue data is missing. */
      triggeredAtMs,
      message: `ENV_CLEANUP build queued (ENV=${envNum}, LIBS_CLEANUP). Monitoring build until console reports success…`,
    });
  } catch (err) {
    console.error("[clean-space]", err.message);
    res.status(500).json({
      error: err.message || "Failed to trigger Jenkins job",
      queued: false,
    });
  }
});

app.post("/api/full-bounce", async (req, res) => {
  const vappRaw = req.body?.vappId ?? req.body?.vapp_id;
  try {
    const envVal = normalizeVappForJenkins(vappRaw);
    if (!envVal) {
      return res.status(400).json({
        error:
          "Missing or invalid vApp ID. Use a value like VAPP_148 or any text containing the numeric id (e.g. vapp-148).",
      });
    }
    let previousBuildNumber = await fetchLastBuildNumberForProfile("fullBounce");
    if (previousBuildNumber == null) {
      await new Promise((r) => setTimeout(r, 400));
      previousBuildNumber = await fetchLastBuildNumberForProfile("fullBounce");
    }
    const triggeredAtMs = Date.now();
    const result = await triggerJenkinsFullBounce(envVal);
    res.json({
      ok: true,
      env: envVal,
      location: result.location,
      queueItemUrl: result.queueItemUrl || null,
      previousBuildNumber,
      triggeredAtMs,
      message: `J-Boot-PMX queued (ENV=${envVal}). Monitoring build…`,
    });
  } catch (err) {
    console.error("[full-bounce]", err.message);
    res.status(500).json({
      error: err.message || "Failed to trigger Full bounce (J-Boot-PMX)",
    });
  }
});

/** Poll queue item: until a build number is assigned. ?profile=cleanup|fullBounce */
app.get("/api/jenkins/queue", async (req, res) => {
  const queueUrl = req.query.url;
  let cfg;
  try {
    cfg = getJenkinsProfile(req.query.profile);
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
  if (!queueUrl || typeof queueUrl !== "string") {
    return res.status(400).json({ error: "Missing url query (queue item URL from trigger response)" });
  }
  try {
    const safe = assertQueueItemUrl(cfg.base, queueUrl);
    const apiUrl = safe + "api/json";
    const r = await jenkinsFetchCfg(cfg, apiUrl);
    /** Queue item removed after build starts — use lastBuild fallback on client. */
    if (r.status === 404) {
      return res.json({
        queueGone: true,
        cancelled: false,
        why: null,
        executableNumber: null,
        executableUrl: null,
      });
    }
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({
        error: `Queue API ${r.status}`,
        detail: t.slice(0, 200),
      });
    }
    const data = await r.json();
    const ex = data.executable;
    res.json({
      queueGone: false,
      cancelled: !!data.cancelled,
      why: data.why || null,
      executableNumber: ex && ex.number != null ? ex.number : null,
      executableUrl: ex && ex.url ? ex.url : null,
    });
  } catch (err) {
    console.error("[jenkins/queue]", err.message);
    res.status(400).json({ error: err.message || "Queue poll failed" });
  }
});

/** Current lastBuild (for monitoring when queue URL is missing or expired). */
app.get("/api/jenkins/last-build", async (req, res) => {
  let cfg;
  try {
    cfg = getJenkinsProfile(req.query.profile);
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
  try {
    const urls = jobUrlParts(cfg);
    const url = urls.lastBuildApi();
    const r = await jenkinsFetchCfg(cfg, url);
    if (r.status === 404) {
      return res.json({ number: null, url: null, timestamp: null });
    }
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: `lastBuild ${r.status}`, detail: t.slice(0, 200) });
    }
    const data = await r.json();
    res.json({
      number: data.number != null ? Number(data.number) : null,
      url: data.url || null,
      timestamp: data.timestamp != null ? data.timestamp : null,
      building: !!data.building,
      result: data.result || null,
    });
  } catch (err) {
    console.error("[jenkins/last-build]", err.message);
    res.status(500).json({ error: err.message || "lastBuild failed" });
  }
});

/** Build status: building + result (SUCCESS / FAILURE / …). */
app.get("/api/jenkins/build-status", async (req, res) => {
  const num = req.query.number;
  let cfg;
  try {
    cfg = getJenkinsProfile(req.query.profile);
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
  if (num == null || num === "") {
    return res.status(400).json({ error: "Missing number query" });
  }
  try {
    const urls = jobUrlParts(cfg);
    const apiUrl = urls.buildResource(num, "api/json");
    const r = await jenkinsFetchCfg(cfg, apiUrl);
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({
        error: `Build API ${r.status}`,
        detail: t.slice(0, 200),
      });
    }
    const data = await r.json();
    res.json({
      building: !!data.building,
      result: data.result || null,
      url: data.url || null,
      number: data.number != null ? data.number : Number(num),
    });
  } catch (err) {
    console.error("[jenkins/build-status]", err.message);
    res.status(500).json({ error: err.message || "Build status failed" });
  }
});

/** Full console log — check for Finished: SUCCESS (same as Console Output page). */
app.get("/api/jenkins/console-verify", async (req, res) => {
  const num = req.query.number;
  let cfg;
  try {
    cfg = getJenkinsProfile(req.query.profile);
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
  if (num == null || num === "") {
    return res.status(400).json({ error: "Missing number query" });
  }
  try {
    const urls = jobUrlParts(cfg);
    const consoleUrl = urls.buildResource(num, "consoleText");
    const r = await jenkinsFetchCfg(cfg, consoleUrl);
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({
        error: `Console ${r.status}`,
        finishedSuccess: false,
        detail: t.slice(0, 200),
      });
    }
    const text = await r.text();
    /** Classic Freestyle / Pipeline both typically end with this line in consoleText. */
    const finishedSuccess = /Finished:\s*SUCCESS/i.test(text);
    res.json({
      finishedSuccess,
      resultLineFound: finishedSuccess,
    });
  } catch (err) {
    console.error("[jenkins/console-verify]", err.message);
    res.status(500).json({ error: err.message || "Console verify failed", finishedSuccess: false });
  }
});

/** Last non-empty line(s) of console — for Full bounce outcome messaging. */
app.get("/api/jenkins/console-summary", async (req, res) => {
  const num = req.query.number;
  let cfg;
  try {
    cfg = getJenkinsProfile(req.query.profile);
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
  if (num == null || num === "") {
    return res.status(400).json({ error: "Missing number query" });
  }
  try {
    const urls = jobUrlParts(cfg);
    const consoleUrl = urls.buildResource(num, "consoleText");
    const r = await jenkinsFetchCfg(cfg, consoleUrl);
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({
        error: `Console ${r.status}`,
        detail: t.slice(0, 200),
      });
    }
    const text = await r.text();
    const lines = text.split(/\r?\n/).filter((l) => String(l).trim().length > 0);
    const lastLine = lines.length ? String(lines[lines.length - 1]).trim() : "";
    const lastFew = lines.slice(-8).join("\n");
    const finishedSuccess = /Finished:\s*SUCCESS/i.test(text);
    const finishedFailure = /Finished:\s*FAILURE/i.test(text);
    res.json({
      lastLine,
      lastFew,
      finishedSuccess,
      finishedFailure,
    });
  } catch (err) {
    console.error("[jenkins/console-summary]", err.message);
    res.status(500).json({ error: err.message || "Console summary failed" });
  }
});

app.listen(PORT, () => {
  console.log(`EnvSync server at http://localhost:${PORT}`);
  if (!SSH_USER || !SSH_PASSWORD) {
    console.warn("Warning: SSH_USER or SSH_PASSWORD not set. Create .env from .env.example");
  }
  // Jenkins (Clean space) is optional — no startup noise. Missing vars are reported when /api/clean-space is used.
});
