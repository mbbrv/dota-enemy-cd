"use strict";

const STORAGE_KEY = "dota-enemy-cd-state-v1";
const READY_FLASH_MS = 7000;
const SAVE_DEBOUNCE_MS = 120;
const desktopApi = window.dotaCdDesktop || null;
const DOTA_ASSET_BASE = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";

const colors = ["#18b7a0", "#f2b84b", "#e95f6a", "#6da8ff", "#b08cff", "#7bd88f"];
const heroImageSlugs = {
  "Anti-Mage": "antimage",
  "Centaur Warrunner": "centaur",
  Doom: "doom_bringer",
  Lifestealer: "life_stealer",
  Magnus: "magnataur",
  Necrophos: "necrolyte",
  "Outworld Destroyer": "obsidian_destroyer",
  "Queen of Pain": "queenofpain",
  "Shadow Fiend": "nevermore",
  Timbersaw: "shredder",
  Treant: "treant",
  "Treant Protector": "treant",
  Underlord: "abyssal_underlord",
  "Vengeful Spirit": "vengefulspirit",
  Windranger: "windrunner",
  "Wraith King": "skeleton_king",
  Zeus: "zuus",
};
const itemImageSlugs = {
  "Aeon Disk": "aeon_disk",
  "Black King Bar": "black_king_bar",
  Bloodstone: "bloodstone",
  "Refresher Orb": "refresher",
};
const abilityImageSlugs = {
  "Invoker:Cataclysm": "invoker_sun_strike",
  "Juggernaut:Omnislash": "juggernaut_omni_slash",
  "Mirana:Moonlight Shadow": "mirana_invis",
  "Outworld Destroyer:Sanity's Eclipse": "obsidian_destroyer_sanity_eclipse",
  "Shadow Fiend:Requiem of Souls": "nevermore_requiem",
  "Techies:Blast Off!": "techies_suicide",
  "Underlord:Fiend's Gate": "abyssal_underlord_dark_portal",
  "Warlock:Chaotic Offering": "warlock_rain_of_chaos",
  "Windranger:Focus Fire": "windrunner_focusfire",
  "Zeus:Nimbus": "zuus_cloud",
};
const voicePackConfig = window.DOTA_ENEMY_CD_VOICE_PACK || {};
const voicePackAudioExtensions = new Set(["mp3", "wav", "ogg", "m4a"]);
const voicePronunciations = new Map([
  ["BKB", "B K B"],
  ["Black King Bar", "B K B"],
  ["OD", "O D"],
  ["Outworld Destroyer", "Outworld Destroyer"],
  ["Aghanim", "Aganim"],
  ["Aghanim's", "Aganim's"],
  ["Aghanim's Scepter", "Aganim's Scepter"],
  ["Aghanim's Shard", "Aganim's Shard"],
  ["Omnislash", "Omni slash"],
  ["Chronosphere", "Chrono sphere"],
  ["Sanity's Eclipse", "Sanity's Eclipse"],
  ["Requiem of Souls", "Requiem of Souls"],
]);
const voicePackAliases = new Map([
  ["Black King Bar", ["bkb"]],
  ["Refresher Orb", ["refresher"]],
  ["Outworld Destroyer", ["od"]],
]);
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
  alertSound: document.querySelector("#alertSound"),
  testSound: document.querySelector("#testSound"),
  openVoicePack: document.querySelector("#openVoicePack"),
  soundToggle: document.querySelector("#soundToggle"),
  resetTimers: document.querySelector("#resetTimers"),
  copyActive: document.querySelector("#copyActive"),
  exportState: document.querySelector("#exportState"),
  importState: document.querySelector("#importState"),
  matchToggle: document.querySelector("#matchToggle"),
  desktopStatus: document.querySelector("#desktopStatus"),
  activeSummary: document.querySelector("#activeSummary"),
  activeTimers: document.querySelector("#activeTimers"),
  addHero: document.querySelector("#addHero"),
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  modeButtons: [...document.querySelectorAll("[data-mode]")],
};

