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

  /* ---------- Start ---------- */
  $("btn-start").addEventListener("click", startVideo);

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

  $("btn-briefing-next").addEventListener("click", () => showScreen("case"));

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
  CONTENT.witnesses.forEach((witness) => {
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
    watched.className = "witness-watched hidden";
    watched.textContent = CONTENT.watchedLabel;
    photo.appendChild(watched);

    const name = document.createElement("span");
    name.className = "witness-name";
    name.textContent = witness.name;

    const role = document.createElement("span");
    role.className = "witness-role";
    role.textContent = witness.role;

    card.append(photo, name, role);
    card.addEventListener("click", () => {
      openViewer({ title: CONTENT.statementTitlePrefix + witness.name, video: witness.video });
      watched.classList.remove("hidden");
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

  function unlockEvidence(setIndex) {
    const { card, status } = evidenceCards[setIndex];
    card.disabled = false;
    card.classList.remove("locked");
    status.textContent = "";
    newEvidenceCount++;
    $("evidence-badge").textContent = newEvidenceCount;
    $("evidence-badge").classList.remove("hidden");
  }

  $("evidence-badge").parentElement.addEventListener("click", () => {
    newEvidenceCount = 0;
  });

  /* ---------- Questions ---------- */
  const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו"];
  let setIndex = 0;
  let questionIndex = 0;

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
    $("question-progress").textContent = CONTENT.questionProgress
      .replace("{n}", questionIndex + 1)
      .replace("{total}", set.questions.length);
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
    reveal(nextBtn);
  }

  renderQuestion();
})();
