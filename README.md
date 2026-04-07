# EnvTracker – Testing Environments Dashboard

A dashboard to view testing environment details: environment list, sprint, vApp ID, DB Host, logical name, env owner, **used space** (from Unix hosts), **logical date**, and **JNext plan** (Production plan end time via `planman showinfo`).

## What it shows

- **Environment** – Short name (used as SSH host for used space)
- **Sprint**, **vApp ID**, **DB Host**, **ANM Connectivity**, **Logical name**, **Env owner**
- **Used Space** – Fetched from each Unix host via SSH (command: `df -h . | awk 'NR==2 {print $5}'`)
- **Logical Date**
- **JNext Date** – Date only (`MM/DD/YYYY`) from `planman showinfo`, or **NA** when Maestro/planman is not installed on the host (via **Refresh All**; separate SSH credentials; host = env name in **lowercase**)

## Run with API (used space fetch)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure credentials**
   ```bash
   cp .env.example .env
   # Edit .env and set:
   # SSH_USER=abpwrk1
   # SSH_PASSWORD=your_password
   #
   # For JNext / Refresh All (planman showinfo, separate user):
   # JNEXTPLAN_USER=maest10
   # JNEXTPLAN_PASSWORD=your_password
   #
   # For "Clean space" (Jenkins ENV_CLEANUP job):
   # JENKINS_URL=http://ilcechr084:8080
   # JENKINS_USER=your_ntnet_id
   # JENKINS_TOKEN=your_jenkins_api_token
   ```

3. **Start the server** (serves the app and the API)
   ```bash
   npm start
   ```

4. Open **http://localhost:3000** — the app **automatically runs Refresh All once** (used space → logical date → JNext → daemon status). You can click **Refresh All** anytime to run it again.

5. **Refresh All** (toolbar) runs, in order: used space (`df`), logical date (`sqla`), JNext plan (`planman showinfo` with `JNEXTPLAN_*` credentials), and **daemon status** for every environment. The toolbar button shows the current phase (e.g. “Used space…”, “Daemon status…”).

6. **Clean space** – Triggers **Build with parameters** on `ENV_CLEANUP` (`ENV` = trailing digits from the env name, **LIBS_CLEANUP** on, **KILL_ENV** off). After the build is queued, the app **polls Jenkins** until the run finishes, checks the **Console Output** text for **`Finished: SUCCESS`**, then **automatically refreshes used space only** for all rows and shows an **alert**. It also tries to **open the build page** in a new tab (may be blocked by the browser).

   Configure `.env`: `JENKINS_URL`, `JENKINS_USER`, `JENKINS_TOKEN`, and optionally `JENKINS_CONTEXT` / `JENKINS_JOB` for folder jobs.

   Server logs: `[jenkins] POST ...` when triggering. If monitoring fails, check **Build History** and **Console Output** in Jenkins.

7. **Full bounce** – Clicking **Full bounce** opens **`full-bounce.html`** (with **Back** to the dashboard). Enter your **Jenkins username** and **password**; submit **Full Bounce** to queue **`J-Boot-PMX`** on **`JENKINS_FULL_BOUNCE_URL`** with the same parameters as **Build with parameters** (`ENV_TYPE=ST`, **`ENV`** = row **vApp ID** normalized to **VAPP_** + number, `Action=ReStart`, full component, CleanLogs/CleanCache, `OnFailure=skip`). The server uses that login for HTTP Basic auth against Jenkins (instead of **`JENKINS_USER`** / **`JENKINS_FULL_BOUNCE_TOKEN`** from `.env`). **`JENKINS_FULL_BOUNCE_URL`** (and job/context options) still come from `.env`. If Jenkins expects an **API token** as the Basic auth secret, paste the token in the password field. When the pipeline finishes, an **alert** shows the result and last console line.

## Run without API (static only)

If you only want to view/add/edit envs without fetching used space:

- Serve the folder with any static server (e.g. `npx serve -p 8080` or `python -m http.server 8080`) and open the app. **Refresh All** (including the automatic run on load) needs the API at the same origin; otherwise fetches will fail until you use `npm start`.

## Used space logic

- Each row’s **environment name** is used as the **SSH host** (e.g. `illnqw-7937`).
- The server connects with the credentials from `.env` (username `SSH_USER`, password `SSH_PASSWORD`).
- It runs: `df -h . | awk 'NR==2 {print $5}'` and returns the value (e.g. `45%`).
- The **Refresh All** flow calls the used-space API for every env in the first phase and updates the Used Space column (along with other columns in later phases).

## JNext date logic

- SSH host is the **environment name lowercased** (e.g. `ILLNQW8358` → `illnqw8358`).
- Uses **`JNEXTPLAN_USER`** / **`JNEXTPLAN_PASSWORD`** (not `SSH_USER` / `SSH_PASSWORD`).
- Remote command: `bash -l -c 'planman showinfo'`.

## Run JNext (JnextPlan)

- Per-row **Run JNext** runs `bash -l -c 'JnextPlan -to MM/DD/YYYY'` over SSH with the same **`JNEXTPLAN_*`** credentials.
- **LD** (logical day) is **today’s local date in the browser** (`MM/DD/YYYY`, same role as Windows `echo %date%` for “today” on your PC).
- **`-to`** is **LD + 1 calendar day** (same as the previous Streamlit tool).
- After **exit code 0**, the app refreshes the **JNext Date** cell for that row via `planman showinfo`. Output (stdout/stderr) is shown in an alert (truncated if very long).
- If output contains `planman: command not found` (Maestro not configured), or `stty: standard input: Inappropriate ioctl for device` (common over non-interactive SSH), the cell shows **NA** (unless a valid `Production plan end time:` line is still present—date is taken from that line).
- Otherwise the first **`MM/DD/YYYY`** from the `Production plan end time:` line is shown (time and timezone are omitted).

## Features

- **Search** – Filter by env name, logical name, vApp ID, DB Host, owner, sprint, used space, JNext date, logical date
- **Filters** – Dropdowns for sprint and owner
- **Sort** – Click column headers to sort
- **Add / Delete** – Add environment (with optional Used Space, Logical Date) and delete rows
- **Drag columns** – Reorder columns; order is saved in localStorage
- **Refresh All** – Sequentially refreshes used space, logical date, JNext date (separate SSH account for planman), and daemon status for all environments
- **Deploy HF** – Per-row **Deploy HF** button (hook up your deployment in `initDeployHfButtons` in `app.js`)
- **Run GSD** – Per-row **Run GSD** button after **Full Bounce** (wire logic in `initRunGsdButtons` in `app.js`)

## Using your own data

Edit `app.js`: the `DEFAULT_ENVIRONMENTS` array defines initial rows. Each item can have: `envName`, `sprint`, `vappId`, `dbHost`, `logicalName`, `owner`, `usedSpace`, `jnextDate`, `runGsd`, `deployHf`, `logicalDate`, etc. Data is persisted in the browser’s localStorage.
