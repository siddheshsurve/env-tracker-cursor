/**
 * EnvSync Dashboard – Testing environments list
 * Columns: Environment, Sprint, vApp ID, Logical name, Env owner (drag headers to reorder).
 * Replace ENVIRONMENTS with your API/data source when ready.
 */

const COLUMNS = {
  envName: { label: "Environment", key: "envName", className: "cell-env" },
  sprint: { label: "Sprint", key: "sprint" },
  vappId: { label: "vApp ID", key: "vappId", className: "cell-vapp" },
  dbHost: { label: "DB Host", key: "dbHost", className: "cell-vapp" },
  anmConnectivity: { label: "ANM Connectivity", key: "anmConnectivity", className: "cell-vapp" },
  logicalName: { label: "Logical name", key: "logicalName", className: "cell-name" },
  owner: { label: "Env owner", key: "owner", className: "cell-owner" },
  usedSpace: { label: "Used Space", key: "usedSpace" },
  cleanSpace: { label: "Clean Space", key: "cleanSpace" },
  fullBounce: { label: "Full Bounce", key: "fullBounce" },
  jnextDate: { label: "JNext Date", key: "jnextDate", className: "cell-jnext" },
  runJnext: { label: "Run JNext", key: "runJnext" },
  upgradedPackage: { label: "Upgraded Package", key: "upgradedPackage", className: "cell-vapp" },
  logicalDate: { label: "Logical Date", key: "logicalDate" },
};

const DEFAULT_COLUMN_ORDER = ["envName", "sprint", "vappId", "dbHost", "anmConnectivity", "logicalName", "owner", "usedSpace", "cleanSpace", "fullBounce", "jnextDate", "runJnext", "upgradedPackage", "logicalDate"];
const STORAGE_KEY = "envsync-column-order";
const STORAGE_KEY_ENVS = "envsync-environments";

/** Static daemon list for Daemon Status table (first column). */
const DAEMON_LIST = [
  "mro",
  "rqs",
  "BTLSOR",
  "BTLQUOTE",
  "TLS1APINV_2_1",
  "TLS1APINV_1_1",
  "TLS1APINV_10_1",
  "AR1PYMRCT",
  "AR1PYMPOST",
  "AR1INVRCT",
  "AR1DDREQCRE",
  "AR1DDFEDBCK",
  "AR1BILINTER",
  "AC1MANAGER",
  "AR9DDNOTIF",
  "AR9PYMCAPTRCN",
  "AR9RFNDCAPT",
  "AR9SUBKAFKA_1",
  "AR9UPDPAYMEN",
  "BL9PUBKAFKA",
];

const DEFAULT_ENVIRONMENTS = [
  { envName: "xk9m-2841", logicalName: "env-prod-7f2a", sprint: "Sprint 41", vappId: "vapp-9c3e-b1d8", dbHost: "10.204.88.112", anmConnectivity: "", owner: "Jordan Lee", usedSpace: "128 GB", cleanSpace: "", fullBounce: "", jnextDate: "", runJnext: "", upgradedPackage: "", logicalDate: "2025-02-15" },
  { envName: "qp2w-7193", logicalName: "env-staging-x4k9", sprint: "Sprint 38", vappId: "vapp-2a7f-e5c0", dbHost: "db-02.internal.net", anmConnectivity: "", owner: "Sam Rivera", usedSpace: "64 GB", cleanSpace: "", fullBounce: "", jnextDate: "", runJnext: "", upgradedPackage: "", logicalDate: "2025-01-20" },
  { envName: "bn4v-5630", logicalName: "env-qa-m8n2", sprint: "Sprint 42", vappId: "vapp-1d9a-4b6e", dbHost: "192.168.33.77", anmConnectivity: "", owner: "Alex Kim", usedSpace: "256 GB", cleanSpace: "", fullBounce: "", jnextDate: "", runJnext: "", upgradedPackage: "", logicalDate: "2025-02-01" },
  { envName: "ty8r-1046", logicalName: "env-dev-p3w1", sprint: "Sprint 39", vappId: "vapp-7e2c-8f4a", dbHost: "mysql-svc-05.cluster", anmConnectivity: "", owner: "Morgan Tate", usedSpace: "32 GB", cleanSpace: "", fullBounce: "", jnextDate: "", runJnext: "", upgradedPackage: "", logicalDate: "2025-01-10" },
  { envName: "hj6s-8925", logicalName: "env-test-q9k4", sprint: "Sprint 41", vappId: "vapp-5b0d-3c7f", dbHost: "pg-primary.region-a", anmConnectivity: "", owner: "Riley Chen", usedSpace: "96 GB", cleanSpace: "", fullBounce: "", jnextDate: "", runJnext: "", upgradedPackage: "", logicalDate: "2025-02-10" },
  { envName: "wc3p-4178", logicalName: "env-perf-n2m8", sprint: "Sprint 40", vappId: "vapp-8f1a-6e9b", dbHost: "10.55.12.203", anmConnectivity: "", owner: "Casey Drew", usedSpace: "512 GB", cleanSpace: "", fullBounce: "", jnextDate: "", runJnext: "", upgradedPackage: "", logicalDate: "2025-02-20" },
];

