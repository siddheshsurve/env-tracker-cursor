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
  logicalName: { label: "Logical name", key: "logicalName", className: "cell-name" },
  owner: { label: "Env owner", key: "owner", className: "cell-owner" },
  usedSpace: { label: "Used Space", key: "usedSpace" },
  logicalDate: { label: "Logical Date", key: "logicalDate" },
};

const DEFAULT_COLUMN_ORDER = ["envName", "sprint", "vappId", "dbHost", "logicalName", "owner", "usedSpace", "logicalDate"];
const STORAGE_KEY = "envsync-column-order";
const STORAGE_KEY_ENVS = "envsync-environments";

const DEFAULT_ENVIRONMENTS = [
  { envName: "xk9m-2841", logicalName: "env-prod-7f2a", sprint: "Sprint 41", vappId: "vapp-9c3e-b1d8", dbHost: "10.204.88.112", owner: "Jordan Lee", usedSpace: "128 GB", logicalDate: "2025-02-15" },
  { envName: "qp2w-7193", logicalName: "env-staging-x4k9", sprint: "Sprint 38", vappId: "vapp-2a7f-e5c0", dbHost: "db-02.internal.net", owner: "Sam Rivera", usedSpace: "64 GB", logicalDate: "2025-01-20" },
  { envName: "bn4v-5630", logicalName: "env-qa-m8n2", sprint: "Sprint 42", vappId: "vapp-1d9a-4b6e", dbHost: "192.168.33.77", owner: "Alex Kim", usedSpace: "256 GB", logicalDate: "2025-02-01" },
  { envName: "ty8r-1046", logicalName: "env-dev-p3w1", sprint: "Sprint 39", vappId: "vapp-7e2c-8f4a", dbHost: "mysql-svc-05.cluster", owner: "Morgan Tate", usedSpace: "32 GB", logicalDate: "2025-01-10" },
  { envName: "hj6s-8925", logicalName: "env-test-q9k4", sprint: "Sprint 41", vappId: "vapp-5b0d-3c7f", dbHost: "pg-primary.region-a", owner: "Riley Chen", usedSpace: "96 GB", logicalDate: "2025-02-10" },
  { envName: "wc3p-4178", logicalName: "env-perf-n2m8", sprint: "Sprint 40", vappId: "vapp-8f1a-6e9b", dbHost: "10.55.12.203", owner: "Casey Drew", usedSpace: "512 GB", logicalDate: "2025-02-20" },
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
          if (e.used_space !== undefined && e.used_space !== null && env.usedSpace === undefined) env.usedSpace = e.used_space;
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

const theadRow = document.getElementById("env-thead-row");
const tbody = document.getElementById("env-tbody");
const searchInput = document.getElementById("search");
const filterSprint = document.getElementById("filter-sprint");
const filterOwner = document.getElementById("filter-owner");
const envCount = document.getElementById("env-count");
const emptyState = document.getElementById("empty-state");
const table = document.getElementById("env-table");

function loadColumnOrder() {
  const allColumnIds = Object.keys(COLUMNS);
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const valid = parsed.filter((id) => COLUMNS[id]);
      // Merge in any columns that exist in COLUMNS but are missing from saved order (e.g. newly added dbHost)
      const merged = [...valid];
      for (const id of allColumnIds) {
        if (!merged.includes(id)) merged.push(id);
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
  if (colKey === "usedSpace") {
    const u = env.used_space;
    if (u !== undefined && u !== null && u !== "") return String(u);
    return "—"; // Fetched from Unix; show placeholder when empty
  }
  if (colKey === "logicalDate") {
    const d = env.logical_date;
    if (d !== undefined && d !== null && d !== "") return String(d);
    return "—";
  }
  return val === undefined || val === null ? "" : String(val);
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
          const cls = col.className ? ` class="${escapeHtml(col.className)}"` : "";
          return `<td${cls}>${escapeHtml(val)}</td>`;
        })
        .join("");
      const envId = escapeHtml(env.id || "");
      return `<tr data-env-id="${envId}">${cells}<td class="cell-actions"><button type="button" class="btn btn-danger btn-delete" data-env-id="${envId}" title="Delete this entry">Delete</button></td></tr>`;
    })
    .join("");

  envCount.textContent = `${sorted.length} environment${sorted.length !== 1 ? "s" : ""}`;
  emptyState.hidden = sorted.length > 0;
  initDeleteButtons();
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

function render() {
  renderHeader();
  renderBody();
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

function refreshUsedSpaceForAll() {
  const btn = document.getElementById("btn-refresh-used-space");
  if (!btn || btn.disabled) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Refreshing…";

  const envs = [...allEnvs];
  Promise.all(
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
  ).finally(() => {
    btn.disabled = false;
    btn.textContent = originalText;
    saveEnvs();
    render();
    setLastUpdated();
  });
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

function refreshLogicalDateForAll() {
  const btn = document.getElementById("btn-refresh-logical-date");
  if (!btn || btn.disabled) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Refreshing…";

  const envs = [...allEnvs];
  Promise.all(
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
  ).finally(() => {
    btn.disabled = false;
    btn.textContent = originalText;
    saveEnvs();
    render();
    setLastUpdated();
  });
}

const btnRefreshUsedSpace = document.getElementById("btn-refresh-used-space");
if (btnRefreshUsedSpace) btnRefreshUsedSpace.addEventListener("click", refreshUsedSpaceForAll);
const btnRefreshLogicalDate = document.getElementById("btn-refresh-logical-date");
if (btnRefreshLogicalDate) btnRefreshLogicalDate.addEventListener("click", refreshLogicalDateForAll);

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(addForm);
  const envName = (fd.get("envName") || "").trim();
  const sprint = (fd.get("sprint") || "").trim();
  const vappId = (fd.get("vappId") || "").trim();
  const dbHost = (fd.get("dbHost") || "").trim();
  const logicalName = (fd.get("logicalName") || "").trim();
  const owner = (fd.get("owner") || "").trim();
  if (!envName || !sprint || !vappId || !logicalName || !owner) return;
  allEnvs.push({
    id: generateId(),
    envName,
    sprint,
    vappId,
    dbHost: dbHost || "",
    logicalName,
    owner,
    usedSpace: "",
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
