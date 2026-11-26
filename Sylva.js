(() => {
  "use strict";

  const canvas = document.getElementById("canopy");
  const ctx = canvas.getContext("2d", { alpha: true });
  const growthCanvas = document.createElement("canvas");
  const growthCtx = growthCanvas.getContext("2d", { alpha: true });
  const $ = (id) => document.getElementById(id);
  const ui = {
    depth: $("depthSlider"), factor: $("factorSlider"), angle: $("angleSlider"),
    tempo: $("tempoSlider"), master: $("masterSlider"), pad: $("padSlider"),
    seed: $("seedInput"), randomSeed: $("randomSeedButton"), copySeed: $("copySeedButton"),
    scale: $("scaleSelect"), timing: $("timingSelect"), loop: $("loopToggle"), padOn: $("padToggle"),
    duration: $("durationSelect"), zen: $("zenButton"),
    breathe: $("breatheToggle"), tour: $("tourButton"), tourExit: $("tourExit"),
    tourCaption: $("tourCaption"), tourCaptionText: $("tourCaptionText"),
    welcome: $("welcomeOverlay"), welcomeStart: $("welcomeStart"),
    traceToggle: $("traceToggle"), traceDrawer: $("traceDrawer"), traceClose: $("traceClose"),
    traceStack: $("traceStack"), traceList: $("traceList"),
    play: $("playButton"), playLabel: $("playLabel"), restart: $("restartButton"),
    export: $("exportButton"), progress: $("exportProgress"), progressBar: $("progressBar"),
    progressText: $("progressText"), panel: $("controlPanel"), collapse: $("collapseButton"),
    reopen: $("reopenButton"), toast: $("toast"), capBadge: $("capBadge"),
    customBadge: $("customBadge"), zenLabel: $("zenLabel"), harmonic: $("harmonicDisplay")
  };
  const palettes = {
    rain: {
      colors: ["#6f9c91", "#83b2a1", "#a3cbb0", "#c5e1c2"], accent: "#b2ddc1", rgb: "173,226,190",
      geometry: "tree", depth: 6, factor: 3, tempo: 82, timing: "uniform", scale: "lydian",
      spread: 32, padVolume: .24, reverb: 2.4, filter: 7200, attack: .12, release: 2.4, style: "soft"
    },
    blossom: {
      colors: ["#9f7896", "#c18ca9", "#e0a9ba", "#f0c5c7"], accent: "#f0bcca", rgb: "238,178,198",
      geometry: "tree", depth: 7, factor: 3, tempo: 92, timing: "fibonacci", scale: "pentatonic",
      spread: 34, padVolume: .35, reverb: 3, filter: 6100, attack: .13, release: 2.7, style: "soft"
    },
    cosmic: {
      colors: ["#777eb3", "#8d94ce", "#aaa5dc", "#d0c2e9"], accent: "#c5bdf3", rgb: "192,180,244",
      geometry: "sierpinski", depth: 6, factor: 3, tempo: 66, timing: "fibonacci", scale: "lydian",
      spread: 25, padVolume: .35, reverb: 3.2, filter: 6400, attack: .12, release: 2.6, style: "soft"
    },
    glacier: {
      colors: ["#5d9bb2", "#78c1d3", "#b4eaf0", "#efffff"], accent: "#d8fcff", rgb: "170,237,248",
      geometry: "koch", depth: 5, factor: 4, tempo: 64, timing: "uniform", scale: "lydian",
      spread: 60, padVolume: .70, reverb: 5.2, filter: 8800, attack: .1, release: 3.4, style: "crystal"
    },
    nautilus: {
      colors: ["#9c6736", "#c58b42", "#e7bb67", "#fff0b5"], accent: "#ffe2a1", rgb: "245,195,112",
      geometry: "spiral", depth: 8, factor: 2, tempo: 96, timing: "fibonacci", scale: "pentatonic",
      spread: 38, padVolume: .32, reverb: 2.1, filter: 5400, attack: .055, release: 1.75, style: "pluck"
    },
    deep: {
      colors: ["#174d50", "#21786c", "#39ae8b", "#9af0d2"], accent: "#a7f5d6", rgb: "92,219,176",
      geometry: "fern", depth: 7, factor: 3, tempo: 54, timing: "fibonacci", scale: "lydian",
      spread: 42, padVolume: .80, reverb: 4.1, filter: 3900, attack: .15, release: 3.1, style: "warm"
    },
    solar: {
      colors: ["#a94e71", "#de5d83", "#fb8b83", "#ffd0a1"], accent: "#ffc5b4", rgb: "255,132,164",
      geometry: "sierpinski", depth: 6, factor: 3, tempo: 132, timing: "fibonacci", scale: "pentatonic",
      spread: 52, padVolume: .28, reverb: 1.8, filter: 9600, attack: .045, release: 1.35, style: "pluck"
    }
  };
  const geometryModes = ["tree", "sierpinski", "koch", "spiral", "fern"];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const scales = { pentatonic: [0, 2, 4, 7, 9], lydian: [0, 2, 4, 6, 7, 9, 11] };
  const noteNames = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const MAX_RENDERED_NODES = 2048;
  const MAX_AUDIO_VOICES = 18;
  const MAX_EXPORT_SECONDS = 60;
  const PHI = (1 + Math.sqrt(5)) / 2;
  const tempoDelaySeconds = (tempo) => 60 / (tempo * PHI);
  function cleanSeed(value) {
    return String(value || "").trim().replace(/[^a-z0-9_-]/gi, "").slice(0, 32).toUpperCase() || "SYLVA-4829";
  }
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  function hashSeed(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    return hash >>> 0;
  }
  function seededUnit(seedHash, first, second, third, salt) {
    let value = (seedHash ^ Math.imul((first | 0) + 1, 0x9e3779b1) ^
      Math.imul((second | 0) + 1, 0x85ebca6b) ^ Math.imul((third | 0) + 1, 0xc2b2ae35) ^
      Math.imul((salt | 0) + 1, 0x27d4eb2f)) >>> 0;
    value ^= value >>> 16; value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15; value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  }
  function makeNodeQuotas(maxDepth, branching, roots) {
    const capacities = [];
    let levelCapacity = roots;
    for (let depth = 0; depth <= maxDepth; depth++) {
      capacities.push(levelCapacity);
      levelCapacity *= branching;
    }
    if (capacities.reduce((total, count) => total + count, 0) <= MAX_RENDERED_NODES) {
      capacities.capped = false;
      return capacities;
    }
    let low = 1, high = MAX_RENDERED_NODES;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      const total = capacities.reduce((sum, count) => sum + Math.min(count, middle), 0);
      if (total <= MAX_RENDERED_NODES) low = middle;
      else high = middle - 1;
    }
    const quotas = capacities.map((count) => Math.min(count, low));
    quotas.capped = true;
    return quotas;
  }
  function childWindow(levelIndex, parentCount, childCount) {
    return {
      start: Math.floor(levelIndex * childCount / parentCount),
      end: Math.floor((levelIndex + 1) * childCount / parentCount)
    };
  }
  function sampledBranchIndex(slot, count, branching, parentIndex, depth) {
    if (count === 1) return (parentIndex + depth) % branching;
    return Math.round(slot * (branching - 1) / (count - 1));
  }
  const sharedParams = new URLSearchParams(window.location.search);
  const sharedPalette = sharedParams.get("preset") || sharedParams.get("palette");
  const initialPalette = Object.prototype.hasOwnProperty.call(palettes, sharedPalette) ? sharedPalette : "rain";
  const initialPreset = palettes[initialPalette];
  const sharedScale = sharedParams.get("scale");
  const initialSeed = cleanSeed(sharedParams.get("seed") || "SYLVA-4829");
  const sharedInteger = (name, fallback, min, max) => {
    const raw = sharedParams.get(name);
    if (raw === null || raw.trim() === "") return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && Number.isInteger(value) ? clamp(value, min, max) : fallback;
  };
  const state = {
    depth: sharedInteger("depth", initialPreset.depth, 3, 9), factor: sharedInteger("factor", initialPreset.factor, 2, 4),
    angle: sharedInteger("angle", initialPreset.spread, 15, 65), tempo: sharedInteger("tempo", initialPreset.tempo, 40, 160),
    timing: ["uniform", "fibonacci"].includes(sharedParams.get("timing")) ? sharedParams.get("timing") : initialPreset.timing,
    mode: geometryModes.includes(sharedParams.get("mode"))
      ? sharedParams.get("mode")
      : (sharedParams.get("mode") === "snow" ? "koch" : initialPreset.geometry),
    palette: initialPalette,
    scale: Object.prototype.hasOwnProperty.call(scales, sharedScale) ? sharedScale : initialPreset.scale,
    loop: sharedParams.get("loop") !== "false", padOn: sharedParams.get("padOn") !== "false",
    master: sharedInteger("master", 42, 0, 100) / 100, padVolume: sharedInteger("pad", Math.round(initialPreset.padVolume * 100), 0, 100) / 100,
    seed: initialSeed, seedHash: hashSeed(initialSeed),
    playing: false, playbackStarting: false, welcomeStarted: false, step: 0, loopCycle: 0,
    calls: 0, active: null, nodes: [], mutedBranches: new Set(), trace: [], particles: [], stars: [], timer: null, lastNote: "listen",
    audio: null, exportBusy: false, hoverNode: null, zen: false,
    manualAngle: sharedInteger("angle", 28, 15, 65), angleHeld: false,
    autoBreathe: false, breatheStartedAt: 0, tourActive: false, tourTimers: [], tourPrunedNode: null,
    customModified: false, capped: false, highlightedPath: new Set(), highlightUntil: 0,
    regrowing: new Map(), regrowthTimers: new Map(), lastWindChimeId: null, lastWindChimeAt: 0
  };
  state.customModified = [
    sharedParams.has("depth") && state.depth !== initialPreset.depth,
    sharedParams.has("factor") && state.factor !== initialPreset.factor,
    sharedParams.has("angle") && state.angle !== initialPreset.spread,
    sharedParams.has("tempo") && state.tempo !== initialPreset.tempo,
    sharedParams.has("timing") && state.timing !== initialPreset.timing,
    sharedParams.has("mode") && state.mode !== initialPreset.geometry,
    sharedParams.has("scale") && state.scale !== initialPreset.scale,
    sharedParams.has("pad") && state.padVolume !== initialPreset.padVolume,
    sharedParams.has("padOn") && !state.padOn
  ].some(Boolean);
  let viewWidth = 0, viewHeight = 0, pixelRatio = 1, toastTimer = 0, animationFrameId = null, breatheTimer = null;
  ui.depth.value = state.depth; ui.factor.value = state.factor; ui.angle.value = state.angle; ui.tempo.value = state.tempo;
  ui.timing.value = state.timing; ui.scale.value = state.scale; ui.seed.value = state.seed;
  ui.loop.checked = state.loop; ui.padOn.checked = state.padOn;
  ui.master.value = Math.round(state.master * 100); ui.pad.value = Math.round(state.padVolume * 100);
  document.querySelectorAll(".mode-button").forEach((button) => button.classList.toggle("selected", button.dataset.mode === state.mode));
  document.querySelectorAll(".preset").forEach((button) => button.classList.toggle("selected", !state.customModified && button.dataset.preset === state.palette));
  ui.customBadge.hidden = !state.customModified;

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2800);
  }

  function updateSliderFill(input) {
    const min = Number(input.min), max = Number(input.max), val = Number(input.value);
    const percentage = (val - min) / (max - min) * 100;
    input.style.background = `linear-gradient(90deg, #93c9a2 ${percentage}%, rgba(169,203,177,.19) ${percentage}%)`;
  }

  function syncLabels() {
    $("depthOut").textContent = state.depth;
    $("factorOut").textContent = state.factor;
    $("angleOut").textContent = `${state.angle}°`;
    $("tempoOut").textContent = `${state.tempo} BPM`;
    $("masterOut").textContent = `${Math.round(state.master * 100)}%`;
    $("padOut").textContent = `${Math.round(state.padVolume * 100)}%`;
    $("depthOut").setAttribute("aria-label", `Current recursion depth ${state.depth}`);
    $("factorOut").setAttribute("aria-label", `Current branching factor ${state.factor}`);
    $("angleOut").setAttribute("aria-label", `Current branch spread ${state.angle} degrees`);
    $("tempoOut").setAttribute("aria-label", `Current tempo ${state.tempo} BPM`);
    ui.harmonic.textContent = `Harmonic engine · ${state.scale === "lydian" ? "D Lydian" : "C Major Pentatonic"}`;
    [ui.depth, ui.factor, ui.angle, ui.tempo, ui.master, ui.pad].forEach(updateSliderFill);
  }

  function markCustomModified() {
    state.customModified = true;
    ui.customBadge.hidden = false;
    document.querySelectorAll(".preset").forEach((button) => button.classList.remove("selected"));
  }

  function syncTempoEcho() {
    if (!state.audio) return;
    const { ac, delay } = state.audio;
    delay.delayTime.setTargetAtTime(tempoDelaySeconds(state.tempo), ac.currentTime, .18);
  }

  function cancelPendingAudio() {
    if (!state.audio) return;
    const { ac, master, warmth, delay, delayFilter, feedback, wet, dry, padBus, padFilter, padOscillators, padLfoDepth, voices } = state.audio;
    const now = ac.currentTime;
    [master.gain, warmth.frequency, delay.delayTime, delayFilter.frequency, feedback.gain,
      wet.gain, dry.gain, padBus.gain, padFilter.frequency, padLfoDepth.gain,
      ...padOscillators.map(({ oscillator }) => oscillator.frequency)]
      .forEach((parameter) => parameter.cancelScheduledValues(now));
    for (const voice of voices) fadeVoice(voice, now, .12);
  }

  function updateInspector() {
    $("depthValue").textContent = state.active ? `${state.active.depth + 1} / ${state.depth + 1}` : "—";
    $("noteValue").textContent = state.active && isNodeMuted(state.active) ? "muted" : state.lastNote;
    $("callsValue").textContent = `${state.calls.toLocaleString()} / ${state.nodes.length.toLocaleString()}`;
    $("statusText").textContent = state.playing ? "GROWING IN REAL TIME" : "READY TO GROW";
    ui.playLabel.textContent = state.playing ? "Pause soundscape" : "Begin growing";
    ui.play.querySelector(".play-icon").textContent = state.playing ? "Ⅱ" : "▶";
  }

  function growBranch(depth, maxDepth, angle, length, branchFactor, x, y, parentAngle, branchIndex, path, parent, levelIndex, quotas) {
    x = x === undefined ? 650 : x;
    y = y === undefined ? 735 : y;
    parentAngle = parentAngle === undefined ? -Math.PI / 2 - angle : parentAngle;
    branchIndex = branchIndex === undefined ? 0 : branchIndex;
    path = path === undefined ? 0 : path;
    levelIndex = levelIndex === undefined ? 0 : levelIndex;
    quotas = quotas || makeNodeQuotas(maxDepth, branchFactor, 1);
    const sway = (seededUnit(state.seedHash, path, depth, branchIndex, 1) - .5) * .035;
    const actualAngle = parentAngle + angle + sway;
    const endX = x + Math.cos(actualAngle) * length;
    const endY = y + Math.sin(actualAngle) * length;
    const node = {
      depth, x1: x, y1: y, x2: endX, y2: endY, angle: actualAngle, length, branchIndex, path,
      swayPhase: seededUnit(state.seedHash, path, depth, branchIndex, 2) * Math.PI * 2,
      id: parent ? `${parent.id}.${branchIndex}` : "tree", parent: parent || null, leaf: depth === maxDepth,
      geometry: "tree", callName: "growBranch"
    };
    state.nodes.push(node);
    if (depth === maxDepth) return;
    const spread = angle * 2 / Math.max(1, branchFactor - 1);
    const childLengthScale = maxDepth >= 8 ? .73 : .715;
    const window = childWindow(levelIndex, quotas[depth], quotas[depth + 1]);
    const childCount = window.end - window.start;
    for (let slot = 0; slot < childCount; slot++) {
      const childOrdinal = window.start + slot;
      const index = sampledBranchIndex(slot, childCount, branchFactor, levelIndex, depth);
      const offset = branchFactor === 1 ? 0 : -angle + index * spread;
      const organicOffset = (seededUnit(state.seedHash, path, index, depth, 3) - .5) * .07;
      growBranch(depth + 1, maxDepth, offset + organicOffset, length * childLengthScale, branchFactor, endX, endY, actualAngle, index, path * branchFactor + index + 1, node, childOrdinal, quotas);
    }
  }

  function subdivideKoch(depth, maxDepth, a, b, path, parent, levelIndex, quotas) {
    levelIndex = levelIndex === undefined ? 0 : levelIndex;
    quotas = quotas || makeNodeQuotas(maxDepth, 4, 3);
    const node = {
      depth, x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      angle: Math.atan2(b.y - a.y, b.x - a.x), length: Math.hypot(b.x - a.x, b.y - a.y),
      branchIndex: path % 4, path, swayPhase: seededUnit(state.seedHash, path, depth, 0, 4) * Math.PI * 2,
      id: parent ? `${parent.id}.${path % 4}` : `koch-${path}`, parent: parent || null, leaf: depth === maxDepth,
      geometry: "koch", callName: "subdivideKoch"
    };
    state.nodes.push(node);
    if (depth === maxDepth) {
      return;
    }
    const dx = (b.x - a.x) / 3, dy = (b.y - a.y) / 3;
    const p1 = { x: a.x + dx, y: a.y + dy }, p3 = { x: a.x + 2 * dx, y: a.y + 2 * dy };
    const rotation = -Math.PI / 3;
    const p2 = { x: p1.x + dx * Math.cos(rotation) - dy * Math.sin(rotation), y: p1.y + dx * Math.sin(rotation) + dy * Math.cos(rotation) };
    const window = childWindow(levelIndex, quotas[depth], quotas[depth + 1]);
    const childCount = window.end - window.start;
    const segments = [[a, p1], [p1, p2], [p2, p3], [p3, b]];
    for (let slot = 0; slot < childCount; slot++) {
      const childOrdinal = window.start + slot;
      const index = sampledBranchIndex(slot, childCount, 4, levelIndex, depth);
      subdivideKoch(depth + 1, maxDepth, segments[index][0], segments[index][1], path * 4 + index, node, childOrdinal, quotas);
    }
  }

  function buildKoch(quotas) {
    state.nodes.length = 0;
    const center = { x: 650, y: 390 }, radius = 240;
    const points = [0, 1, 2].map((i) => ({
      x: center.x + Math.cos(-Math.PI / 2 + i * Math.PI * 2 / 3) * radius,
      y: center.y + Math.sin(-Math.PI / 2 + i * Math.PI * 2 / 3) * radius
    }));
    for (let i = 0; i < 3; i++) subdivideKoch(0, state.depth, points[i], points[(i + 1) % 3], i, null, i, quotas);
  }

  function subdivideSierpinski(depth, maxDepth, triangle, path, parent, levelIndex, quotas) {
    const center = triangle.reduce((sum, point) => ({ x: sum.x + point.x / 3, y: sum.y + point.y / 3 }), { x: 0, y: 0 });
    const node = {
      depth, x1: triangle[0].x, y1: triangle[0].y, x2: triangle[1].x, y2: triangle[1].y,
      cx: center.x, cy: center.y, triangle,
      segments: [[triangle[0], triangle[1]], [triangle[1], triangle[2]], [triangle[2], triangle[0]]],
      angle: Math.atan2(triangle[1].y - triangle[0].y, triangle[1].x - triangle[0].x),
      length: Math.hypot(triangle[1].x - triangle[0].x, triangle[1].y - triangle[0].y),
      branchIndex: path % 3, path, swayPhase: seededUnit(state.seedHash, path, depth, 0, 14) * Math.PI * 2,
      id: parent ? `${parent.id}.${path % 3}` : "sierpinski", parent: parent || null,
      leaf: depth === maxDepth, geometry: "sierpinski", callName: "subdivideSierpinski"
    };
    state.nodes.push(node);
    if (depth === maxDepth) return;
    const [a, b, c] = triangle;
    const midpoint = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
    const children = [[a, ab, ca], [ab, b, bc], [ca, bc, c]];
    const window = childWindow(levelIndex, quotas[depth], quotas[depth + 1]);
    const childCount = window.end - window.start;
    for (let slot = 0; slot < childCount; slot++) {
      const childOrdinal = window.start + slot;
      const index = sampledBranchIndex(slot, childCount, 3, levelIndex, depth);
      subdivideSierpinski(depth + 1, maxDepth, children[index], path * 3 + index + 1, node, childOrdinal, quotas);
    }
  }

  function buildSierpinski(quotas) {
    state.nodes.length = 0;
    const center = { x: 650, y: 405 }, radius = 285;
    const triangle = [0, 1, 2].map((index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
      return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
    });
    subdivideSierpinski(0, state.depth, triangle, 0, null, 0, quotas);
  }

  function stepSpiral(depth, maxDepth, x, y, angle, branchIndex, path, parent, levelIndex, quotas) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const radius = 232 * (1 - Math.pow(1 / phi, depth + 1));
    const center = { x: 650, y: 400 };
    const endX = center.x + Math.cos(angle) * radius;
    const endY = center.y + Math.sin(angle) * radius;
    const node = {
      depth, x1: x, y1: y, x2: endX, y2: endY, cx: endX, cy: endY,
      angle, length: Math.hypot(endX - x, endY - y), branchIndex, path,
      swayPhase: seededUnit(state.seedHash, path, depth, branchIndex, 15) * Math.PI * 2,
      id: parent ? `${parent.id}.${branchIndex}` : "spiral", parent: parent || null,
      leaf: depth === maxDepth, geometry: "spiral", callName: "stepSpiral"
    };
    state.nodes.push(node);
    if (depth === maxDepth) return;
    const window = childWindow(levelIndex, quotas[depth], quotas[depth + 1]);
    const childCount = window.end - window.start;
    const spread = state.angle * Math.PI / 180;
    for (let slot = 0; slot < childCount; slot++) {
      const childOrdinal = window.start + slot;
      const index = sampledBranchIndex(slot, childCount, state.factor, levelIndex, depth);
      const offset = childCount === 1 ? 0 : (index - (state.factor - 1) / 2) * spread * .42;
      stepSpiral(depth + 1, maxDepth, endX, endY, angle + goldenAngle + offset,
        index, path * state.factor + index + 1, node, childOrdinal, quotas);
    }
  }

  function buildSpiral(quotas) {
    state.nodes.length = 0;
    stepSpiral(0, state.depth, 650, 400, -Math.PI / 2, 0, 0, null, 0, quotas);
  }

  function growFern(depth, maxDepth, x, y, angle, length, branchIndex, path, parent, levelIndex, quotas) {
    const sway = (seededUnit(state.seedHash, path, depth, branchIndex, 16) - .5) * .045;
    const actualAngle = angle + sway;
    const endX = x + Math.cos(actualAngle) * length;
    const endY = y + Math.sin(actualAngle) * length;
    const node = {
      depth, x1: x, y1: y, x2: endX, y2: endY, cx: (x + endX) / 2, cy: (y + endY) / 2,
      angle: actualAngle, length, branchIndex, path,
      swayPhase: seededUnit(state.seedHash, path, depth, branchIndex, 17) * Math.PI * 2,
      id: parent ? `${parent.id}.${branchIndex}` : "fern", parent: parent || null,
      leaf: depth === maxDepth, geometry: "fern", callName: "growFern"
    };
    state.nodes.push(node);
    if (depth === maxDepth) return;
    const window = childWindow(levelIndex, quotas[depth], quotas[depth + 1]);
    const childCount = window.end - window.start;
    for (let slot = 0; slot < childCount; slot++) {
      const childOrdinal = window.start + slot;
      const index = sampledBranchIndex(slot, childCount, state.factor, levelIndex, depth);
      const normalized = state.factor === 1 ? 0 : index / (state.factor - 1);
      const centered = normalized * 2 - 1;
      const asymmetry = centered < 0 ? .82 : 1.08;
      const branchAngle = centered * state.angle * Math.PI / 180 * asymmetry;
      const childLength = length * (centered < 0 ? .72 : .68);
      growFern(depth + 1, maxDepth, endX, endY, actualAngle + branchAngle, childLength,
        index, path * state.factor + index + 1, node, childOrdinal, quotas);
    }
  }

  function buildFern(quotas) {
    state.nodes.length = 0;
    growFern(0, state.depth, 650, 735, -Math.PI / 2, 155, 0, 0, null, 0, quotas);
  }

  function stopTimer() {
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
  }

  function fadeVoice(voice, at, duration) {
    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setTargetAtTime(.0001, at, duration / 4);
    voice.oscillators.forEach((oscillator) => oscillator.stop(at + duration));
    voice.stopAt = at + duration;
  }

  function stopLiveVoices() {
    if (!state.audio) return;
    const now = state.audio.ac.currentTime;
    for (const voice of state.audio.voices) fadeVoice(voice, now, .1);
  }

  function resumeAfterVoiceFade() {
    if (state.audio && state.audio.voices.size) {
      state.timer = setTimeout(() => {
        state.timer = null;
        if (state.playing) scheduleStep();
      }, 120);
    } else scheduleStep();
  }

  function buildPlan(resetProgress) {
    const resumePlayback = state.playing;
    stopTimer();
    if (resetProgress) {
      stopLiveVoices();
      clearAllRegrowth();
      state.highlightedPath = [];
      state.highlightUntil = 0;
    }
    state.nodes.length = 0;
    const branching = ["tree", "spiral", "fern"].includes(state.mode) ? state.factor : (state.mode === "koch" ? 4 : 3);
    const roots = state.mode === "koch" ? 3 : 1;
    const quotas = makeNodeQuotas(state.depth, branching, roots);
    state.capped = quotas.capped;
    ui.capBadge.hidden = !state.capped;
    if (state.mode === "tree") {
      growBranch(0, state.depth, state.angle * Math.PI / 180, 214, state.factor, undefined, undefined, undefined, 0, 0, null, 0, quotas);
    } else if (state.mode === "sierpinski") buildSierpinski(quotas);
    else if (state.mode === "koch") buildKoch(quotas);
    else if (state.mode === "spiral") buildSpiral(quotas);
    else buildFern(quotas);
    if (resetProgress) {
      state.step = 0;
      state.calls = 0;
      state.loopCycle = 0;
      state.active = null;
      state.lastNote = "listen";
      state.trace.length = 0;
      state.particles.length = 0;
      syncPadChord(state.depth);
    } else state.step = Math.min(state.step, state.nodes.length);
    rebuildGrowthLayer();
    updateInspector();
    draw();
    restartAnimation();
    if (resumePlayback && state.audio) resumeAfterVoiceFade();
    renderAlgorithmTrace();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewWidth = rect.width;
    viewHeight = rect.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewWidth * pixelRatio);
    canvas.height = Math.round(viewHeight * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    growthCanvas.width = canvas.width;
    growthCanvas.height = canvas.height;
    growthCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    rebuildGrowthLayer();
    buildStarfield();
    draw();
  }

  function buildStarfield() {
    state.stars = Array.from({ length: Math.max(45, Math.min(220, Math.floor(viewWidth * viewHeight / 10000))) }, (_, i) => ({
      x: seededUnit(state.seedHash, i, 0, 0, 10) * 1200,
      y: seededUnit(state.seedHash, i, 0, 0, 11) * 800,
      r: .4 + seededUnit(state.seedHash, i, 0, 0, 12) * 1.15,
      phase: seededUnit(state.seedHash, i, 0, 0, 13) * Math.PI * 2
    }));
  }

  function worldToScreen(x, y) {
    const scale = Math.min(viewWidth / 1200, viewHeight / 800);
    const offsetX = (viewWidth - 1200 * scale) * .5;
    const offsetY = (viewHeight - 800 * scale) * .5;
    return { x: offsetX + x * scale, y: offsetY + y * scale, scale };
  }

  function nodePosition(node) {
    if (Number.isFinite(node.cx) && Number.isFinite(node.cy)) return { x: node.cx, y: node.cy };
    return { x: (node.x1 + node.x2) / 2, y: (node.y1 + node.y2) / 2 };
  }

  function clearGrowthLayer() {
    if (growthCtx && viewWidth && viewHeight) growthCtx.clearRect(0, 0, viewWidth, viewHeight);
  }

  function rebuildGrowthLayer() {
    clearGrowthLayer();
    if (!growthCtx || !viewWidth || !viewHeight) return;
    if (state.step === 0) {
      const stride = Math.max(1, Math.ceil(state.nodes.length / 4000));
      for (let index = 0; index < state.nodes.length; index += stride) {
        paintBranch(growthCtx, state.nodes[index], false, 0, .14);
      }
    } else {
      const visible = Math.min(state.step, state.nodes.length);
      const stride = Math.max(1, Math.ceil(visible / 6000));
      for (let index = 0; index < visible; index += stride) {
        paintBranch(growthCtx, state.nodes[index], false, 0);
      }
    }
  }

  function regrowthAmount(node) {
    for (let current = node; current; current = current.parent) {
      const regrowth = state.regrowing.get(current.id);
      if (regrowth) {
        const levels = Math.max(1, state.depth - current.depth + 1);
        const level = Math.max(0, node.depth - current.depth);
        const elapsed = clamp((performance.now() - regrowth.startedAt) / 5000, 0, 1);
        return clamp(elapsed * levels - level, 0, 1);
      }
      if (state.mutedBranches.has(current.id)) return 0;
    }
    return 1;
  }

  function hasRegrowingAncestor(node) {
    for (let current = node; current; current = current.parent) {
      if (state.regrowing.has(current.id)) return true;
    }
    return false;
  }

  function isNodeMuted(node) {
    return regrowthAmount(node) < 1;
  }

  function clearRegrowth(id) {
    const timers = state.regrowthTimers.get(id);
    if (timers) timers.forEach(clearTimeout);
    state.regrowthTimers.delete(id);
    state.regrowing.delete(id);
  }

  function clearAllRegrowth() {
    state.regrowthTimers.forEach((timers) => timers.forEach(clearTimeout));
    state.regrowing.forEach((regrowth, id) => state.mutedBranches.delete(id));
    state.regrowthTimers.clear();
    state.regrowing.clear();
  }

  function scheduleRegrowthChimes(node) {
    if (!state.audio || state.audio.ac.state !== "running") return;
    const rootFrequency = noteFor(node, "pentatonic").frequency;
    const degrees = [0, 2, 4, 7, 9];
    const timers = state.regrowthTimers.get(node.id) || [];
    degrees.forEach((semitones, index) => {
      timers.push(setTimeout(() => {
        if (!state.regrowing.has(node.id) || !state.audio || state.audio.ac.state !== "running") return;
        const startFrequency = rootFrequency * Math.pow(2, semitones / 12);
        playSoftGliss(node, startFrequency, .011, .92);
      }, index * 900));
    });
    state.regrowthTimers.set(node.id, timers);
  }

  function toggleMutedBranch(node) {
    let mutedRoot = null;
    for (let current = node; current; current = current.parent) {
      if (state.mutedBranches.has(current.id)) { mutedRoot = current; break; }
    }
    if (mutedRoot) {
      state.mutedBranches.delete(mutedRoot.id);
      clearRegrowth(mutedRoot.id);
    } else {
      state.mutedBranches.add(node.id);
      state.regrowing.set(node.id, { node, startedAt: performance.now() });
      const finishTimer = setTimeout(() => {
        state.mutedBranches.delete(node.id);
        clearRegrowth(node.id);
        rebuildGrowthLayer();
        draw();
      }, 5000);
      state.regrowthTimers.set(node.id, [finishTimer]);
      scheduleRegrowthChimes(node);
      if (state.audio) {
        const now = state.audio.ac.currentTime;
        for (const voice of state.audio.voices) {
          if (isNodeMuted(voice.node)) fadeVoice(voice, now, .1);
        }
      }
    }
    rebuildGrowthLayer();
    updateInspector();
    draw();
    showToast(mutedRoot ? "Recursive subtree restored." : "Recursive subtree pruned; regrowth begins.");
  }

  function paintBranch(target, node, active, now, opacity = .72) {
    const a = worldToScreen(node.x1, node.y1), b = worldToScreen(node.x2, node.y2);
    const amount = regrowthAmount(node);
    const muted = isNodeMuted(node) && amount <= 0;
    const regrowing = amount > 0 && amount < 1;
    const pathPosition = state.highlightedPath.indexOf(node);
    const pathAlpha = pathPosition < 0 ? 0 : clamp((state.highlightUntil - performance.now()) / 1500, 0, 1);
    const onCallPath = pathAlpha > 0;
    const depthRatio = node.depth / Math.max(1, state.depth);
    const colors = palettes[state.palette].colors;
    const color = colors[Math.min(colors.length - 1, Math.floor(depthRatio * colors.length))];
    const width = Math.max(.45, (node.geometry === "tree" || node.geometry === "fern"
      ? 7.3 * Math.pow(node.geometry === "fern" ? .7 : .72, node.depth)
      : (node.geometry === "koch" ? 1.65 : node.geometry === "sierpinski" ? 1.25 : 1.35)) * a.scale);
    const sway = (node.geometry === "tree" || node.geometry === "fern") && node.depth > 0
      ? Math.sin(now * 1.15 + node.swayPhase) * node.depth * .42 * a.scale : 0;
    const glowing = (active || onCallPath) && !muted;
    target.beginPath();
    if (node.geometry === "sierpinski" && node.triangle) {
      const points = node.triangle.map((point) => worldToScreen(point.x, point.y));
      target.moveTo(points[0].x, points[0].y);
      target.lineTo(points[1].x, points[1].y);
      target.lineTo(points[2].x, points[2].y);
      target.closePath();
    } else {
      target.moveTo(a.x, a.y);
      if (node.geometry === "tree" || node.geometry === "fern") {
        target.quadraticCurveTo((a.x + b.x) / 2 + sway, (a.y + b.y) / 2, b.x, b.y);
      } else {
        target.lineTo(b.x, b.y);
      }
    }
    const pathColor = node === state.highlightedPath[state.highlightedPath.length - 1] ? "#f6d893" : "#96e8ef";
    target.strokeStyle = muted ? "rgba(151,168,155,.72)" : (onCallPath ? pathColor : color);
    target.lineWidth = glowing ? width + 2.4 : width;
    target.lineCap = "round";
    target.setLineDash(muted || (regrowing && amount < .58) ? [4, 4] : []);
    target.shadowColor = muted ? "transparent" : color;
    target.shadowBlur = glowing ? 20 : (muted ? 0 : (node.leaf ? 7 : 3));
    target.globalAlpha = muted ? .24 : (regrowing ? (.14 + amount * .72) : (onCallPath ? pathAlpha * .98 : (glowing ? .98 : opacity * (1 - depthRatio * .15))));
    target.stroke();
    if (node.geometry === "sierpinski" && node.leaf && node.triangle) {
      const points = node.triangle.map((point) => worldToScreen(point.x, point.y));
      target.beginPath();
      target.moveTo(points[0].x, points[0].y);
      target.lineTo(points[1].x, points[1].y);
      target.lineTo(points[2].x, points[2].y);
      target.closePath();
      target.fillStyle = muted ? "#748278" : palettes[state.palette].accent;
      target.globalAlpha = muted ? .04 : (glowing ? .12 : opacity * .09);
      target.fill();
    }
    if (node.leaf && (node.path % 2 === 0 || node.geometry === "koch" || node.geometry === "spiral")) {
      target.beginPath(); target.arc(b.x, b.y, (glowing ? 3.8 : 2.2) * a.scale, 0, Math.PI * 2);
      target.fillStyle = muted ? "#748278" : palettes[state.palette].accent;
      target.globalAlpha = muted ? .2 : (glowing ? .95 : opacity * .74);
      target.shadowBlur = glowing ? 20 : (muted ? 0 : 10); target.fill();
    }
    target.globalAlpha = 1; target.shadowBlur = 0; target.setLineDash([]);
  }

  function readAudioEnergy() {
    const audio = state.audio;
    if (!audio) return 0;
    if (audio.ac.state === "running") {
      audio.analyser.getByteFrequencyData(audio.frequencyData);
      let total = 0;
      const end = Math.min(48, audio.frequencyData.length);
      for (let index = 2; index < end; index++) total += audio.frequencyData[index];
      const spectrum = end > 2 ? total / (end - 2) / 255 : 0;
      audio.energy += (spectrum - audio.energy) * .14;
    } else {
      audio.energy *= .985;
    }
    return audio.energy;
  }

  function drawAurora(now, energy) {
    const radius = Math.max(viewWidth, viewHeight) * .56;
    const glow = Math.min(.2, .035 + energy * .2);
    const rgb = paletteRGB();
    const seedX = seededUnit(state.seedHash, 0, 0, 0, 20);
    const seedY = seededUnit(state.seedHash, 0, 0, 0, 21);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let index = 0; index < 2; index++) {
      const drift = now * (.018 + index * .009);
      const x = viewWidth * (.22 + seedX * .56) + Math.sin(drift + index * 2.2) * viewWidth * .07;
      const y = viewHeight * (.2 + seedY * .48) + Math.cos(drift * .8 + index) * viewHeight * .05;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * (index ? .78 : 1));
      gradient.addColorStop(0, `rgba(${rgb},${glow * (index ? .75 : 1)})`);
      gradient.addColorStop(.4, `rgba(${rgb},${glow * .34})`);
      gradient.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
    ctx.restore();
  }

  function draw() {
    if (!ctx || !viewWidth || !viewHeight) return;
    const now = performance.now() / 1000;
    const energy = readAudioEnergy();
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    for (const star of state.stars) {
      const p = worldToScreen(star.x + Math.sin(now * .045 + star.phase) * 8, star.y + Math.cos(now * .035 + star.phase) * 5);
      const alpha = .1 + (Math.sin(now * .7 + star.phase) + 1) * .1 + energy * .14;
      ctx.beginPath(); ctx.arc(p.x, p.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(204,231,208,${alpha})`; ctx.fill();
    }
    drawAurora(now, energy);
    const visible = Math.min(state.step, state.nodes.length);
    ctx.save();
    ctx.translate(Math.sin(now * .62) * 1.4, 0);
    ctx.drawImage(growthCanvas, 0, 0, viewWidth, viewHeight);
    ctx.restore();
    if (state.regrowing.size) {
      const visibleNodes = state.step === 0 ? state.nodes.length : Math.min(state.step, state.nodes.length);
      for (let index = 0; index < visibleNodes; index++) {
        const node = state.nodes[index];
        if (hasRegrowingAncestor(node)) paintBranch(ctx, node, false, now, state.step === 0 ? .14 : .72);
      }
    }
    if (state.highlightUntil > performance.now()) {
      state.highlightedPath.forEach((node) => paintBranch(ctx, node, true, now));
    }
    if (visible && state.active) {
      paintBranch(ctx, state.active, true, now);
    }
    if (state.hoverNode && state.hoverNode !== state.active) {
      paintBranch(ctx, state.hoverNode, true, now);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    const root = worldToScreen(650, 735);
    const ground = ctx.createLinearGradient(0, root.y - 20, 0, viewHeight);
    ground.addColorStop(0, "rgba(102,151,108,.13)"); ground.addColorStop(1, "rgba(8,19,13,0)");
    ctx.fillStyle = ground; ctx.fillRect(0, root.y - 15, viewWidth, viewHeight - root.y + 15);
    for (let index = state.particles.length - 1; index >= 0; index--) {
      const particle = state.particles[index], age = now - particle.born;
      if (age > (particle.type === "ripple" ? 2.6 : 4)) { state.particles.splice(index, 1); continue; }
      const p = worldToScreen(particle.x + Math.sin(age * 1.4 + particle.seed) * 8, particle.y - age * 19);
      if (particle.type === "ripple") {
        const progress = age / 2.6;
        const center = worldToScreen(particle.x, particle.y);
        ctx.beginPath();
        ctx.arc(center.x, center.y, (4 + progress * 46) * center.scale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${particle.rgb},${(1 - progress) * .46})`;
        ctx.lineWidth = Math.max(.7, (1 - progress) * 2.1);
        ctx.shadowColor = `rgb(${particle.rgb})`; ctx.shadowBlur = 12 * (1 - progress); ctx.stroke();
        continue;
      }
      const alpha = Math.sin(Math.min(1, age / 4) * Math.PI) * .58;
      ctx.beginPath(); ctx.arc(p.x, p.y, (2 + Math.sin(age * 3 + particle.seed)) * p.scale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particle.rgb},${alpha})`; ctx.shadowColor = `rgb(${particle.rgb})`; ctx.shadowBlur = 15; ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  function animate() {
    draw();
    animationFrameId = requestAnimationFrame(animate);
  }

  function restartAnimation() {
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(animate);
  }

  function makeImpulse(audioContext, seedHash, duration) {
    const seconds = duration || 2.4, rate = audioContext.sampleRate;
    const impulse = audioContext.createBuffer(2, Math.floor(rate * seconds), rate);
    let randomState = (seedHash ^ 0xa341316c) >>> 0;
    const random = () => {
      randomState += 0x6d2b79f5;
      let value = randomState;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++) data[i] = (random() * 2 - 1) * Math.pow(1 - i / data.length, 2.7);
    }
    return impulse;
  }

  async function ensureAudio() {
    if (!state.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Web Audio is not supported by this browser.");
      const ac = new AudioContext();
      const master = ac.createGain(); master.gain.value = state.master;
      const compressor = ac.createDynamicsCompressor();
      compressor.threshold.value = -10; compressor.knee.value = 6; compressor.ratio.value = 10;
      compressor.attack.value = .003; compressor.release.value = .15;
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256; analyser.smoothingTimeConstant = .82;
      const mood = palettes[state.palette] || palettes.rain;
      const warmth = ac.createBiquadFilter(); warmth.type = "lowpass"; warmth.frequency.value = mood.filter; warmth.Q.value = .45;
      const delay = ac.createDelay(2); delay.delayTime.value = tempoDelaySeconds(state.tempo);
      const delayFilter = ac.createBiquadFilter(); delayFilter.type = "lowpass"; delayFilter.frequency.value = 1800; delayFilter.Q.value = .35;
      const feedback = ac.createGain(); feedback.gain.value = .28;
      const reverb = ac.createConvolver(); reverb.buffer = makeImpulse(ac, state.seedHash, mood.reverb);
      const wet = ac.createGain(); wet.gain.value = .22;
      const dry = ac.createGain(); dry.gain.value = .78;
      const merger = ac.createGain();
      warmth.connect(dry); dry.connect(merger);
      warmth.connect(delay); delay.connect(delayFilter); delayFilter.connect(feedback); feedback.connect(delay); delayFilter.connect(merger);
      warmth.connect(reverb); reverb.connect(wet); wet.connect(merger);
      merger.connect(compressor); compressor.connect(master); master.connect(analyser); analyser.connect(ac.destination);
      const padBus = ac.createGain(); padBus.gain.value = state.padOn ? state.padVolume : 0;
      const initialPadCutoff = state.autoBreathe
        ? 570 + Math.sin((performance.now() - state.breatheStartedAt) / 45000 * Math.PI * 2) * 250
        : mood.filter;
      const padFilter = ac.createBiquadFilter(); padFilter.type = "lowpass"; padFilter.frequency.value = initialPadCutoff; padFilter.Q.value = .4;
      padBus.connect(padFilter); padFilter.connect(compressor);
      const padLfo = ac.createOscillator(), padLfoDepth = ac.createGain();
      padLfo.type = "sine"; padLfo.frequency.value = state.autoBreathe ? 1 / 45 : .075;
      padLfoDepth.gain.value = state.autoBreathe ? 0 : 300;
      padLfo.connect(padLfoDepth); padLfoDepth.connect(padFilter.frequency); padLfo.start();
      const padOscillators = [55, 82.41, 110, 164.81].map((frequency, index) => {
        const oscillator = ac.createOscillator(), gain = ac.createGain();
        oscillator.type = index === 1 ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        gain.gain.value = index < 2 ? .11 : .055;
        oscillator.connect(gain); gain.connect(padBus); oscillator.start();
        return { oscillator, gain };
      });
      state.audio = {
        ac, master, compressor, analyser, frequencyData: new Uint8Array(analyser.frequencyBinCount), energy: 0,
        warmth, delay, delayFilter, feedback, reverb, wet, dry, padBus, padFilter, padOscillators, padLfo, padLfoDepth,
        voices: new Set(), maxVoices: MAX_AUDIO_VOICES, reverbSeconds: mood.reverb, reverbSeedHash: state.seedHash
      };
      syncPadChord();
    }
    if (state.audio.ac.state === "suspended") await state.audio.ac.resume();
    return state.audio;
  }

  function syncPadChord(depth) {
    if (!state.audio) return;
    const mood = palettes[state.palette] || palettes.rain;
    const scale = scales[state.scale];
    const tonic = state.scale === "lydian" ? 38 : 36;
    const seedDegree = Math.floor(seededUnit(state.seedHash, 0, 0, 0, 31) * scale.length);
    const cycleDrift = state.loopCycle % scale.length;
    const degree = (((depth || 0) * 2) + seedDegree + cycleDrift) % scale.length;
    const pitchAt = (offset) => {
      const position = degree + offset;
      return tonic + scale[position % scale.length] + Math.floor(position / scale.length) * 12;
    };
    const voicing = state.loopCycle % 3 === 1 ? [0, 3, 5, 0] : state.loopCycle % 3 === 2 ? [0, 1, 4, 0] : [0, 2, 4, 0];
    const frequencies = [pitchAt(voicing[0]), pitchAt(voicing[1]), pitchAt(voicing[2]), pitchAt(voicing[3]) + 12]
      .map((midi) => 440 * Math.pow(2, (midi - 69) / 12));
    frequencies.forEach((frequency, index) => {
      state.audio.padOscillators[index].oscillator.frequency.setTargetAtTime(frequency, state.audio.ac.currentTime, .9);
    });
    const padCutoff = state.autoBreathe
      ? 570 + Math.sin((performance.now() - state.breatheStartedAt) / 45000 * Math.PI * 2) * 250
      : mood.filter;
    state.audio.padFilter.frequency.setTargetAtTime(padCutoff, state.audio.ac.currentTime, .25);
    state.audio.warmth.frequency.setTargetAtTime(mood.filter, state.audio.ac.currentTime, .9);
    if (state.audio.reverb.buffer !== null &&
        (state.audio.reverbSeconds !== mood.reverb || state.audio.reverbSeedHash !== state.seedHash)) {
      state.audio.reverb.buffer = makeImpulse(state.audio.ac, state.seedHash, mood.reverb);
      state.audio.reverbSeconds = mood.reverb;
      state.audio.reverbSeedHash = state.seedHash;
    }
    state.audio.padBus.gain.setTargetAtTime(state.padOn ? state.padVolume : 0, state.audio.ac.currentTime, .2);
  }

  function noteFor(node, scaleName, seedHash) {
    const activeScale = scaleName || state.scale;
    const activeSeed = seedHash === undefined ? state.seedHash : seedHash;
    const scale = scales[activeScale];
    const seedVariation = Math.floor(seededUnit(activeSeed, node.path, node.depth, node.branchIndex, 40) * scale.length);
    const position = nodePosition(node);
    const spatialDegree = Math.floor(((node.angle + Math.PI) / (Math.PI * 2)) * scale.length);
    const scaleIndex = (node.depth * 2 + node.branchIndex * 2 + spatialDegree + seedVariation) % scale.length;
    const verticalOctave = Math.floor(Math.max(0, Math.min(1, (800 - position.y) / 800)) * 2);
    const semitones = scale[scaleIndex] + (verticalOctave + Math.floor(node.depth / 3)) * 12;
    const midi = (activeScale === "lydian" ? 50 : 48) + semitones;
    return { frequency: 440 * Math.pow(2, (midi - 69) / 12), label: `${noteNames[midi % 12]}${Math.floor(midi / 12) - 1}` };
  }

  function getStepDelay(node, tempo, timingMode) {
    const beat = 60000 / tempo;
    if (timingMode !== "fibonacci") {
      return beat * (node.geometry === "fern" ? (node.branchIndex % 2 === 0 ? .88 : 1.12) : 1);
    }
    const fibonacci = [1, 1];
    for (let index = 2; index <= node.depth + 2; index++) fibonacci[index] = fibonacci[index - 1] + fibonacci[index - 2];
    const ratio = fibonacci[node.depth + 1] / fibonacci[node.depth + 2];
    const goldenDecay = Math.pow(1 / 1.61803398875, node.depth / 12);
    const multiplier = Math.max(.65, Math.min(1.05, goldenDecay * (.92 + ratio * .16)));
    const fernCallResponse = node.geometry === "fern" ? (node.branchIndex % 2 === 0 ? .88 : 1.12) : 1;
    return beat * multiplier * fernCallResponse;
  }

  function formatTraceAngle(node) {
    return `${(node.angle * 180 / Math.PI).toFixed(1)}°`;
  }

  function makeTraceRow(node, label, frequency, title, indent) {
    const item = document.createElement("li");
    item.className = "trace-frame";
    item.style.marginInlineStart = `${Math.min(indent, 8) * 7}px`;
    const head = document.createElement("div");
    head.className = "trace-frame-head";
    const branch = document.createElement("strong");
    branch.textContent = `${node.callName || "recursiveCall"} · depth ${node.depth} · branch ${node.branchIndex}`;
    const note = document.createElement("span");
    note.textContent = `${label} · ${frequency.toFixed(2)} Hz`;
    head.append(branch, note);
    const meta = document.createElement("div");
    meta.className = "trace-meta";
    const callName = document.createElement("span");
    callName.className = "trace-call-name";
    callName.textContent = `${node.callName || "recursiveCall"}(...)`;
    const position = nodePosition(node);
    const xPosition = document.createElement("span");
    xPosition.textContent = `x ${position.x.toFixed(1)}`;
    const yPosition = document.createElement("span");
    yPosition.textContent = `y ${position.y.toFixed(1)}`;
    const angle = document.createElement("span");
    angle.textContent = `angle ${formatTraceAngle(node)}`;
    const leaf = document.createElement("span");
    leaf.textContent = node.leaf ? "BASE CASE" : "RECURSIVE CALL";
    meta.append(callName, xPosition, yPosition, angle, leaf);
    item.append(head, meta);
    if (title) item.setAttribute("aria-label", title);
    return item;
  }

  function renderAlgorithmTrace() {
    if (ui.traceDrawer.hidden) return;
    ui.traceStack.replaceChildren();
    ui.traceList.replaceChildren();
    if (!state.active) {
      const emptyStack = document.createElement("li");
      emptyStack.className = "trace-empty";
      emptyStack.textContent = "Start growing to follow the call stack.";
      ui.traceStack.append(emptyStack);
    } else {
      const frames = [];
      for (let node = state.active; node; node = node.parent) frames.push(node);
      frames.reverse().forEach((node) => {
        const note = noteFor(node);
        ui.traceStack.append(makeTraceRow(node, note.label, note.frequency, "Current recursive stack frame", node.depth));
      });
    }
    if (!state.trace.length) {
      const emptyHistory = document.createElement("li");
      emptyHistory.className = "trace-empty";
      emptyHistory.textContent = "Each recursive note will appear here.";
      ui.traceList.append(emptyHistory);
      return;
    }
    state.trace.slice(-24).reverse().forEach((entry) => {
      const row = makeTraceRow(entry.node, entry.label, entry.frequency, `Call ${entry.call} ${entry.source}`, entry.node.depth);
      row.classList.add("trace-call");
      const head = row.querySelector(".trace-frame-head");
      const title = document.createElement("strong");
      title.textContent = `${entry.source} #${entry.call}`;
      head.prepend(title);
      ui.traceList.append(row);
    });
  }

  function recordCall(node, source, callNumber) {
    const note = noteFor(node);
    const call = callNumber === undefined
      ? (source === "recursive" ? state.calls : state.trace.length + 1)
      : callNumber;
    state.trace.push({ call, source, node, label: note.label, frequency: note.frequency });
    if (state.trace.length > 80) state.trace.shift();
    renderAlgorithmTrace();
  }

  function paletteRGB() {
    return (palettes[state.palette] || palettes.rain).rgb;
  }

  function enforceVoiceCap(voiceManager, at) {
    if (!voiceManager) return;
    for (const activeVoice of voiceManager.voices) {
      if (activeVoice.stopAt <= at) voiceManager.voices.delete(activeVoice);
    }
    if (voiceManager.voices.size < voiceManager.maxVoices) return;
    let oldest = null;
    for (const activeVoice of voiceManager.voices) {
      if (!oldest || activeVoice.startedAt < oldest.startedAt) oldest = activeVoice;
    }
    if (oldest) {
      voiceManager.voices.delete(oldest);
      fadeVoice(oldest, at, .08);
    }
  }

  function scheduleTone(ac, warmth, node, at, isLeaf, scaleName, seedHash, voiceManager, paletteName) {
    const { frequency } = noteFor(node, scaleName, seedHash);
    enforceVoiceCap(voiceManager, at);
    const center = nodePosition(node);
    const point = worldToScreen(center.x, center.y);
    const pan = ac.createStereoPanner();
    const voice = ac.createGain();
    const mood = palettes[paletteName || state.palette] || palettes.rain;
    const branchVelocity = Math.max(.18, Math.min(1, Math.sqrt(Math.max(1, node.length) / 214)));
    const peak = (node.depth < 2 ? .086 : .066) * (.42 + branchVelocity * .58) * (isLeaf ? .88 : 1);
    const attack = mood.attack;
    const release = Math.max(mood.release, isLeaf ? mood.release + .25 : mood.release);
    const gate = mood.style === "pluck" ? .42 : .72;
    const releaseStart = at + gate;
    const releaseEnd = releaseStart + release;
    voice.gain.setValueAtTime(.0001, at);
    voice.gain.exponentialRampToValueAtTime(peak, at + attack);
    voice.gain.exponentialRampToValueAtTime(peak * .72, at + Math.max(attack + .08, gate * .52));
    voice.gain.setValueAtTime(peak * .72, releaseStart);
    voice.gain.exponentialRampToValueAtTime(.0001, releaseEnd);
    const targetPan = Math.max(-1, Math.min(1, point.x / Math.max(1, viewWidth) * 2 - 1));
    pan.pan.setValueAtTime(0, at);
    pan.pan.linearRampToValueAtTime(targetPan, at + .13);
    const fundamental = ac.createOscillator(), overtone = ac.createOscillator(), partial = ac.createOscillator();
    fundamental.type = node.depth < 2 ? "triangle" : "sine";
    overtone.type = "sine"; partial.type = "sine";
    fundamental.frequency.value = frequency;
    overtone.frequency.value = frequency * 2;
    partial.frequency.value = frequency * 3;
    const overtoneGain = ac.createGain(), partialGain = ac.createGain();
    const oscillators = [fundamental, overtone, partial];
    const crystalline = node.geometry === "koch" || mood.style === "crystal";
    overtoneGain.gain.value = crystalline ? (isLeaf ? .34 : .25) : (isLeaf ? .2 : .13);
    partialGain.gain.value = crystalline ? (isLeaf ? .13 : .09) : (isLeaf ? .045 : .022);
    fundamental.connect(voice);
    overtone.connect(overtoneGain); overtoneGain.connect(voice);
    partial.connect(partialGain); partialGain.connect(voice);
    voice.connect(pan); pan.connect(warmth);
    fundamental.start(at); overtone.start(at); partial.start(at);
    fundamental.stop(releaseEnd + .05); overtone.stop(releaseEnd + .05); partial.stop(releaseEnd + .05);
    const activeVoice = { gain: voice, oscillators, node, startedAt: at, stopAt: releaseEnd + .05 };
    if (voiceManager) voiceManager.voices.add(activeVoice);
    fundamental.onended = () => {
      if (voiceManager) voiceManager.voices.delete(activeVoice);
      fundamental.disconnect(); overtone.disconnect(); partial.disconnect();
      overtoneGain.disconnect(); partialGain.disconnect(); voice.disconnect(); pan.disconnect();
    };
    if (isLeaf) {
      const shimmer = ac.createOscillator(), shimmerGain = ac.createGain();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(frequency * 2.5, at);
      shimmer.frequency.exponentialRampToValueAtTime(frequency * 1.25, at + 1.25);
      shimmerGain.gain.setValueAtTime(.0001, at);
      shimmerGain.gain.exponentialRampToValueAtTime(.018, at + .12);
      shimmerGain.gain.exponentialRampToValueAtTime(.0001, at + 1.65);
      shimmer.connect(shimmerGain); shimmerGain.connect(voice);
      shimmer.start(at); shimmer.stop(at + 1.7);
      oscillators.push(shimmer);
      shimmer.onended = () => { shimmer.disconnect(); shimmerGain.disconnect(); };
    }
  }

  function playSoftGliss(node, startFrequency, peak, duration) {
    if (!state.audio || state.audio.ac.state !== "running") return;
    const { ac, warmth, voices } = state.audio;
    const at = ac.currentTime;
    enforceVoiceCap(state.audio, at);
    const center = nodePosition(node);
    const point = worldToScreen(center.x, center.y);
    const pan = ac.createStereoPanner();
    pan.pan.value = clamp(point.x / Math.max(1, viewWidth) * 2 - 1, -1, 1);
    const voice = ac.createGain();
    const fundamental = ac.createOscillator();
    const harmonic = ac.createOscillator();
    const pitchClass = Math.round(69 + 12 * Math.log2(startFrequency / 440)) % 12;
    const pentatonicSteps = { 0: 2, 2: 2, 4: 3, 7: 2, 9: 3 };
    const glideSemitones = pentatonicSteps[pitchClass] || 2;
    fundamental.type = "sine";
    harmonic.type = "sine";
    fundamental.frequency.setValueAtTime(startFrequency, at);
    fundamental.frequency.exponentialRampToValueAtTime(startFrequency * Math.pow(2, glideSemitones / 12), at + duration * .72);
    harmonic.frequency.setValueAtTime(startFrequency * 2, at);
    harmonic.frequency.exponentialRampToValueAtTime(startFrequency * 4 * Math.pow(2, glideSemitones / 12), at + duration * .72);
    voice.gain.setValueAtTime(.0001, at);
    voice.gain.exponentialRampToValueAtTime(peak, at + .08);
    voice.gain.setTargetAtTime(.0001, at + duration * .48, .2);
    fundamental.connect(voice); harmonic.connect(voice); voice.connect(pan); pan.connect(warmth);
    fundamental.start(at); harmonic.start(at);
    fundamental.stop(at + duration); harmonic.stop(at + duration);
    const activeVoice = { gain: voice, oscillators: [fundamental, harmonic], node, startedAt: at, stopAt: at + duration };
    voices.add(activeVoice);
    fundamental.onended = () => {
      voices.delete(activeVoice);
      fundamental.disconnect(); harmonic.disconnect(); voice.disconnect(); pan.disconnect();
    };
  }

  function spawnTipEffects(node) {
    const born = performance.now() / 1000;
    const point = node.geometry === "sierpinski" ? nodePosition(node) : { x: node.x2, y: node.y2 };
    state.particles.push({ type: "light", x: point.x, y: point.y, born, seed: node.path, rgb: paletteRGB() });
    state.particles.push({ type: "ripple", x: point.x, y: point.y, born, seed: node.path, rgb: paletteRGB() });
  }

  function playNote(node, isLeaf) {
    if (!state.audio) return;
    const { ac, warmth } = state.audio;
    const { label } = noteFor(node);
    state.highlightedPath = [];
    for (let current = node; current; current = current.parent) state.highlightedPath.unshift(current);
    state.highlightUntil = performance.now() + 1500;
    scheduleTone(ac, warmth, node, ac.currentTime, isLeaf, state.scale, state.seedHash, state.audio, state.palette);
    state.lastNote = label;
    if (isLeaf) spawnTipEffects(node);
    updateInspector();
  }

  function scheduleStep() {
    if (!state.playing) return;
    if (state.step >= state.nodes.length) {
      if (!state.loop) {
        state.playing = false; stopTimer(); updateInspector(); return;
      }
      state.step = 0; state.calls = 0; state.loopCycle++; state.particles.length = 0;
      syncPadChord(state.depth);
      rebuildGrowthLayer();
    }
    const node = state.nodes[state.step++];
    state.active = node;
    state.calls++;
    paintBranch(growthCtx, node, false, 0);
    if (isNodeMuted(node)) {
      state.lastNote = "muted";
      recordCall(node, "muted", state.calls);
    } else {
      syncPadChord(state.depth + node.depth);
      recordCall(node, "recursive");
      playNote(node, node.leaf);
    }
    updateInspector();
    state.timer = setTimeout(scheduleStep, getStepDelay(node, state.tempo, state.timing));
  }

  async function togglePlayback() {
    if (state.playbackStarting) return;
    try {
      if (state.playing) {
        state.playing = false; stopTimer(); updateInspector(); return;
      }
      state.playbackStarting = true;
      ui.play.disabled = true;
      const restarted = state.step >= state.nodes.length;
      if (restarted) buildPlan(true);
      await ensureAudio();
      state.playing = true; updateInspector();
      if (restarted) resumeAfterVoiceFade();
      else scheduleStep();
    } catch (error) {
      showToast(error.message || "Audio could not be started.");
    } finally {
      state.playbackStarting = false;
      ui.play.disabled = false;
    }
  }

  async function beginWelcome() {
    if (state.welcomeStarted || state.playbackStarting) return;
    state.playbackStarting = true;
    ui.welcomeStart.disabled = true;
    try {
      await ensureAudio();
      state.welcomeStarted = true;
      ui.welcome.classList.add("leaving");
      setTimeout(() => {
        ui.welcome.hidden = true;
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      }, 780);
      state.playing = true;
      updateInspector();
      scheduleStep();
    } catch (error) {
      $("welcomeDescription").textContent = error.message || "Audio could not be started in this browser.";
      ui.welcomeStart.disabled = false;
    } finally {
      state.playbackStarting = false;
    }
  }

  function reset() {
    const shouldResume = state.playing;
    state.playing = false;
    buildPlan(true);
    if (shouldResume && state.audio) {
      state.playing = true;
      resumeAfterVoiceFade();
    }
    updateInspector();
  }

  function toggleZen() {
    state.zen = !state.zen;
    document.querySelector(".app").classList.toggle("zen-mode", state.zen);
    ui.zen.setAttribute("aria-label", state.zen ? "Exit Zen mode" : "Enter Zen mode");
    ui.zen.title = state.zen ? "Exit Zen mode" : "Enter Zen mode";
    ui.zenLabel.textContent = state.zen ? "Exit Zen (Z)" : "Zen";
    ui.zen.setAttribute("aria-pressed", String(state.zen));
  }

  function applyPreset(name) {
    const preset = palettes[name];
    if (!preset) return;
    cancelPendingAudio();
    state.palette = name;
    state.customModified = false;
    ui.customBadge.hidden = true;
    state.mutedBranches.clear();
    state.mode = preset.geometry;
    state.depth = preset.depth;
    state.factor = preset.factor;
    state.manualAngle = preset.spread;
    state.angle = preset.spread;
    state.tempo = preset.tempo;
    state.timing = preset.timing;
    state.scale = preset.scale;
    state.padVolume = preset.padVolume;
    state.padOn = true;
    ui.depth.value = state.depth;
    ui.factor.value = state.factor;
    ui.tempo.value = state.tempo;
    ui.angle.value = state.angle;
    ui.pad.value = Math.round(state.padVolume * 100);
    ui.padOn.checked = true;
    ui.scale.value = state.scale;
    ui.timing.value = state.timing;
    document.querySelectorAll(".mode-button").forEach((button) => button.classList.toggle("selected", button.dataset.mode === state.mode));
    document.querySelectorAll(".preset").forEach((button) => button.classList.toggle("selected", button.dataset.preset === name));
    syncLabels();
    syncTempoEcho();
    if (state.audio) state.audio.master.gain.setTargetAtTime(state.master, state.audio.ac.currentTime, .08);
    syncPadChord(state.depth);
    updateInspector();
    buildPlan(true);
  }

  function applySeed(value) {
    markCustomModified();
    state.seed = cleanSeed(value);
    state.seedHash = hashSeed(state.seed);
    ui.seed.value = state.seed;
    buildStarfield();
    buildPlan(true);
  }

  function randomizeSeed() {
    const values = new Uint32Array(1);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(values);
    else values[0] = Math.floor(Math.random() * 0xffffffff);
    applySeed(`SYLVA-${1000 + values[0] % 9000}`);
  }

  function shareableLink() {
    const url = new URL(window.location.href);
    const values = {
      seed: state.seed, depth: state.depth, factor: state.factor, angle: state.manualAngle,
      tempo: state.tempo, timing: state.timing, mode: state.mode, palette: state.palette, preset: state.palette, scale: state.scale,
      loop: state.loop, padOn: state.padOn, master: Math.round(state.master * 100), pad: Math.round(state.padVolume * 100)
    };
    Object.keys(values).forEach((key) => url.searchParams.set(key, values[key]));
    return url.toString();
  }

  async function copySoundscapeLink() {
    const value = shareableLink();
    try {
      let copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(value);
          copied = true;
        } catch (error) {
          copied = false;
        }
      }
      if (!copied) {
        const temporary = document.createElement("textarea");
        temporary.value = value;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.left = "-9999px";
        temporary.style.opacity = "0";
        temporary.setAttribute("aria-hidden", "true");
        document.body.appendChild(temporary);
        try {
          temporary.select();
          copied = document.execCommand("copy");
        } finally {
          temporary.remove();
        }
      }
      if (!copied) throw new Error("Clipboard access is unavailable.");
      showToast("Soundscape link copied.");
    } catch (error) {
      showToast(error.message || "The soundscape link could not be copied.");
    }
  }

  function setAutoBreathe(enabled) {
    state.autoBreathe = Boolean(enabled);
    ui.breathe.checked = state.autoBreathe;
    if (breatheTimer) clearInterval(breatheTimer);
    breatheTimer = null;
    if (state.autoBreathe) {
      state.breatheStartedAt = performance.now();
      updateAutoBreathe();
      breatheTimer = setInterval(updateAutoBreathe, 250);
    } else {
      state.angle = state.manualAngle;
      syncLabels();
      buildPlan(false);
      if (state.audio) {
        const mood = palettes[state.palette] || palettes.rain;
        state.audio.padLfoDepth.gain.setTargetAtTime(300, state.audio.ac.currentTime, .5);
        state.audio.padFilter.frequency.setTargetAtTime(mood.filter, state.audio.ac.currentTime, .6);
      }
    }
    if (state.autoBreathe && state.audio) {
      state.audio.padLfoDepth.gain.setTargetAtTime(0, state.audio.ac.currentTime, .5);
    }
  }

  function updateAutoBreathe() {
    if (!state.autoBreathe) return;
    const phase = (performance.now() - state.breatheStartedAt) / 45000 * Math.PI * 2;
    const cutoff = 570 + Math.sin(phase) * 250;
    if (!state.angleHeld) {
      const angle = clamp(state.manualAngle + Math.sin(phase) * 3, 15, 65);
      if (Math.abs(angle - state.angle) >= .25) {
        state.angle = angle;
        syncLabels();
        buildPlan(false);
      }
    }
    if (state.audio) state.audio.padFilter.frequency.setTargetAtTime(cutoff, state.audio.ac.currentTime, .2);
  }

  function setTourGeometry(mode, depth, caption) {
    state.mode = mode;
    state.depth = clamp(depth, 3, 9);
    ui.depth.value = state.depth;
    document.querySelectorAll(".mode-button").forEach((button) => button.classList.toggle("selected", button.dataset.mode === mode));
    syncLabels();
    buildPlan(true);
    ui.tourCaptionText.textContent = caption;
  }

  function showTourStep(step) {
    if (!state.tourActive) return;
    if (step === 0) {
      setTourGeometry("tree", 3, "Depth sets the number of recursive levels. As branches reach deeper octaves, their notes rise gently in pitch.");
    } else if (step === 1) {
      setTourGeometry("tree", 6, "Each branch has a horizontal position, and its notes pan from left to right across the stereo field.");
    } else if (step === 2) {
      state.timing = "fibonacci";
      ui.timing.value = "fibonacci";
      ui.tourCaptionText.textContent = "Golden Ratio timing quickens deeper calls into an organic polyrhythm. A soft branch highlight shows how a note can be plucked and a subtree pruned.";
      const node = state.nodes.find((item) => item.depth > 0) || state.nodes[0];
      if (node) {
        state.active = node;
        const point = nodePosition(node);
        state.particles.push({ type: "ripple", x: point.x, y: point.y, born: performance.now() / 1000, seed: node.path, rgb: paletteRGB() });
        playNote(node, node.leaf);
        const branch = state.nodes.find((item) => item.parent === node.id);
        const prune = branch || node;
        state.tourPrunedNode = prune.id;
        state.mutedBranches.add(prune.id);
        draw();
        state.tourTimers.push(setTimeout(() => { state.mutedBranches.delete(prune.id); state.tourPrunedNode = null; draw(); }, 950));
      }
      updateInspector();
    } else if (step === 3) {
      applyPreset("nautilus");
      ui.traceDrawer.hidden = false;
      ui.traceToggle.setAttribute("aria-expanded", "true");
      renderAlgorithmTrace();
      ui.tourCaptionText.textContent = "Golden Nautilus grows in a golden-angle spiral. The live Call Stack Inspector is open; the tour will finish in a few seconds.";
    }
  }

  function endTour() {
    state.tourActive = false;
    state.tourTimers.forEach(clearTimeout);
    state.tourTimers.length = 0;
    if (state.tourPrunedNode !== null) state.mutedBranches.delete(state.tourPrunedNode);
    state.tourPrunedNode = null;
    draw();
    ui.tourCaption.hidden = true;
    ui.tour.textContent = "▶ Guided Tour";
  }

  async function startTour() {
    if (state.tourActive) return;
    state.tourActive = true;
    ui.tour.textContent = "Tour in progress";
    ui.tourCaption.hidden = false;
    state.tourTimers.forEach(clearTimeout);
    state.tourTimers.length = 0;
    try {
      await ensureAudio();
      if (!state.tourActive) return;
      stopTimer();
      state.playing = false;
      showTourStep(0);
      state.playing = true;
      updateInspector();
      scheduleStep();
      [1, 2, 3].forEach((step) => state.tourTimers.push(setTimeout(() => showTourStep(step), step * 5000)));
      state.tourTimers.push(setTimeout(() => endTour(), 20000));
    } catch (error) {
      endTour();
      showToast(error.message || "The guided tour could not start.");
    }
  }

  function closestBranchAt(x, y, maxDistance, sampleLimit) {
    let closest = null;
    const stride = Math.max(1, Math.ceil(state.nodes.length / (sampleLimit || state.nodes.length)));
    for (let index = 0; index < state.nodes.length; index += stride) {
      const node = state.nodes[index];
      const segments = node.segments || [[{ x: node.x1, y: node.y1 }, { x: node.x2, y: node.y2 }]];
      for (const segment of segments) {
        const [start, end] = segment;
        const a = worldToScreen(start.x, start.y), b = worldToScreen(end.x, end.y);
        const dx = b.x - a.x, dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy || 1;
        const ratio = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
        const screenX = a.x + ratio * dx, screenY = a.y + ratio * dy;
        const distance = Math.hypot(x - screenX, y - screenY);
        if (distance <= maxDistance && (!closest || distance < closest.distance)) {
          closest = {
            node, distance,
            x: start.x + (end.x - start.x) * ratio,
            y: start.y + (end.y - start.y) * ratio
          };
        }
      }
    }
    return closest;
  }

  function eventCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function encodeWav(samplesLeft, samplesRight, sampleRate) {
    const frameCount = samplesLeft.length;
    const buffer = new ArrayBuffer(44 + frameCount * 4);
    const view = new DataView(buffer);
    const writeString = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
    writeString(0, "RIFF"); view.setUint32(4, 36 + frameCount * 4, true); writeString(8, "WAVE");
    writeString(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 2, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true); view.setUint16(34, 16, true); writeString(36, "data"); view.setUint32(40, frameCount * 4, true);
    let offset = 44;
    for (let i = 0; i < frameCount; i++) {
      const left = Math.max(-1, Math.min(1, samplesLeft[i]));
      const right = Math.max(-1, Math.min(1, samplesRight[i]));
      view.setInt16(offset, left < 0 ? left * 32768 : left * 32767, true);
      view.setInt16(offset + 2, right < 0 ? right * 32768 : right * 32767, true);
      offset += 4;
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  async function renderWav() {
    const seconds = Number(ui.duration.value);
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_EXPORT_SECONDS) {
      throw new Error(`Choose a WAV duration from 1 to ${MAX_EXPORT_SECONDS} seconds.`);
    }
    const sampleRate = 22050;
    const frameCount = Math.floor(seconds * sampleRate);
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) throw new Error("Offline audio rendering is not supported by this browser.");
    const snapshot = {
      nodes: state.nodes.slice(),
      palette: state.palette,
      depth: state.depth,
      scale: state.scale,
      seedHash: state.seedHash,
      tempo: state.tempo,
      timing: state.timing,
      loop: state.loop,
      padOn: state.padOn,
      padVolume: state.padVolume,
      master: state.master,
      autoBreathe: state.autoBreathe,
      mutedBranches: Array.from(state.mutedBranches)
    };
    const offline = new OfflineContext(2, frameCount, sampleRate);
    const master = offline.createGain();
    master.gain.value = snapshot.master;
    const compressor = offline.createDynamicsCompressor();
    compressor.threshold.value = -10; compressor.knee.value = 6; compressor.ratio.value = 10;
    compressor.attack.value = .003; compressor.release.value = .15;
    compressor.connect(master); master.connect(offline.destination);

    const warmth = offline.createBiquadFilter();
    const mood = palettes[snapshot.palette] || palettes.rain;
    warmth.type = "lowpass"; warmth.frequency.value = mood.filter; warmth.Q.value = .45;
    const dry = offline.createGain(); dry.gain.value = .78;
    const wet = offline.createGain(); wet.gain.value = .22;
    const delay = offline.createDelay(2); delay.delayTime.value = tempoDelaySeconds(snapshot.tempo);
    const delayFilter = offline.createBiquadFilter(); delayFilter.type = "lowpass"; delayFilter.frequency.value = 1800; delayFilter.Q.value = .35;
    const feedback = offline.createGain(); feedback.gain.value = .28;
    const convolver = offline.createConvolver(); convolver.buffer = makeImpulse(offline, snapshot.seedHash, palettes[snapshot.palette].reverb);
    const effectMix = offline.createGain();
    warmth.connect(dry); dry.connect(effectMix);
    warmth.connect(delay); delay.connect(delayFilter); delayFilter.connect(feedback); feedback.connect(delay); delayFilter.connect(effectMix);
    warmth.connect(convolver); convolver.connect(wet); wet.connect(effectMix);
    effectMix.connect(compressor);

    const padBus = offline.createGain();
    padBus.gain.value = snapshot.padOn ? snapshot.padVolume : 0;
    const padFilter = offline.createBiquadFilter();
    padFilter.type = "lowpass"; padFilter.frequency.value = snapshot.autoBreathe ? 570 : palettes[snapshot.palette].filter; padFilter.Q.value = .4;
    padBus.connect(padFilter); padFilter.connect(warmth);
    const lfo = offline.createOscillator(), lfoDepth = offline.createGain();
    lfo.type = "sine"; lfo.frequency.value = snapshot.autoBreathe ? 1 / 45 : .075; lfoDepth.gain.value = snapshot.autoBreathe ? 250 : 300;
    lfo.connect(lfoDepth); lfoDepth.connect(padFilter.frequency); lfo.start(0); lfo.stop(seconds);

    const tonic = snapshot.scale === "lydian" ? 38 : 36;
    const padOscillators = [0, 1, 2, 3].map((index) => {
      const oscillator = offline.createOscillator(), gain = offline.createGain();
      oscillator.type = index === 1 ? "triangle" : "sine";
      gain.gain.value = index < 2 ? .11 : .055;
      oscillator.connect(gain); gain.connect(padBus);
      oscillator.start(0); oscillator.stop(seconds);
      return oscillator;
    });
    let exportLoopCycle = 0;
    const offlineVoices = { voices: new Set(), maxVoices: MAX_AUDIO_VOICES };
    const updateOfflineChord = (depth, at) => {
      const scale = scales[snapshot.scale];
      const seedDegree = Math.floor(seededUnit(snapshot.seedHash, 0, 0, 0, 31) * scale.length);
      const degree = (depth * 2 + seedDegree + exportLoopCycle % scale.length) % scale.length;
      const pitchAt = (offset) => {
        const position = degree + offset;
        return tonic + scale[position % scale.length] + Math.floor(position / scale.length) * 12;
      };
      const voicing = exportLoopCycle % 3 === 1 ? [0, 3, 5, 0] : exportLoopCycle % 3 === 2 ? [0, 1, 4, 0] : [0, 2, 4, 0];
      const pitches = [pitchAt(voicing[0]), pitchAt(voicing[1]), pitchAt(voicing[2]), pitchAt(voicing[3]) + 12];
      padOscillators.forEach((oscillator, index) => {
        const frequency = 440 * Math.pow(2, (pitches[index] - 69) / 12);
        oscillator.frequency.setTargetAtTime(frequency, at, .55);
      });
    };
    updateOfflineChord(0, 0);

    const interval = 60 / snapshot.tempo;
    const tailSeconds = 6;
    const availableSteps = Math.max(1, Math.floor((seconds - tailSeconds) / interval) + 1);
    const eventCount = snapshot.loop ? availableSteps : Math.min(availableSteps, snapshot.nodes.length);
    const sampleWholeTree = snapshot.loop && eventCount < snapshot.nodes.length;
    const cycleLength = sampleWholeTree
      ? Math.min(16, Math.max(1, Math.floor(eventCount / 2)))
      : snapshot.nodes.length;
    let timeline = 0;
    let renderedEvents = 0;
    ui.progress.classList.add("rendering");
    for (let index = 0; index < eventCount; index++) {
      const localIndex = index % cycleLength;
      exportLoopCycle = snapshot.loop ? Math.floor(index / cycleLength) : 0;
      const nodeIndex = sampleWholeTree && cycleLength > 1
        ? Math.round(localIndex * (snapshot.nodes.length - 1) / (cycleLength - 1))
        : index % snapshot.nodes.length;
      const node = snapshot.nodes[nodeIndex];
      const at = timeline;
      let muted = false;
      for (let ancestor = node; ancestor; ancestor = ancestor.parent) {
        if (snapshot.mutedBranches.indexOf(ancestor.id) !== -1) { muted = true; break; }
      }
      if (!muted) {
        scheduleTone(offline, warmth, node, at, node.leaf, snapshot.scale, snapshot.seedHash, offlineVoices, snapshot.palette);
        renderedEvents++;
      }
      updateOfflineChord(snapshot.depth + node.depth, at);
      timeline += getStepDelay(node, snapshot.tempo, snapshot.timing) / 1000;
      if (index % 8 === 0) {
        const progress = Math.round((index / eventCount) * 40);
        ui.progressBar.style.width = `${progress}%`;
        ui.progressText.textContent = `Preparing ${seconds}-second stereo WAV · scheduling notes`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    ui.progressBar.style.width = "48%";
    ui.progressText.textContent = `Rendering ${seconds}-second stereo composition…`;
    const rendered = await offline.startRendering();
    ui.progressBar.style.width = "88%";
    ui.progressText.textContent = "Encoding 16-bit PCM WAV…";
    const blob = encodeWav(rendered.getChannelData(0), rendered.getChannelData(1), sampleRate);
    ui.progress.classList.remove("rendering");
    return { blob, seconds, eventCount: renderedEvents, palette: snapshot.palette };
  }

  async function exportComposition() {
    if (state.exportBusy) return;
    state.exportBusy = true; ui.export.disabled = true; ui.duration.disabled = true;
    ui.progress.hidden = false; ui.progressBar.style.width = "0%";
    ui.progressText.textContent = "Rendering your soundscape…";
    try {
      const result = await renderWav();
      const { blob, seconds, eventCount, palette } = result;
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = `sylva-${palette}-${seconds}s-${new Date().toISOString().slice(0, 10)}.wav`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      ui.progressBar.style.width = "100%";
      ui.progressText.textContent = `${seconds}s stereo WAV · ${eventCount} recursion events saved.`;
      showToast("Your soundscape has been saved as a WAV.");
      setTimeout(() => { ui.progress.hidden = true; }, 5000);
    } catch (error) {
      ui.progress.classList.remove("rendering");
      ui.progressText.textContent = "Export failed. Please try again.";
      showToast(error.message || "The WAV could not be rendered.");
    } finally {
      state.exportBusy = false; ui.export.disabled = false; ui.duration.disabled = false;
    }
  }

  ui.play.addEventListener("click", togglePlayback);
  ui.restart.addEventListener("click", reset);
  ui.welcomeStart.addEventListener("click", beginWelcome);
  ui.export.addEventListener("click", exportComposition);
  ui.seed.addEventListener("change", () => applySeed(ui.seed.value));
  ui.seed.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); ui.seed.blur(); }
  });
  ui.randomSeed.addEventListener("click", randomizeSeed);
  ui.copySeed.addEventListener("click", copySoundscapeLink);
  ui.tour.addEventListener("click", startTour);
  ui.tourExit.addEventListener("click", endTour);
  ui.panel.addEventListener("input", (event) => {
    if (state.tourActive && event.target.matches("input, select")) endTour();
    if (event.target.matches('input[type="range"]')) markCustomModified();
  });
  ui.panel.addEventListener("change", (event) => {
    if (state.tourActive && event.target.matches("input, select")) endTour();
  });
  ui.panel.addEventListener("click", (event) => {
    if (state.tourActive && event.target.closest("button")) endTour();
  });
  ui.breathe.addEventListener("change", () => setAutoBreathe(ui.breathe.checked));
  ui.angle.addEventListener("pointerdown", () => { state.angleHeld = true; });
  ["pointerup", "pointercancel", "blur"].forEach((name) => ui.angle.addEventListener(name, () => { state.angleHeld = false; }));
  window.addEventListener("pointerup", () => { state.angleHeld = false; });
  ui.timing.addEventListener("change", () => { markCustomModified(); state.timing = ui.timing.value; });
  ui.duration.addEventListener("change", () => {
    ui.progressText.textContent = `${ui.duration.value}-second stereo WAV · 16-bit PCM`;
  });
  [ui.depth, ui.factor, ui.angle, ui.tempo].forEach((input) => input.addEventListener("input", () => {
    state.depth = Number(ui.depth.value);
    state.factor = Number(ui.factor.value);
    state.angle = Number(ui.angle.value);
    state.manualAngle = Number(ui.angle.value);
    state.tempo = Number(ui.tempo.value);
    syncLabels();
    if (state.audio && input === ui.depth) syncPadChord(state.depth);
    syncTempoEcho();
    buildPlan(true);
  }));
  ui.master.addEventListener("input", () => {
    markCustomModified();
    state.master = Number(ui.master.value) / 100; syncLabels();
    if (state.audio) state.audio.master.gain.setTargetAtTime(state.master, state.audio.ac.currentTime, .08);
  });
  ui.pad.addEventListener("input", () => { markCustomModified(); state.padVolume = Number(ui.pad.value) / 100; syncLabels(); syncPadChord(state.depth + (state.active ? state.active.depth : 0)); });
  ui.padOn.addEventListener("change", () => { markCustomModified(); state.padOn = ui.padOn.checked; syncPadChord(state.depth + (state.active ? state.active.depth : 0)); });
  ui.loop.addEventListener("change", () => { markCustomModified(); state.loop = ui.loop.checked; });
  ui.scale.addEventListener("change", () => { markCustomModified(); state.scale = ui.scale.value; syncLabels(); syncPadChord(state.depth + (state.active ? state.active.depth : 0)); updateInspector(); });
  document.querySelectorAll(".mode-button").forEach((button) => button.addEventListener("click", () => {
    markCustomModified();
    if (state.mode !== button.dataset.mode) state.mutedBranches.clear();
    state.mode = button.dataset.mode;
    document.querySelectorAll(".mode-button").forEach((item) => item.classList.toggle("selected", item === button));
    buildPlan(true);
  }));
  document.querySelectorAll(".preset").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
  ui.collapse.addEventListener("click", () => { ui.panel.hidden = true; ui.reopen.hidden = false; });
  ui.reopen.addEventListener("click", () => { ui.panel.hidden = false; ui.reopen.hidden = true; });
  ui.zen.addEventListener("click", toggleZen);
  ui.traceToggle.addEventListener("click", () => {
    ui.traceDrawer.hidden = !ui.traceDrawer.hidden;
    const expanded = !ui.traceDrawer.hidden;
    ui.traceToggle.setAttribute("aria-expanded", String(expanded));
    if (expanded) renderAlgorithmTrace();
  });
  ui.traceClose.addEventListener("click", () => {
    ui.traceDrawer.hidden = true;
    ui.traceToggle.setAttribute("aria-expanded", "false");
    ui.traceToggle.focus();
  });
  let lastHoverCheck = 0;
  canvas.addEventListener("pointermove", (event) => {
    const now = performance.now();
    if (now - lastHoverCheck < 55) return;
    lastHoverCheck = now;
    const point = eventCanvasPoint(event);
    const hit = closestBranchAt(point.x, point.y, 22, 6000);
    state.hoverNode = hit ? hit.node : null;
    canvas.classList.toggle("branch-hover", Boolean(hit));
    if (!hit || !hit.node.leaf) {
      state.lastWindChimeId = null;
    } else if (state.audio && state.audio.ac.state === "running" &&
        hit.node.id !== state.lastWindChimeId && now - state.lastWindChimeAt >= 110) {
      state.lastWindChimeId = hit.node.id;
      state.lastWindChimeAt = now;
      playSoftGliss(hit.node, noteFor(hit.node, "pentatonic").frequency, .012, .88);
    }
  });
  canvas.addEventListener("pointerleave", () => {
    state.hoverNode = null;
    state.lastWindChimeId = null;
    canvas.classList.remove("branch-hover");
  });
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const point = eventCanvasPoint(event);
    const hit = closestBranchAt(point.x, point.y, 28, 12000);
    if (hit) toggleMutedBranch(hit.node);
  });
  canvas.addEventListener("click", async (event) => {
    if (event.shiftKey) {
      event.preventDefault();
      const shiftPoint = eventCanvasPoint(event);
      const shiftHit = closestBranchAt(shiftPoint.x, shiftPoint.y, 28, 12000);
      if (shiftHit) toggleMutedBranch(shiftHit.node);
      return;
    }
    const point = eventCanvasPoint(event);
    const hit = closestBranchAt(point.x, point.y, 28, 12000);
    if (!hit) return;
    if (isNodeMuted(hit.node)) {
      showToast("That recursive subtree is muted.");
      return;
    }
    try {
      await ensureAudio();
      state.active = hit.node;
      state.lastNote = noteFor(hit.node).label;
      state.particles.push({ type: "ripple", x: hit.x, y: hit.y, born: performance.now() / 1000, seed: hit.node.path, rgb: paletteRGB() });
      syncPadChord(state.depth + hit.node.depth);
      recordCall(hit.node, "plucked");
      playNote(hit.node, hit.node.leaf);
      updateInspector();
    } catch (error) {
      showToast(error.message || "Audio could not be started.");
    }
  });
  window.addEventListener("resize", resize);
  document.addEventListener("keydown", (event) => {
    if (!ui.welcome.hidden) {
      if (event.key === "Enter" || event.code === "Space") {
        event.preventDefault();
        beginWelcome();
      }
      return;
    }
    const target = event.target;
    if (target && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName))) return;
    if (event.code === "Space") {
      if (target && target.closest && target.closest("button")) return;
      event.preventDefault();
      togglePlayback();
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      reset();
    } else if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      toggleZen();
    } else if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      ui.traceDrawer.hidden = !ui.traceDrawer.hidden;
      ui.traceToggle.setAttribute("aria-expanded", String(!ui.traceDrawer.hidden));
      if (!ui.traceDrawer.hidden) renderAlgorithmTrace();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.audio && state.audio.ac.state === "running") state.audio.ac.suspend();
    else if (!document.hidden && state.playing && state.audio && state.audio.ac.state === "suspended") state.audio.ac.resume();
  });

  syncLabels();
  resize();
  buildPlan(true);
  updateInspector();
})();