function generateId() {
  return "env-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function loadEnvs() {
  const defaultKeys = Object.keys(COLUMNS);
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ENVS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((e) => {
          const env = { ...e, id: e.id || generateId() };
          // Normalize snake_case to camelCase for display
          if (e.db_host !== undefined && e.db_host !== null && env.dbHost === undefined) env.dbHost = e.db_host;
          if (e.anm_connectivity !== undefined && e.anm_connectivity !== null && env.anmConnectivity === undefined) env.anmConnectivity = e.anm_connectivity;
          if (e.used_space !== undefined && e.used_space !== null && env.usedSpace === undefined) env.usedSpace = e.used_space;
          if (e.clean_space !== undefined && e.clean_space !== null && env.cleanSpace === undefined) env.cleanSpace = e.clean_space;
          if (e.full_bounce !== undefined && e.full_bounce !== null && env.fullBounce === undefined) env.fullBounce = e.full_bounce;
          if (e.jnext_date !== undefined && e.jnext_date !== null && env.jnextDate === undefined) env.jnextDate = e.jnext_date;
          if (e.run_jnext !== undefined && e.run_jnext !== null && env.runJnext === undefined) env.runJnext = e.run_jnext;
          if (e.upgraded_package !== undefined && e.upgraded_package !== null && env.upgradedPackage === undefined) env.upgradedPackage = e.upgraded_package;
          if (e.logical_date !== undefined && e.logical_date !== null && env.logicalDate === undefined) env.logicalDate = e.logical_date;
          // Ensure every column key exists so new fields display
          for (const key of defaultKeys) {
            if (env[key] === undefined) env[key] = "";
          }
          return env;
        });
      }
    }
  } catch (_) {}
  return DEFAULT_ENVIRONMENTS.map((e, i) => ({ ...e, id: e.id || "env-default-" + i }));
}

function saveEnvs() {
  try {
    localStorage.setItem(STORAGE_KEY_ENVS, JSON.stringify(allEnvs));
  } catch (_) {}
}

/** Base URL for API (empty when served from same Node server). */
const API_BASE = "";

let allEnvs = loadEnvs();
let sortKey = "envName";
let sortDir = "asc";
let columnOrder = loadColumnOrder();
let wasDragging = false;
/** Daemon status per env: daemonStatusMap[envId][daemon] = "Up" | "Down" */
let daemonStatusMap = {};

const theadRow = document.getElementById("env-thead-row");
const tbody = document.getElementById("env-tbody");
const searchInput = document.getElementById("search");
const filterSprint = document.getElementById("filter-sprint");
const filterOwner = document.getElementById("filter-owner");
const envCount = document.getElementById("env-count");
const emptyState = document.getElementById("empty-state");
const table = document.getElementById("env-table");
const daemonTheadRow = document.getElementById("daemon-thead-row");
const daemonTbody = document.getElementById("daemon-tbody");

function loadColumnOrder() {
  const allColumnIds = Object.keys(COLUMNS);
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const valid = parsed.filter((id) => COLUMNS[id]);
      // Merge in any columns that exist in COLUMNS but are missing from saved order (e.g. newly added dbHost)
      const merged = [...valid];
      const missing = allColumnIds.filter((id) => !merged.includes(id));
      if (missing.includes("fullBounce") && merged.includes("cleanSpace")) {
        const ci = merged.indexOf("cleanSpace");
        merged.splice(ci + 1, 0, "fullBounce");
        missing
          .filter((id) => id !== "fullBounce")
          .forEach((id) => merged.push(id));
      } else {
        missing.forEach((id) => merged.push(id));
      }
      return merged.length ? merged : [...DEFAULT_COLUMN_ORDER];
    }
  } catch (_) {}
  return [...DEFAULT_COLUMN_ORDER];
}

function saveColumnOrder() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnOrder));
  } catch (_) {}
}

function getFilteredEnvs() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const sprint = filterSprint.value;
  const owner = filterOwner.value;

  return allEnvs.filter((env) => {
    const matchSearch =
      !q ||
      env.envName.toLowerCase().includes(q) ||
      env.logicalName.toLowerCase().includes(q) ||
      (env.vappId && env.vappId.toLowerCase().includes(q)) ||
      (env.dbHost && env.dbHost.toLowerCase().includes(q)) ||
      (env.db_host && String(env.db_host).toLowerCase().includes(q)) ||
      (env.usedSpace && String(env.usedSpace).toLowerCase().includes(q)) ||
      (env.cleanSpace && String(env.cleanSpace).toLowerCase().includes(q)) ||
      (env.fullBounce && String(env.fullBounce).toLowerCase().includes(q)) ||
      (env.jnextDate && String(env.jnextDate).toLowerCase().includes(q)) ||
      (env.jnext_date && String(env.jnext_date).toLowerCase().includes(q)) ||
      (env.runJnext && String(env.runJnext).toLowerCase().includes(q)) ||
      (env.upgradedPackage && String(env.upgradedPackage).toLowerCase().includes(q)) ||
      (env.logicalDate && String(env.logicalDate).toLowerCase().includes(q)) ||
      (env.owner && env.owner.toLowerCase().includes(q)) ||
      (env.sprint && env.sprint.toLowerCase().includes(q));
    const matchSprint = !sprint || env.sprint === sprint;
    const matchOwner = !owner || env.owner === owner;
    return matchSearch && matchSprint && matchOwner;
  });
}