let state = loadState();
let audioContext = null;
let saveTimer = null;
let voiceFallbackShown = false;
let voicePackFallbackShown = false;
let activeVoicePackAudio = null;
const voicePackFiles = new Map();

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createAbility(data = {}) {
  const startedAt = data.startedAt || null;
  const endsAt = data.endsAt || null;
  const fallbackDurationMs = startedAt && endsAt ? Math.max(1000, endsAt - startedAt) : null;

  return {
    id: data.id || uid(),
    name: data.name || "Новый скилл",
    cooldown: clampNumber(data.cooldown ?? 120, 1, 999),
    type: ["ult", "item"].includes(data.type) ? data.type : "skill",
    key: normalizeHotkey(data.key || ""),
    tracked: Boolean(data.tracked),
    startedAt,
    endsAt,
    timerDurationMs: data.timerDurationMs || fallbackDurationMs,
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
    alertSound: "chime",
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
      alertSound: normalizeAlertSound(parsed.alertSound),
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

function normalizeAlertSound(value) {
  return ["chime", "ping", "alarm", "pack", "voice"].includes(value) ? value : "chime";
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

function slugifyAssetName(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll("'", "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getAbbreviation(value) {
  const words = String(value || "")
    .replaceAll("'", "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getHeroImageSlug(hero) {
  return hero.imageSlug || heroImageSlugs[hero.name] || slugifyAssetName(hero.name);
}

function getAbilityImageSlug(hero, ability) {
  if (ability.imageSlug) return ability.imageSlug;
  if (ability.type === "item") return itemImageSlugs[ability.name] || null;

  const exactKey = `${hero.name}:${ability.name}`;
  if (abilityImageSlugs[exactKey]) return abilityImageSlugs[exactKey];

  return `${getHeroImageSlug(hero)}_${slugifyAssetName(ability.name)}`;
}

function getAssetUrl(kind, slug) {
  if (!slug) return "";
  return `${DOTA_ASSET_BASE}/${kind}/${slug}.png`;
}

function renderAssetImage(className, url, label, fallbackText) {
  const safeLabel = escapeHtml(label);
  const fallback = escapeHtml(fallbackText || getAbbreviation(label));
  if (!url) {
    return `<span class="${className} asset-frame has-fallback" title="${safeLabel}" aria-label="${safeLabel}"><span class="asset-fallback">${fallback}</span></span>`;
  }

  return `
    <span class="${className} asset-frame" title="${safeLabel}" aria-label="${safeLabel}">
      <img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />
      <span class="asset-fallback" hidden>${fallback}</span>
    </span>
  `;
}

function renderHeroImage(hero, className = "hero-portrait") {
  return renderAssetImage(className, getAssetUrl("heroes", getHeroImageSlug(hero)), hero.name, getAbbreviation(hero.name));
}

function renderAbilityImage(hero, ability, className = "ability-icon") {
  const kind = ability.type === "item" ? "items" : "abilities";
  return renderAssetImage(className, getAssetUrl(kind, getAbilityImageSlug(hero, ability)), ability.name, getAbbreviation(ability.name));
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

function getActiveTimers(now = Date.now()) {
  const timers = [];

  for (const hero of state.heroes) {
    for (const ability of hero.abilities) {
      if (isActive(ability, now)) {
        timers.push({ hero, ability, remaining: getRemainingMs(ability, now) });
      }
    }
  }

  return timers.sort((a, b) => a.ability.endsAt - b.ability.endsAt);
}

function makeActiveChatText(now = Date.now()) {
  return getActiveTimers(now)
    .map(({ hero, ability }) => makeChatText(hero, ability))
    .join(", ");
}

function getHotkeyConflicts() {
  const byKey = new Map();

  for (const hero of state.heroes) {
    for (const ability of hero.abilities) {
      if (!ability.key) continue;
      const entries = byKey.get(ability.key) || [];
      entries.push({ hero, ability });
      byKey.set(ability.key, entries);
    }
  }

  for (const [key, entries] of byKey) {
    if (entries.length < 2) byKey.delete(key);
  }

  return byKey;
}

function hasHotkeyConflict(ability, conflicts) {
  return Boolean(ability.key && conflicts.get(ability.key)?.some((entry) => entry.ability.id === ability.id));
}

function getHotkeyConflictTitle(ability, conflicts) {
  const entries = ability.key ? conflicts.get(ability.key) : null;
  if (!entries) return "Клавиша";
  const names = entries.map((entry) => `${entry.hero.name}: ${entry.ability.name}`).join(", ");
  return `Конфликт хоткея ${ability.key}: ${names}`;
}

function findAbilitiesByHotkey(key) {
  const normalizedKey = normalizeHotkey(key);
  if (!normalizedKey) return [];
  const matches = [];

  for (const hero of state.heroes) {
    for (const ability of hero.abilities) {
      if (ability.key === normalizedKey && isAbilityVisible(ability)) {
        matches.push({ hero, ability });
      }
    }
  }

  return matches;
}

function showHotkeyConflict(key, matches) {
  const names = matches.map((match) => `${match.hero.name}: ${match.ability.name}`).join(", ");
  showToast(`Конфликт хоткея ${key}: ${names}`);
}

function handleHotkeyCommand(action, key) {
  const matches = findAbilitiesByHotkey(key);
  if (!matches.length) {
    showToast(`Нет видимого таймера для ${key}`);
    return;
  }
  if (matches.length > 1) {
    showHotkeyConflict(key, matches);
    return;
  }

  const match = matches[0];

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
  els.alertSound.value = state.alertSound;
  els.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  els.soundToggle.title = state.soundEnabled ? "Звук включен" : "Звук выключен";
  els.soundToggle.innerHTML = icon(state.soundEnabled ? "bell" : "bell-off");
  els.matchToggle.innerHTML = `${icon(state.matchStartedAt ? "reset" : "play")}${state.matchStartedAt ? "Сброс матча" : "Начать матч"}`;
  els.matchToggle.title = state.matchStartedAt ? "Остановить матч и сбросить все кулдауны" : "Запустить игровые часы";

  els.filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });

  els.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });
}

function renderBoard() {
  const conflicts = getHotkeyConflicts();
  els.board.innerHTML = state.heroes.map((hero) => renderHero(hero, conflicts)).join("");
}

function renderHero(hero, conflicts) {
  const visibleAbilities = hero.abilities.filter(isAbilityVisible);
  const isMatchMode = state.mode === "match";
  const rows = visibleAbilities.length
    ? visibleAbilities.map((ability) => renderAbility(hero, ability, conflicts)).join("")
    : `<div class="empty-state">Нет скиллов в текущем фильтре</div>`;
  const activeCount = hero.abilities.filter((ability) => isActive(ability)).length;

  return `
    <article class="hero-card" style="--hero-color: ${escapeHtml(hero.color)}" data-hero-id="${hero.id}">
      <div class="hero-top">
        ${
          isMatchMode
            ? `
              <div class="hero-title hero-title-visual" title="${escapeHtml(hero.name)}">
                ${renderHeroImage(hero)}
                <span>${activeCount ? `активно ${activeCount}` : "нет кд"}</span>
              </div>
            `
            : `
              ${renderHeroImage(hero, "hero-portrait hero-portrait-setup")}
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

function renderAbility(hero, ability, conflicts) {
  const now = Date.now();
  const stateName = abilityState(ability, now);
  const remaining = getRemainingMs(ability, now);
  const percent = getProgressPercent(ability, now);
  const isRunning = remaining > 0;
  const isMatchMode = state.mode === "match";
  const readyText = getReadyMatchText(ability);
  const timerLabel = isRunning ? formatTime(remaining) : "Готов";
  const hasConflict = hasHotkeyConflict(ability, conflicts);
  const conflictTitle = getHotkeyConflictTitle(ability, conflicts);

  return `
    <div class="ability-row" data-state="${stateName}" data-hotkey-conflict="${hasConflict}" data-hero-id="${hero.id}" data-ability-id="${ability.id}">
      ${
        isMatchMode
          ? `
            <button class="row-button start-button star-button" type="button" data-action="startTimer" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Запустить">${icon("play")}</button>
            <div class="ability-display ability-display-visual" title="${escapeHtml(ability.name)}">
              ${renderAbilityImage(hero, ability)}
            </div>
            <input class="cooldown-input match-cooldown-input" data-field="cooldown" data-hero-id="${hero.id}" data-ability-id="${ability.id}" type="number" min="1" max="999" step="1" value="${escapeHtml(ability.cooldown)}" title="Кулдаун в секундах" />
            <div class="ult-badge ${ability.type === "ult" ? "is-ult" : ""}">${abilityTypeLabel(ability.type)}</div>
            <div class="key-badge ${hasConflict ? "has-conflict" : ""}" title="${escapeHtml(conflictTitle)}">${escapeHtml(ability.key || "-")}</div>
          `
          : `
            <button class="row-button star-button ${ability.tracked ? "is-on" : ""}" type="button" data-action="toggleTracked" data-hero-id="${hero.id}" data-ability-id="${ability.id}" title="Избранное">${icon("star")}</button>
            <input class="ability-name" data-field="abilityName" data-hero-id="${hero.id}" data-ability-id="${ability.id}" value="${escapeHtml(ability.name)}" placeholder="Скилл" />
            <input class="cooldown-input" data-field="cooldown" data-hero-id="${hero.id}" data-ability-id="${ability.id}" type="number" min="1" max="999" step="1" value="${escapeHtml(ability.cooldown)}" title="Кулдаун в секундах" />
            <label class="ult-toggle" title="Ультимейт">
              <input data-field="type" data-hero-id="${hero.id}" data-ability-id="${ability.id}" type="checkbox" ${ability.type === "ult" ? "checked" : ""} />
              Ult
            </label>
            <input class="key-input ${hasConflict ? "has-conflict" : ""}" data-field="key" data-hero-id="${hero.id}" data-ability-id="${ability.id}" maxlength="1" value="${escapeHtml(ability.key)}" title="${escapeHtml(conflictTitle)}" />
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
  const total = ability.timerDurationMs || Number(ability.cooldown) * 1000;
  if (!remaining || !total) return 0;
  return Math.max(0, Math.min(100, (remaining / total) * 100));
}

function renderActiveTimerChip(item) {
  const readyText = getReadyMatchText(item.ability);
  const label = `${item.hero.name}: ${item.ability.name}`;
  return `
    <div class="active-chip" data-hero-id="${item.hero.id}" data-ability-id="${item.ability.id}" title="${escapeHtml(label)}">
      <div class="active-chip-media">
        ${renderHeroImage(item.hero, "hero-portrait hero-portrait-chip")}
        ${renderAbilityImage(item.hero, item.ability, "ability-icon ability-icon-chip")}
      </div>
      <div class="active-chip-time">
        <strong>${formatTime(item.remaining)}</strong>
        <span>${readyText || "без времени матча"}</span>
      </div>
      <button class="row-button copy-button" type="button" data-action="copyChat" data-hero-id="${item.hero.id}" data-ability-id="${item.ability.id}" title="Скопировать текст для чата">${icon("copy")}</button>
    </div>
  `;
}

function updateActivePanel(activeTimers) {
  if (!els.activeSummary || !els.activeTimers) return;

  if (!activeTimers.length) {
    els.activeSummary.textContent = "Нет";
    els.activeTimers.innerHTML = `<div class="active-empty">Нет активных кулдаунов</div>`;
    return;
  }

  els.activeSummary.textContent = `${activeTimers.length} активно`;
  els.activeTimers.innerHTML = activeTimers.map(renderActiveTimerChip).join("");
}

function updateActionButtons(activeCount, readyCount) {
  const hasResettableTimers = activeCount > 0 || readyCount > 0;
  if (els.resetTimers) {
    els.resetTimers.disabled = !hasResettableTimers;
  }
  if (els.copyActive) {
    els.copyActive.disabled = activeCount === 0;
  }
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
        ability.timerDurationMs = null;
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

  const activeTimers = getActiveTimers(now);
  activeCount = activeTimers.length;
  next = activeTimers[0] || null;

  els.activeCount.textContent = String(activeCount);
  els.readyCount.textContent = String(readyCount);
  els.nextReady.textContent = next
    ? `${next.hero.name}: ${next.ability.name} ${formatTime(getRemainingMs(next.ability, now))}${next.ability.readyMatchAtMs ? ` @ ${formatMatchTime(next.ability.readyMatchAtMs)}` : ""}`
    : "-";
  updateActivePanel(activeTimers);
  updateActionButtons(activeCount, readyCount);

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
  ability.timerDurationMs = ability.cooldown * 1000;
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
  ability.timerDurationMs = null;
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

function updateAbilityCooldown(ability, value) {
  ability.cooldown = clampNumber(value, 1, 999);
}

function clearCooldownTimers() {
  for (const hero of state.heroes) {
    for (const ability of hero.abilities) {
      ability.startedAt = null;
      ability.endsAt = null;
      ability.timerDurationMs = null;
      ability.readyAt = null;
      ability.readyMatchAtMs = null;
    }
  }
}

function startMatch() {
  state.matchStartedAt = Date.now();
  state.mode = "match";
  clearCooldownTimers();
  saveStateNow();
  render();
}

function resetMatch() {
  if (!state.matchStartedAt) return;
  if (!window.confirm("Сбросить матч и все активные кулдауны?")) return;

  state.matchStartedAt = null;
  clearCooldownTimers();
  saveStateNow();
  render();
}

function toggleMatch() {
  if (state.matchStartedAt) {
    resetMatch();
    return;
  }

  startMatch();
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
    showToast(`${addon.name} уже добавлен`);
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

function copyActiveTimers(options = {}) {
  const text = makeActiveChatText();
  if (!text) {
    showToast("Нет активных кулдаунов");
    return;
  }

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
    // Keep the prompt fallback below for plain browser mode.
  }

  if (!options.silent) {
    window.prompt("Текст для чата:", text);
  }
  return false;
}

function showToast(text) {
  let toast = document.querySelector(".copy-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "copy-toast";
    document.body.append(toast);
  }
  toast.textContent = text;
  toast.dataset.visible = "true";
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.dataset.visible = "false";
  }, 2200);
}

function showCopiedText(text) {
  showToast(`Скопировано: ${text}`);
}

function setupDesktopIntegration() {
  if (desktopApi?.isDesktop) {
    setRuntimeStatus("desktop");
    loadVoicePackFiles({ silent: true });
    desktopApi.onHotkey((event) => {
      handleHotkeyCommand(event?.action, event?.key);
    });
    return;
  }

  setRuntimeStatus("browser");
  loadVoicePackFiles({ silent: true });
}

function setRuntimeStatus(status) {
  if (!els.desktopStatus) return;

  els.desktopStatus.dataset.state = status;
  els.desktopStatus.textContent = status === "desktop" ? "Desktop" : "Browser";
  if (els.openVoicePack) {
    els.openVoicePack.hidden = status !== "desktop" || !desktopApi?.openVoicePackFolder;
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
  clearCooldownTimers();
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
      alertSound: normalizeAlertSound(parsed.alertSound),
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

function getAlertPattern(alertSound = state.alertSound) {
  if (alertSound === "ping") {
    return {
      type: "triangle",
      notes: [
        { frequency: 1046, offset: 0, duration: 0.09 },
        { frequency: 1046, offset: 0.18, duration: 0.09 },
      ],
      volumeScale: 0.16,
    };
  }

  if (alertSound === "alarm") {
    return {
      type: "square",
      notes: [
        { frequency: 520, offset: 0, duration: 0.16 },
        { frequency: 390, offset: 0.18, duration: 0.16 },
        { frequency: 520, offset: 0.36, duration: 0.2 },
      ],
      volumeScale: 0.12,
    };
  }

  return {
    type: "sine",
    notes: [
      { frequency: 740, offset: 0, duration: 0.1 },
      { frequency: 932, offset: 0.14, duration: 0.1 },
      { frequency: 1175, offset: 0.28, duration: 0.2 },
    ],
    volumeScale: 0.18,
  };
}

function playToneAlert(label, alertSound = state.alertSound) {
  const ctx = ensureAudio();
  if (!ctx) return;

  const pattern = getAlertPattern(alertSound);
  const volume = Math.max(0.001, state.volume * pattern.volumeScale);
  const start = ctx.currentTime + 0.02;

  pattern.notes.forEach((note) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = start + note.offset;

    oscillator.type = pattern.type;
    oscillator.frequency.setValueAtTime(note.frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + note.duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + note.duration + 0.03);
  });

  markReadyTitle(label);
}

function getVoiceLabel(label) {
  const cleanLabel = String(label || "Cooldown")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const exact = voicePronunciations.get(cleanLabel);
  if (exact) return exact;

  return cleanLabel
    .split(" ")
    .map((part) => voicePronunciations.get(part) || part)
    .join(" ");
}

function makeVoiceAlertText(label) {
  return `${getVoiceLabel(label)} is ready now`;
}

function stripAudioExtension(name) {
  return String(name || "").replace(/\.(mp3|wav|ogg|m4a)$/i, "");
}

function voicePackKey(value) {
  return stripAudioExtension(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveVoicePackSource(src) {
  return String(src || "").trim();
}

function registerVoicePackFile(label, src) {
  const key = voicePackKey(label);
  const source = resolveVoicePackSource(src);
  if (!key || !source) return;

  voicePackFiles.set(key, source);
}

function registerVoicePackAudioFile(name, src) {
  const fileName = String(name || "");
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!voicePackAudioExtensions.has(extension)) return;

  registerVoicePackFile(stripAudioExtension(fileName), src);
}

function registerBundledVoicePackFiles() {
  const files = voicePackConfig.files || {};

  if (Array.isArray(files)) {
    files.forEach((entry) => {
      if (typeof entry === "string") {
        registerVoicePackAudioFile(entry, entry);
        return;
      }

      registerVoicePackAudioFile(entry?.name, entry?.src);
    });
  } else {
    Object.entries(files).forEach(([label, src]) => {
      registerVoicePackFile(label, src);
    });
  }

  if (voicePackConfig.fallback) {
    registerVoicePackFile("default", voicePackConfig.fallback);
  }
}

async function loadVoicePackFiles(options = {}) {
  voicePackFiles.clear();
  registerBundledVoicePackFiles();

  if (!desktopApi?.listVoicePackFiles) return;

  try {
    const result = await desktopApi.listVoicePackFiles();
    (result?.files || []).forEach((file) => {
      registerVoicePackAudioFile(file.name, file.src);
    });

    if (els.openVoicePack && result?.directory) {
      els.openVoicePack.title = `Открыть папку voice pack (${result.files?.length || 0} файлов)`;
    }
  } catch {
    if (!options.silent) {
      showToast("Не получилось прочитать voice pack");
    }
  }
}

function getVoicePackCandidateKeys(label) {
  const cleanLabel = String(label || "").replace(/\s+/g, " ").trim();
  const baseKey = voicePackKey(cleanLabel);
  const spokenKey = voicePackKey(getVoiceLabel(cleanLabel));
  const aliases = voicePackAliases.get(cleanLabel) || [];

  return [
    ...aliases.flatMap((alias) => [`${alias}-ready`, alias]),
    `${baseKey}-ready`,
    `${baseKey}-is-ready`,
    baseKey,
    `${spokenKey}-ready`,
    spokenKey,
    "cooldown-ready",
    "default",
  ].filter(Boolean);
}

function getVoicePackSource(label) {
  for (const key of getVoicePackCandidateKeys(label)) {
    if (voicePackFiles.has(key)) return voicePackFiles.get(key);
  }

  return "";
}

function fallbackAfterVoicePack(label) {
  if (playVoiceReady(label)) return;
  playToneAlert(label, "chime");
}

function showVoicePackFallbackOnce(label) {
  if (voicePackFallbackShown) return;
  voicePackFallbackShown = true;
  showToast(`Voice Pack: нет файла для ${label}, fallback`);
}

function playVoicePackReady(label) {
  const src = getVoicePackSource(label);
  if (!src) {
    showVoicePackFallbackOnce(label);
    fallbackAfterVoicePack(label);
    return true;
  }

  let didFallback = false;
  const fallback = () => {
    if (didFallback) return;
    didFallback = true;
    showVoicePackFallbackOnce(label);
    fallbackAfterVoicePack(label);
  };

  if (activeVoicePackAudio) {
    activeVoicePackAudio.pause();
    activeVoicePackAudio = null;
  }

  const audio = new Audio(src);
  activeVoicePackAudio = audio;
  audio.volume = clampNumber(state.volume, 0, 1);
  audio.addEventListener("ended", () => {
    if (activeVoicePackAudio === audio) activeVoicePackAudio = null;
  }, { once: true });
  audio.addEventListener("error", fallback, { once: true });

  const playPromise = audio.play();
  if (playPromise?.catch) playPromise.catch(fallback);

  markReadyTitle(label);
  return true;
}

function isDefaultVoice(voice) {
  const name = String(voice?.name || "").toLowerCase();
  return Boolean(voice?.default) || name === "default" || name.includes("system default");
}

function isEnglishVoice(voice) {
  return String(voice?.lang || "").toLowerCase().startsWith("en");
}

function scoreVoice(voice) {
  const name = String(voice.name || "").toLowerCase();
  const lang = String(voice.lang || "").toLowerCase();
  let score = 0;

  if (lang === "en-us") score += 30;
  if (lang === "en-gb") score += 24;
  if (lang.startsWith("en")) score += 10;
  if (name.includes("google")) score += 30;
  if (name.includes("microsoft")) score += 24;
  if (name.includes("natural") || name.includes("online")) score += 12;
  if (name.includes("aria") || name.includes("jenny") || name.includes("guy")) score += 8;
  if (name.includes("david") || name.includes("zira")) score += 6;
  if (voice.localService) score += 2;

  return score;
}

function getPreferredVoice() {
  const synth = window.speechSynthesis;
  if (!synth?.getVoices) return null;

  return synth
    .getVoices()
    .filter((voice) => isEnglishVoice(voice) && !isDefaultVoice(voice))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
}

function showVoiceFallbackOnce() {
  if (voiceFallbackShown) return;
  voiceFallbackShown = true;
  showToast("Voice: нет не-default English voice, играю Chime");
}

function playVoiceReady(label) {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance !== "function") return false;

  const voice = getPreferredVoice();
  if (!voice) {
    showVoiceFallbackOnce();
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(makeVoiceAlertText(label));
  utterance.voice = voice;
  utterance.lang = voice.lang || "en-US";
  utterance.rate = 0.98;
  utterance.pitch = 1;
  utterance.volume = clampNumber(state.volume, 0, 1);

  synth.cancel();
  synth.speak(utterance);
  markReadyTitle(label);
  return true;
}

function playReadySound(label) {
  if (!state.soundEnabled) return;

  if (state.alertSound === "pack") {
    playVoicePackReady(label);
    return;
  }

  if (state.alertSound === "voice") {
    if (playVoiceReady(label)) return;
    playToneAlert(label, "chime");
    return;
  }

  playToneAlert(label);
}

function warmUpVoices() {
  if (window.speechSynthesis?.getVoices) {
    window.speechSynthesis.getVoices();
  }
}

function markReadyTitle(label) {
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

  els.matchToggle.addEventListener("click", toggleMatch);
  els.minCooldown.addEventListener("input", () => {
    state.minCooldown = clampNumber(els.minCooldown.value, 1, 999);
    saveState();
    if (state.filter === "min") renderBoard();
  });

  els.volume.addEventListener("input", () => {
    state.volume = clampNumber(Number(els.volume.value) / 100, 0, 1);
    saveState();
  });

  els.alertSound.addEventListener("change", async () => {
    state.alertSound = normalizeAlertSound(els.alertSound.value);
    saveStateNow();
    if (state.alertSound === "pack") {
      await loadVoicePackFiles({ silent: true });
    }
    playReadySound("Black Hole");
  });

  els.openVoicePack?.addEventListener("click", async () => {
    if (!desktopApi?.openVoicePackFolder) return;

    const result = await desktopApi.openVoicePackFolder();
    await loadVoicePackFiles();
    if (result?.directory) {
      showToast(`Voice pack: ${result.directory}`);
    }
  });

  els.testSound.addEventListener("click", async () => {
    if (!state.soundEnabled) {
      state.soundEnabled = true;
      saveStateNow();
      syncControls();
    }
    if (state.alertSound === "pack") {
      await loadVoicePackFiles({ silent: true });
    }
    playReadySound("Black Hole");
  });

  els.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    saveStateNow();
    syncControls();
    if (state.soundEnabled) playReadySound("Black Hole");
  });

  els.resetTimers.addEventListener("click", resetTimers);
  els.copyActive.addEventListener("click", copyActiveTimers);
  els.exportState.addEventListener("click", exportState);
  els.importState.addEventListener("click", importState);
  els.addHero.addEventListener("click", addHero);

  els.activeTimers.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, heroId, abilityId } = button.dataset;
    if (action === "copyChat") copyChatText(heroId, abilityId);
  });

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
    if (field === "cooldown" && ability) updateAbilityCooldown(ability, target.value);
    if (field === "key" && ability) {
      ability.key = normalizeHotkey(target.value);
      target.value = ability.key;
      saveStateNow();
      renderBoard();
      updateTimers();
      return;
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

    const matches = findAbilitiesByHotkey(key);
    if (!matches.length) return;

    event.preventDefault();
    if (matches.length > 1) {
      showHotkeyConflict(key, matches);
      return;
    }

    const match = matches[0];
    if (event.shiftKey) {
      copyChatText(match.hero.id, match.ability.id);
    } else {
      startTimer(match.hero.id, match.ability.id);
    }
  });
}

bindEvents();
render();
setupDesktopIntegration();
warmUpVoices();
if (window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", warmUpVoices);
}
window.setInterval(updateTimers, 250);
