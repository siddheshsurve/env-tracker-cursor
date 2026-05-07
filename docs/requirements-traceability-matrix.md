# EnvTracker — Requirements Traceability Matrix (RTM)

**Product:** EnvTracker (testing environments dashboard)  
**Baseline:** Repository as of internal release; traceability to source files and HTTP APIs.

**Legend**

| Column | Meaning |
|--------|---------|
| **Req ID** | Stable identifier for requirements |
| **Requirement** | Testable statement |
| **Priority** | P0 = must-have for core use, P1 = important, P2 = nice-to-have / placeholder |
| **Implementation** | Code / config / page |
| **Verification** | How to confirm (manual unless automated tests exist) |

---

## 1. Functional requirements — dashboard shell

| Req ID | Requirement | Priority | Implementation | Verification |
|--------|-------------|----------|----------------|--------------|
| ENV-001 | User can view a multi-column environment table with configurable column order | P0 | `app.js` (`COLUMNS`, `DEFAULT_COLUMN_ORDER`, `renderHeader`, `renderBody`, `loadColumnOrder`), `index.html`, `styles.css` | Open app; drag headers; reload; order persists |
| ENV-002 | Environment data persists in the browser across sessions | P0 | `app.js` (`STORAGE_KEY_ENVS`, `loadEnvs`, `saveEnvs`) | Add row, close tab, reopen; data still present |
| ENV-003 | User can search and filter environments (sprint, owner) | P0 | `app.js` (`getFilteredEnvs`, `populateFilters`, toolbar in `index.html`) | Search text + dropdowns narrow rows |
| ENV-004 | User can sort by clicking column headers | P0 | `app.js` (`initSort`, `compare`, `sortKey` / `sortDir`) | Click header; order toggles |
| ENV-005 | User can add a new environment row via form | P0 | `index.html` (add form), `app.js` (submit handler) | Submit valid form; row appears |
| ENV-006 | User can delete an environment row | P0 | `app.js` (`initDeleteButtons`) | Delete; row removed; storage updated |
| ENV-007 | Application branding shows **EnvTracker** | P1 | `index.html`, `full-bounce.html`, `README.md`, `package.json` | Title / header / footer text |
| ENV-008 | User can switch light/dark theme with persistence | P1 | `index.html` / `full-bounce.html` (inline theme script), `app.js` / `full-bounce.js` (toggle), `localStorage` key `envsync-theme`, `styles.css` (`[data-theme]`) | Toggle; refresh; theme retained |

---

## 2. Functional requirements — data columns (display & normalization)

| Req ID | Requirement | Priority | Implementation | Verification |
|--------|-------------|----------|----------------|--------------|
| COL-001 | Columns include Environment, Sprint, vApp ID, DB Host, ANM Connectivity, Logical name, Owner, Used Space, Clean Space, Full Bounce, Run GSD, JNext Date, Run JNext, Deploy HF, Upgraded Package, Logical Date | P0 | `app.js` `COLUMNS`, `DEFAULT_COLUMN_ORDER` | Visual inspection vs. list |
| COL-002 | Saved JSON may use snake_case; UI normalizes to camelCase where applicable | P0 | `app.js` (`loadEnvs` mappings: `db_host`, `jnext_date`, etc.) | Import legacy payload; columns populate |
| COL-003 | ANM Connectivity supports Yes/No (and empty) in add form | P1 | `index.html` (select), `app.js` (form field) | Add entry with Yes/No |
| COL-004 | Used Space shows battery-style bar for percentage values | P1 | `app.js` (`getUsedSpaceBarHtml`, `getUsedSpaceColorClass`), `styles.css` | Refresh used space; % shows bar + color bands |

---

## 3. Functional requirements — Refresh All & SSH-backed fields