function compare(a, b) {
  const va = a[sortKey] ?? "";
  const vb = b[sortKey] ?? "";
  const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
  return sortDir === "asc" ? cmp : -cmp;
}

function escapeHtml(s) {
  if (s == null || s === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(s);
  return div.innerHTML;
}

/** Get value for a column from env, supporting both camelCase and snake_case. */
function getEnvValue(env, colKey) {
  const val = env[colKey];
  if (val !== undefined && val !== null && val !== "") return String(val);
  if (colKey === "dbHost" && (env.db_host !== undefined && env.db_host !== null)) return String(env.db_host);
  if (colKey === "anmConnectivity" && (env.anm_connectivity !== undefined && env.anm_connectivity !== null)) return String(env.anm_connectivity);
  if (colKey === "usedSpace") {
    const u = env.used_space;
    if (u !== undefined && u !== null && u !== "") return String(u);
    return "—"; // Fetched from Unix; show placeholder when empty
  }
  if (colKey === "cleanSpace") {
    const c = env.clean_space;
    if (c !== undefined && c !== null && c !== "") return String(c);
    return val === undefined || val === null ? "" : String(val);
  }
  if (colKey === "fullBounce") {
    const f = env.full_bounce;
    if (f !== undefined && f !== null && f !== "") return String(f);
    return val === undefined || val === null ? "" : String(val);
  }
  if (colKey === "jnextDate") {
    const j = env.jnext_date;
    if (j !== undefined && j !== null && j !== "") return String(j);
    return val === undefined || val === null || val === "" ? "—" : String(val);
  }
  if (colKey === "runJnext") {
    const r = env.run_jnext;
    if (r !== undefined && r !== null && r !== "") return String(r);
    return val === undefined || val === null ? "" : String(val);
  }
  if (colKey === "upgradedPackage") {
    const p = env.upgraded_package;
    if (p !== undefined && p !== null && p !== "") return String(p);
    return val === undefined || val === null ? "" : String(val);
  }
  if (colKey === "logicalDate") {
    const d = env.logical_date;
    if (d !== undefined && d !== null && d !== "") return String(d);
    return "—";
  }
  return val === undefined || val === null ? "" : String(val);
}

/** Return CSS class for Used Space cell based on percentage: &lt;50 green, 50-80 yellow, ≥80 red. */
function getUsedSpaceColorClass(val) {
  if (val == null || val === "" || val === "—") return "";
  const num = parseFloat(String(val).replace(/[%\s]/g, ""));
  if (Number.isNaN(num)) return "";
  if (num < 50) return "used-space-low";
  if (num < 80) return "used-space-mid";
  return "used-space-high";
}

/** Return battery-style bar HTML for percentage, or escaped text for non-percentage used space values. */
function getUsedSpaceBarHtml(val) {
  if (val == null || val === "" || val === "—") return escapeHtml(val || "—");
  const str = String(val).trim();
  const num = parseFloat(str.replace(/[%\s]/g, ""));
  const looksLikePct = str.includes("%") || (Number.isNaN(num) === false && num >= 0 && num <= 100 && !/[a-zA-Z]/.test(str.replace(/%/g, "")));
  if (!looksLikePct || Number.isNaN(num) || num < 0) return escapeHtml(str);
  const pct = Math.min(100, Math.max(0, num));
  const colorClass = getUsedSpaceColorClass(val);
  const displayText = str.match(/%/) ? str : pct + "%";
  return (
    '<span class="used-space-bar-wrap">' +
    '<span class="used-space-bar">' +
    '<span class="used-space-bar-fill ' + (colorClass || "") + '" style="width:' + pct + '%"></span>' +
    "</span>" +
    '<span class="used-space-bar-pct">' + escapeHtml(displayText) + "</span>" +
    "</span>"
  );
}

function getDisplayColumnOrder() {
  // Always include all columns; columnOrder may be from before dbHost was added
  const order = columnOrder.filter((id) => COLUMNS[id]);
  const allIds = Object.keys(COLUMNS);
  for (const id of allIds) {
    if (!order.includes(id)) order.push(id);
  }
  return order.length ? order : [...DEFAULT_COLUMN_ORDER];
}

function renderHeader() {
  const displayOrder = getDisplayColumnOrder();
  const colHeaders = displayOrder
    .map(
      (colId) => {
        const col = COLUMNS[colId];
        if (!col) return "";
        const label = escapeHtml(col.label);
        return `<th scope="col" data-sort="${escapeHtml(col.key)}" data-col-id="${escapeHtml(colId)}" draggable="true" role="columnheader">
          <span class="col-drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
          <span class="col-label">${label}</span>
        </th>`;
      }
    )
    .join("");
  theadRow.innerHTML = colHeaders + "<th scope=\"col\" class=\"cell-actions\">Actions</th>";
  initSort();
  initColumnDrag();
}

function renderBody() {
  const filtered = getFilteredEnvs();
  const sorted = [...filtered].sort(compare);
  const displayOrder = getDisplayColumnOrder();

  tbody.innerHTML = sorted
    .map((env) => {
      const cells = displayOrder
        .map((colId) => {
          const col = COLUMNS[colId];
          if (!col) return "";
          const val = getEnvValue(env, col.key);
          let cls = col.className ? escapeHtml(col.className) : "";
          let content;
          if (colId === "usedSpace") {
            cls = cls ? cls + " cell-used-space" : "cell-used-space";
            content = getUsedSpaceBarHtml(val);
          } else if (colId === "cleanSpace") {
            const envId = escapeHtml(env.id || "");
            content =
              '<button type="button" class="btn btn-secondary btn-clean-space" data-env-id="' + envId + '" title="Clean space action">Clean space</button>';
          } else if (colId === "fullBounce") {
            const envId = escapeHtml(env.id || "");
            content =
              '<button type="button" class="btn btn-secondary btn-full-bounce" data-env-id="' + envId + '" title="Full bounce action">Full bounce</button>';
          } else {
            content = escapeHtml(val);
          }
          if (cls) cls = ` class="${cls}"`;
          return `<td${cls}>${content}</td>`;
        })
        .join("");
      const envId = escapeHtml(env.id || "");
      return `<tr data-env-id="${envId}">${cells}<td class="cell-actions"><button type="button" class="btn btn-danger btn-delete" data-env-id="${envId}" title="Delete this entry">Delete</button></td></tr>`;
    })
    .join("");

  envCount.textContent = `${sorted.length} environment${sorted.length !== 1 ? "s" : ""}`;
  emptyState.hidden = sorted.length > 0;
  initDeleteButtons();
  initCleanSpaceButtons();
  initFullBounceButtons();
}

/** Trailing digits from env name (illnqw8358 → 8358) — must match server logic. */
function getEnvironmentNumberFromName(envName) {
  if (!envName || typeof envName !== "string") return null;
  const m = String(envName).trim().match(/(\d+)$/);
  return m ? m[1] : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** vApp id → VAPP_NNN for J-Boot-PMX ENV (same rules as server). */
function normalizeVappForJenkinsClient(vappId) {
  if (vappId == null || String(vappId).trim() === "") return null;
  const s = String(vappId).trim();
  const m = s.match(/(\d+)/);
  if (m) return `VAPP_${m[1]}`;
  const u = s.replace(/-/g, "_").toUpperCase();
  if (/^VAPP_\d+$/.test(u)) return u;
  return null;
}

function jenkinsProfileQuery(profile) {
  return `profile=${encodeURIComponent(profile)}`;
}

/**
 * Resolve build # and wait for completion (queue + lastBuild + build-status).
 * @param {string} profile - "cleanup" | "fullBounce"
 * @param {{ acceptAnyJenkinsResult?: boolean }} opts - if true, do not throw on FAILURE/UNSTABLE
 * @returns {{ buildNum: number, jenkinsResult: string }}
 */
async function waitForJenkinsJobPipeline(
  queueItemUrl,
  previousBuildNumber,
  triggeredAtMs,
  button,
  profile,
  opts
) {
  const acceptAny = opts && opts.acceptAnyJenkinsResult === true;
  const api = API_BASE || "";
  const pq = jenkinsProfileQuery(profile);
  let buildNum = null;
  let buildPageUrl = null;

  if (queueItemUrl) {
    for (let i = 0; i < 90; i++) {
      const r = await fetch(
        `${api}/api/jenkins/queue?url=${encodeURIComponent(queueItemUrl)}&${pq}`
      );
      const q = await r.json();
      if (!r.ok) throw new Error(q.error || q.detail || "Queue poll failed");
      if (q.cancelled) throw new Error("Build was cancelled in the Jenkins queue.");
      if (q.executableNumber != null) {
        buildNum = q.executableNumber;
        buildPageUrl = q.executableUrl || null;
        break;
      }
      if (q.queueGone) break;
      if (button) button.textContent = "In queue…";
      await sleep(1500);
    }
  }

  if (buildNum == null) {
    await sleep(2000);
    if (button) button.textContent = "Finding build #…";
    for (let i = 0; i < 200; i++) {
      const r = await fetch(`${api}/api/jenkins/last-build?${pq}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || j.detail || "last-build poll failed");
      if (j.number != null) {
        const n = Number(j.number);
        const prevOk =
          previousBuildNumber != null && !Number.isNaN(Number(previousBuildNumber));
        if (prevOk && n > Number(previousBuildNumber)) {
          buildNum = n;
          buildPageUrl = j.url || buildPageUrl;
          break;
        }
        if (!prevOk && triggeredAtMs != null) {
          const ts = j.timestamp != null ? Number(j.timestamp) : 0;
          if (ts >= Number(triggeredAtMs) - 20000) {
            buildNum = n;
            buildPageUrl = j.url || buildPageUrl;
            break;
          }
        }
        if (!prevOk && j.building === true) {
          buildNum = n;
          buildPageUrl = j.url || buildPageUrl;
          break;
        }
      }
      if (button) button.textContent = "Finding build #…";
      await sleep(1500);
    }
  }

  if (buildNum == null) {
    throw new Error(
      "Could not detect the new build (queue expired and lastBuild did not advance). Check the job in Jenkins."
    );
  }

  if (buildPageUrl) {
    try {
      window.open(buildPageUrl, "_blank", "noopener,noreferrer");
    } catch (_) {
      /* popup may be blocked */
    }
  }

  if (button) button.textContent = "Build #" + buildNum + "…";

  let jenkinsResult = null;
  for (let i = 0; i < 1200; i++) {
    const r = await fetch(
      `${api}/api/jenkins/build-status?number=${encodeURIComponent(buildNum)}&${pq}`
    );
    const b = await r.json();
    if (!r.ok) throw new Error(b.error || b.detail || "Build status failed");
    const hasResult = b.result != null && String(b.result).length > 0;
    if (!b.building && hasResult) {
      jenkinsResult = String(b.result);
      if (!acceptAny && b.result !== "SUCCESS") {
        throw new Error(
          `Jenkins build finished with result: ${b.result}. Check Console Output in Jenkins.`
        );
      }
      break;
    }
    if (button) button.textContent = "Build #" + buildNum + " running…";
    await sleep(3000);
  }
  if (jenkinsResult == null) {
    throw new Error("Timed out waiting for the build to finish (still running in Jenkins).");
  }

  return { buildNum, jenkinsResult };
}

/**
 * ENV_CLEANUP: must end with Finished: SUCCESS in console.
 */
async function waitForCleanSpacePipeline(queueItemUrl, previousBuildNumber, triggeredAtMs, button) {
  const { buildNum } = await waitForJenkinsJobPipeline(
    queueItemUrl,
    previousBuildNumber,
    triggeredAtMs,
    button,
    "cleanup",
    { acceptAnyJenkinsResult: false }
  );
  const api = API_BASE || "";
  const r = await fetch(
    `${api}/api/jenkins/console-verify?number=${encodeURIComponent(buildNum)}&${jenkinsProfileQuery("cleanup")}`
  );
  const c = await r.json();
  if (!r.ok) throw new Error(c.error || "Console verify failed");
  if (!c.finishedSuccess) {
    throw new Error(
      'Build reported SUCCESS but the console log did not contain "Finished: SUCCESS". Open Console Output in Jenkins to verify.'
    );
  }
  return buildNum;
}

/**
 * J-Boot-PMX: report Jenkins result + last console line (any outcome).
 */
async function waitForFullBouncePipeline(queueItemUrl, previousBuildNumber, triggeredAtMs, button) {
  const { buildNum, jenkinsResult } = await waitForJenkinsJobPipeline(
    queueItemUrl,
    previousBuildNumber,
    triggeredAtMs,
    button,
    "fullBounce",
    { acceptAnyJenkinsResult: true }
  );
  const api = API_BASE || "";
  const r = await fetch(
    `${api}/api/jenkins/console-summary?number=${encodeURIComponent(buildNum)}&${jenkinsProfileQuery("fullBounce")}`
  );
  const s = await r.json();
  if (!r.ok) throw new Error(s.error || "Console summary failed");
  return {
    buildNum,
    jenkinsResult,
    lastLine: s.lastLine || "",
    lastFew: s.lastFew || "",
    finishedSuccess: !!s.finishedSuccess,
    finishedFailure: !!s.finishedFailure,
  };
}

function initCleanSpaceButtons() {
  tbody.querySelectorAll(".btn-clean-space").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-env-id");
      if (!id) return;
      const env = allEnvs.find((r) => r.id === id);
      if (!env) return;
      const envName = getEnvValue(env, "envName");
      const envNum = getEnvironmentNumberFromName(envName);
      if (!envNum) {
        alert(
          "Cannot derive environment number from this name. Use a name ending in digits (e.g. illnqw8358 → 8358)."
        );
        return;
      }
      if (
        !confirm(
          `Trigger Jenkins ENV_CLEANUP for ENV=${envNum} (LIBS_CLEANUP only)?\n\nThe app will wait until the job completes and the log shows "Finished: SUCCESS".`
        )
      ) {
        return;
      }
      const b = e.currentTarget;
      const prevText = b.textContent;
      b.disabled = true;
      b.textContent = "Queuing…";
      try {
        const res = await fetch((API_BASE || "") + "/api/clean-space", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ envName }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || res.statusText || "Request failed");
        }
        b.textContent = data.queueItemUrl ? "Waiting in queue…" : "Finding build #…";
        const buildNum = await waitForCleanSpacePipeline(
          data.queueItemUrl || null,
          data.previousBuildNumber,
          data.triggeredAtMs,
          b
        );
        b.textContent = "Refreshing used space…";
        await refreshUsedSpaceCore();
        saveEnvs();
        render();
        setLastUpdated();
        alert(
          `Clean space job completed successfully (build #${buildNum}).\n\n` +
            `Console output contains "Finished: SUCCESS".\n\n` +
            `Used space has been refreshed for all environments.`
        );
      } catch (err) {
        alert("Clean space (Jenkins): " + (err.message || String(err)));
      } finally {
        b.disabled = false;
        b.textContent = prevText;
      }
    });
  });
}

