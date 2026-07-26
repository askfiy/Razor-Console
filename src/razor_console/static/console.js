const state = {
  mode: "boot",
  game: "",
  games: [],
  activeLoader: "",
  content: "",
  original: "",
  bootContent: "",
  runtimeRunning: false,
  frameUrl: null,
  frameLive: false,
};

const $ = (selector) => document.querySelector(selector);
let toastTimer;
let frameTimer;
let runtimeTimer;
let bridgeEventTimer;
let bridgeLogTimer;

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function addEvent(message) {
  const item = document.createElement("div");
  item.className = "event-item";
  const now = new Date();
  item.innerHTML = `<time>${now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time><span></span>`;
  item.querySelector("span").textContent = message;
  $("#event-list").prepend(item);
}

function toast(title, message = "") {
  clearTimeout(toastTimer);
  $("#toast-title").textContent = title;
  $("#toast-message").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2600);
}

function isDirty() {
  return state.content !== state.original;
}

function setDirtyState() {
  const dirty = isDirty();
  $("#save-state").textContent = dirty ? "modified" : "saved";
  $("#save-state").classList.toggle("dirty", dirty);
}

function updateLines() {
  const count = Math.max(1, state.content.split("\n").length);
  $("#line-numbers").textContent = Array.from({length: count}, (_, index) => index + 1).join("\n");
}

function appendTomlToken(parent, className, text) {
  if (!text) return;
  const node = document.createElement(className ? "span" : "span");
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
}

function findTomlDelimiter(line, delimiter, start = 0) {
  let quote = null;
  let escaped = false;
  for (let index = start; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (quote === '"' && character === "\\" && !escaped) {
        escaped = true;
        continue;
      }
      if (character === quote && !escaped) quote = null;
      escaped = false;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === delimiter) return index;
  }
  return -1;
}

function highlightTomlValue(parent, value) {
  let index = 0;
  while (index < value.length) {
    const character = value[index];
    if (character === "#") {
      appendTomlToken(parent, "toml-comment", value.slice(index));
      return;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      let end = index + 1;
      let escaped = false;
      while (end < value.length) {
        const current = value[end];
        if (quote === '"' && current === "\\" && !escaped) {
          escaped = true;
          end += 1;
          continue;
        }
        if (current === quote && !escaped) {
          end += 1;
          break;
        }
        escaped = false;
        end += 1;
      }
      appendTomlToken(parent, "toml-string", value.slice(index, end));
      index = end;
      continue;
    }
    if (/\s/.test(character)) {
      let end = index + 1;
      while (end < value.length && /\s/.test(value[end])) end += 1;
      appendTomlToken(parent, "", value.slice(index, end));
      index = end;
      continue;
    }
    if ("[]{},.".includes(character)) {
      appendTomlToken(parent, "toml-punctuation", character);
      index += 1;
      continue;
    }

    let end = index + 1;
    while (
      end < value.length
      && !/\s/.test(value[end])
      && !"'#[]{},.".includes(value[end])
    ) {
      end += 1;
    }
    const token = value.slice(index, end);
    let className = "toml-bare";
    if (/^(?:true|false)$/i.test(token)) className = "toml-boolean";
    else if (/^[+-]?(?:\d[\d_]*)(?:\.\d[\d_]*)?(?:e[+-]?\d+)?$/i.test(token)
      || /^\d{4}-\d{2}-\d{2}(?:[Tt ].*)?$/.test(token)) className = "toml-number";
    appendTomlToken(parent, className, token);
    index = end;
  }
}

