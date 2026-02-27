# EnvSync – Testing Environments Dashboard

A simple dashboard to view testing environment details: environment list, sprint, vApp ID, logical name, and environment owner.

## What it shows

- **Environment** – Short name (e.g. SIT-01, UAT-01)
- **Logical name** – Full logical identifier
- **Sprint** – Associated sprint
- **vApp ID** – vApp identifier
- **Env owner** – Owner of the environment

## Run locally

1. Open the project folder and serve the files over HTTP (required for correct loading of assets).

   **Option A – Python 3**
   ```bash
   cd C:\Users\surves\Documents\env-sync
   python -m http.server 8080
   ```

   **Option B – Node (npx)**
   ```bash
   npx serve -p 8080
   ```

2. In a browser go to: **http://localhost:8080**

## Features

- **Search** – Filter by env name, logical name, vApp ID, owner, or sprint
- **Filters** – Dropdowns for sprint and owner
- **Sort** – Click column headers to sort (Logical name, Environment, Sprint, vApp ID, Owner)
- **Count** – Displays how many environments match the current filters

## Using your own data

Edit `app.js` and replace the `ENVIRONMENTS` array with your data. Each item should have:

- `envName` – Environment name
- `logicalName` – Logical name
- `sprint` – Sprint (e.g. "Sprint 24")
- `vappId` – vApp ID
- `owner` – Environment owner

You can later load this from an API by fetching JSON and assigning to `allEnvs`, then calling `populateFilters()` and `render()`.