/** Per-row Full bounce — J-Boot-PMX on ilcechr042 (see .env). */
function initFullBounceButtons() {
  tbody.querySelectorAll(".btn-full-bounce").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-env-id");
      if (!id) return;
      const env = allEnvs.find((r) => r.id === id);
      if (!env) return;
      const vappRaw = getEnvValue(env, "vappId");
      const envNorm = normalizeVappForJenkinsClient(vappRaw);
      if (!envNorm) {
        alert(
          "Set a valid vApp ID for this row (e.g. VAPP_81 or any value containing the number, like vapp-148)."
        );
        return;
      }
      if (
        !confirm(
          `Trigger Full bounce (J-Boot-PMX) for ENV=${envNorm}?\n\n` +
            `Uses: ENV_TYPE=ST, Action=ReStart, ComponentType=FULL, Component=FULL, CleanLogs/CleanCache=ON, OnFailure=skip.\n\n` +
            `The app will wait until the pipeline finishes and show the Jenkins result and last console line.`
        )
      ) {
        return;
      }
      const b = e.currentTarget;
      const prevText = b.textContent;
      b.disabled = true;
      b.textContent = "Queuing…";
      try {
        const res = await fetch((API_BASE || "") + "/api/full-bounce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vappId: vappRaw }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || res.statusText || "Request failed");
        }
        b.textContent = data.queueItemUrl ? "Waiting in queue…" : "Finding build #…";
        const out = await waitForFullBouncePipeline(
          data.queueItemUrl || null,
          data.previousBuildNumber,
          data.triggeredAtMs,
          b
        );
        alert(
          `Full bounce finished (build #${out.buildNum}).\n\n` +
            `Jenkins result: ${out.jenkinsResult}\n\n` +
            `Last console line:\n${out.lastLine || "(none)"}\n\n` +
            (out.finishedSuccess
              ? "You can run Refresh All if needed."
              : "Check Console Output in Jenkins for details.")
        );
      } catch (err) {
        alert("Full bounce (Jenkins): " + (err.message || String(err)));
      } finally {
        b.disabled = false;
        b.textContent = prevText;
      }
    });
  });
}

