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

  /* ---------- Witnesses ---------- */
  const overlay = $("statement-overlay");
  const statementVideo = $("statement-video");

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
      openStatement(witness);
      watched.classList.remove("hidden");
    });
    $("witness-grid").appendChild(card);
  });

  function openStatement(witness) {
    $("statement-title").textContent = CONTENT.statementTitlePrefix + witness.name;
    $("statement-error").classList.add("hidden");
    overlay.classList.remove("hidden");
    statementVideo.src = witness.video;
    const attempt = statementVideo.play();
    if (attempt && attempt.catch) attempt.catch(() => {});
  }

  function closeStatement() {
    statementVideo.pause();
    statementVideo.removeAttribute("src");
    statementVideo.load();
    overlay.classList.add("hidden");
  }

  statementVideo.addEventListener("error", () => {
    if (statementVideo.getAttribute("src")) $("statement-error").classList.remove("hidden");
  });
  $("btn-close-statement").addEventListener("click", closeStatement);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeStatement();
  });
})();