| Req ID | Requirement | Priority | Implementation | Verification |
|--------|-------------|----------|----------------|--------------|
| REF-001 | On first load, app runs a full refresh sequence without button click | P0 | `app.js` (`refreshAll` after initial `render`) | Load page; toolbar shows phases; cells update |
| REF-002 | **Refresh All** runs sequentially: Used space → Logical date → JNext date → Daemon status | P0 | `app.js` (`refreshAll`, `refreshUsedSpaceCore`, `refreshLogicalDateCore`, `refreshJnextPlanCore`, `refreshDaemonStatusCore`) | Network tab / UI phase labels |
| REF-003 | Used space fetched per environment using env name as SSH host | P0 | `server.js` (`POST /api/used-space`, `getUsedSpace`, `DF_COMMAND`), creds `SSH_USER` / `SSH_PASSWORD` | Match `df` output to cell |
| REF-004 | Logical date fetched via login shell + `sqla` pipeline | P0 | `server.js` (`POST /api/logical-date`, `getLogicalDateCommand`), `app.js` `fetchLogicalDateForHost` | Cell shows DB logical date or error |
| REF-005 | JNext “date” from `planman showinfo`; host is env name lowercased; separate Jenkins-unrelated SSH user | P0 | `server.js` (`JNEXTPLAN_*`, `getJnextPlanProductionEndLine`, `POST /api/jnext-plan`), `app.js` | Set `JNEXTPLAN_*`; refresh; see date / NA / errors per rules |
| REF-006 | JNext: `planman` missing → display **NA**; `stty` ioctl noise → **NA** when no production line | P0 | `server.js` (`PLANMAN_COMMAND_NOT_FOUND`, `STTY_IOCTL_INAPPROPRIATE`) | SSH host without Maestro |
| REF-007 | JNext success shows **MM/DD/YYYY** only (not full planman line) | P0 | `server.js` (`JNEXT_PRODUCTION_DATE_REGEX`) | Compare to raw `planman` line |
| REF-008 | Daemon status table lists fixed daemon names and per-env Up/Down/Error | P0 | `app.js` (`DAEMON_LIST`, `renderDaemonTable`), `server.js` (`POST /api/daemon-status`, `DAEMON_PATTERNS`) | Refresh All; cells match `ps` expectation |
| REF-009 | Daemon section instructs user to use Refresh All | P1 | `index.html` (daemon hint) | Copy present |

---

## 4. Functional requirements — Run JNext

| Req ID | Requirement | Priority | Implementation | Verification |
|--------|-------------|----------|----------------|--------------|
| JNX-001 | Per-row **Run JNext** runs `JnextPlan -to` with **LD+1** where LD is browser local date **MM/DD/YYYY** | P0 | `app.js` (`getLocalDateMMDDYYYY`, `addOneDayMMDDYYYY`, `initRunJnextButtons`), `server.js` (`POST /api/run-jnext`, `runJnextPlanOnHost`) | Confirm `-to` date = tomorrow local |
| JNX-002 | Run JNext uses `JNEXTPLAN_USER` / `JNEXTPLAN_PASSWORD` (not main SSH user) | P0 | `server.js` (`runJnextPlanOnHost`) | Wrong creds in `JNEXTPLAN_*` fail; main SSH unaffected |
| JNX-003 | Success alert shows **JNextPlan to &lt;LD&gt; completed on &lt;host&gt;** (no exit code, LD not LD+1 in message) | P1 | `app.js` (alert string in `initRunJnextButtons`) | Run on test host |
| JNX-004 | On exit 0, JNext Date cell refreshed via `planman` fetch | P0 | `app.js` (`fetchJnextPlanForHost` after success) | Date updates after run |
| JNX-005 | No persistent “OK · date” text under Run JNext button | P1 | `app.js` (removed `env.runJnext` status line) | UI: button only |

---

## 5. Functional requirements — Clean space (Jenkins)

| Req ID | Requirement | Priority | Implementation | Verification |
|--------|-------------|----------|----------------|--------------|
| CLN-001 | Clean space derives numeric **ENV** from trailing digits of environment name | P0 | `app.js` (`getEnvironmentNumberFromName`), `server.js` (`extractEnvironmentNumber`) | Name `illnqw8358` → `8358` |
| CLN-002 | Triggers Jenkins **ENV_CLEANUP** with parameters aligned to UI (LIBS_CLEANUP, etc.) | P0 | `server.js` (`POST /api/clean-space`, `triggerJenkinsEnvCleanup`), `.env` `JENKINS_*` | Jenkins queue shows correct params |
| CLN-003 | Client polls until build completes and console verifies **Finished: SUCCESS** | P0 | `app.js` (`waitForCleanSpacePipeline`, `waitForJenkinsJobPipeline`), `server.js` (`/api/jenkins/*` with `profile=cleanup`) | Success path shows alert |
| CLN-004 | After success, used space refreshed automatically for all rows | P0 | `app.js` (`refreshUsedSpaceCore` after pipeline) | Disk % updates without extra click |

---