function initDeleteButtons() {
  tbody.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-env-id");
      if (!id) return;
      if (!confirm("Delete this environment entry?")) return;
      allEnvs = allEnvs.filter((env) => env.id !== id);
      saveEnvs();
      populateFilters();
      render();
      setLastUpdated();
    });
  });
}

function getStoredDaemonStatus(envId, daemon) {
  return (daemonStatusMap[envId] && daemonStatusMap[envId][daemon]) || null;
}

function renderDaemonTable() {
  if (!daemonTheadRow || !daemonTbody) return;
  const envs = [...allEnvs];
  const headerCells =
    "<th scope=\"col\" class=\"daemon-col-label\">Daemons/ENV</th>" +
    envs.map((e) => `<th scope="col">${escapeHtml(e.envName || "")}</th>`).join("");
  daemonTheadRow.innerHTML = headerCells;
  daemonTbody.innerHTML = DAEMON_LIST.map(
    (daemon) =>
      "<tr><td class=\"daemon-name\">" +
      escapeHtml(daemon) +
      "</td>" +
      envs.map((env) => {
        const status = getStoredDaemonStatus(env.id, daemon);
        const display = status != null ? status : "—";
        let cellContent;
        if (display === "Up") {
          cellContent = '<span class="status-dot status-up" title="Up" aria-label="Up"></span>';
        } else if (display === "Down") {
          cellContent = '<span class="status-dot status-down" title="Down" aria-label="Down"></span>';
        } else {
          const cls = display === "Error" ? "daemon-error" : "";
          cellContent = `<span class="${cls}">${escapeHtml(display)}</span>`;
        }
        return `<td>${cellContent}</td>`;
      }).join("") +
      "</tr>"
  ).join("");
}

