# EnvSync – Testing Environments Dashboard

A dashboard to view testing environment details: environment list, sprint, vApp ID, DB Host, logical name, env owner, **used space** (from Unix hosts), and logical date.

## What it shows

- **Environment** – Short name (used as SSH host for used space)
- **Sprint**, **vApp ID**, **DB Host**, **Logical name**, **Env owner**
- **Used Space** – Fetched from each Unix host via SSH (command: `df -h . | awk 'NR==2 {print $5}'`)
- **Logical Date**

## Run with API (used space fetch)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure SSH credentials**
   ```bash
   cp .env.example .env
   # Edit .env and set:
   # SSH_USER=abpwrk1
   # SSH_PASSWORD=your_password
   ```

3. **Start the server** (serves the app and the API)
   ```bash
   npm start
   ```

4. Open **http://localhost:3000**

5. Click **"Refresh used space"** to SSH to each environment (host = environment name), run the `df` command, and fill the Used Space column.

## Run without API (static only)

If you only want to view/add/edit envs without fetching used space:

- Serve the folder with any static server (e.g. `npx serve -p 8080` or `python -m http.server 8080`) and open the app. The "Refresh used space" button will fail unless the API is running at the same origin.

## Used space logic

- Each row’s **environment name** is used as the **SSH host** (e.g. `illnqw-7937`).
- The server connects with the credentials from `.env` (username `SSH_USER`, password `SSH_PASSWORD`).
- It runs: `df -h . | awk 'NR==2 {print $5}'` and returns the value (e.g. `45%`).
- The dashboard calls the API for every env when you click **"Refresh used space"** and updates the Used Space column.

## Features

- **Search** – Filter by env name, logical name, vApp ID, DB Host, owner, sprint, used space, logical date
- **Filters** – Dropdowns for sprint and owner
- **Sort** – Click column headers to sort
- **Add / Delete** – Add environment (with optional Used Space, Logical Date) and delete rows
- **Drag columns** – Reorder columns; order is saved in localStorage
- **Refresh used space** – Fetches live used space from each Unix host via the API

## Using your own data

Edit `app.js`: the `DEFAULT_ENVIRONMENTS` array defines initial rows. Each item can have: `envName`, `sprint`, `vappId`, `dbHost`, `logicalName`, `owner`, `usedSpace`, `logicalDate`. Data is persisted in the browser’s localStorage.
