(function () {
  const SKIP_DELAY_MS = 3000;

  const $ = (id) => document.getElementById(id);

  /* ---------- Service Worker (Static GitHub Pages Cache) ---------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  /* ---------- Static Text Binding ---------- */
  document.querySelectorAll("[data-text]").forEach((el) => {
    const value = CONTENT[el.dataset.text];
    if (value !== undefined) el.textContent = value;
  });

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("screen-" + name).classList.add("active");
    syncAppWidth();
  }

  function reveal(btn) {
    btn.classList.remove("hidden");
    btn.classList.add("appear");
  }

  /* ---------- Audio Unlock & Mute Controls ---------- */
  function syncMuteButtons() {
    const muted = window.SFX ? SFX.isMuted() : false;
    document.querySelectorAll(".btn-mute-toggle").forEach((btn) => {
      btn.textContent = (muted ? "🔇 " : "🔊 ") + (muted ? CONTENT.soundOffLabel : CONTENT.soundOnLabel);
      btn.classList.toggle("muted", muted);
    });
  }

  document.querySelectorAll(".btn-mute-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.SFX) SFX.toggleMute();
      syncMuteButtons();
    });
  });
  syncMuteButtons();

  document.addEventListener(
    "pointerdown",
    () => {
      if (window.SFX) SFX.unlockAudio();
    },
    { once: true }
  );

  /* ---------- Smart Portrait / Landscape Video Sizing ---------- */
  function attachSmartAspect(videoEl, wrapEl) {
    if (!videoEl || !wrapEl) return;
    videoEl.addEventListener("loadedmetadata", () => {
      if (!videoEl.videoWidth || !videoEl.videoHeight) return;
      const portrait = videoEl.videoHeight > videoEl.videoWidth * 1.05;
      wrapEl.classList.toggle("is-portrait", portrait);
    });
  }

  attachSmartAspect($("intro-video"), $("intro-video-wrap"));
  attachSmartAspect($("viewer-video"), $("viewer-video-wrap"));
  attachSmartAspect($("desk-video"), $("desk-video-wrap"));

  /* ---------- Saved Progress & URL Params ---------- */
  const PROGRESS_KEY = "taharoot-v2-progress";
  const CASEFILE_KEY = "taharoot-v2-casefile";

  function loadJSON(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  const urlParams = new URLSearchParams(window.location.search);
  const urlTeam = (urlParams.get("team") || "").trim();

  const progress = Object.assign(
    {
      reachedCase: false,
      teamName: "",
      quizSeed: Math.floor(Math.random() * 899999) + 100000,
      setIndex: 0,
      questionIndex: 0,
      wrongCount: 0,
      currentQWrong: 0,
      watched: [],
      deskDone: [],
      tags: {},
      polygraphIndex: null,
      seenTransmission: false,
      recoveredMsgs: [],
      uvFound: [],
      elapsedSec: 0,
      finalTimeSec: null,
      splitView: true,
      boardHidden: false,
    },
    loadJSON(PROGRESS_KEY)
  );

  if (urlTeam && !progress.reachedCase) {
    progress.teamName = urlTeam;
  }

  const saveProgress = () => saveJSON(PROGRESS_KEY, progress);
  saveProgress();

  function markDone(list, index) {
    if (!progress[list].includes(index)) progress[list].push(index);
    saveProgress();
  }

  /* ---------- Deterministic Hash, Case ID & Timer ---------- */
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function getTeamName() {
    return (progress.teamName && progress.teamName.trim()) || CONTENT.defaultTeamName;
  }

  function getCaseNumber() {
    const num = (fnv1a(getTeamName() + "#" + progress.quizSeed) % 900) + 100;
    return String(num);
  }

  function formatDuration(sec) {
    const total = Math.max(0, Math.floor(sec || 0));
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return hrs > 0 ? hrs + ":" + mm + ":" + ss : mm + ":" + ss;
  }

  function getEffectiveTimeSec() {
    return progress.finalTimeSec !== null && progress.finalTimeSec !== undefined
      ? progress.finalTimeSec
      : progress.elapsedSec || 0;
  }

  function updateHeaderMeta() {
    $("case-team-tag").textContent = CONTENT.caseIdPrefix + getCaseNumber() + " · " + getTeamName();
    $("case-timer").textContent = formatDuration(getEffectiveTimeSec());
  }

  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    const onActiveInvestigation =
      $("screen-case").classList.contains("active") || $("screen-final").classList.contains("active");
    if (!onActiveInvestigation) return;
    if (progress.finalSuspect !== undefined) return;
    progress.elapsedSec = (progress.elapsedSec || 0) + 1;
    $("case-timer").textContent = formatDuration(progress.elapsedSec);
    if (progress.elapsedSec % 5 === 0) saveProgress();
  }, 1000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveProgress();
  });

  /* ---------- Start Screen & Clearance Scanner ---------- */
  const teamInput = $("team-input");
  teamInput.placeholder = CONTENT.teamPlaceholder;
  teamInput.value = progress.teamName || "";
  teamInput.addEventListener("input", () => {
    progress.teamName = teamInput.value.trim();
    saveProgress();
    updateHeaderMeta();
  });

  updateHeaderMeta();

  let scanTimer = null;
  let scanActive = false;

  function finishScan() {
    if (!scanActive) return;
    scanActive = false;
    clearInterval(scanTimer);
    $("scan-overlay").classList.add("hidden");
    startVideo();
  }

  function beginClearanceScan() {
    progress.teamName = teamInput.value.trim();
    saveProgress();
    updateHeaderMeta();

    // Prime intro video inside user tap handler so iOS Safari allows audio after scan.
    const introVid = $("intro-video");
    introVid.src = CONTENT.videoSrc;
    const warm = introVid.play();
    if (warm && warm.then) {
      warm
        .then(() => {
          introVid.pause();
          introVid.currentTime = 0;
        })
        .catch(() => {});
    }

    scanActive = true;
    const bar = $("scan-progress-bar");
    const status = $("scan-status");
    $("scan-team-name").textContent = CONTENT.caseIdPrefix + getCaseNumber() + " // " + getTeamName();
    bar.style.width = "0%";
    status.textContent = CONTENT.scanStatus;
    $("scan-overlay").classList.remove("hidden");

    const duration = 1350;
    const started = performance.now();
    let stepCount = 0;
    scanTimer = setInterval(() => {
      const ratio = Math.min(1, (performance.now() - started) / duration);
      bar.style.width = Math.round(ratio * 100) + "%";
      stepCount++;
      if (stepCount % 2 === 0 && window.SFX) SFX.scanBlip(ratio);
      if (ratio >= 1) {
        clearInterval(scanTimer);
        status.textContent = CONTENT.scanApproved;
        if (window.SFX) SFX.correct();
        setTimeout(finishScan, 260);
      }
    }, 65);
  }

  $("scan-overlay").addEventListener("click", finishScan);

  $("btn-start").addEventListener("click", beginClearanceScan);
  if (progress.reachedCase) $("btn-resume").classList.remove("hidden");
  $("btn-resume").addEventListener("click", () => {
    progress.teamName = teamInput.value.trim() || progress.teamName;
    saveProgress();
    updateHeaderMeta();
    if (window.SFX) SFX.click();
    showScreen("case");
  });

  // 5-tap on "סודי ביותר" badge triggers the Desk Easter Egg!
  let badgeTaps = 0;
  let badgeTapTimer = null;
  $("start-badge").addEventListener("click", () => {
    badgeTaps++;
    clearTimeout(badgeTapTimer);
    badgeTapTimer = setTimeout(() => (badgeTaps = 0), 2200);
    if (badgeTaps >= 5) {
      badgeTaps = 0;
      showEasterEgg();
    }
  });

  /* ---------- Intro Video ---------- */
  const video = $("intro-video");
  let skipTimer = null;

  function startVideo() {
    showScreen("video");
    $("video-error").classList.add("hidden");
    $("btn-skip").classList.add("hidden");
    $("btn-continue").classList.add("hidden");
    if (!video.getAttribute("src")) video.src = CONTENT.videoSrc;
    const attempt = video.play();
    if (attempt && attempt.catch) {
      attempt.catch(() => {
        if (!video.error) video.controls = true;
      });
    }
    clearTimeout(skipTimer);
    skipTimer = setTimeout(() => reveal($("btn-skip")), SKIP_DELAY_MS);
  }

  function videoFinished() {
    clearTimeout(skipTimer);
    $("btn-skip").classList.add("hidden");
    reveal($("btn-continue"));
  }

  video.addEventListener("ended", videoFinished);
  video.addEventListener("error", () => {
    if (!video.getAttribute("src")) return;
    $("video-error").classList.remove("hidden");
    videoFinished();
  });

  $("btn-skip").addEventListener("click", () => {
    video.pause();
    videoFinished();
  });

  $("btn-continue").addEventListener("click", () => {
    video.pause();
    startBriefing();
  });

  /* ---------- Briefing ---------- */
  let typer = null;

  function startBriefing() {
    showScreen("briefing");
    $("tap-hint").classList.remove("hidden");
    $("btn-briefing-next").classList.add("hidden");
    typer = typewrite($("briefing-text"), CONTENT.briefing, {
      onDone: () => {
        $("tap-hint").classList.add("hidden");
        reveal($("btn-briefing-next"));
      },
    });
  }

  $("screen-briefing").addEventListener("click", (e) => {
    if (typer && !typer.isDone() && !e.target.closest("button")) typer.skip();
  });

  $("btn-briefing-next").addEventListener("click", () => {
    progress.reachedCase = true;
    saveProgress();
    updateHeaderMeta();
    if (window.SFX) SFX.click();
    showScreen("case");
  });

  /* ---------- Tabs & PC Split-Screen Mode ---------- */
  let currentTab = "witnesses";

  function syncAppWidth() {
    const caseActive = $("screen-case").classList.contains("active");
    const splitOn = Boolean(progress.splitView);
    $("case-terminal").classList.toggle("split-casefile", splitOn);
    $("case-terminal").classList.toggle("on-casefile-tab", currentTab === "casefile");
    $("btn-split-view").classList.toggle("active", splitOn);
    $("app").classList.toggle("wide-split", caseActive && splitOn && currentTab !== "casefile");
  }

  $("btn-split-view").addEventListener("click", () => {
    progress.splitView = !progress.splitView;
    saveProgress();
    if (window.SFX) SFX.click();
    syncAppWidth();
  });

  let pendingTransmission = false;

  function showTab(name) {
    currentTab = name;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
    if (name === "evidence") $("evidence-badge").classList.add("hidden");
    if (window.SFX) SFX.click();
    syncAppWidth();
    if (pendingTransmission && $("viewer").classList.contains("hidden")) {
      pendingTransmission = false;
      showDeskTransmission();
    }
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => showTab(tab.dataset.tab));
  });

  /* ---------- Toast & Alert Modals (Desk Transmission & Easter Egg) ---------- */
  let toastTimer = null;
  function flashDecryptedToast(title) {
    const toast = $("decrypted-toast");
    toast.textContent = CONTENT.decryptedBanner.replace("{title}", title);
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
  }

  let alertTyper = null;
  function openAlertModal(opts) {
    const overlay = $("alert-overlay");
    const inner = overlay.querySelector(".alert-inner");
    inner.classList.toggle("danger-alert", Boolean(opts.danger));
    $("alert-header-text").textContent = opts.header;
    $("alert-sender").textContent = opts.sender;
    $("btn-dismiss-alert").textContent = opts.dismissText;
    overlay.classList.remove("hidden");
    if (window.SFX) SFX.alert();
    if (alertTyper && !alertTyper.isDone()) alertTyper.skip();
    alertTyper = typewrite($("alert-text"), opts.body, {
      charDelay: 28,
      jitter: 15,
      pauseDelay: 420,
    });
  }

  function closeAlertModal() {
    if (alertTyper && !alertTyper.isDone()) {
      alertTyper.skip();
      return;
    }
    $("alert-overlay").classList.add("hidden");
  }

  $("alert-text").addEventListener("click", () => {
    if (alertTyper && !alertTyper.isDone()) alertTyper.skip();
  });
  $("btn-dismiss-alert").addEventListener("click", () => {
    if (alertTyper && !alertTyper.isDone()) alertTyper.skip();
    $("alert-overlay").classList.add("hidden");
  });
  $("btn-close-alert").addEventListener("click", () => {
    if (alertTyper && !alertTyper.isDone()) alertTyper.skip();
    $("alert-overlay").classList.add("hidden");
  });

  function showDeskTransmission() {
    const t = CONTENT.deskTransmission;
    openAlertModal({
      header: t.header,
      sender: t.sender,
      body: t.body,
      dismissText: t.dismissButton,
      danger: false,
    });
  }

  function showEasterEgg() {
    const e = CONTENT.deskEasterEgg;
    openAlertModal({
      header: e.header,
      sender: e.title,
      body: e.body,
      dismissText: e.dismissButton,
      danger: true,
    });
  }

  /* ---------- Case File Data & Violation Chips Helpers ---------- */
  const OTHER = "__other__";
  const caseFile = loadJSON(CASEFILE_KEY);
  const saveCaseFile = () => saveJSON(CASEFILE_KEY, caseFile);
  const witnessFieldRefs = [];

  function hasChipInText(text, chip) {
    return (text || "").includes(chip);
  }

  function toggleChipInText(currentText, chip) {
    const lines = (currentText || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const idx = lines.findIndex((l) => l === chip || l === "• " + chip || l === "- " + chip);
    if (idx >= 0) {
      lines.splice(idx, 1);
      return lines.join("\n");
    }
    lines.push("• " + chip);
    return lines.join("\n");
  }

  function buildViolationChips(container, getText, setText) {
    container.textContent = "";
    const buttons = CONTENT.violationChips.map((chip) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "violation-chip";
      btn.textContent = "+ " + chip;
      btn.addEventListener("click", () => {
        const updated = toggleChipInText(getText(), chip);
        setText(updated);
        if (window.SFX) SFX.click();
      });
      container.appendChild(btn);
      return { btn, chip };
    });

    return function sync() {
      const val = getText();
      buttons.forEach(({ btn, chip }) => {
        const active = hasChipInText(val, chip);
        btn.classList.toggle("active", active);
        btn.textContent = (active ? "✓ " : "+ ") + chip;
      });
    };
  }

  /* ---------- Viewer (Statements + Evidence + Attached Docs + Quick Notes) ---------- */
  const viewer = $("viewer");
  const viewerVideo = $("viewer-video");
  let activeViewerWitness = null;

  const quickStatement = $("quick-statement");
  const quickViolations = $("quick-violations");
  quickStatement.placeholder = CONTENT.textPlaceholder;
  quickViolations.placeholder = CONTENT.textPlaceholder;

  const syncQuickChips = buildViolationChips(
    $("quick-chips"),
    () => quickViolations.value,
    (val) => {
      quickViolations.value = val;
      onQuickInput();
    }
  );

  function onQuickInput() {
    if (activeViewerWitness === null) return;
    const i = activeViewerWitness;
    const stKey = "witness-" + i + "-statement";
    const viKey = "witness-" + i + "-violations";
    caseFile[stKey] = quickStatement.value;
    caseFile[viKey] = quickViolations.value;
    saveCaseFile();
    syncQuickChips();
    const ref = witnessFieldRefs[i];
    if (ref) {
      ref.statement.value = quickStatement.value;
      ref.violations.value = quickViolations.value;
      ref.syncChips();
    }
    renderSuspectBoard();
  }

  quickStatement.addEventListener("input", onQuickInput);
  quickViolations.addEventListener("input", onQuickInput);

  function renderViewerDoc(doc) {
    const box = $("viewer-doc");
    box.textContent = "";
    if (!doc) {
      box.classList.add("hidden");
      return;
    }
    const code = document.createElement("div");
    code.className = "viewer-doc-code";
    code.textContent = doc.code || "";

    const heading = document.createElement("div");
    heading.className = "viewer-doc-heading";
    heading.textContent = doc.heading || "";

    const ul = document.createElement("ul");
    ul.className = "viewer-doc-list";
    (doc.items || []).forEach((itemText) => {
      const li = document.createElement("li");
      li.textContent = itemText;
      ul.appendChild(li);
    });

    box.append(code, heading, ul);
    box.classList.remove("hidden");
  }

  /* ---------- Evidence 4: Captured Phone WhatsApp Renderer ---------- */
  function renderCapturedPhone(chat) {
    const box = $("viewer-phone");
    if (!chat) {
      box.classList.add("hidden");
      return;
    }
    $("phone-group-name").textContent = chat.groupName || "";
    $("phone-group-sub").textContent = chat.subtitle || "";
    const list = $("phone-messages");
    list.textContent = "";

    (chat.messages || []).forEach((msg) => {
      const witness = CONTENT.witnesses[msg.witnessIndex] || { name: "לא ידוע", photo: "" };
      const row = document.createElement("div");
      row.className = "chat-row";

      const avatar = document.createElement("img");
      avatar.className = "chat-avatar";
      avatar.alt = witness.name;
      avatar.src = witness.photo;
      avatar.addEventListener("error", () => avatar.classList.add("hidden"));

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";

      const sender = document.createElement("div");
      sender.className = "chat-sender sender-" + (msg.witnessIndex % 5);
      sender.textContent = witness.name;
      bubble.appendChild(sender);

      if (msg.replyTo) {
        const reply = document.createElement("div");
        reply.className = "chat-reply";
        reply.textContent = "↩ בתגובה אל " + msg.replyTo;
        bubble.appendChild(reply);
      }

      const isRecovered = msg.id && (progress.recoveredMsgs || []).includes(msg.id);

      if (msg.deleted && !isRecovered) {
        const delText = document.createElement("div");
        delText.className = "chat-deleted-text";
        delText.textContent = chat.deletedLabel;

        const recBtn = document.createElement("button");
        recBtn.type = "button";
        recBtn.className = "btn-recover-msg";
        recBtn.textContent = chat.recoverButton;
        recBtn.addEventListener("click", () => {
          if (!progress.recoveredMsgs) progress.recoveredMsgs = [];
          if (!progress.recoveredMsgs.includes(msg.id)) {
            progress.recoveredMsgs.push(msg.id);
            saveProgress();
          }
          if (window.SFX) SFX.unlock();
          renderCapturedPhone(chat);
        });

        bubble.append(delText, recBtn);
      } else if (msg.deleted && isRecovered) {
        const recBox = document.createElement("div");
        recBox.className = "chat-recovered-box";
        const recTag = document.createElement("div");
        recTag.className = "chat-recovered-tag";
        recTag.textContent = chat.recoveredLabel;
        const recBody = document.createElement("div");
        recBody.textContent = msg.recoveredText;
        recBox.append(recTag, recBody);
        bubble.appendChild(recBox);
      } else {
        const body = document.createElement("div");
        body.textContent = msg.text;
        bubble.appendChild(body);
      }

      const meta = document.createElement("div");
      meta.className = "chat-meta";
      const time = document.createElement("span");
      time.textContent = msg.time || "";
      const ticks = document.createElement("span");
      ticks.className = "chat-ticks";
      ticks.textContent = "✓✓";
      meta.append(time, ticks);
      bubble.appendChild(meta);

      row.append(avatar, bubble);
      list.appendChild(row);
    });

    box.classList.remove("hidden");
  }

  /* ---------- Evidence 5: Interactive UV Blacklight Scanner ---------- */
  const uvStage = $("uv-stage");
  let activeUvScene = null;

  function renderUvScene(uvScene) {
    const box = $("viewer-uv");
    activeUvScene = uvScene || null;
    if (!uvScene) {
      box.classList.add("hidden");
      return;
    }
    if (!progress.uvFound) progress.uvFound = [];
    $("uv-instruction").textContent = uvScene.instruction || "";
    uvStage.style.setProperty("--uv-x", "50%");
    uvStage.style.setProperty("--uv-y", "50%");
    syncUvFindingsUI();
    box.classList.remove("hidden");
  }

  function syncUvFindingsUI() {
    if (!activeUvScene) return;
    const hotspots = activeUvScene.hotspots || [];
    const foundSet = new Set(progress.uvFound || []);
    const foundList = hotspots.filter((h) => foundSet.has(h.id));

    $("uv-progress").textContent = (activeUvScene.progressLabel || "{n}/{total}")
      .replace("{n}", foundList.length)
      .replace("{total}", hotspots.length);

    const pinsEl = $("uv-pins");
    pinsEl.textContent = "";
    const listEl = $("uv-findings-list");
    listEl.textContent = "";

    foundList.forEach((h) => {
      const pin = document.createElement("div");
      pin.className = "uv-pin";
      pin.style.left = h.x + "%";
      pin.style.top = h.y + "%";
      pin.textContent = "✓ " + h.shortLabel;
      pinsEl.appendChild(pin);

      const card = document.createElement("div");
      card.className = "uv-finding-card";
      const title = document.createElement("div");
      title.className = "uv-finding-title";
      title.textContent = h.clueTitle;
      const text = document.createElement("div");
      text.className = "uv-finding-text";
      text.textContent = h.clueText;
      card.append(title, text);
      listEl.appendChild(card);
    });
  }

  function moveUvBeam(clientX, clientY) {
    if (!activeUvScene) return;
    const rect = uvStage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pctX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const pctY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    uvStage.style.setProperty("--uv-x", pctX.toFixed(1) + "%");
    uvStage.style.setProperty("--uv-y", pctY.toFixed(1) + "%");

    if (!progress.uvFound) progress.uvFound = [];
    const hotspots = activeUvScene.hotspots || [];
    let newlyFound = false;
    hotspots.forEach((h) => {
      if (progress.uvFound.includes(h.id)) return;
      if (Math.hypot(pctX - h.x, pctY - h.y) <= 13.5) {
        progress.uvFound.push(h.id);
        newlyFound = true;
      }
    });

    if (newlyFound) {
      saveProgress();
      if (window.SFX) {
        if (progress.uvFound.length >= hotspots.length) SFX.unlock();
        else SFX.correct();
      }
      syncUvFindingsUI();
    }
  }

  uvStage.addEventListener("pointerdown", (e) => {
    uvStage.setPointerCapture && uvStage.setPointerCapture(e.pointerId);
    moveUvBeam(e.clientX, e.clientY);
  });
  uvStage.addEventListener("pointermove", (e) => {
    moveUvBeam(e.clientX, e.clientY);
  });

  /* ---------- Evidence 6: Incoming Encrypted Informant Call (TTS + Live Text) ---------- */
  const callOverlay = $("call-overlay");
  let activeCallData = null;
  let ringInterval = null;
  let callSecTimer = null;
  let callSeconds = 0;
  let callTyper = null;

  function stopCallTimersAndVoice() {
    clearInterval(ringInterval);
    ringInterval = null;
    clearInterval(callSecTimer);
    callSecTimer = null;
    if (callTyper && !callTyper.isDone()) callTyper.skip();
    if (window.SFX) SFX.stopSpeech();
    $("call-waveform").classList.remove("speaking");
  }

  function openInformantCall(call) {
    stopCallTimersAndVoice();
    activeCallData = call;
    $("call-header-text").textContent = call.header || "";
    $("call-caller-name").textContent = call.callerName || "";
    $("call-caller-sub").textContent = call.callerSub || "";
    $("btn-answer-call").textContent = call.answerButton || "";
    $("call-voice-badge").textContent = call.voiceBadge || "";
    $("btn-replay-tts").textContent = call.replayTtsButton || "";
    $("btn-hangup-call").textContent = call.hangupButton || "";

    $("call-stage-ring").classList.remove("hidden");
    $("call-stage-active").classList.add("hidden");
    callOverlay.classList.remove("hidden");

    if (window.SFX) SFX.ring();
    ringInterval = setInterval(() => {
      if (window.SFX) SFX.ring();
    }, 2100);
  }

  function playInformantVoice() {
    if (!activeCallData || !window.SFX) return;
    const wave = $("call-waveform");
    wave.classList.add("speaking");
    const started = SFX.speakHebrew(activeCallData.ttsText, {
      onStart: () => wave.classList.add("speaking"),
      onEnd: () => wave.classList.remove("speaking"),
    });
    if (!started) {
      // Keep waveform active while transcript types if device is muted or lacks TTS
      setTimeout(() => wave.classList.remove("speaking"), 4500);
    }
  }

  function answerInformantCall() {
    if (!activeCallData) return;
    clearInterval(ringInterval);
    ringInterval = null;
    if (window.SFX) SFX.radioSquelch();

    $("call-stage-ring").classList.add("hidden");
    $("call-stage-active").classList.remove("hidden");

    callSeconds = 0;
    $("call-duration").textContent = "00:00";
    callSecTimer = setInterval(() => {
      callSeconds++;
      $("call-duration").textContent = formatDuration(callSeconds);
    }, 1000);

    // Speak Hebrew TTS directly inside user click handler AND type live text transcript
    playInformantVoice();

    callTyper = typewrite($("call-transcript"), activeCallData.transcript, {
      charDelay: 42,
      jitter: 18,
      pauseDelay: 550,
      sound: false,
    });
  }

  function closeInformantCall() {
    const wasActive = !$("call-stage-active").classList.contains("hidden");
    stopCallTimersAndVoice();
    if (wasActive && window.SFX) SFX.radioSquelch();
    callOverlay.classList.add("hidden");
    activeCallData = null;
  }

  $("btn-answer-call").addEventListener("click", answerInformantCall);
  $("btn-replay-tts").addEventListener("click", playInformantVoice);
  $("call-transcript").addEventListener("click", () => {
    if (callTyper && !callTyper.isDone()) callTyper.skip();
  });
  $("btn-hangup-call").addEventListener("click", closeInformantCall);
  $("btn-close-call").addEventListener("click", closeInformantCall);
  callOverlay.addEventListener("click", (e) => {
    if (e.target === callOverlay) closeInformantCall();
  });

  function openViewer(item) {
    if (item && item.call) {
      openInformantCall(item.call);
      return;
    }

    $("viewer-title").textContent = item.title;
    $("viewer-error").classList.add("hidden");
    $("viewer-video-wrap").classList.remove("is-portrait");
    $("viewer-video-wrap").classList.toggle("hidden", !item.video);
    $("viewer-image").classList.toggle("hidden", !item.image);
    $("viewer-text").classList.toggle("hidden", !item.text);
    $("viewer-text").textContent = item.text || "";

    renderCapturedPhone(item.chat);
    renderUvScene(item.uvScene);
    renderViewerDoc(item.doc);

    if (typeof item.witnessIndex === "number") {
      activeViewerWitness = item.witnessIndex;
      quickStatement.value = caseFile["witness-" + item.witnessIndex + "-statement"] || "";
      quickViolations.value = caseFile["witness-" + item.witnessIndex + "-violations"] || "";
      syncQuickChips();
      $("viewer-quick-notes").classList.remove("hidden");
    } else {
      activeViewerWitness = null;
      $("viewer-quick-notes").classList.add("hidden");
    }

    if (item.image) $("viewer-image").src = item.image;
    if (!item.video && !item.image && !item.text && !item.doc && !item.chat && !item.uvScene) {
      $("viewer-video-wrap").classList.remove("hidden");
      $("viewer-error").classList.remove("hidden");
    }

    viewer.classList.remove("hidden");
    viewer.querySelector(".viewer-scroll").scrollTop = 0;

    if (item.video) {
      viewerVideo.src = item.video;
      const attempt = viewerVideo.play();
      if (attempt && attempt.catch) attempt.catch(() => {});
    }
  }

  function closeViewer() {
    viewerVideo.pause();
    viewerVideo.removeAttribute("src");
    viewerVideo.load();
    $("viewer-image").removeAttribute("src");
    activeViewerWitness = null;
    activeUvScene = null;
    viewer.classList.add("hidden");

    if (pendingTransmission) {
      pendingTransmission = false;
      setTimeout(showDeskTransmission, 220);
    }
  }

  viewerVideo.addEventListener("error", () => {
    if (viewerVideo.getAttribute("src")) $("viewer-error").classList.remove("hidden");
  });
  $("viewer-image").addEventListener("error", () => {
    if (!$("viewer-image").getAttribute("src")) return;
    $("viewer-image").classList.add("hidden");
    $("viewer-video-wrap").classList.remove("hidden");
    $("viewer-error").classList.remove("hidden");
  });
  $("btn-close-viewer").addEventListener("click", closeViewer);
  viewer.addEventListener("click", (e) => {
    if (e.target === viewer) closeViewer();
  });

  /* ---------- Suspect Tags & Witnesses ---------- */
  const TAGS = CONTENT.suspectTags;
  const witnessCardUI = [];

  function getWitnessTagObj(index) {
    const id = (progress.tags && progress.tags[index]) || "none";
    return TAGS.find((t) => t.id === id) || TAGS[0];
  }

  function applyTagClasses(el, tagId) {
    TAGS.forEach((t) => el.classList.remove("tag-" + t.id));
    if (tagId && tagId !== "none") el.classList.add("tag-" + tagId);
  }

  function cycleWitnessTag(index) {
    if (!progress.tags) progress.tags = {};
    const cur = getWitnessTagObj(index);
    const nextIdx = (TAGS.indexOf(cur) + 1) % TAGS.length;
    const next = TAGS[nextIdx];
    progress.tags[index] = next.id;
    saveProgress();
    if (window.SFX) SFX.click();
    syncWitnessTagsUI();
    renderSuspectBoard();
  }

  function syncWitnessTagsUI() {
    witnessCardUI.forEach(({ card, tagBtn }, index) => {
      const tag = getWitnessTagObj(index);
      tagBtn.textContent = tag.label;
      applyTagClasses(tagBtn, tag.id);
      applyTagClasses(card, tag.id);
    });
  }

  CONTENT.witnesses.forEach((witness, index) => {
    const card = document.createElement("div");
    card.className = "witness-card";
    card.setAttribute("role", "button");
    card.tabIndex = 0;

    const photo = document.createElement("div");
    photo.className = "witness-photo";
    const img = document.createElement("img");
    img.alt = witness.name;
    img.src = witness.photo;
    img.addEventListener("error", () => {
      img.remove();
      photo.classList.add("no-photo");
    });
    photo.appendChild(img);

    const watched = document.createElement("span");
    watched.className = "witness-watched";
    watched.classList.toggle("hidden", !progress.watched.includes(index));
    watched.textContent = CONTENT.watchedLabel;
    photo.appendChild(watched);

    const name = document.createElement("span");
    name.className = "witness-name";
    name.textContent = witness.name;

    card.append(photo, name);
    if (witness.role) {
      const role = document.createElement("span");
      role.className = "witness-role";
      role.textContent = witness.role;
      card.appendChild(role);
    }

    const tagBtn = document.createElement("button");
    tagBtn.type = "button";
    tagBtn.className = "suspect-tag-btn";
    tagBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cycleWitnessTag(index);
    });
    card.appendChild(tagBtn);

    const openStatement = () => {
      openViewer({
        title: CONTENT.statementTitlePrefix + witness.name,
        video: witness.video,
        witnessIndex: index,
      });
      watched.classList.remove("hidden");
      markDone("watched", index);
      updateTabCounts();
      renderSuspectBoard();
    };

    card.addEventListener("click", openStatement);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openStatement();
      }
    });

    $("witness-grid").appendChild(card);
    witnessCardUI.push({ card, tagBtn, watched });
  });

  syncWitnessTagsUI();

  /* ---------- Evidence & Background Video Preloader ---------- */
  const preloaderVideo = document.createElement("video");
  preloaderVideo.preload = "metadata";
  preloaderVideo.muted = true;
  preloaderVideo.style.display = "none";
  document.body.appendChild(preloaderVideo);

  function preloadSetEvidence(idx) {
    const set = CONTENT.questionSets[idx];
    if (!set || !set.evidence || !set.evidence.video) return;
    if (preloaderVideo.getAttribute("data-src") === set.evidence.video) return;
    preloaderVideo.setAttribute("data-src", set.evidence.video);
    preloaderVideo.src = set.evidence.video;
  }

  const evidenceCards = CONTENT.questionSets.map((set) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "evidence-card locked";
    card.disabled = true;

    const title = document.createElement("span");
    title.className = "evidence-title";
    title.textContent = set.evidence.title;

    const status = document.createElement("span");
    status.className = "evidence-status";
    status.textContent = CONTENT.evidenceLocked;

    card.append(title, status);
    card.addEventListener("click", () => openViewer(set.evidence));
    $("evidence-list").appendChild(card);
    return { card, status };
  });

  let newEvidenceCount = 0;

  function unlockEvidence(idx, silent) {
    const { card, status } = evidenceCards[idx];
    card.disabled = false;
    card.classList.remove("locked");
    status.textContent = CONTENT.evidenceOpenLabel;
    if (silent) return;
    newEvidenceCount++;
    $("evidence-badge").textContent = newEvidenceCount;
    $("evidence-badge").classList.remove("hidden");
    flashDecryptedToast(CONTENT.questionSets[idx].evidence.title);
    if (idx === 1 && !progress.seenTransmission) {
      progress.seenTransmission = true;
      saveProgress();
      pendingTransmission = true;
    }
  }

  $("evidence-badge").parentElement.addEventListener("click", () => {
    newEvidenceCount = 0;
  });

  /* ---------- Questions (Per-Device Option Shuffle + Escalating Cooldown + Takeaway) ---------- */
  const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו"];
  let setIndex = Math.min(progress.setIndex, CONTENT.questionSets.length);
  let questionIndex = progress.questionIndex;
  let cooldownTimer = null;
  let currentOptionButtons = [];

  for (let i = 0; i < setIndex; i++) unlockEvidence(i, true);

  function getShuffledOrder(length, sIdx, qIdx) {
    const indices = Array.from({ length }, (_, i) => i);
    let seed = fnv1a(progress.quizSeed + ":" + sIdx + ":" + qIdx) || 1;
    for (let i = length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    return indices;
  }

  function updateTabCounts() {
    const sets = CONTENT.questionSets;
    const totalQ = sets.reduce((sum, s) => sum + s.questions.length, 0);
    const doneBefore = sets.slice(0, setIndex).reduce((sum, s) => sum + s.questions.length, 0);
    const answeredQ = Math.min(totalQ, doneBefore + (sets[setIndex] ? questionIndex : 0));

    $("count-witnesses").textContent = progress.watched.length + "/" + CONTENT.witnesses.length;
    $("count-questions").textContent = answeredQ + "/" + totalQ;
    $("count-evidence").textContent = Math.min(setIndex, sets.length) + "/" + sets.length;
    $("count-desk").textContent = progress.deskDone.length + "/" + CONTENT.witnesses.length;
  }

  function renderQuestion() {
    clearInterval(cooldownTimer);
    const feedback = $("question-feedback");
    const takeaway = $("question-takeaway");
    const nextBtn = $("btn-next-question");
    const optionsEl = $("question-options");
    feedback.textContent = "";
    feedback.className = "question-feedback";
    takeaway.textContent = "";
    takeaway.classList.add("hidden");
    nextBtn.classList.add("hidden");
    optionsEl.textContent = "";
    currentOptionButtons = [];
    updateTabCounts();

    const set = CONTENT.questionSets[setIndex];
    if (!set) {
      $("question-progress").textContent = "";
      $("question-text").textContent = CONTENT.allQuestionsDone;
      return;
    }

    preloadSetEvidence(setIndex);

    const question = set.questions[questionIndex];
    const sets = CONTENT.questionSets;
    const countBefore = sets.slice(0, setIndex).reduce((sum, s) => sum + s.questions.length, 0);
    const total = sets.reduce((sum, s) => sum + s.questions.length, 0);
    $("question-progress").textContent =
      CONTENT.questionProgress.replace("{n}", countBefore + questionIndex + 1).replace("{total}", total) +
      " // " +
      CONTENT.questionReward.replace("{title}", set.evidence.title);
    $("question-text").textContent = question.text;

    const order = getShuffledOrder(question.options.length, setIndex, questionIndex);
    const buttons = order.map((origIdx, displayIdx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = LETTERS[displayIdx];
      const label = document.createElement("span");
      label.textContent = question.options[origIdx];
      btn.append(letter, label);
      btn.addEventListener("click", () => answer(displayIdx, origIdx, buttons, question));
      optionsEl.appendChild(btn);
      return btn;
    });
    currentOptionButtons = buttons;
  }

  function answer(displayIdx, origIdx, buttons, question) {
    const feedback = $("question-feedback");
    const takeaway = $("question-takeaway");

    if (origIdx !== question.correct) {
      if (window.SFX) SFX.wrong();
      buttons[displayIdx].classList.add("wrong");
      progress.wrongCount = (progress.wrongCount || 0) + 1;
      const attemptIdx = progress.currentQWrong || 0;
      progress.currentQWrong = attemptIdx + 1;
      saveProgress();

      const cooldowns = CONTENT.retryCooldownsMs || [CONTENT.retryDelayMs];
      const delayMs = cooldowns[Math.min(attemptIdx, cooldowns.length - 1)];
      let remainingSec = Math.ceil(delayMs / 1000);

      feedback.className = "question-feedback wrong";
      feedback.textContent = CONTENT.wrongCooldownFeedback.replace("{s}", remainingSec);
      buttons.forEach((b) => (b.disabled = true));

      clearInterval(cooldownTimer);
      cooldownTimer = setInterval(() => {
        remainingSec--;
        if (remainingSec > 0) {
          feedback.textContent = CONTENT.wrongCooldownFeedback.replace("{s}", remainingSec);
        } else {
          clearInterval(cooldownTimer);
          feedback.textContent = CONTENT.wrongFeedback;
          buttons.forEach((b) => {
            if (!b.classList.contains("wrong")) b.disabled = false;
          });
        }
      }, 1000);
      return;
    }

    clearInterval(cooldownTimer);
    progress.currentQWrong = 0;
    buttons[displayIdx].classList.add("correct");
    buttons.forEach((b) => (b.disabled = true));
    feedback.textContent = CONTENT.correctFeedback;
    feedback.className = "question-feedback correct";

    if (question.takeaway) {
      takeaway.textContent = CONTENT.takeawayPrefix + question.takeaway;
      takeaway.classList.remove("hidden");
    }

    const set = CONTENT.questionSets[setIndex];
    const nextBtn = $("btn-next-question");
    const finishedSet = questionIndex === set.questions.length - 1;

    if (finishedSet) {
      if (window.SFX) SFX.unlock();
      const unlockedIndex = setIndex;
      unlockEvidence(unlockedIndex);
      feedback.textContent = CONTENT.correctFeedback + " " + CONTENT.evidenceUnlocked;
      setIndex++;
      questionIndex = 0;
      updateFinalButtons();
      nextBtn.textContent = CONTENT.viewEvidenceButton;
      nextBtn.onclick = () => {
        renderQuestion();
        showTab("evidence");
        newEvidenceCount = 0;
        openViewer(CONTENT.questionSets[unlockedIndex].evidence);
      };
    } else {
      if (window.SFX) SFX.correct();
      questionIndex++;
      nextBtn.textContent = CONTENT.nextQuestionButton;
      nextBtn.onclick = renderQuestion;
    }

    progress.setIndex = setIndex;
    progress.questionIndex = questionIndex;
    saveProgress();
    updateTabCounts();
    reveal(nextBtn);
  }

  /* ---------- Case File, Suspect Board & Violation Chips ---------- */
  function bindField(el, key, onAfterInput) {
    el.value = caseFile[key] || "";
    el.addEventListener("input", () => {
      caseFile[key] = el.value;
      saveCaseFile();
      if (onAfterInput) onAfterInput();
    });
  }

  const suspectSelect = $("suspect-select");
  const suspectOther = $("suspect-other");
  const suspectOptions = [["", CONTENT.suspectPlaceholder]]
    .concat(CONTENT.witnesses.map((w) => [w.name, w.name]))
    .concat([[OTHER, CONTENT.suspectOtherOption]]);
  suspectOptions.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    suspectSelect.appendChild(option);
  });

  suspectOther.placeholder = CONTENT.suspectOtherPlaceholder;
  bindField(suspectSelect, "suspect");

  let lastEasterEggTrigger = "";
  bindField(suspectOther, "suspectOther", () => {
    const val = suspectOther.value.trim();
    const triggers = (CONTENT.deskEasterEgg && CONTENT.deskEasterEgg.triggers) || [];
    const matched = triggers.find((t) => val === t || val.includes(t));
    if (matched && matched !== lastEasterEggTrigger) {
      lastEasterEggTrigger = matched;
      showEasterEgg();
    } else if (!matched) {
      lastEasterEggTrigger = "";
    }
  });

  const syncSuspectOther = () => suspectOther.classList.toggle("hidden", suspectSelect.value !== OTHER);
  suspectSelect.addEventListener("change", syncSuspectOther);
  syncSuspectOther();

  const suspectViolationsEl = $("suspect-violations");
  suspectViolationsEl.placeholder = CONTENT.textPlaceholder;
  const syncSuspectChips = buildViolationChips(
    $("suspect-chips"),
    () => suspectViolationsEl.value,
    (val) => {
      suspectViolationsEl.value = val;
      caseFile.suspectViolations = val;
      saveCaseFile();
      syncSuspectChips();
    }
  );
  bindField(suspectViolationsEl, "suspectViolations", syncSuspectChips);
  syncSuspectChips();

  CONTENT.witnesses.forEach((witness, i) => {
    const card = document.createElement("div");
    card.className = "file-card";
    card.id = "witness-file-card-" + i;

    const title = document.createElement("h3");
    title.className = "file-card-title";
    title.textContent = i + 1 + ". " + witness.name;
    card.appendChild(title);

    const stId = "witness-" + i + "-statement";
    const stLabel = document.createElement("label");
    stLabel.className = "field-label";
    stLabel.htmlFor = stId;
    stLabel.textContent = CONTENT.witnessStatementLabel;
    const stArea = document.createElement("textarea");
    stArea.className = "field";
    stArea.id = stId;
    stArea.rows = 3;
    stArea.placeholder = CONTENT.textPlaceholder;
    bindField(stArea, stId, () => {
      if (activeViewerWitness === i) quickStatement.value = stArea.value;
      renderSuspectBoard();
    });

    const viId = "witness-" + i + "-violations";
    const viLabel = document.createElement("label");
    viLabel.className = "field-label";
    viLabel.htmlFor = viId;
    viLabel.textContent = CONTENT.witnessViolationsLabel;

    const chipsWrap = document.createElement("div");
    chipsWrap.className = "violation-chips no-print";

    const viArea = document.createElement("textarea");
    viArea.className = "field";
    viArea.id = viId;
    viArea.rows = 3;
    viArea.placeholder = CONTENT.textPlaceholder;

    const syncChips = buildViolationChips(
      chipsWrap,
      () => viArea.value,
      (val) => {
        viArea.value = val;
        caseFile[viId] = val;
        saveCaseFile();
        syncChips();
        if (activeViewerWitness === i) {
          quickViolations.value = val;
          syncQuickChips();
        }
        renderSuspectBoard();
      }
    );

    bindField(viArea, viId, () => {
      syncChips();
      if (activeViewerWitness === i) {
        quickViolations.value = viArea.value;
        syncQuickChips();
      }
      renderSuspectBoard();
    });
    syncChips();

    card.append(stLabel, stArea, viLabel, chipsWrap, viArea);
    $("witness-files").appendChild(card);
    witnessFieldRefs.push({ statement: stArea, violations: viArea, syncChips });
  });

  /* ---------- Suspect Tracking & Connections Board ---------- */
  function syncBoardVisibility() {
    $("suspect-board").classList.toggle("hidden", Boolean(progress.boardHidden));
    $("btn-toggle-board").textContent = progress.boardHidden ? CONTENT.boardToggleShow : CONTENT.boardToggleHide;
  }

  $("btn-toggle-board").addEventListener("click", () => {
    progress.boardHidden = !progress.boardHidden;
    saveProgress();
    syncBoardVisibility();
  });
  syncBoardVisibility();

  function renderSuspectBoard() {
    const board = $("suspect-board");
    board.textContent = "";
    CONTENT.witnesses.forEach((w, i) => {
      const row = document.createElement("div");
      const tag = getWitnessTagObj(i);
      row.className = "board-row";
      applyTagClasses(row, tag.id);

      const nameEl = document.createElement("span");
      nameEl.className = "board-name";
      nameEl.textContent = i + 1 + ". " + w.name;
      nameEl.addEventListener("click", () => {
        const target = $("witness-file-card-" + i);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      const indicators = document.createElement("div");
      indicators.className = "board-indicators";

      const pWatch = document.createElement("span");
      pWatch.className = "board-pill" + (progress.watched.includes(i) ? " done" : "");
      pWatch.textContent = "עדות";

      const pDesk = document.createElement("span");
      pDesk.className = "board-pill" + (progress.deskDone.includes(i) ? " done" : "");
      pDesk.textContent = "דסק";

      const hasNotes =
        Boolean((caseFile["witness-" + i + "-statement"] || "").trim()) ||
        Boolean((caseFile["witness-" + i + "-violations"] || "").trim());
      const pNotes = document.createElement("span");
      pNotes.className = "board-pill" + (hasNotes ? " done" : "");
      pNotes.textContent = "רישום";

      indicators.append(pWatch, pDesk, pNotes);

      if (progress.polygraphIndex === i) {
        const pPoly = document.createElement("span");
        pPoly.className = "board-pill poly";
        pPoly.textContent = "פוליגרף";
        indicators.appendChild(pPoly);
      }

      const tagBtn = document.createElement("button");
      tagBtn.type = "button";
      tagBtn.className = "suspect-tag-btn";
      tagBtn.textContent = tag.label;
      applyTagClasses(tagBtn, tag.id);
      tagBtn.addEventListener("click", () => cycleWitnessTag(i));

      row.append(nameEl, indicators, tagBtn);
      board.appendChild(row);
    });
  }

  renderSuspectBoard();

  /* ---------- Anti-Tamper Verification Code & Export ---------- */
  function buildVerificationCode() {
    const v = progress.finalSuspect !== undefined ? progress.finalSuspect : 9;
    const c = v === CONTENT.criminalIndex ? 1 : 0;
    const t = Math.min(46655, Math.max(0, Math.floor(getEffectiveTimeSec())))
      .toString(36)
      .toUpperCase()
      .padStart(3, "0");
    const w = Math.min(1295, Math.max(0, progress.wrongCount || 0))
      .toString(36)
      .toUpperCase()
      .padStart(2, "0");
    const p = progress.polygraphIndex !== null && progress.polygraphIndex !== undefined ? progress.polygraphIndex : 9;
    const e = Math.min(9, setIndex);

    const payload = "" + v + c + t + w + p + e;
    const teamNorm = getTeamName().trim().toLowerCase();
    const teamSig = (fnv1a("TAHAROOT_TEAM_26|" + teamNorm + "|" + payload) & 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
    const globalSig = (fnv1a("TAHAROOT_GLOBAL_26|" + payload) & 0xff)
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");

    return "MZ-" + payload + "-" + teamSig + globalSig;
  }

  function decodeAndVerifyText(rawInput) {
    const text = (rawInput || "").trim();
    const match = text.match(/MZ-([0-9A-Z]{9})-([0-9A-F]{6})/i);
    if (!match) return { valid: false, reason: "לא נמצא קוד אימות תקין בטקסט שהודבק." };

    const payload = match[1].toUpperCase();
    const sig = match[2].toUpperCase();
    const teamSig = sig.slice(0, 4);
    const globalSig = sig.slice(4, 6);

    const expectedGlobal = (fnv1a("TAHAROOT_GLOBAL_26|" + payload) & 0xff)
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");

    if (globalSig !== expectedGlobal) {
      return { valid: false, reason: "קוד האימות מזויף או שונה ידנית!" };
    }

    const v = parseInt(payload[0], 10);
    const c = parseInt(payload[1], 10);
    const timeSec = parseInt(payload.slice(2, 5), 36);
    const wrongCount = parseInt(payload.slice(5, 7), 36);
    const polyIdx = parseInt(payload[7], 10);
    const evCount = parseInt(payload[8], 10);

    // If full WhatsApp text was pasted, verify visible fields haven't been altered!
    const teamLine = text.match(new RegExp(CONTENT.exportTeamLabel + ":\\s*(.+)"));
    if (teamLine) {
      const pastedTeam = teamLine[1].trim().toLowerCase();
      const expectedTeamSig = (fnv1a("TAHAROOT_TEAM_26|" + pastedTeam + "|" + payload) & 0xffff)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0");
      if (teamSig !== expectedTeamSig) {
        return { valid: false, reason: "שם הצוות בהודעה שונה ידנית לאחר הפקת הקוד!" };
      }
    }

    const timeLine = text.match(new RegExp(CONTENT.exportTimeLabel + ":\\s*([0-9:]+)"));
    if (timeLine && timeLine[1].trim() !== formatDuration(timeSec)) {
      return { valid: false, reason: "זמן החקירה בהודעה נערך ידנית ואינו תואם לקוד!" };
    }

    const wrongLine = text.match(new RegExp(CONTENT.exportMistakesLabel + ":\\s*(\\d+)"));
    if (wrongLine && parseInt(wrongLine[1], 10) !== wrongCount) {
      return { valid: false, reason: "מספר הטעויות בהודעה נערך ידנית ואינו תואם לקוד!" };
    }

    const verdictName =
      v >= 0 && v < CONTENT.witnesses.length ? CONTENT.witnesses[v].name : CONTENT.exportPendingVerdict;

    return {
      valid: true,
      code: "MZ-" + payload + "-" + sig,
      verdictName,
      correct: c === 1 && v === CONTENT.criminalIndex,
      submitted: v !== 9,
      timeFormatted: formatDuration(timeSec),
      wrongCount,
      evidenceCount: evCount + "/" + CONTENT.questionSets.length,
      polygraphUsedOn:
        polyIdx >= 0 && polyIdx < CONTENT.witnesses.length ? CONTENT.witnesses[polyIdx].name : "לא נוצל",
    };
  }

  function getSquadRank() {
    if (progress.finalSuspect === undefined) return "";
    if (progress.finalSuspect !== CONTENT.criminalIndex) return CONTENT.ranks.wrong;
    const w = progress.wrongCount || 0;
    if (w === 0) return CONTENT.ranks.perfect;
    if (w <= 3) return CONTENT.ranks.great;
    return CONTENT.ranks.good;
  }

  function caseFileAsText() {
    const blank = (v) => (v && v.trim()) || CONTENT.noAnswer;
    const suspect = caseFile.suspect === OTHER ? caseFile.suspectOther : caseFile.suspect;
    const finalVerdict =
      progress.finalSuspect !== undefined && CONTENT.witnesses[progress.finalSuspect]
        ? CONTENT.witnesses[progress.finalSuspect].name
        : CONTENT.exportPendingVerdict;

    const lines = [
      CONTENT.caseFileExportTitle + " (" + CONTENT.caseIdPrefix + getCaseNumber() + ")",
      CONTENT.exportTeamLabel + ": " + getTeamName(),
      CONTENT.exportTimeLabel + ": " + formatDuration(getEffectiveTimeSec()),
      CONTENT.exportMistakesLabel + ": " + (progress.wrongCount || 0),
      CONTENT.exportVerdictLabel + ": " + finalVerdict,
      CONTENT.exportVerifyLabel + ": " + buildVerificationCode(),
      "------------------------",
      CONTENT.suspectTitle + ": " + blank(suspect),
      CONTENT.suspectViolationsLabel + ": " + blank(caseFile.suspectViolations),
    ];
    CONTENT.witnesses.forEach((witness, i) => {
      lines.push(
        "",
        i + 1 + ". " + witness.name,
        CONTENT.witnessStatementLabel + ": " + blank(caseFile["witness-" + i + "-statement"]),
        CONTENT.witnessViolationsLabel + ": " + blank(caseFile["witness-" + i + "-violations"])
      );
    });
    return lines.join("\n");
  }

  $("btn-share-file").addEventListener("click", async () => {
    const text = caseFileAsText();
    if (navigator.share) {
      try {
        await navigator.share({ title: CONTENT.caseFileExportTitle, text });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      $("share-feedback").textContent = CONTENT.copiedFeedback;
      if (window.SFX) SFX.correct();
    } catch (e) {}
  });

  $("btn-print-file").addEventListener("click", () => {
    $("print-dossier-header").textContent =
      CONTENT.caseFileExportTitle +
      " // " +
      CONTENT.caseIdPrefix +
      getCaseNumber() +
      "\n" +
      CONTENT.exportTeamLabel +
      ": " +
      getTeamName() +
      " | " +
      CONTENT.exportTimeLabel +
      ": " +
      formatDuration(getEffectiveTimeSec()) +
      " | " +
      CONTENT.exportVerifyLabel +
      ": " +
      buildVerificationCode();
    window.print();
  });

  /* ---------- Canvas "Case Closed" Verdict Card Generator ---------- */
  function generateVerdictCard() {
    const canvas = document.createElement("canvas");
    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext("2d");

    // Background + CRT Scanlines
    g.fillStyle = "#050a07";
    g.fillRect(0, 0, W, H);

    const grad = g.createRadialGradient(W / 2, H * 0.35, 60, W / 2, H * 0.45, 760);
    grad.addColorStop(0, "rgba(57, 255, 122, 0.12)");
    grad.addColorStop(1, "rgba(5, 10, 7, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    g.fillStyle = "rgba(0, 0, 0, 0.24)";
    for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);

    // Outer Frame
    g.strokeStyle = "#39ff7a";
    g.lineWidth = 4;
    g.strokeRect(48, 48, W - 96, H - 96);
    g.strokeStyle = "#1c3a26";
    g.lineWidth = 2;
    g.strokeRect(64, 64, W - 128, H - 128);

    g.direction = "rtl";
    g.textAlign = "center";

    // Top Classified Badge
    g.strokeStyle = "#ffb648";
    g.lineWidth = 2;
    g.strokeRect(W / 2 - 140, 108, 280, 52);
    g.fillStyle = "#ffb648";
    g.font = "600 28px 'IBM Plex Mono', 'Heebo', monospace";
    g.fillText(CONTENT.startBadge + " // מצ״ח", W / 2, 144);

    // Main Title & Team
    g.fillStyle = "#39ff7a";
    g.font = "900 84px 'Heebo', sans-serif";
    g.fillText(CONTENT.title, W / 2, 260);

    g.fillStyle = "#b8f5c8";
    g.font = "700 42px 'Heebo', sans-serif";
    g.fillText(CONTENT.caseIdPrefix + getCaseNumber() + " · " + getTeamName(), W / 2, 330);

    // Stamp
    const isCorrect = progress.finalSuspect === CONTENT.criminalIndex;
    const stampText =
      progress.finalSuspect === undefined
        ? CONTENT.caseHeader
        : isCorrect
        ? CONTENT.finalStamp
        : CONTENT.finalStampWrong;
    const stampColor = isCorrect ? "#ff4d4d" : "#ffb648";

    g.save();
    g.translate(W / 2, 455);
    g.rotate(-0.09);
    g.strokeStyle = stampColor;
    g.lineWidth = 8;
    g.strokeRect(-235, -58, 470, 112);
    g.fillStyle = stampColor;
    g.font = "900 66px 'Heebo', sans-serif";
    g.fillText(stampText, 0, 22);
    g.restore();

    // Rank & Suspect Box
    g.fillStyle = "#0a140e";
    g.strokeStyle = "#1c3a26";
    g.lineWidth = 3;
    g.fillRect(110, 565, W - 220, 250);
    g.strokeRect(110, 565, W - 220, 250);

    const submittedName =
      progress.finalSuspect !== undefined && CONTENT.witnesses[progress.finalSuspect]
        ? CONTENT.witnesses[progress.finalSuspect].name
        : CONTENT.exportPendingVerdict;

    g.fillStyle = "#ffb648";
    g.font = "600 30px 'Heebo', sans-serif";
    g.fillText("הכרעת הצוות:", W / 2, 628);

    g.fillStyle = "#39ff7a";
    g.font = "900 48px 'Heebo', sans-serif";
    g.fillText(submittedName, W / 2, 698);

    const rank = getSquadRank();
    if (rank) {
      g.fillStyle = "#b8f5c8";
      g.font = "700 34px 'Heebo', sans-serif";
      g.fillText("דרגת צוות: " + rank, W / 2, 770);
    }

    // Stats Grid
    const stats = [
      ["זמן חקירה", formatDuration(getEffectiveTimeSec())],
      ["טעויות בשאלות", String(progress.wrongCount || 0)],
      ["ראיות שפוענחו", Math.min(setIndex, CONTENT.questionSets.length) + "/" + CONTENT.questionSets.length],
      ["עדים שנבדקו בדסק", progress.deskDone.length + "/" + CONTENT.witnesses.length],
    ];

    stats.forEach(([label, val], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = col === 0 ? 560 : 110;
      const by = 855 + row * 145;
      const bw = 410;
      const bh = 120;

      g.fillStyle = "#07100b";
      g.strokeStyle = "#1c3a26";
      g.lineWidth = 2;
      g.fillRect(bx, by, bw, bh);
      g.strokeRect(bx, by, bw, bh);

      g.fillStyle = "#ffb648";
      g.font = "400 26px 'Heebo', sans-serif";
      g.fillText(label, bx + bw / 2, by + 46);

      g.fillStyle = "#39ff7a";
      g.font = "700 40px 'IBM Plex Mono', 'Heebo', monospace";
      g.fillText(val, bx + bw / 2, by + 98);
    });

    // Verification Footer
    const code = buildVerificationCode();
    g.direction = "ltr";
    g.fillStyle = "#b8f5c8";
    g.font = "600 30px 'IBM Plex Mono', monospace";
    g.fillText("VERIFY // " + code, W / 2, 1225);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const fileName = "taharoot-case-" + getCaseNumber() + ".png";
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: CONTENT.caseFileExportTitle,
            files: [file],
          });
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      $("share-feedback").textContent = CONTENT.cardSavedFeedback;
    }, "image/png");
  }

  $("btn-final-card").addEventListener("click", generateVerdictCard);
  $("btn-case-card").addEventListener("click", generateVerdictCard);

  /* ---------- Desk Analysis + Per-Witness Logs + 1-Time Polygraph ---------- */
  const deskOverlay = $("desk-overlay");
  const deskTeamPhoto = $("desk-team-photo");
  if (CONTENT.deskTeamPhoto) {
    deskTeamPhoto.src = CONTENT.deskTeamPhoto;
    deskTeamPhoto.addEventListener("error", () => deskTeamPhoto.classList.add("hidden"));
  } else {
    deskTeamPhoto.classList.add("hidden");
  }
  const deskVideo = $("desk-video");
  let deskRun = 0;
  let deskTimers = [];
  let deskTyper = null;
  let deskWitness = null;

  function fillPhoto(container, witness) {
    container.textContent = "";
    container.classList.remove("no-photo");
    const img = document.createElement("img");
    img.alt = witness.name;
    img.src = witness.photo;
    img.addEventListener("error", () => {
      img.remove();
      container.classList.add("no-photo");
    });
    container.appendChild(img);
  }

  function updatePolygraphBanner() {
    const banner = $("polygraph-banner");
    const usedIdx = progress.polygraphIndex;
    if (usedIdx !== null && usedIdx !== undefined && CONTENT.witnesses[usedIdx]) {
      banner.textContent = CONTENT.polygraphTokenUsed.replace("{name}", CONTENT.witnesses[usedIdx].name);
      banner.classList.add("used");
    } else {
      banner.textContent = CONTENT.polygraphTokenAvailable;
      banner.classList.remove("used");
    }
  }

  const deskRowUI = CONTENT.witnesses.map((witness, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "desk-item";

    const photo = document.createElement("div");
    photo.className = "witness-photo desk-thumb";
    fillPhoto(photo, witness);

    const name = document.createElement("span");
    name.className = "desk-item-name";
    name.textContent = witness.name;

    const badges = document.createElement("span");
    badges.className = "desk-badges";

    const polyTag = document.createElement("span");
    polyTag.className = "desk-poly-tag";
    polyTag.textContent = "פוליגרף";
    polyTag.classList.toggle("hidden", progress.polygraphIndex !== index);

    const done = document.createElement("span");
    done.className = "desk-done";
    done.classList.toggle("hidden", !progress.deskDone.includes(index));
    done.textContent = CONTENT.deskDoneLabel;

    badges.append(polyTag, done);
    item.append(photo, name, badges);
    item.addEventListener("click", () => openDesk(witness));
    $("desk-list").appendChild(item);
    return { done, polyTag };
  });

  updatePolygraphBanner();

  function deskLater(fn, ms) {
    deskTimers.push(setTimeout(fn, ms));
  }

  function showDeskStage(name) {
    ["video", "process", "result"].forEach((s) => {
      $("desk-stage-" + s).classList.toggle("hidden", s !== name);
    });
  }

  function stopDeskVideo() {
    deskVideo.pause();
    deskVideo.removeAttribute("src");
    deskVideo.load();
  }

  function openDesk(witness) {
    deskRun++;
    deskWitness = witness;
    deskOverlay.classList.remove("hidden");

    const wIdx = CONTENT.witnesses.indexOf(witness);
    // If already analyzed earlier, still allow viewing results fast or re-running? Let's skip process if already done?
    // Wait: keeping the fun animation on click or jumping straight to result? Let's run process, or let them click to skip!
    if (!CONTENT.deskVideo) {
      runDeskProcess(deskRun, wIdx);
      return;
    }
    showDeskStage("video");
    deskVideo.src = CONTENT.deskVideo;
    const attempt = deskVideo.play();
    if (attempt && attempt.catch) attempt.catch(() => {});
  }

  function deskVideoDone() {
    if (deskOverlay.classList.contains("hidden")) return;
    if ($("desk-stage-video").classList.contains("hidden")) return;
    stopDeskVideo();
    runDeskProcess(deskRun);
  }

  deskVideo.addEventListener("ended", deskVideoDone);
  deskVideo.addEventListener("error", () => {
    if (deskVideo.getAttribute("src")) deskVideoDone();
  });
  $("btn-desk-skip").addEventListener("click", deskVideoDone);

  function buildWitnessDeskLines(witness) {
    const grandma = witness.gender === "f" ? "סבתא שלה" : "סבתא שלו";
    const base = CONTENT.deskLog.map((l) => l.split("{name}").join(witness.name).split("{grandma}").join(grandma));
    if (Array.isArray(witness.deskExtraLog) && witness.deskExtraLog.length) {
      const merged = base.slice(0, 5).concat(witness.deskExtraLog, base.slice(5));
      return merged;
    }
    return base;
  }

  function runDeskProcess(run) {
    showDeskStage("process");
    const log = $("desk-log");
    const bar = $("desk-progress-bar");
    const label = $("desk-progress-label");
    log.textContent = "";
    bar.style.width = "0%";

    const lines = buildWitnessDeskLines(deskWitness);
    const duration = CONTENT.deskDurationMs;
    const lineGap = duration / (lines.length + 1);

    lines.forEach((line, i) => {
      deskLater(() => {
        if (run !== deskRun) return;
        const row = document.createElement("div");
        row.className = "desk-log-line";
        row.textContent = line;
        log.appendChild(row);
        log.scrollTop = log.scrollHeight;
        if (window.SFX) SFX.scanBlip((i + 1) / lines.length);
      }, lineGap * (i + 1));
    });

    const start = Date.now();
    (function tick() {
      if (run !== deskRun) return;
      const p = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      bar.style.width = p + "%";
      label.textContent = CONTENT.deskProgressLabel.replace("{p}", p);
      if (p < 100) deskLater(tick, 80);
      else deskLater(() => run === deskRun && showDeskResult(), 450);
    })();
  }

  function renderPolygraphSection(witnessIndex) {
    const witness = CONTENT.witnesses[witnessIndex];
    const section = $("desk-polygraph-section");
    const runBtn = $("btn-run-polygraph");
    const scanning = $("polygraph-scanning");
    const output = $("polygraph-output");
    const outputText = $("polygraph-output-text");
    const lockedNote = $("polygraph-locked-note");

    if (!witness.polygraph) {
      section.classList.add("hidden");
      return;
    }

    section.classList.remove("hidden");
    scanning.classList.add("hidden");
    runBtn.classList.add("hidden");
    output.classList.add("hidden");
    lockedNote.classList.add("hidden");

    const usedIdx = progress.polygraphIndex;
    if (usedIdx === null || usedIdx === undefined) {
      runBtn.classList.remove("hidden");
      runBtn.onclick = () => {
        if (!confirm(CONTENT.polygraphConfirm.replace("{name}", witness.name))) return;
        progress.polygraphIndex = witnessIndex;
        saveProgress();
        deskRowUI[witnessIndex].polyTag.classList.remove("hidden");
        updatePolygraphBanner();
        renderSuspectBoard();

        runBtn.classList.add("hidden");
        scanning.classList.remove("hidden");
        const curRun = deskRun;
        [0.2, 0.45, 0.7, 0.95].forEach((r, idx) => {
          deskLater(() => {
            if (curRun === deskRun && window.SFX) SFX.scanBlip(r);
          }, (idx + 1) * 420);
        });
        deskLater(() => {
          if (curRun !== deskRun) return;
          scanning.classList.add("hidden");
          outputText.textContent = witness.polygraph;
          output.classList.remove("hidden");
          if (window.SFX) SFX.alert();
        }, 2000);
      };
    } else if (usedIdx === witnessIndex) {
      outputText.textContent = witness.polygraph;
      output.classList.remove("hidden");
    } else {
      const otherName = CONTENT.witnesses[usedIdx] ? CONTENT.witnesses[usedIdx].name : "";
      lockedNote.textContent = CONTENT.polygraphLockedNote.replace("{name}", otherName);
      lockedNote.classList.remove("hidden");
    }
  }

  function showDeskResult() {
    const witness = deskWitness;
    const index = CONTENT.witnesses.indexOf(witness);
    showDeskStage("result");
    fillPhoto($("desk-photo"), witness);
    $("desk-name").textContent = witness.name;
    $("desk-polygraph-section").classList.add("hidden");
    $("btn-desk-back").classList.add("hidden");

    const text = witness.desk.map((f) => "▸ " + f).join("|\n\n");
    deskTyper = typewrite($("desk-findings"), text, {
      charDelay: 32,
      jitter: 18,
      punctuationDelay: 180,
      pauseDelay: 420,
      onDone: () => {
        deskRowUI[index].done.classList.remove("hidden");
        markDone("deskDone", index);
        updateTabCounts();
        renderSuspectBoard();
        renderPolygraphSection(index);
        reveal($("btn-desk-back"));
      },
    });
  }

  $("desk-findings").addEventListener("click", () => {
    if (deskTyper && !deskTyper.isDone()) deskTyper.skip();
  });

  function closeDesk() {
    deskRun++;
    deskTimers.forEach(clearTimeout);
    deskTimers = [];
    if (deskTyper && !deskTyper.isDone()) deskTyper.skip();
    stopDeskVideo();
    deskOverlay.classList.add("hidden");
  }

  $("btn-close-desk").addEventListener("click", closeDesk);
  $("btn-desk-back").addEventListener("click", closeDesk);
  deskOverlay.addEventListener("click", (e) => {
    if (e.target === deskOverlay) closeDesk();
  });

  /* ---------- Final Suspect & Verdict Reveal ---------- */
  const finalVideo = $("final-video");
  let finalChoice = null;
  let finalSkipTimer = null;

  function updateFinalButtons() {
    const ready = setIndex >= CONTENT.questionSets.length;
    document.querySelectorAll(".btn-to-final").forEach((b) => b.classList.toggle("hidden", !ready));
    $("btn-case-card").classList.toggle("hidden", progress.finalSuspect === undefined);
  }

  function showFinalStage(name) {
    $("final-pick").classList.toggle("hidden", name !== "pick");
    $("final-video-stage").classList.toggle("hidden", name !== "video");
    $("final-end").classList.toggle("hidden", name !== "end");
  }

  const finalCards = CONTENT.witnesses.map((witness, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "witness-card final-card";
    const photo = document.createElement("div");
    photo.className = "witness-photo";
    fillPhoto(photo, witness);
    const name = document.createElement("span");
    name.className = "witness-name";
    name.textContent = witness.name;
    card.append(photo, name);
    card.addEventListener("click", () => selectFinal(index));
    $("final-grid").appendChild(card);
    return card;
  });

  function selectFinal(index) {
    finalChoice = index;
    if (window.SFX) SFX.click();
    finalCards.forEach((c, i) => c.classList.toggle("selected", i === index));
    $("btn-final-submit").disabled = false;
  }

  function openFinal() {
    showScreen("final");
    if (progress.finalSuspect !== undefined) {
      showFinalEnd(true);
      return;
    }
    showFinalStage("pick");
    const preset = CONTENT.witnesses.findIndex((w) => w.name === caseFile.suspect);
    if (preset >= 0 && finalChoice === null) selectFinal(preset);
  }

  document.querySelectorAll(".btn-to-final").forEach((b) => b.addEventListener("click", openFinal));
  $("btn-final-back").addEventListener("click", () => showScreen("case"));

  $("btn-final-submit").addEventListener("click", () => {
    if (finalChoice === null) return;
    const name = CONTENT.witnesses[finalChoice].name;
    if (!confirm(CONTENT.finalConfirm.replace("{name}", name))) return;
    progress.finalSuspect = finalChoice;
    if (progress.finalTimeSec === null || progress.finalTimeSec === undefined) {
      progress.finalTimeSec = progress.elapsedSec || 0;
    }
    saveProgress();
    updateHeaderMeta();
    updateFinalButtons();
    playFinalVideo();
  });

  function playFinalVideo() {
    showFinalStage("video");
    $("final-video-error").classList.add("hidden");
    $("btn-final-video-skip").classList.add("hidden");
    finalVideo.src = CONTENT.finalVideo;
    const attempt = finalVideo.play();
    if (attempt && attempt.catch) {
      attempt.catch(() => {
        if (!finalVideo.error) finalVideo.controls = true;
      });
    }
    clearTimeout(finalSkipTimer);
    finalSkipTimer = setTimeout(() => reveal($("btn-final-video-skip")), SKIP_DELAY_MS);
  }

  function finalVideoDone() {
    if ($("final-video-stage").classList.contains("hidden")) return;
    clearTimeout(finalSkipTimer);
    finalVideo.pause();
    showFinalEnd(false);
  }

  finalVideo.addEventListener("ended", finalVideoDone);
  finalVideo.addEventListener("error", () => {
    if (!finalVideo.getAttribute("src")) return;
    $("final-video-error").classList.remove("hidden");
    reveal($("btn-final-video-skip"));
  });
  $("btn-final-video-skip").addEventListener("click", finalVideoDone);

  function renderFinalStats() {
    const box = $("final-stats");
    box.textContent = "";
    const pills = [
      CONTENT.exportTimeLabel + ": " + formatDuration(getEffectiveTimeSec()),
      CONTENT.exportMistakesLabel + ": " + (progress.wrongCount || 0),
      getSquadRank(),
      buildVerificationCode(),
    ].filter(Boolean);

    pills.forEach((pText) => {
      const pill = document.createElement("span");
      pill.className = "final-stat-pill";
      pill.textContent = pText;
      box.appendChild(pill);
    });
  }

  function showFinalEnd(instant) {
    showFinalStage("end");
    $("final-end-actions").classList.add("hidden");
    const name = CONTENT.witnesses[progress.finalSuspect].name;
    const correct = progress.finalSuspect === CONTENT.criminalIndex;
    const stamp = document.querySelector(".final-stamp");
    stamp.textContent = correct ? CONTENT.finalStamp : CONTENT.finalStampWrong;
    stamp.classList.toggle("wrong", !correct);

    if (!instant && window.SFX) SFX.stamp();
    renderFinalStats();

    const text = (correct ? CONTENT.finalEndText : CONTENT.finalEndTextWrong)
      .replace("{name}", name)
      .replace("{criminal}", CONTENT.witnesses[CONTENT.criminalIndex].name);
    const endTyper = typewrite($("final-end-text"), text, {
      onDone: () => reveal($("final-end-actions")),
    });
    if (instant) endTyper.skip();
  }

  $("btn-final-replay").addEventListener("click", playFinalVideo);
  $("btn-final-to-case").addEventListener("click", () => showScreen("case"));

  /* ---------- Static Judge / Commander Verifier (?judge=1 or 5-tap rec dot) ---------- */
  const judgeOverlay = $("judge-overlay");
  const judgeInput = $("judge-input");
  const judgeResult = $("judge-result");
  judgeInput.placeholder = CONTENT.judgePlaceholder;

  function openJudge() {
    judgeOverlay.classList.remove("hidden");
  }

  function closeJudge() {
    judgeOverlay.classList.add("hidden");
  }

  $("btn-close-judge").addEventListener("click", closeJudge);
  judgeOverlay.addEventListener("click", (e) => {
    if (e.target === judgeOverlay) closeJudge();
  });

  $("btn-judge-check").addEventListener("click", () => {
    const res = decodeAndVerifyText(judgeInput.value);
    judgeResult.classList.remove("hidden", "valid", "invalid");
    if (!res.valid) {
      judgeResult.classList.add("invalid");
      judgeResult.textContent = CONTENT.judgeInvalidTitle + "\n" + res.reason;
      if (window.SFX) SFX.wrong();
      return;
    }
    judgeResult.classList.add("valid");
    judgeResult.textContent = [
      CONTENT.judgeValidTitle,
      "קוד: " + res.code,
      "הכרעה: " + res.verdictName + (res.submitted ? (res.correct ? " (✓ זיהוי נכון)" : " (✗ טעות בזיהוי)") : ""),
      "זמן חקירה מקורי: " + res.timeFormatted,
      "ניסיונות שגויים בשאלות: " + res.wrongCount,
      "ראיות שנפתחו: " + res.evidenceCount,
      "שימוש בפוליגרף: " + res.polygraphUsedOn,
    ].join("\n");
    if (window.SFX) SFX.correct();
  });

  $("btn-judge-copy-link").addEventListener("click", async () => {
    const tName = $("judge-team-name").value.trim() || "צוות 1";
    const base = window.location.origin + window.location.pathname;
    const link = base + "?team=" + encodeURIComponent(tName);
    try {
      await navigator.clipboard.writeText(link);
      $("judge-link-feedback").textContent = CONTENT.judgeLinkCopied + " (" + tName + ")";
    } catch (e) {
      $("judge-link-feedback").textContent = link;
    }
  });

  let recDotTaps = 0;
  let recDotTimer = null;
  $("case-rec-dot").addEventListener("click", () => {
    recDotTaps++;
    clearTimeout(recDotTimer);
    recDotTimer = setTimeout(() => (recDotTaps = 0), 2200);
    if (recDotTaps >= 5) {
      recDotTaps = 0;
      openJudge();
    }
  });

  if (urlParams.get("judge") === "1") {
    openJudge();
  }

  /* ---------- PC Keyboard Shortcuts ---------- */
  const HEBREW_KEY_INDEX = { "1": 0, "2": 1, "3": 2, "4": 3, "א": 0, "ב": 1, "ג": 2, "ד": 3 };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!callOverlay.classList.contains("hidden")) return closeInformantCall();
      if (!$("alert-overlay").classList.contains("hidden")) return closeAlertModal();
      if (!judgeOverlay.classList.contains("hidden")) return closeJudge();
      if (!viewer.classList.contains("hidden")) return closeViewer();
      if (!deskOverlay.classList.contains("hidden")) return closeDesk();
      if (!$("scan-overlay").classList.contains("hidden")) return finishScan();
      return;
    }

    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    // 1-4 / א-ד answers active quiz question
    if (
      $("screen-case").classList.contains("active") &&
      currentTab === "questions" &&
      viewer.classList.contains("hidden") &&
      deskOverlay.classList.contains("hidden") &&
      $("alert-overlay").classList.contains("hidden") &&
      callOverlay.classList.contains("hidden")
    ) {
      const idx = HEBREW_KEY_INDEX[e.key];
      if (idx !== undefined && currentOptionButtons[idx] && !currentOptionButtons[idx].disabled) {
        e.preventDefault();
        currentOptionButtons[idx].click();
        return;
      }
    }

    // Space / Enter advances or skips typewriter when not already focused on a button
    if ((e.key === " " || e.key === "Enter") && tag !== "BUTTON") {
      if (!$("alert-overlay").classList.contains("hidden")) {
        e.preventDefault();
        closeAlertModal();
        return;
      }
      if (!deskOverlay.classList.contains("hidden") && deskTyper && !deskTyper.isDone()) {
        e.preventDefault();
        deskTyper.skip();
        return;
      }
      if ($("screen-briefing").classList.contains("active")) {
        e.preventDefault();
        if (typer && !typer.isDone()) typer.skip();
        else if (!$("btn-briefing-next").classList.contains("hidden")) $("btn-briefing-next").click();
        return;
      }
      if ($("screen-video").classList.contains("active")) {
        if (!$("btn-continue").classList.contains("hidden")) {
          e.preventDefault();
          $("btn-continue").click();
        }
        return;
      }
      if ($("screen-case").classList.contains("active") && currentTab === "questions") {
        if (!$("btn-next-question").classList.contains("hidden")) {
          e.preventDefault();
          $("btn-next-question").click();
        }
      }
    }
  });

  /* ---------- Init Render ---------- */
  renderQuestion();
  updateFinalButtons();
  syncAppWidth();

  /* ---------- New Case ---------- */
  $("btn-new-case").addEventListener("click", () => {
    if (!confirm(CONTENT.newCaseConfirm)) return;
    try {
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(CASEFILE_KEY);
    } catch (e) {}
    location.reload();
  });
})();