async function fetchDaemonStatusForHost(host, daemon) {
  let res;
  try {
    res = await fetch(API_BASE + "/api/daemon-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: host || "", daemon: daemon || "" }),
    });
  } catch (e) {
    return Promise.reject(new Error("API unreachable. Start server with: npm start"));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error && typeof data.error === "string" ? data.error : "Request failed";
    return Promise.reject(new Error(msg));
  }
  const status = data.status;
  return status === "Up" || status === "Down" ? status : "Down";
}

/** Fetch daemon status for every env × daemon. No UI. */
function refreshDaemonStatusCore() {
  const envs = [...allEnvs];
  const tasks = [];
  envs.forEach((env) => {
    if (!daemonStatusMap[env.id]) daemonStatusMap[env.id] = {};
    const host = (env.envName || "").trim();
    if (!host) return;
    DAEMON_LIST.forEach((daemon) => {
      tasks.push(
        fetchDaemonStatusForHost(host, daemon)
          .then((status) => {
            daemonStatusMap[env.id][daemon] = status;
          })
          .catch(() => {
            daemonStatusMap[env.id][daemon] = "Error";
          })
      );
    });
  });
  return Promise.all(tasks);
}

function render() {
  renderHeader();
  renderBody();
  renderDaemonTable();
}

function initSort() {
  table.querySelectorAll("th[data-sort] .col-label").forEach((label) => {
    label.addEventListener("click", (e) => {
      e.stopPropagation();
      if (wasDragging) return;
      const th = label.closest("th");
      const key = th.getAttribute("data-sort");
      if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
      else (sortKey = key), (sortDir = "asc");
      table.querySelectorAll("th[data-sort]").forEach((h) => h.removeAttribute("aria-sort"));
      th.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");
      renderBody();
    });
  });
}

