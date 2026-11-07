/**
 * Types text into an element one character at a time.
 * A "|" in the text is a dramatic pause (not printed).
 * Call skip() on the returned controller to print the rest instantly.
 */
function typewrite(element, text, options) {
  const opts = Object.assign(
    {
      charDelay: 55,
      jitter: 35,
      punctuationDelay: 380,
      newlineDelay: 250,
      pauseDelay: 900,
      onDone: function () {},
    },
    options || {}
  );

  const fullText = text.replace(/\|/g, "");
  const output = document.createElement("span");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  element.textContent = "";
  element.appendChild(output);
  element.appendChild(cursor);

  let index = 0;
  let timer = null;
  let done = false;

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    output.textContent = fullText;
    element.scrollTop = element.scrollHeight;
    opts.onDone();
  }

  function step() {
    if (index >= text.length) {
      finish();
      return;
    }

    const ch = text[index++];
    let delay = opts.charDelay + Math.random() * opts.jitter;

    if (ch === "|") {
      delay = opts.pauseDelay;
    } else {
      output.textContent += ch;
      element.scrollTop = element.scrollHeight;
      if (window.SFX && opts.sound !== false && !/\s/.test(ch)) {
        window.SFX.tick();
      }
      if (".,!?:;-".includes(ch)) delay += opts.punctuationDelay;
      else if (ch === "\n") delay += opts.newlineDelay;
    }

    timer = setTimeout(step, delay);
  }

  timer = setTimeout(step, opts.startDelay || 400);

  return {
    skip: finish,
    isDone: function () {
      return done;
    },
  };
}