function highlightTomlLine(parent, line) {
  const trimmed = line.trimStart();
  const indentation = line.slice(0, line.length - trimmed.length);
  if (trimmed.startsWith("#")) {
    appendTomlToken(parent, "", indentation);
    appendTomlToken(parent, "toml-comment", trimmed);
    return;
  }

  const commentAt = findTomlDelimiter(line, "#");
  const content = commentAt >= 0 ? line.slice(0, commentAt) : line;
  const trailingComment = commentAt >= 0 ? line.slice(commentAt) : "";
  if (/^\s*\[\[?.+?\]\]?\s*$/.test(content)) {
    appendTomlToken(parent, "", indentation);
    appendTomlToken(parent, "toml-section", content.trim());
    appendTomlToken(parent, "toml-comment", trailingComment);
    return;
  }

  const equalsAt = findTomlDelimiter(content, "=");
  if (equalsAt >= 0) {
    const key = content.slice(0, equalsAt);
    const keyTrimmed = key.trim();
    const keyStart = key.indexOf(keyTrimmed);
    appendTomlToken(parent, "", key.slice(0, keyStart));
    appendTomlToken(parent, "toml-key", keyTrimmed);
    appendTomlToken(parent, "", key.slice(keyStart + keyTrimmed.length));
    appendTomlToken(parent, "toml-equals", "=");
    highlightTomlValue(parent, content.slice(equalsAt + 1));
    appendTomlToken(parent, "toml-comment", trailingComment);
    return;
  }

  highlightTomlValue(parent, line);
}

function updateHighlight() {
  const code = $("#toml-highlight code");
  const fragment = document.createDocumentFragment();
  state.content.split("\n").forEach((line, index, lines) => {
    highlightTomlLine(fragment, line);
    if (index < lines.length - 1) fragment.append(document.createTextNode("\n"));
  });
  code.replaceChildren(fragment);
}

function updateCursor() {
  const editor = $("#toml-editor");
  const before = editor.value.slice(0, editor.selectionStart);
  const lines = before.split("\n");
  $("#cursor-position").textContent = `Ln ${lines.length}, Col ${lines.at(-1).length + 1}`;
}