function initColumnDrag() {
  const headers = table.querySelectorAll("th[data-col-id]");

  headers.forEach((th) => {
    th.setAttribute("draggable", "true");

    th.addEventListener("dragstart", (e) => {
      wasDragging = true;
      const colId = th.getAttribute("data-col-id");
      e.dataTransfer.setData("text/plain", colId);
      e.dataTransfer.effectAllowed = "move";
      th.classList.add("dragging");
    });

    th.addEventListener("dragend", (e) => {
      th.classList.remove("dragging");
      table.querySelectorAll("th.drag-over").forEach((h) => h.classList.remove("drag-over"));
      setTimeout(() => (wasDragging = false), 0);
    });

    th.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!th.classList.contains("dragging")) {
        table.querySelectorAll("th.drag-over").forEach((h) => h.classList.remove("drag-over"));
        th.classList.add("drag-over");
      }
    });

    th.addEventListener("dragleave", () => {
      th.classList.remove("drag-over");
    });

    th.addEventListener("drop", (e) => {
      e.preventDefault();
      th.classList.remove("drag-over");
      const colId = e.dataTransfer.getData("text/plain");
      const targetId = th.getAttribute("data-col-id");
      if (!colId || colId === targetId) return;
      const fromIdx = columnOrder.indexOf(colId);
      const toIdx = columnOrder.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return;
      const newOrder = [...columnOrder];
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, colId);
      columnOrder = newOrder;
      saveColumnOrder();
      render();
    });
  });
}

function populateFilters() {
  const sprints = [...new Set(allEnvs.map((e) => e.sprint).filter(Boolean))].sort();
  const owners = [...new Set(allEnvs.map((e) => e.owner).filter(Boolean))].sort();

  filterSprint.innerHTML =
    '<option value="">All sprints</option>' +
    sprints.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  filterOwner.innerHTML =
    '<option value="">All owners</option>' +
    owners.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
}

function setLastUpdated() {
  const el = document.getElementById("last-updated");
  if (el) el.textContent = new Date().toLocaleString();
}

searchInput.addEventListener("input", () => {
  renderBody();
});
filterSprint.addEventListener("change", renderBody);
filterOwner.addEventListener("change", renderBody);

const addForm = document.getElementById("add-env-form");
const addEntrySection = document.getElementById("add-entry-section");
const btnAddEnv = document.getElementById("btn-add-env");
const btnCancelAdd = document.getElementById("btn-cancel-add");

function showAddForm() {
  addEntrySection.hidden = false;
}
function hideAddForm() {
  addEntrySection.hidden = true;
  addForm.reset();
}

btnAddEnv.addEventListener("click", showAddForm);
btnCancelAdd.addEventListener("click", hideAddForm);

async function fetchUsedSpaceForHost(host) {
  let res;
  try {
    res = await fetch(API_BASE + "/api/used-space", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: host || "" }),
    });
  } catch (e) {
    return Promise.reject(new Error("API unreachable. Start server with: npm start"));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error && typeof data.error === "string" ? data.error : "Request failed";
    return Promise.reject(new Error(msg));
  }
  const raw = data.usedSpace;
  if (raw !== undefined && raw !== null) return String(raw).trim() || "—";
  return "—";
}

/** Refetch used space for every row. No UI (used by Refresh All and after Clean space). */
function refreshUsedSpaceCore() {
  const envs = [...allEnvs];
  return Promise.all(
    envs.map((env) => {
      const host = (env.envName || "").trim();
      if (!host) return Promise.resolve();
      return fetchUsedSpaceForHost(host)
        .then((usedSpace) => {
          env.usedSpace = usedSpace != null && usedSpace !== "" ? String(usedSpace) : "—";
        })
        .catch((err) => {
          const msg = err && err.message ? String(err.message) : "Error";
          env.usedSpace = msg.length > 50 ? msg.slice(0, 47) + "…" : msg;
          console.error("Used space for " + host + ":", err.message);
        });
    })
  );
}

