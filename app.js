"use strict";

const STORAGE_KEY = "dota-enemy-cd-state-v1";
const READY_FLASH_MS = 7000;
const SAVE_DEBOUNCE_MS = 120;
const HOTKEY_BRIDGE_EVENTS_URL = "http://127.0.0.1:8765/events";
const HOTKEY_BRIDGE_CLIPBOARD_URL = "http://127.0.0.1:8765/clipboard";
const desktopApi = window.dotaCdDesktop || null;

const colors = ["#18b7a0", "#f2b84b", "#e95f6a", "#6da8ff", "#b08cff", "#7bd88f"];
const blockedPresetAbilities = new Set([
  "aegis",
  "aegis of the immortal",
  "blink dagger",
  "linken sphere",
  "linken's sphere",
  "linkensphere",
  "roshan",
  "satanic",
]);

const presetBundle = window.DOTA_ENEMY_CD_PRESETS || { starterHeroNames: [], heroes: [] };
const heroPresets = [...(presetBundle.heroes || [])].sort((a, b) => a.name.localeCompare(b.name));
const addonPresets = [...(presetBundle.addons || [])].sort((a, b) => a.name.localeCompare(b.name));
const starterHeroes = (presetBundle.starterHeroNames || [])
  .map((name, heroIndex) => {
    const preset = heroPresets.find((hero) => hero.name === name);
    if (!preset) return null;

    return {
      ...preset,
      abilities: preset.abilities.map((ability, abilityIndex) => ({
        ...ability,
        key: ability.key || (abilityIndex === 0 ? String(heroIndex + 1) : ""),
      })),
    };
  })
  .filter(Boolean);

const els = {
  board: document.querySelector("#board"),
  activeCount: document.querySelector("#activeCount"),
  matchClock: document.querySelector("#matchClock"),
  readyCount: document.querySelector("#readyCount"),
  nextReady: document.querySelector("#nextReady"),
  minCooldown: document.querySelector("#minCooldown"),
  volume: document.querySelector("#volume"),
  soundToggle: document.querySelector("#soundToggle"),
  resetTimers: document.querySelector("#resetTimers"),
  exportState: document.querySelector("#exportState"),
  importState: document.querySelector("#importState"),
  matchToggle: document.querySelector("#matchToggle"),
  bridgeStatus: document.querySelector("#bridgeStatus"),
  addHero: document.querySelector("#addHero"),
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  modeButtons: [...document.querySelectorAll("[data-mode]")],
};

let state = loadState();
let audioContext = null;
let saveTimer = null;
let hotkeyBridgeTimer = null;
let hotkeyBridgeOnline = false;
const handledBridgeEventIds = new Set();

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createAbility(data = {}) {
  return {
    id: data.id || uid(),
    name: data.name || "Новый скилл",
    cooldown: clampNumber(data.cooldown ?? 120, 1, 999),
    type: ["ult", "item"].includes(data.type) ? data.type : "skill",
    key: normalizeHotkey(data.key || ""),
    tracked: Boolean(data.tracked),
    startedAt: data.startedAt || null,
    endsAt: data.endsAt || null,
    readyAt: data.readyAt || null,
    readyMatchAtMs: data.readyMatchAtMs || null,
  };
}

function createHero(data = {}, index = 0) {
  return {
    id: data.id || uid(),
    name: data.name || `Враг ${index + 1}`,
    color: data.color || colors[index % colors.length],
    abilities: Array.isArray(data.abilities)
      ? data.abilities.filter((ability) => !isBlockedPresetAbility(ability.name)).map(createAbility)
      : [createAbility({ key: String(index + 1), tracked: true })],
  };
}

function isBlockedPresetAbility(name) {
  return blockedPresetAbilities.has(String(name || "").trim().toLowerCase());
}