function parseBridgeEnabled(content) {
  const bridgeMatch = content.match(/(?:^|\n)\s*\[bridge\]([\s\S]*?)(?=\n\s*\[|$)/i);
  if (!bridgeMatch) return false;
  return /(?:^|\n)\s*enabled\s*=\s*true(?:\s*(?:#.*)?)?(?:\n|$)/i.test(bridgeMatch[1]);
}

function syncFrameSetting() {
  const enabled = parseBridgeEnabled(state.bootContent);
  const hasLiveFrame = enabled && state.frameLive && state.frameUrl;
  $("#frame-state").textContent = `bridge.enabled = ${enabled}`;
  $("#frame-state").className = `mini-pill ${enabled ? "on" : "off"}`;
  $("#frame-stage").classList.toggle("disabled", !enabled);
  const placeholder = $("#frame-placeholder");
  if (!enabled) {
    $("#frame-image").hidden = true;
    placeholder.hidden = false;
    placeholder.querySelector("strong").textContent = "Frame output disabled";
    placeholder.querySelector("span").innerHTML = "Set <code>bridge.enabled = true</code> in boot.toml";
  } else if (hasLiveFrame) {
    $("#frame-image").hidden = false;
    placeholder.hidden = true;
  } else if (!state.runtimeRunning) {
    $("#frame-image").hidden = true;
    placeholder.hidden = false;
    placeholder.querySelector("strong").textContent = "Waiting for Runtime bridge";
    placeholder.querySelector("span").textContent = "Start here or run Razor Runtime independently";
  } else {
    $("#frame-image").hidden = true;
    placeholder.hidden = false;
    placeholder.querySelector("strong").textContent = "Waiting for frame stream";
    placeholder.querySelector("span").textContent = "The output bridge will publish the latest frame here";
  }
  $("#frame-connection").textContent = hasLiveFrame ? "live" : enabled ? "waiting" : "offline";
  $("#open-frame-button").disabled = !hasLiveFrame;
  scheduleFramePoll(enabled);
}

function scheduleFramePoll(active) {
  clearTimeout(frameTimer);
  if (!active) return;
  frameTimer = setTimeout(fetchFrame, 100);
}

async function fetchFrame() {
  if (!parseBridgeEnabled(state.bootContent)) return;
  try {
    const response = await fetch(`/api/frame?t=${Date.now()}`, {cache: "no-store"});
    if (response.ok && response.status !== 204 && response.headers.get("content-type")?.startsWith("image/")) {
      const blob = await response.blob();
      if (state.frameUrl) URL.revokeObjectURL(state.frameUrl);
      state.frameUrl = URL.createObjectURL(blob);
      state.frameLive = true;
      $("#frame-image").src = state.frameUrl;
      $("#native-frame-image").src = state.frameUrl;
    } else if (response.status === 204) {
      state.frameLive = false;
    }
  } catch {}
  syncFrameSetting();
}

function renderEditor() {
  $("#toml-editor").value = state.content;
  $("#editor-title").textContent = state.mode === "boot" ? "boot.toml" : `${state.game}.toml`;
  $("#editor-path").textContent = state.mode === "boot"
    ? "D:\\Project\\SuperAimBot\\boot.toml"
    : `D:\\Project\\SuperAimBot\\config\\${state.game}.toml`;
  $("#boot-button").classList.toggle("active", state.mode === "boot");
  $("#frame-profile").textContent = `${state.activeLoader || state.game || "unknown"}.toml`;
  setDirtyState();
  updateLines();
  updateHighlight();
  updateCursor();
}

async function loadSummary() {
  const summary = await api("/api/configs");
  state.games = summary.games;
  state.activeLoader = summary.active_loader;
  if (!state.game || !state.games.includes(state.game)) state.game = state.activeLoader || state.games[0] || "";
  const gameSelect = $("#game-select");
  const sourceSelect = $("#new-game-source");
  gameSelect.replaceChildren(...state.games.map((name) => new Option(`${name}.toml${name === state.activeLoader ? " · active" : ""}`, name)));
  sourceSelect.replaceChildren(...state.games.map((name) => new Option(`${name}.toml`, name)));
  gameSelect.value = state.game;
}

async function loadBoot() {
  if (!confirmDiscard()) return;
  const result = await api("/api/config/boot");
  state.mode = "boot";
  state.content = result.content;
  state.original = result.content;
  state.bootContent = result.content;
  renderEditor();
  syncFrameSetting();
  addEvent("Opened boot.toml");
}

async function loadGame(name = $("#game-select").value) {
  if (!name || !confirmDiscard()) return;
  const result = await api(`/api/config/game/${encodeURIComponent(name)}`);
  state.mode = "game";
  state.game = name;
  state.content = result.content;
  state.original = result.content;
  $("#game-select").value = name;
  renderEditor();
  addEvent(`Opened ${name}.toml`);
}

function confirmDiscard() {
  return !isDirty() || confirm("Discard unsaved TOML changes?");
}

async function saveCurrent() {
  try {
    const endpoint = state.mode === "boot" ? "/api/config/boot" : `/api/config/game/${encodeURIComponent(state.game)}`;
    await api(endpoint, {method: "PUT", body: JSON.stringify({content: state.content})});
    state.original = state.content;
    if (state.mode === "boot") {
      state.bootContent = state.content;
      await loadSummary();
      syncFrameSetting();
    }
    setDirtyState();
    toast("Configuration saved", state.mode === "boot" ? "boot.toml" : `${state.game}.toml`);
    addEvent(`Saved ${state.mode === "boot" ? "boot.toml" : `${state.game}.toml`}`);
  } catch (error) {
    toast("TOML was not saved", error.message);
    addEvent(`Save failed: ${error.message}`);
  }
}

async function refreshCurrent() {
  if (state.mode === "boot") await loadBoot();
  else await loadGame(state.game);
}

async function createGame() {
  const name = $("#new-game-name").value.trim();
  const source = $("#new-game-source").value || null;
  if (!name) return $("#new-game-name").focus();
  try {
    const result = await api("/api/config/game", {
      method: "POST",
      body: JSON.stringify({name, source}),
    });
    $("#new-game-dialog").close();
    await loadSummary();
    await loadGame(result.name);
    toast("Game config created", `${result.name}.toml`);
  } catch (error) {
    toast("Could not create config", error.message);
  }
}

async function deleteGame() {
  const name = $("#game-select").value;
  if (!name || !confirm(`Move ${name}.toml to .razor-trash?`)) return;
  try {
    const result = await api(`/api/config/game/${encodeURIComponent(name)}`, {method: "DELETE"});
    toast("Game config removed", `Recoverable from ${result.recovery}`);
    addEvent(`Removed ${name}.toml`);
    await loadSummary();
    await loadGame(state.game);
  } catch (error) {
    toast("Could not delete config", error.message);
  }
}

function applyRuntimeStatus(status, announce = false) {
  const changed = state.runtimeRunning !== Boolean(status.running);
  state.runtimeRunning = Boolean(status.running);
  document.body.classList.toggle("runtime-on", state.runtimeRunning);
  document.body.classList.toggle("runtime-off", !state.runtimeRunning);
  $("#runtime-status").className = `status-pill ${state.runtimeRunning ? "online" : "offline"}`;
  $("#runtime-status").innerHTML = `<i></i>Runtime ${state.runtimeRunning ? "online" : "offline"}`;
  $("#start-button").disabled = state.runtimeRunning;
  $("#stop-button").disabled = !state.runtimeRunning;
  if (changed && announce) addEvent(`Runtime ${state.runtimeRunning ? "started" : "stopped"}`);
  syncFrameSetting();
}

async function pollRuntime() {
  try {
    applyRuntimeStatus(await api("/api/runtime"));
  } catch {}
  clearTimeout(runtimeTimer);
  runtimeTimer = setTimeout(pollRuntime, 1500);
}

async function startRuntime() {
  $("#start-button").disabled = true;
  try {
    const status = await api("/api/runtime/start", {method: "POST"});
    applyRuntimeStatus(status, true);
  } catch (error) {
    toast("Runtime failed to start", error.message);
    addEvent(`Start failed: ${error.message}`);
    $("#start-button").disabled = false;
  }
}

async function stopRuntime() {
  $("#stop-button").disabled = true;
  try {
    applyRuntimeStatus(await api("/api/runtime/stop", {method: "POST"}), true);
  } catch (error) {
    toast("Runtime failed to stop", error.message);
    $("#stop-button").disabled = false;
  }
}

async function playSound(event) {
  try {
    const audio = new Audio(`/api/sound/${event}?t=${Date.now()}`);
    await audio.play();
    addEvent(`Played ${event} sound`);
  } catch (error) {
    toast("Sound playback failed", error.message);
  }
}

async function pollBridgeEvents() {
  try {
    const payload = await api("/api/bridge/events");
    for (const event of payload.events) playSound(event.name);
  } catch {}
  clearTimeout(bridgeEventTimer);
  bridgeEventTimer = setTimeout(pollBridgeEvents, 200);
}

function logLevel(level) {
  if (level >= 50) return "critical";
  if (level >= 40) return "error";
  if (level >= 30) return "warning";
  if (level >= 20) return "info";
  return "debug";
}

function appendRuntimeLogs(records) {
  if (!records.length) return;

  const list = $("#runtime-log-list");
  const wasNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 36;
  $("#runtime-log-empty")?.remove();
  const fragment = document.createDocumentFragment();

  for (const record of records) {
    const levelName = logLevel(Number(record.level));
    const item = document.createElement("div");
    item.className = "runtime-log-line";

    const timestamp = document.createElement("time");
    timestamp.textContent = new Date(Number(record.published_at_ms)).toLocaleTimeString(
      [],
      {hour: "2-digit", minute: "2-digit", second: "2-digit"},
    );
    const level = document.createElement("span");
    level.className = `runtime-log-level ${levelName}`;
    level.textContent = levelName.toUpperCase();
    const text = document.createElement("span");
    text.className = "runtime-log-text";
    text.textContent = record.text;
    item.append(timestamp, level, text);
    fragment.append(item);
  }

  list.append(fragment);
  while (list.children.length > 500) list.firstElementChild.remove();
  if (wasNearBottom) list.scrollTop = list.scrollHeight;
}

async function pollBridgeLogs() {
  try {
    const payload = await api("/api/bridge/logs");
    appendRuntimeLogs(payload.logs);
  } catch {}
  clearTimeout(bridgeLogTimer);
  bridgeLogTimer = setTimeout(pollBridgeLogs, 250);
}

function clearRuntimeLogs() {
  const empty = document.createElement("div");
  empty.className = "runtime-log-empty";
  empty.id = "runtime-log-empty";
  empty.textContent = "Waiting for Runtime logs...";
  $("#runtime-log-list").replaceChildren(empty);
}

function openNativeFrame() {
  if (!state.frameUrl) {
    toast("Frame is not ready", "Wait for the Runtime bridge to publish a frame");
    return;
  }
  $("#frame-dialog").showModal();
}

$("#toml-editor").addEventListener("input", (event) => {
  state.content = event.target.value;
  if (state.mode === "boot") {
    state.bootContent = state.content;
    syncFrameSetting();
  }
  setDirtyState();
  updateLines();
  updateHighlight();
  updateCursor();
});
$("#toml-editor").addEventListener("scroll", (event) => {
  $("#line-numbers").scrollTop = event.target.scrollTop;
  $("#toml-highlight").scrollTop = event.target.scrollTop;
  $("#toml-highlight").scrollLeft = event.target.scrollLeft;
});
$("#toml-editor").addEventListener("click", updateCursor);
$("#toml-editor").addEventListener("keyup", updateCursor);
$("#toml-editor").addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const editor = event.target;
    const start = editor.selectionStart;
    editor.setRangeText("  ", start, editor.selectionEnd, "end");
    editor.dispatchEvent(new Event("input", {bubbles: true}));
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveCurrent();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "/") {
    event.preventDefault();
    toggleSelectedComments();
  }
});