async function fetchLogicalDateForHost(host) {
  let res;
  try {
    res = await fetch(API_BASE + "/api/logical-date", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: host || "" }),
    });
  } catch (e) {
    return Promise.reject(new Error("API unreachable. Start server with: npm start"));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error && typeof data.error === "string" ? data.error : "Request failed";
    return Promise.reject(new Error(msg));
  }
  const raw = data.logicalDate;
  if (raw !== undefined && raw !== null) return String(raw).trim() || "—";
  return "—";
}

function refreshLogicalDateCore() {
  const envs = [...allEnvs];
  return Promise.all(
    envs.map((env) => {
      const host = (env.envName || "").trim();
      if (!host) return Promise.resolve();
      return fetchLogicalDateForHost(host)
        .then((logicalDate) => {
          env.logicalDate = logicalDate != null && logicalDate !== "" ? String(logicalDate) : "—";
        })
        .catch((err) => {
          const msg = err && err.message ? String(err.message) : "Error";
          env.logicalDate = msg.length > 50 ? msg.slice(0, 47) + "…" : msg;
          console.error("Logical date for " + host + ":", err.message);
        });
    })
  );
}

async function fetchJnextPlanForHost(host) {
  let res;
  try {
    res = await fetch(API_BASE + "/api/jnext-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: host || "" }),
    });
  } catch (e) {
    return Promise.reject(new Error("API unreachable. Start server with: npm start"));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error && typeof data.error === "string" ? data.error : "Request failed";
    return Promise.reject(new Error(msg));
  }
  const raw = data.jnextPlanLine;
  if (raw !== undefined && raw !== null) return String(raw).trim();
  return "";
}

function refreshJnextPlanCore() {
  const envs = [...allEnvs];
  return Promise.all(
    envs.map((env) => {
      const host = (env.envName || "").trim();
      if (!host) return Promise.resolve();
      return fetchJnextPlanForHost(host)
        .then((line) => {
          env.jnextDate = line != null && line !== "" ? String(line) : "—";
        })
        .catch((err) => {
          const msg = err && err.message ? String(err.message) : "Error";
          env.jnextDate = msg.length > 80 ? msg.slice(0, 77) + "…" : msg;
          console.error("JNext plan for " + host + ":", err.message);
        });
    })
  );
}

/**
 * Runs used space → logical date → JNext date → daemon status (sequential phases).
 */
async function refreshAll() {
  const btn = document.getElementById("btn-refresh-all");
  if (!btn || btn.disabled) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  try {
    const steps = [
      ["Used space…", refreshUsedSpaceCore],
      ["Logical date…", refreshLogicalDateCore],
      ["JNext date…", refreshJnextPlanCore],
      ["Daemon status…", refreshDaemonStatusCore],
    ];
    for (const [label, run] of steps) {
      btn.textContent = label;
      await run();
      saveEnvs();
      render();
      setLastUpdated();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

const btnRefreshAll = document.getElementById("btn-refresh-all");
if (btnRefreshAll) btnRefreshAll.addEventListener("click", () => refreshAll());

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(addForm);
  const envName = (fd.get("envName") || "").trim();
  const sprint = (fd.get("sprint") || "").trim();
  const vappId = (fd.get("vappId") || "").trim();
  const dbHost = (fd.get("dbHost") || "").trim();
  const anmConnectivity = (fd.get("anmConnectivity") || "").trim();
  const logicalName = (fd.get("logicalName") || "").trim();
  const owner = (fd.get("owner") || "").trim();
  const jnextDate = (fd.get("jnextDate") || "").trim();
  const runJnext = (fd.get("runJnext") || "").trim();
  const upgradedPackage = (fd.get("upgradedPackage") || "").trim();
  if (!envName || !sprint || !vappId || !logicalName || !owner) return;
  allEnvs.push({
    id: generateId(),
    envName,
    sprint,
    vappId,
    dbHost: dbHost || "",
    anmConnectivity: anmConnectivity || "",
    logicalName,
    owner,
    usedSpace: "",
    cleanSpace: "",
    fullBounce: "",
    jnextDate,
    runJnext,
    upgradedPackage,
    logicalDate: "",
  });
  saveEnvs();
  populateFilters();
  render();
  setLastUpdated();
  addForm.reset();
  hideAddForm();
});

populateFilters();
render();
setLastUpdated();

/** On first load, run the same sequence as Refresh All (no click required). */
if (btnRefreshAll) {
  refreshAll();
}

(function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  const label = document.getElementById("theme-toggle-label");
  function updateLabel() {
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    label.textContent = theme === "dark" ? "Light" : "Dark";
  }
  updateLabel();
  if (toggle) {
    toggle.addEventListener("click", () => {
      const theme = document.documentElement.getAttribute("data-theme") || "dark";
      const next = theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("envsync-theme", next);
      } catch (_) {}
      updateLabel();
    });
  }
})();