## 6. Functional requirements — Full bounce (J-Boot-PMX)

| Req ID | Requirement | Priority | Implementation | Verification |
|--------|-------------|----------|----------------|--------------|
| FB-001 | Full bounce button navigates to dedicated page with **Back** to dashboard | P0 | `app.js` (`initFullBounceButtons` → `full-bounce.html?vappId=`), `full-bounce.html` | Navigation + back link |
| FB-002 | Full bounce page collects Jenkins **username** and **password**; submit labeled **Full Bounce** | P0 | `full-bounce.html`, `full-bounce.js` | Form validation |
| FB-003 | Trigger and all polls use submitted credentials (Basic auth), not `JENKINS_USER` / token from `.env` for that session | P0 | `server.js` (`POST /api/full-bounce` body, `getJenkinsProfile(..., interactiveCreds)`, `jenkinsCfgFromRequest` + `X-Full-Bounce-*` headers on GET polls) | Network: Authorization / headers |
| FB-004 | Job URL, job name, context from `.env` (`JENKINS_FULL_BOUNCE_*`) | P0 | `server.js` (`getJenkinsProfile`, `jobUrlParts`) | Misconfigured URL fails predictably |
| FB-005 | vApp normalized to **VAPP_&lt;n&gt;** for **ENV** parameter | P0 | `server.js` (`normalizeVappForJenkins`), `app.js` (`normalizeVappForJenkinsClient`) | Jenkins shows expected ENV |
| FB-006 | Outcome alert includes Jenkins result and last console line | P0 | `full-bounce.js` (`waitForFullBouncePipeline`, alert) | Run pipeline |

---

## 7. Functional requirements — placeholders & extensions

| Req ID | Requirement | Priority | Implementation | Verification |
|--------|-------------|----------|----------------|--------------|
| EXT-001 | **Deploy HF** column shows per-row **Deploy HF** button (hook TBD) | P2 | `app.js` (`initDeployHfButtons`) | Click logs to console |
| EXT-002 | **Run GSD** column shows per-row **Run GSD** button after Full Bounce (hook TBD) | P2 | `app.js` (`initRunGsdButtons`, column order) | Click logs to console |

---

## 8. Non-functional & configuration

| Req ID | Requirement | Priority | Implementation | Verification |
|--------|-------------|----------|----------------|--------------|
| NFR-001 | Server serves static UI and JSON API on configured **PORT** | P0 | `server.js` (`express.static`, `PORT`), `package.json` `npm start` | `http://localhost:3000` |
| NFR-002 | Secrets supplied via `.env`; example without secrets in repo | P0 | `.env.example`, `dotenv` in `server.js` | No real passwords in git |
| NFR-003 | Clean space and full bounce Jenkins calls use identifiable User-Agent | P1 | `server.js` (`EnvTracker-Jenkins/1.0`) | Jenkins / proxy logs |
| NFR-004 | Queue URL polling guarded against SSRF | P1 | `server.js` (`assertQueueItemUrl`) | Malicious `url` query rejected |

---

## 9. Traceability summary (API → capability)

| HTTP API | Primary Req IDs |
|----------|-----------------|
| `POST /api/used-space` | REF-003 |
| `POST /api/logical-date` | REF-004 |
| `POST /api/jnext-plan` | REF-005, REF-006, REF-007 |
| `POST /api/run-jnext` | JNX-001, JNX-002 |
| `POST /api/daemon-status` | REF-008 |
| `POST /api/clean-space` | CLN-001, CLN-002 |
| `POST /api/full-bounce` | FB-003, FB-004, FB-005 |
| `GET /api/jenkins/queue` | CLN-003, FB-006 |
| `GET /api/jenkins/last-build` | CLN-003, FB-006 |
| `GET /api/jenkins/build-status` | CLN-003, FB-006 |
| `GET /api/jenkins/console-verify` | CLN-003 |
| `GET /api/jenkins/console-summary` | FB-006 |

---

## 10. Gaps & recommendations

| Topic | Note |
|-------|------|
| **Automated tests** | No unit/e2e suite traced in repo; verification column assumes **manual** or external tooling. |
| **Deploy HF / Run GSD** | Requirements marked P2 until business rules and backends are defined; update RTM when implemented. |
| **Jenkins password vs API token** | NFR: document org policy; Jenkins often expects token as Basic “password”. |

---

*Maintainers: when adding features, append rows with new Req IDs and update §9.*
