(function () {
  const API_BASE = "";

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function pollHeaders(user, pass) {
    return {
      "X-Full-Bounce-Username": user,
      "X-Full-Bounce-Password": pass,
    };
  }

  function jenkinsProfileQuery() {
    return "profile=fullBounce";
  }

  async function waitForJenkinsJobPipeline(
    queueItemUrl,
    previousBuildNumber,
    triggeredAtMs,
    setStatus,
    jenkinsUsername,
    jenkinsPassword
  ) {
    const api = API_BASE || "";
    const pq = jenkinsProfileQuery();
    const h = () => pollHeaders(jenkinsUsername, jenkinsPassword);
    let buildNum = null;
    let buildPageUrl = null;

    if (queueItemUrl) {
      for (let i = 0; i < 90; i++) {
        const r = await fetch(
          `${api}/api/jenkins/queue?url=${encodeURIComponent(queueItemUrl)}&${pq}`,
          { headers: h() }
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
        if (setStatus) setStatus("In queue…");
        await sleep(1500);
      }
    }

    if (buildNum == null) {
      await sleep(2000);
      if (setStatus) setStatus("Finding build #…");
      for (let i = 0; i < 200; i++) {
        const r = await fetch(`${api}/api/jenkins/last-build?${pq}`, { headers: h() });
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
        if (setStatus) setStatus("Finding build #…");
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
      } catch (_) {}
    }

    if (setStatus) setStatus("Build #" + buildNum + "…");

    let jenkinsResult = null;
    for (let i = 0; i < 1200; i++) {
      const r = await fetch(
        `${api}/api/jenkins/build-status?number=${encodeURIComponent(buildNum)}&${pq}`,
        { headers: h() }
      );
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || b.detail || "Build status failed");
      const hasResult = b.result != null && String(b.result).length > 0;
      if (!b.building && hasResult) {
        jenkinsResult = String(b.result);
        break;
      }
      if (setStatus) setStatus("Build #" + buildNum + " running…");
      await sleep(3000);
    }
    if (jenkinsResult == null) {
      throw new Error("Timed out waiting for the build to finish (still running in Jenkins).");
    }

    return { buildNum, jenkinsResult };
  }

  async function waitForFullBouncePipeline(
    queueItemUrl,
    previousBuildNumber,
    triggeredAtMs,
    setStatus,
    jenkinsUsername,
    jenkinsPassword
  ) {
    const { buildNum, jenkinsResult } = await waitForJenkinsJobPipeline(
      queueItemUrl,
      previousBuildNumber,
      triggeredAtMs,
      setStatus,
      jenkinsUsername,
      jenkinsPassword
    );
    const api = API_BASE || "";
    const pq = jenkinsProfileQuery();
    const h = pollHeaders(jenkinsUsername, jenkinsPassword);
    const r = await fetch(
      `${api}/api/jenkins/console-summary?number=${encodeURIComponent(buildNum)}&${pq}`,
      { headers: h }
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

  const params = new URLSearchParams(window.location.search);
  const vappId = (params.get("vappId") || "").trim();

  const contextEl = document.getElementById("fb-context");
  const form = document.getElementById("fb-form");
  const submitBtn = document.getElementById("fb-submit");
  const statusEl = document.getElementById("fb-status");
  const userEl = document.getElementById("fb-username");
  const passEl = document.getElementById("fb-password");

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || "";
  }

  if (!vappId) {
    if (contextEl) {
      contextEl.textContent = "Missing vApp ID. Go back and click Full bounce on a row.";
    }
    if (form) form.hidden = true;
  } else if (contextEl) {
    contextEl.innerHTML =
      "Triggering <strong>J-Boot-PMX</strong> for vApp ID: <code>" +
      escapeHtml(vappId) +
      "</code>";
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  if (form && vappId) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const jenkinsUsername = (userEl && userEl.value) || "";
      const jenkinsPassword = (passEl && passEl.value) || "";
      if (!jenkinsUsername.trim() || !jenkinsPassword) return;

      submitBtn.disabled = true;
      setStatus("Queuing…");
      try {
        const res = await fetch((API_BASE || "") + "/api/full-bounce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vappId,
            jenkinsUsername: jenkinsUsername.trim(),
            jenkinsPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || res.statusText || "Request failed");
        }
        setStatus(data.queueItemUrl ? "Waiting in queue…" : "Finding build #…");
        const out = await waitForFullBouncePipeline(
          data.queueItemUrl || null,
          data.previousBuildNumber,
          data.triggeredAtMs,
          setStatus,
          jenkinsUsername.trim(),
          jenkinsPassword
        );
        alert(
          `Full bounce finished (build #${out.buildNum}).\n\n` +
            `Jenkins result: ${out.jenkinsResult}\n\n` +
            `Last console line:\n${out.lastLine || "(none)"}\n\n` +
            (out.finishedSuccess
              ? "You can run Refresh All on the dashboard if needed."
              : "Check Console Output in Jenkins for details.")
        );
        setStatus("");
      } catch (err) {
        alert("Full bounce (Jenkins): " + (err.message || String(err)));
        setStatus("");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  (function initThemeToggle() {
    const toggle = document.getElementById("theme-toggle");
    const label = document.getElementById("theme-toggle-label");
    function updateLabel() {
      const theme = document.documentElement.getAttribute("data-theme") || "dark";
      if (label) label.textContent = theme === "dark" ? "Light" : "Dark";
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
})();