function defaultState() {
  return {
    mode: "setup",
    filter: "all",
    minCooldown: 90,
    matchStartedAt: null,
    soundEnabled: true,
    volume: 0.55,
    heroes: starterHeroes.map(createHero),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);

    return {
      ...defaultState(),
      ...parsed,
      mode: parsed.mode === "match" ? "match" : "setup",
      minCooldown: clampNumber(parsed.minCooldown ?? 90, 1, 999),
      matchStartedAt: parsed.matchStartedAt || null,
      volume: clampNumber(parsed.volume ?? 0.55, 0, 1),
      heroes: Array.isArray(parsed.heroes) ? parsed.heroes.map(createHero) : defaultState().heroes,
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, SAVE_DEBOUNCE_MS);
}

function saveStateNow() {
  window.clearTimeout(saveTimer);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function normalizeHotkey(value) {
  return String(value || "")
    .trim()
    .slice(0, 1)
    .toUpperCase();
}

function normalizeEventHotkey(event) {
  if (event.code?.startsWith("Digit")) return event.code.slice(5);
  if (event.code?.startsWith("Numpad")) return event.code.slice(6);
  return normalizeHotkey(event.key);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name) {
  return `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function getHero(heroId) {
  return state.heroes.find((hero) => hero.id === heroId);
}

function getAbility(heroId, abilityId) {
  const hero = getHero(heroId);
  return hero?.abilities.find((ability) => ability.id === abilityId) || null;
}

function isAbilityVisible(ability) {
  if (state.filter === "ults") return ability.type === "ult";
  if (state.filter === "min") return Number(ability.cooldown) >= Number(state.minCooldown);
  if (state.filter === "tracked") return ability.tracked;
  return true;
}

function getRemainingMs(ability, now = Date.now()) {
  return ability.endsAt ? Math.max(0, ability.endsAt - now) : 0;
}

function isActive(ability, now = Date.now()) {
  return getRemainingMs(ability, now) > 0;
}

function isReadyFlash(ability, now = Date.now()) {
  return ability.readyAt && now - ability.readyAt < READY_FLASH_MS;
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatMatchTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getMatchElapsedMs(now = Date.now()) {
  return state.matchStartedAt ? Math.max(0, now - state.matchStartedAt) : 0;
}

function getReadyMatchText(ability) {
  if (!ability.readyMatchAtMs) return "";
  return `ready ${formatMatchTime(ability.readyMatchAtMs)}`;
}

function abilityTypeLabel(type) {
  if (type === "ult") return "Ult";
  if (type === "item") return "Item";
  return "Skill";
}

function getHeroSlotIndex(heroId) {
  return Math.max(0, state.heroes.findIndex((hero) => hero.id === heroId));
}

function clonePresetAbility(ability, index, heroIndex) {
  return createAbility({
    ...ability,
    key: index === 0 ? String((heroIndex % 9) + 1) : "",
    startedAt: null,
    endsAt: null,
    readyAt: null,
    readyMatchAtMs: null,
  });
}

function findPreset(name) {
  return heroPresets.find((preset) => preset.name === name);
}

function findAddon(name) {
  return addonPresets.find((addon) => addon.name === name);
}

function makeChatText(hero, ability) {
  const remaining = getRemainingMs(ability);
  const readyText = getReadyMatchText(ability);
  if (remaining > 0) {
    return `${ability.name} cd ${formatTime(remaining)}${readyText ? ` ${readyText}` : ""}`;
  }
  return `${ability.name} ready`;
}

function findAbilityByHotkey(key) {
  const normalizedKey = normalizeHotkey(key);
  if (!normalizedKey) return null;

  for (const hero of state.heroes) {
    for (const ability of hero.abilities) {
      if (ability.key === normalizedKey && isAbilityVisible(ability)) {
        return { hero, ability };
      }
    }
  }

  return null;
}

function handleHotkeyCommand(action, key) {
  const match = findAbilityByHotkey(key);
  if (!match) {
    showCopiedText(`No visible timer for ${key}`);
    return;
  }

  if (action === "copy") {
    copyChatText(match.hero.id, match.ability.id, { silent: true });
    return;
  }

  startTimer(match.hero.id, match.ability.id);
}

function abilityState(ability, now = Date.now()) {
  if (isActive(ability, now)) return "active";
  if (isReadyFlash(ability, now)) return "ready-flash";
  return "ready";
}

function render() {
  syncControls();
  renderBoard();
  updateTimers();
}

function syncControls() {
  document.body.dataset.mode = state.mode;
  els.minCooldown.value = state.minCooldown;
  els.volume.value = Math.round(state.volume * 100);
  els.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  els.soundToggle.title = state.soundEnabled ? "Звук включен" : "Звук выключен";
  els.soundToggle.innerHTML = icon(state.soundEnabled ? "bell" : "bell-off");
  els.matchToggle.innerHTML = `${icon(state.matchStartedAt ? "reset" : "play")}${state.matchStartedAt ? "Новый матч" : "Начать матч"}`;
  els.matchToggle.title = state.matchStartedAt ? "Перезапустить матч и сбросить таймеры" : "Запустить игровые часы";

  els.filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });

  els.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });
}

function renderBoard() {
  els.board.innerHTML = state.heroes.map(renderHero).join("");
}

function renderHero(hero) {
  const visibleAbilities = hero.abilities.filter(isAbilityVisible);
  const isMatchMode = state.mode === "match";
  const rows = visibleAbilities.length
    ? visibleAbilities.map((ability) => renderAbility(hero, ability)).join("")
    : `<div class="empty-state">Нет скиллов в текущем фильтре</div>`;
  const activeCount = hero.abilities.filter((ability) => isActive(ability)).length;

  return `
    <article class="hero-card" style="--hero-color: ${escapeHtml(hero.color)}" data-hero-id="${hero.id}">
      <div class="hero-top">
        ${
          isMatchMode
            ? `<div class="hero-title"><strong>${escapeHtml(hero.name)}</strong><span>${activeCount ? `активно ${activeCount}` : "нет кд"}</span></div>`
            : `
              <input class="hero-name" data-field="heroName" data-hero-id="${hero.id}" value="${escapeHtml(hero.name)}" placeholder="Враг" />
              <select class="preset-select" data-field="preset" data-hero-id="${hero.id}">
                <option value="">Пресет героя...</option>
                ${heroPresets
                  .map((preset) => `<option value="${escapeHtml(preset.name)}" ${preset.name === hero.name ? "selected" : ""}>${escapeHtml(preset.name)}</option>`)
                  .join("")}
              </select>
              <select class="addon-select" data-field="addon" data-hero-id="${hero.id}">
                <option value="">+ item/resource...</option>
                ${addonPresets
                  .map((addon) => `<option value="${escapeHtml(addon.name)}">${escapeHtml(addon.name)}</option>`)
                  .join("")}
              </select>
              <button class="row-button" type="button" data-action="addAbility" data-hero-id="${hero.id}" title="Добавить скилл">${icon("plus")}</button>
              <button class="row-button" type="button" data-action="deleteHero" data-hero-id="${hero.id}" title="Удалить героя">${icon("trash")}</button>
            `
        }
      </div>
      <div class="ability-list">
        ${rows}
      </div>
    </article>
  `;
}

function renderAbility(hero, ability) {
  const now = Date.now();
  const stateName = abilityState(ability, now);
  const remaining = getRemainingMs(ability, now);
  const percent = getProgressPercent(ability, now);
  const isRunning = remaining > 0;
  const isMatchMode = state.mode === "match";
  const readyText = getReadyMatchText(ability);
  const timerLabel = isRunning ? formatTime(remaining) : "Готов";

  return `
    <div class="ability-row" data-state="${stateName}" data-hero-id="${hero.id}" data-ability-id="${ability.id}">
      ${
        isMatchMode
          ? `
            <button class="row-button start-button star-button" type="button" data-action="startTimer" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Запустить">${icon("play")}</button>
            <div class="ability-display">
              <strong>${escapeHtml(ability.name)}</strong>
              <span>${abilityTypeLabel(ability.type)} · CD ${escapeHtml(ability.cooldown)}s${ability.key ? ` · ${escapeHtml(ability.key)}` : ""}</span>
            </div>
            <div class="cooldown-badge">${escapeHtml(ability.cooldown)}s</div>
            <div class="ult-badge ${ability.type === "ult" ? "is-ult" : ""}">${abilityTypeLabel(ability.type)}</div>
            <div class="key-badge">${escapeHtml(ability.key || "-")}</div>
          `
          : `
            <button class="row-button star-button ${ability.tracked ? "is-on" : ""}" type="button" data-action="toggleTracked" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Избранное">${icon("star")}</button>
            <input class="ability-name" data-field="abilityName" data-hero-id="${hero.id}" data-ability-id="${ability.id}" value="${escapeHtml(ability.name)}" placeholder="Скилл" />
            <input class="cooldown-input" data-field="cooldown" data-hero-id="${hero.id}" data-ability-id="${ability.id}" type="number" min="1" max="999" step="1" value="${escapeHtml(ability.cooldown)}" title="Кулдаун в секундах" />
            <label class="ult-toggle" title="Ультимейт">
              <input data-field="type" data-hero-id="${hero.id}" data-ability-id="${ability.id}" type="checkbox" ${ability.type === "ult" ? "checked" : ""} />
              Ult
            </label>
            <input class="key-input" data-field="key" data-hero-id="${hero.id}" data-ability-id="${ability.id}" maxlength="1" value="${escapeHtml(ability.key)}" title="Клавиша" />
          `
      }
      <div class="timer-cell">
        <div class="timer-main">${timerLabel}</div>
        <div class="timer-sub">${readyText || (state.matchStartedAt ? "нет активного кд" : "матч не начат")}</div>
        <div class="progress"><span style="width: ${percent}%"></span></div>
      </div>
      <div class="row-actions">
        ${isMatchMode ? "" : `<button class="row-button start-button" type="button" data-action="startTimer" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Запустить">${icon("play")}</button>`}
        <button class="row-button copy-button" type="button" data-action="copyChat" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Скопировать текст для чата">${icon("copy")}</button>
        <button class="row-button stop-button" type="button" data-action="stopTimer" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Остановить">${icon("stop")}</button>
        <button class="tiny-button" type="button" data-action="adjustTimer" data-delta="-5" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Минус 5 секунд">-5</button>
        ${isMatchMode ? "" : `<button class="row-button" type="button" data-action="deleteAbility" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Удалить">${icon("trash")}</button>`}
      </div>
    </div>
  `;
}

function getProgressPercent(ability, now = Date.now()) {
  const remaining = getRemainingMs(ability, now);
  if (!remaining || !ability.cooldown) return 0;
  const total = Number(ability.cooldown) * 1000;
  return Math.max(0, Math.min(100, (remaining / total) * 100));
}

function updateTimers() {
  const now = Date.now();
  let activeCount = 0;
  let readyCount = 0;
  let next = null;
  let expired = [];
  els.matchClock.textContent = formatMatchTime(getMatchElapsedMs(now));

  for (const hero of state.heroes) {
    for (const ability of hero.abilities) {
      if (ability.endsAt && ability.endsAt <= now) {
        expired.push({ hero, ability });
        ability.endsAt = null;
        ability.startedAt = null;
        ability.readyAt = now;
      }

      if (isActive(ability, now)) {
        activeCount += 1;
        if (!next || ability.endsAt < next.ability.endsAt) {
          next = { hero, ability };
        }
      }

      if (isReadyFlash(ability, now)) {
        readyCount += 1;
      }
    }
  }

  if (expired.length) {
    saveStateNow();
    for (const item of expired) {
      playReadySound(item.ability.name);
    }
    renderBoard();
  }

  els.activeCount.textContent = String(activeCount);
  els.readyCount.textContent = String(readyCount);
  els.nextReady.textContent = next
    ? `${next.hero.name}: ${next.ability.name} ${formatTime(getRemainingMs(next.ability, now))}${next.ability.readyMatchAtMs ? ` @ ${formatMatchTime(next.ability.readyMatchAtMs)}` : ""}`
    : "-";

  for (const row of els.board.querySelectorAll(".ability-row")) {
    const ability = getAbility(row.dataset.heroId, row.dataset.abilityId);
    if (!ability) continue;

    const remaining = getRemainingMs(ability, now);
    row.dataset.state = abilityState(ability, now);
    row.querySelector(".timer-main").textContent = remaining ? formatTime(remaining) : "Готов";
    const sub = row.querySelector(".timer-sub");
    if (sub) {
      sub.textContent = getReadyMatchText(ability) || (state.matchStartedAt ? "нет активного кд" : "матч не начат");
    }
    row.querySelector(".progress span").style.width = `${getProgressPercent(ability, now)}%`;
  }
}

function startTimer(heroId, abilityId) {
  const ability = getAbility(heroId, abilityId);
  if (!ability) return;

  ensureAudio();
  const now = Date.now();
  ability.cooldown = clampNumber(ability.cooldown, 1, 999);
  ability.startedAt = now;
  ability.endsAt = now + ability.cooldown * 1000;
  ability.readyMatchAtMs = state.matchStartedAt ? getMatchElapsedMs(now) + ability.cooldown * 1000 : null;
  ability.readyAt = null;
  saveStateNow();
  renderBoard();
  updateTimers();
}

function stopTimer(heroId, abilityId) {
  const ability = getAbility(heroId, abilityId);
  if (!ability) return;

  ability.startedAt = null;
  ability.endsAt = null;
  ability.readyAt = null;
  ability.readyMatchAtMs = null;
  saveStateNow();
  renderBoard();
  updateTimers();
}

function adjustTimer(heroId, abilityId, deltaSeconds) {
  const ability = getAbility(heroId, abilityId);
  if (!ability || !ability.endsAt) return;

  ability.endsAt = Math.max(Date.now() + 1000, ability.endsAt + deltaSeconds * 1000);
  if (state.matchStartedAt) {
    ability.readyMatchAtMs = Math.max(0, ability.endsAt - state.matchStartedAt);
  }
  saveStateNow();
  updateTimers();
}

function startMatch() {
  if (state.matchStartedAt && !window.confirm("Начать новый матч и сбросить активные таймеры?")) {
    return;
  }

  state.matchStartedAt = Date.now();
  state.mode = "match";
  for (const hero of state.heroes) {
    for (const ability of hero.abilities) {
      ability.startedAt = null;
      ability.endsAt = null;
      ability.readyAt = null;
      ability.readyMatchAtMs = null;
    }
  }
  saveStateNow();
  render();
}

function applyHeroPreset(heroId, presetName) {
  const hero = getHero(heroId);
  const preset = findPreset(presetName);
  if (!hero || !preset) return;

  const heroIndex = getHeroSlotIndex(heroId);
  hero.name = preset.name;
  hero.color = preset.color;
  hero.abilities = preset.abilities
    .filter((ability) => !isBlockedPresetAbility(ability.name))
    .map((ability, index) => clonePresetAbility(ability, index, heroIndex));
  saveStateNow();
  render();
}

function addAddonToHero(heroId, addonName) {
  const hero = getHero(heroId);
  const addon = findAddon(addonName);
  if (!hero || !addon || isBlockedPresetAbility(addon.name)) return;

  const existing = hero.abilities.some((ability) => ability.name === addon.name);
  if (existing) {
    showCopiedText(`${addon.name} already added`);
    return;
  }

  hero.abilities.push(createAbility({ ...addon, key: "" }));
  saveStateNow();
  render();
}

function copyChatText(heroId, abilityId, options = {}) {
  const hero = getHero(heroId);
  const ability = getAbility(heroId, abilityId);
  if (!hero || !ability) return;

  const text = makeChatText(hero, ability);
  writeClipboardText(text, options);
  showCopiedText(text);
}

async function writeClipboardText(text, options = {}) {
  try {
    if (desktopApi?.writeClipboard) {
      await desktopApi.writeClipboard(text);
      return true;
    }
  } catch {
    // Fall back to browser clipboard below.
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to the local bridge below.
  }

  try {
    const response = await fetch(HOTKEY_BRIDGE_CLIPBOARD_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: text,
    });
    if (response.ok) return true;
  } catch {
    // The bridge is optional; keep the browser fallback for manual clicks.
  }

  if (!options.silent) {
    window.prompt("Текст для чата:", text);
  }
  return false;
}

function showCopiedText(text) {
  let toast = document.querySelector(".copy-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "copy-toast";
    document.body.append(toast);
  }
  toast.textContent = `Скопировано: ${text}`;
  toast.dataset.visible = "true";
  window.clearTimeout(showCopiedText.timer);
  showCopiedText.timer = window.setTimeout(() => {
    toast.dataset.visible = "false";
  }, 2200);
}

function setHotkeyBridgeStatus(status) {
  if (!els.bridgeStatus) return;

  hotkeyBridgeOnline = status === "online";
  els.bridgeStatus.dataset.state = status;
  if (desktopApi?.isDesktop && status === "online") {
    els.bridgeStatus.textContent = "Desktop";
  } else {
    els.bridgeStatus.textContent = status === "online" ? "Global on" : "Global off";
  }
}

function startHotkeyBridgePolling() {
  if (desktopApi?.isDesktop) {
    setHotkeyBridgeStatus("online");
    desktopApi.onHotkey((event) => {
      handleHotkeyCommand(event?.action, event?.key);
    });
    return;
  }

  window.clearTimeout(hotkeyBridgeTimer);
  pollHotkeyBridge();
}

async function pollHotkeyBridge() {
  let nextDelay = hotkeyBridgeOnline ? 220 : 1200;

  try {
    const response = await fetch(`${HOTKEY_BRIDGE_EVENTS_URL}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Bridge unavailable");

    const events = await response.json();
    setHotkeyBridgeStatus("online");
    nextDelay = 160;

    for (const event of Array.isArray(events) ? events : []) {
      if (!event?.id || handledBridgeEventIds.has(event.id)) continue;
      handledBridgeEventIds.add(event.id);
      handleHotkeyCommand(event.action, event.key);
    }

    if (handledBridgeEventIds.size > 300) {
      handledBridgeEventIds.clear();
    }
  } catch {
    setHotkeyBridgeStatus("offline");
  } finally {
    hotkeyBridgeTimer = window.setTimeout(pollHotkeyBridge, nextDelay);
  }
}