function toggleSelectedComments() {
  const editor = $("#toml-editor");
  const content = editor.value;
  const selectionStart = editor.selectionStart;
  const selectionEnd = editor.selectionEnd;
  const lineStart = content.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const effectiveEnd = selectionEnd > selectionStart && content[selectionEnd - 1] === "\n"
    ? selectionEnd - 1
    : selectionEnd;
  const nextNewline = content.indexOf("\n", effectiveEnd);
  const lineEnd = nextNewline === -1 ? content.length : nextNewline;
  const lines = content.slice(lineStart, lineEnd).split("\n");
  const meaningfulLines = lines.filter((line) => line.trim().length > 0);
  const shouldUncomment = meaningfulLines.length > 0
    && meaningfulLines.every((line) => /^\s*#/.test(line));

  const replacement = lines.map((line) => {
    if (!line.trim()) return line;
    if (shouldUncomment) return line.replace(/^(\s*)# ?/, "$1");
    return line.replace(/^(\s*)/, "$1# ");
  }).join("\n");

  editor.setRangeText(replacement, lineStart, lineEnd, "select");
  editor.focus();
  editor.dispatchEvent(new Event("input", {bubbles: true}));
}
$("#boot-button").addEventListener("click", loadBoot);
$("#open-game-button").addEventListener("click", () => loadGame());
$("#game-select").addEventListener("change", async (event) => {
  const requested = event.target.value;
  await loadGame(requested);
  event.target.value = state.game;
});
$("#save-button").addEventListener("click", saveCurrent);
$("#reload-button").addEventListener("click", refreshCurrent);
$("#toggle-comment-button").addEventListener("click", toggleSelectedComments);
$("#new-game-button").addEventListener("click", () => {
  $("#new-game-name").value = "";
  $("#new-game-source").value = state.game || state.activeLoader;
  $("#new-game-dialog").showModal();
});
$("#create-game-button").addEventListener("click", (event) => { event.preventDefault(); createGame(); });
$("#delete-game-button").addEventListener("click", deleteGame);
$("#start-button").addEventListener("click", startRuntime);
$("#stop-button").addEventListener("click", stopRuntime);
$("#clear-events").addEventListener("click", () => { $("#event-list").innerHTML = ""; });
$("#clear-runtime-log").addEventListener("click", clearRuntimeLogs);
$("#open-frame-button").addEventListener("click", openNativeFrame);
$("#close-frame-dialog").addEventListener("click", () => $("#frame-dialog").close());
$("#native-frame-image").addEventListener("load", (event) => {
  const image = event.target;
  $("#native-frame-size").textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
});
$("#frame-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

async function initialize() {
  try {
    await loadSummary();
    const boot = await api("/api/config/boot");
    state.mode = "boot";
    state.content = boot.content;
    state.original = boot.content;
    state.bootContent = boot.content;
    renderEditor();
    syncFrameSetting();
    await pollRuntime();
    await pollBridgeEvents();
    await pollBridgeLogs();
    addEvent("Razor Console ready");
  } catch (error) {
    toast("Console initialization failed", error.message);
    addEvent(`Initialization failed: ${error.message}`);
  }
}

initialize();
