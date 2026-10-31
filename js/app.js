(function () {
  const SKIP_DELAY_MS = 3000;

  const $ = (id) => document.getElementById(id);

  document.querySelectorAll("[data-text]").forEach((el) => {
    const value = CONTENT[el.dataset.text];
    if (value !== undefined) el.textContent = value;
  });

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("screen-" + name).classList.add("active");
  }

  function reveal(btn) {
    btn.classList.remove("hidden");
    btn.classList.add("appear");
  }

  /* ---------- Saved progress ---------- */
  const PROGRESS_KEY = "taharoot-progress";
  const CASEFILE_KEY = "taharoot-casefile";

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

  const progress = Object.assign(
    { reachedCase: false, setIndex: 0, questionIndex: 0, watched: [], deskDone: [] },
    loadJSON(PROGRESS_KEY)
  );
  const saveProgress = () => saveJSON(PROGRESS_KEY, progress);

  function markDone(list, index) {
    if (!progress[list].includes(index)) progress[list].push(index);
    saveProgress();
  }

  /* ---------- Start ---------- */
  $("btn-start").addEventListener("click", startVideo);
  if (progress.reachedCase) $("btn-resume").classList.remove("hidden");
  $("btn-resume").addEventListener("click", () => showScreen("case"));

  /* ---------- Video ---------- */
  const video = $("intro-video");
  let skipTimer = null;

  function startVideo() {
    showScreen("video");
    video.src = CONTENT.videoSrc;
    // play() must run inside the tap handler so iOS allows sound.
    const attempt = video.play();
    if (attempt && attempt.catch) {
      attempt.catch(() => {
        if (!video.error) video.controls = true;
      });
    }
    skipTimer = setTimeout(() => reveal($("btn-skip")), SKIP_DELAY_MS);
  }

  function videoFinished() {
    clearTimeout(skipTimer);
    $("btn-skip").classList.add("hidden");
    reveal($("btn-continue"));
  }

  video.addEventListener("ended", videoFinished);
  video.addEventListener("error", () => {
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
    showScreen("case");
  });

  /* ---------- Tabs ---------- */
  function showTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
    if (name === "evidence") $("evidence-badge").classList.add("hidden");
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => showTab(tab.dataset.tab));
  });

  /* ---------- Viewer (statements + evidence) ---------- */
  const viewer = $("viewer");
  const viewerVideo = $("viewer-video");

  function openViewer(item) {
    $("viewer-title").textContent = item.title;
    $("viewer-error").classList.add("hidden");
    $("viewer-video-wrap").classList.toggle("hidden", !item.video);
    $("viewer-image").classList.toggle("hidden", !item.image);
    $("viewer-text").classList.toggle("hidden", !item.text);
    $("viewer-text").textContent = item.text || "";

    if (item.image) $("viewer-image").src = item.image;
    if (!item.video && !item.image && !item.text) {
      $("viewer-video-wrap").classList.remove("hidden");
      $("viewer-error").classList.remove("hidden");
    }

    viewer.classList.remove("hidden");

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
    viewer.classList.add("hidden");
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

  /* ---------- Witnesses ---------- */
  CONTENT.witnesses.forEach((witness, index) => {
    const card = document.createElement("button");
    card.className = "witness-card";

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
    card.addEventListener("click", () => {
      openViewer({ title: CONTENT.statementTitlePrefix + witness.name, video: witness.video });
      watched.classList.remove("hidden");
      markDone("watched", index);
    });
    $("witness-grid").appendChild(card);
  });

  /* ---------- Evidence ---------- */
  const evidenceCards = CONTENT.questionSets.map((set) => {
    const card = document.createElement("button");
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

  function unlockEvidence(setIndex, silent) {
    const { card, status } = evidenceCards[setIndex];
    card.disabled = false;
    card.classList.remove("locked");
    status.textContent = "";
    if (silent) return;
    newEvidenceCount++;
    $("evidence-badge").textContent = newEvidenceCount;
    $("evidence-badge").classList.remove("hidden");
  }

  $("evidence-badge").parentElement.addEventListener("click", () => {
    newEvidenceCount = 0;
  });

  /* ---------- Questions ---------- */
  const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו"];
  let setIndex = Math.min(progress.setIndex, CONTENT.questionSets.length);
  let questionIndex = progress.questionIndex;
  for (let i = 0; i < setIndex; i++) unlockEvidence(i, true);

  function renderQuestion() {
    const feedback = $("question-feedback");
    const nextBtn = $("btn-next-question");
    const optionsEl = $("question-options");
    feedback.textContent = "";
    feedback.className = "question-feedback";
    nextBtn.classList.add("hidden");
    optionsEl.textContent = "";

    const set = CONTENT.questionSets[setIndex];
    if (!set) {
      $("question-progress").textContent = "";
      $("question-text").textContent = CONTENT.allQuestionsDone;
      return;
    }

    const question = set.questions[questionIndex];
    const sets = CONTENT.questionSets;
    const countBefore = sets.slice(0, setIndex).reduce((sum, s) => sum + s.questions.length, 0);
    const total = sets.reduce((sum, s) => sum + s.questions.length, 0);
    $("question-progress").textContent =
      CONTENT.questionProgress.replace("{n}", countBefore + questionIndex + 1).replace("{total}", total) +
      " // " +
      CONTENT.questionReward.replace("{title}", set.evidence.title);
    $("question-text").textContent = question.text;

    const buttons = question.options.map((option, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.textContent = LETTERS[i];
      const label = document.createElement("span");
      label.textContent = option;
      btn.append(letter, label);
      btn.addEventListener("click", () => answer(i, buttons, question));
      optionsEl.appendChild(btn);
      return btn;
    });
  }

  function answer(choice, buttons, question) {
    const feedback = $("question-feedback");

    if (choice !== question.correct) {
      buttons[choice].classList.add("wrong");
      feedback.textContent = CONTENT.wrongFeedback;
      feedback.className = "question-feedback wrong";
      buttons.forEach((b) => (b.disabled = true));
      setTimeout(() => {
        buttons.forEach((b) => {
          if (!b.classList.contains("wrong")) b.disabled = false;
        });
      }, CONTENT.retryDelayMs);
      return;
    }

    buttons[choice].classList.add("correct");
    buttons.forEach((b) => (b.disabled = true));
    feedback.textContent = CONTENT.correctFeedback;
    feedback.className = "question-feedback correct";

    const set = CONTENT.questionSets[setIndex];
    const nextBtn = $("btn-next-question");
    const finishedSet = questionIndex === set.questions.length - 1;

    if (finishedSet) {
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
      questionIndex++;
      nextBtn.textContent = CONTENT.nextQuestionButton;
      nextBtn.onclick = renderQuestion;
    }
    progress.setIndex = setIndex;
    progress.questionIndex = questionIndex;
    saveProgress();
    reveal(nextBtn);
  }

  renderQuestion();

  /* ---------- Case file ---------- */
  const OTHER = "__other__";
  const caseFile = loadJSON(CASEFILE_KEY);
  const saveCaseFile = () => saveJSON(CASEFILE_KEY, caseFile);

  function bindField(el, key) {
    el.value = caseFile[key] || "";
    el.addEventListener("input", () => {
      caseFile[key] = el.value;
      saveCaseFile();
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
  bindField(suspectOther, "suspectOther");
  const syncSuspectOther = () => suspectOther.classList.toggle("hidden", suspectSelect.value !== OTHER);
  suspectSelect.addEventListener("change", syncSuspectOther);
  syncSuspectOther();

  $("suspect-violations").placeholder = CONTENT.textPlaceholder;
  bindField($("suspect-violations"), "suspectViolations");

  CONTENT.witnesses.forEach((witness, i) => {
    const card = document.createElement("div");
    card.className = "file-card";

    const title = document.createElement("h3");
    title.className = "file-card-title";
    title.textContent = i + 1 + ". " + witness.name;
    card.appendChild(title);

    [
      ["statement", CONTENT.witnessStatementLabel],
      ["violations", CONTENT.witnessViolationsLabel],
    ].forEach(([field, labelText]) => {
      const id = "witness-" + i + "-" + field;
      const label = document.createElement("label");
      label.className = "field-label";
      label.htmlFor = id;
      label.textContent = labelText;
      const textarea = document.createElement("textarea");
      textarea.className = "field";
      textarea.id = id;
      textarea.rows = 4;
      textarea.placeholder = CONTENT.textPlaceholder;
      bindField(textarea, id);
      card.append(label, textarea);
    });

    $("witness-files").appendChild(card);
  });

  function caseFileAsText() {
    const blank = (v) => (v && v.trim()) || CONTENT.noAnswer;
    const suspect = caseFile.suspect === OTHER ? caseFile.suspectOther : caseFile.suspect;
    const lines = [
      CONTENT.caseFileExportTitle,
      "",
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
    } catch (e) {}
  });

  /* ---------- Desk analysis ---------- */
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

  const deskDoneTags = CONTENT.witnesses.map((witness, index) => {
    const item = document.createElement("button");
    item.className = "desk-item";

    const photo = document.createElement("div");
    photo.className = "witness-photo desk-thumb";
    fillPhoto(photo, witness);

    const name = document.createElement("span");
    name.className = "desk-item-name";
    name.textContent = witness.name;

    const done = document.createElement("span");
    done.className = "desk-done";
    done.classList.toggle("hidden", !progress.deskDone.includes(index));
    done.textContent = CONTENT.deskDoneLabel;

    item.append(photo, name, done);
    item.addEventListener("click", () => openDesk(witness));
    $("desk-list").appendChild(item);
    return done;
  });

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

    if (!CONTENT.deskVideo) {
      runDeskProcess(deskRun);
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

  function runDeskProcess(run) {
    showDeskStage("process");
    const log = $("desk-log");
    const bar = $("desk-progress-bar");
    const label = $("desk-progress-label");
    log.textContent = "";
    bar.style.width = "0%";

    const lines = CONTENT.deskLog.map((l) => l.split("{name}").join(deskWitness.name));
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
      }, lineGap * (i + 1));
    });

    const start = Date.now();
    (function tick() {
      if (run !== deskRun) return;
      const p = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      bar.style.width = p + "%";
      label.textContent = CONTENT.deskProgressLabel.replace("{p}", p);
      if (p < 100) deskLater(tick, 80);
      else deskLater(() => run === deskRun && showDeskResult(), 500);
    })();
  }

  function showDeskResult() {
    const witness = deskWitness;
    showDeskStage("result");
    fillPhoto($("desk-photo"), witness);
    $("desk-name").textContent = witness.name;
    $("btn-desk-back").classList.add("hidden");

    const text = witness.desk.map((f) => "▸ " + f).join("|\n\n");
    deskTyper = typewrite($("desk-findings"), text, {
      charDelay: 35,
      jitter: 20,
      punctuationDelay: 200,
      pauseDelay: 500,
      onDone: () => {
        const index = CONTENT.witnesses.indexOf(witness);
        deskDoneTags[index].classList.remove("hidden");
        markDone("deskDone", index);
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

  /* ---------- Final suspect ---------- */
  const finalVideo = $("final-video");
  let finalChoice = null;
  let finalSkipTimer = null;

  function updateFinalButtons() {
    const ready = setIndex >= CONTENT.questionSets.length;
    document.querySelectorAll(".btn-to-final").forEach((b) => b.classList.toggle("hidden", !ready));
  }

  function showFinalStage(name) {
    $("final-pick").classList.toggle("hidden", name !== "pick");
    $("final-video-stage").classList.toggle("hidden", name !== "video");
    $("final-end").classList.toggle("hidden", name !== "end");
  }

  const finalCards = CONTENT.witnesses.map((witness, index) => {
    const card = document.createElement("button");
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
    saveProgress();
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

  function showFinalEnd(instant) {
    showFinalStage("end");
    $("final-end-actions").classList.add("hidden");
    const name = CONTENT.witnesses[progress.finalSuspect].name;
    const correct = progress.finalSuspect === CONTENT.criminalIndex;
    const stamp = document.querySelector(".final-stamp");
    stamp.textContent = correct ? CONTENT.finalStamp : CONTENT.finalStampWrong;
    stamp.classList.toggle("wrong", !correct);
    const text = (correct ? CONTENT.finalEndText : CONTENT.finalEndTextWrong)
      .replace("{name}", name)
      .replace("{criminal}", CONTENT.witnesses[CONTENT.criminalIndex].name);
    const typer = typewrite($("final-end-text"), text, {
      onDone: () => reveal($("final-end-actions")),
    });
    if (instant) typer.skip();
  }

  $("btn-final-replay").addEventListener("click", playFinalVideo);
  $("btn-final-to-case").addEventListener("click", () => showScreen("case"));

  updateFinalButtons();

  /* ---------- New case ---------- */
  $("btn-new-case").addEventListener("click", () => {
    if (!confirm(CONTENT.newCaseConfirm)) return;
    try {
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(CASEFILE_KEY);
    } catch (e) {}
    location.reload();
  });
})();