function addHero() {
  const hero = createHero({ name: `Враг ${state.heroes.length + 1}`, color: colors[state.heroes.length % colors.length] }, state.heroes.length);
  state.heroes.push(hero);
  saveStateNow();
  render();
}

function deleteHero(heroId) {
  state.heroes = state.heroes.filter((hero) => hero.id !== heroId);
  saveStateNow();
  render();
}

function addAbility(heroId) {
  const hero = getHero(heroId);
  if (!hero) return;

  hero.abilities.push(createAbility({ name: "Новый скилл", cooldown: state.minCooldown, tracked: true }));
  saveStateNow();
  render();
}

function deleteAbility(heroId, abilityId) {
  const hero = getHero(heroId);
  if (!hero) return;

  hero.abilities = hero.abilities.filter((ability) => ability.id !== abilityId);
  saveStateNow();
  render();
}

function resetTimers() {
  for (const hero of state.heroes) {
    for (const ability of hero.abilities) {
      ability.startedAt = null;
      ability.endsAt = null;
      ability.readyAt = null;
      ability.readyMatchAtMs = null;
    }
  }
  saveStateNow();
  render();
}

function exportState() {
  const data = JSON.stringify(state, null, 2);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(data).catch(() => {
      window.prompt("Настройки:", data);
    });
  } else {
    window.prompt("Настройки:", data);
  }
}

function importState() {
  const raw = window.prompt("Вставь JSON настроек:");
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state = {
      ...defaultState(),
      ...parsed,
      mode: parsed.mode === "match" ? "match" : "setup",
      minCooldown: clampNumber(parsed.minCooldown ?? 90, 1, 999),
      matchStartedAt: parsed.matchStartedAt || null,
      volume: clampNumber(parsed.volume ?? 0.55, 0, 1),
      heroes: Array.isArray(parsed.heroes) ? parsed.heroes.map(createHero) : defaultState().heroes,
    };
    saveStateNow();
    render();
  } catch {
    window.alert("Не получилось прочитать настройки.");
  }
}

function ensureAudio() {
  if (!state.soundEnabled) return null;

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playReadySound(label) {
  const ctx = ensureAudio();
  if (!ctx || !state.soundEnabled) return;

  const volume = Math.max(0.001, state.volume * 0.18);
  const start = ctx.currentTime + 0.02;
  const notes = [740, 932, 1175];

  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = start + index * 0.14;
    const duration = index === notes.length - 1 ? 0.2 : 0.1;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + duration + 0.03);
  });

  document.title = `${label} готов`;
  window.setTimeout(() => {
    document.title = "Dota Enemy CD";
  }, 2200);
}

function bindEvents() {
  els.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      saveState();
      render();
    });
  });

  els.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      saveStateNow();
      render();
    });
  });

  els.matchToggle.addEventListener("click", startMatch);
  els.minCooldown.addEventListener("input", () => {
    state.minCooldown = clampNumber(els.minCooldown.value, 1, 999);
    saveState();
    if (state.filter === "min") renderBoard();
  });

  els.volume.addEventListener("input", () => {
    state.volume = clampNumber(Number(els.volume.value) / 100, 0, 1);
    saveState();
  });

  els.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    saveStateNow();
    syncControls();
    if (state.soundEnabled) playReadySound("Sound");
  });

  els.resetTimers.addEventListener("click", resetTimers);
  els.exportState.addEventListener("click", exportState);
  els.importState.addEventListener("click", importState);
  els.addHero.addEventListener("click", addHero);

  els.board.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, heroId, abilityId } = button.dataset;

    if (action === "startTimer") startTimer(heroId, abilityId);
    if (action === "stopTimer") stopTimer(heroId, abilityId);
    if (action === "adjustTimer") adjustTimer(heroId, abilityId, Number(button.dataset.delta));
    if (action === "addAbility") addAbility(heroId);
    if (action === "deleteHero") deleteHero(heroId);
    if (action === "deleteAbility") deleteAbility(heroId, abilityId);
    if (action === "copyChat") copyChatText(heroId, abilityId);
    if (action === "toggleTracked") {
      const ability = getAbility(heroId, abilityId);
      if (!ability) return;
      ability.tracked = !ability.tracked;
      saveStateNow();
      render();
    }
  });

  els.board.addEventListener("input", (event) => {
    const target = event.target;
    const field = target.dataset.field;
    if (!field) return;

    const hero = getHero(target.dataset.heroId);
    const ability = target.dataset.abilityId ? getAbility(target.dataset.heroId, target.dataset.abilityId) : null;

    if (field === "heroName" && hero) hero.name = target.value;
    if (field === "abilityName" && ability) ability.name = target.value;
    if (field === "cooldown" && ability) ability.cooldown = clampNumber(target.value, 1, 999);
    if (field === "key" && ability) {
      ability.key = normalizeHotkey(target.value);
      target.value = ability.key;
    }

    saveState();
    updateTimers();
  });

  els.board.addEventListener("change", (event) => {
    const target = event.target;
    const field = target.dataset.field;
    if (field !== "type") return;

    const ability = getAbility(target.dataset.heroId, target.dataset.abilityId);
    if (!ability) return;

    ability.type = target.checked ? "ult" : "skill";
    saveStateNow();
    if (state.filter === "ults") renderBoard();
  });

  els.board.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.field !== "preset") return;
    applyHeroPreset(target.dataset.heroId, target.value);
  });

  els.board.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.field !== "addon") return;
    addAddonToHero(target.dataset.heroId, target.value);
    target.value = "";
  });

  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

    const key = normalizeEventHotkey(event);
    if (!key) return;

    for (const hero of state.heroes) {
      for (const ability of hero.abilities) {
        if (ability.key === key && isAbilityVisible(ability)) {
          event.preventDefault();
          if (event.shiftKey) {
            copyChatText(hero.id, ability.id);
          } else {
            startTimer(hero.id, ability.id);
          }
          return;
        }
      }
    }
  });
}

bindEvents();
render();
startHotkeyBridgePolling();
window.setInterval(updateTimers, 250);
