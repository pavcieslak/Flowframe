/* Flowframe — Figma-style auto layout for Adobe InDesign groups (UXP panel).
 * https://github.com/pavcieslak/Flowframe  ·  MIT licence */
const ind = require("indesign");
const app = ind.app;

const KEY = "lucmedia.autolayout";      // settings JSON on the group
const KEY_BG = "lucmedia.al.bg";         // "1" on the background rectangle
const KEY_FILL = "lucmedia.al.fill";     // "1" = stretch on cross axis
const KEY_ABS = "lucmedia.al.abs";       // "1" = ignored by layout

const DEFAULTS = { dir: "V", gap: 12, justify: "start", align: "start",
  pt: 0, pr: 0, pb: 0, pl: 0, wMode: "hug", hMode: "hug", w: 200, h: 200 };

const $ = (id) => document.getElementById(id);
let busy = false;
const sigCache = new Map();

// ---------------------------------------------------------------- helpers
function kind(o) {
  try { if (o.constructorName) return o.constructorName; } catch (e) {}
  try { return o.constructor.name; } catch (e) { return ""; }
}
function isGroup(o) { return kind(o) === "Group"; }
function label(o, k) { try { return o.extractLabel(k) || ""; } catch (e) { return ""; } }
function setLabel(o, k, v) { try { o.insertLabel(k, v); } catch (e) {} }
function getSettings(g) {
  const s = label(g, KEY);
  if (!s) return null;
  try { return Object.assign({}, DEFAULTS, JSON.parse(s)); } catch (e) { return null; }
}
function saveSettings(g, s) { setLabel(g, KEY, JSON.stringify(s)); }
function children(g) { return g.pageItems.everyItem().getElements(); }
function vb(o) { return o.visibleBounds; }            // [top, left, bottom, right]
function gbx(o) { return o.geometricBounds; }
function wh(o) { const b = vb(o); return [b[3] - b[1], b[2] - b[0]]; }
function num(v, d) { const n = parseFloat(v); return isFinite(n) ? n : d; }
function msg(t) { $("msg").textContent = t || ""; }

function withPoints(fn) {
  const sp = app.scriptPreferences;
  const old = sp.measurementUnit;
  sp.measurementUnit = ind.MeasurementUnits.POINTS;
  try { return fn(); } finally { try { sp.measurementUnit = old; } catch (e) {} }
}
function undoable(name, fn) {
  busy = true;
  let ran = false;
  const run = () => { ran = true; withPoints(fn); };
  try {
    app.doScript(run, ind.ScriptLanguage.UXPSCRIPT, [], ind.UndoModes.ENTIRE_SCRIPT, name);
  } catch (e) {
    if (ran) { busy = false; throw e; }
    run();                                      // doScript unavailable: run without undo grouping
  } finally { busy = false; }
}

/** Resolve whatever is selected (text cursor, child, group) to a page item. */
function resolveItem(o) {
  try {
    const k = kind(o);
    if (["InsertionPoint", "Text", "Character", "Word", "Paragraph", "Line", "TextColumn", "TextStyleRange"].includes(k))
      return o.parentTextFrames[0];
    if (["Image", "PDF", "EPS", "ImportedPage", "PICT", "WMF"].includes(k)) return o.parent;
  } catch (e) {}
  return o;
}
function selection() {
  const out = [];
  try { const s = app.selection; for (let i = 0; i < s.length; i++) out.push(resolveItem(s[i])); } catch (e) {}
  return out.filter(Boolean);
}
function alParent(item) {           // nearest auto-layout group containing item (not item itself)
  let p = null;
  try { p = item.parent; } catch (e) { return null; }
  while (p && isGroup(p)) { if (getSettings(p)) return p; try { p = p.parent; } catch (e) { return null; } }
  return null;
}
function topAL(g) {                  // outermost auto-layout ancestor (or g)
  let top = g, p = alParent(g);
  while (p) { top = p; p = alParent(p); }
  return top;
}

// ---------------------------------------------------------------- layout engine
function layout(g) {
  const s = getSettings(g);
  if (!s) return;
  let kids = children(g);
  kids.forEach((k) => { if (isGroup(k) && getSettings(k)) layout(k); });   // nested first
  kids = children(g);

  const bg = kids.find((k) => label(k, KEY_BG) === "1");
  const flow = kids.filter((k) => k !== bg && label(k, KEY_ABS) !== "1");
  if (!flow.length) return;

  const V = s.dir === "V";
  const main = V ? 1 : 0, cross = V ? 0 : 1;           // index into [w, h]

  // origin of the container's frame
  let ox, oy;
  if (bg) { const b = gbx(bg); oy = b[0]; ox = b[1]; }
  else {
    let t = Infinity, l = Infinity;
    flow.forEach((k) => { const b = vb(k); t = Math.min(t, b[0]); l = Math.min(l, b[1]); });
    oy = t - s.pt; ox = l - s.pl;
  }

  // order by current position along the main axis
  flow.sort((a, b) => V ? vb(a)[0] - vb(b)[0] || vb(a)[1] - vb(b)[1]
                        : vb(a)[1] - vb(b)[1] || vb(a)[0] - vb(b)[0]);

  const padMain0 = V ? s.pt : s.pl, padMain1 = V ? s.pb : s.pr;
  const padCross0 = V ? s.pl : s.pt, padCross1 = V ? s.pr : s.pb;
  const fixedMain = V ? s.hMode === "fixed" : s.wMode === "fixed";
  const fixedCross = V ? s.wMode === "fixed" : s.hMode === "fixed";
  const sizeMain = V ? s.h : s.w, sizeCross = V ? s.w : s.h;

  // cross-axis inner size
  let crossInner = fixedCross ? sizeCross - padCross0 - padCross1
    : Math.max.apply(null, flow.filter((k) => label(k, KEY_FILL) !== "1").map((k) => wh(k)[cross]).concat([0]));
  if (!fixedCross && crossInner === 0) crossInner = Math.max.apply(null, flow.map((k) => wh(k)[cross]));

  // stretch "fill" children (not groups — resizing a group would scale its contents)
  flow.forEach((k) => {
    if (label(k, KEY_FILL) !== "1" || isGroup(k)) return;
    const v = vb(k), gb = gbx(k);
    const strokeExtra = (cross === 0) ? (v[3] - v[1]) - (gb[3] - gb[1]) : (v[2] - v[0]) - (gb[2] - gb[0]);
    const target = Math.max(1, crossInner - strokeExtra);
    k.geometricBounds = cross === 0 ? [gb[0], gb[1], gb[2], gb[1] + target] : [gb[0], gb[1], gb[0] + target, gb[3]];
    try { if (kind(k) === "TextFrame") k.recompose(); } catch (e) {}
  });

  const sizes = flow.map((k) => wh(k));
  const content = sizes.reduce((a, sz) => a + sz[main], 0);
  let gap = s.gap;
  let mainInner = fixedMain ? sizeMain - padMain0 - padMain1 : content + gap * (flow.length - 1);
  let pos = 0;
  if (fixedMain) {
    const free = mainInner - content - gap * (flow.length - 1);
    if (s.justify === "between" && flow.length > 1) gap = (mainInner - content) / (flow.length - 1);
    else if (s.justify === "center") pos = free / 2;
    else if (s.justify === "end") pos = free;
  }

  flow.forEach((k, i) => {
    const sz = sizes[i];
    let c = 0;
    if (s.align === "center") c = (crossInner - sz[cross]) / 2;
    else if (s.align === "end") c = crossInner - sz[cross];
    const tx = ox + (V ? padCross0 + c : padMain0 + pos);
    const ty = oy + (V ? padMain0 + pos : padCross0 + c);
    const b = vb(k);
    const dx = tx - b[1], dy = ty - b[0];
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) k.move(undefined, [dx, dy]);
    pos += sz[main] + gap;
  });

  const W = V ? padCross0 + crossInner + padCross1 : padMain0 + mainInner + padMain1;
  const H = V ? padMain0 + mainInner + padMain1 : padCross0 + crossInner + padCross1;
  if (bg) bg.geometricBounds = [oy, ox, oy + H, ox + W];
  if (s.wMode !== "fixed" || s.hMode !== "fixed") {          // remember hugged size for the panel
    const ns = Object.assign({}, s);
    if (s.wMode !== "fixed") ns.w = Math.round(W * 100) / 100;
    if (s.hMode !== "fixed") ns.h = Math.round(H * 100) / 100;
    if (ns.w !== s.w || ns.h !== s.h) saveSettings(g, ns);
  }
  sigCache.set(g.id, signature(g));
}

function signature(g) {
  try {
    const kids = children(g);
    const gb = vb(g);
    return label(g, KEY) + "|" + kids.map((k) => {
      const b = vb(k);
      return [kind(k), Math.round(b[0] - gb[0]), Math.round(b[1] - gb[1]),
              Math.round(b[2] - b[0]), Math.round(b[3] - b[1]),
              label(k, KEY_FILL), label(k, KEY_ABS), isGroup(k) ? signature(k) : ""].join(",");
    }).join(";");
  } catch (e) { return ""; }
}

// ---------------------------------------------------------------- actions
function currentGroup() {
  const sel = selection();
  if (sel.length !== 1) return { group: null, child: null, sel };
  const it = sel[0];
  if (isGroup(it) && getSettings(it)) return { group: it, child: null, sel };
  const p = alParent(it);
  return { group: p, child: p ? it : null, sel };
}

function createAL() {
  const sel = selection();
  if (!sel.length) { msg("Select a group or several objects first."); return; }
  undoable("Add auto layout", () => {
    let g;
    if (sel.length === 1 && isGroup(sel[0])) g = sel[0];
    else {
      const host = sel[0].parent;
      g = (isGroup(host) ? app.activeDocument : host).groups.add(sel);
    }
    const s = Object.assign({}, DEFAULTS);
    // guess direction from current arrangement
    const kids = children(g);
    if (kids.length > 1) {
      const xs = kids.map((k) => vb(k)[1]), ys = kids.map((k) => vb(k)[0]);
      s.dir = (Math.max.apply(null, xs) - Math.min.apply(null, xs)) > (Math.max.apply(null, ys) - Math.min.apply(null, ys)) ? "H" : "V";
      const sorted = kids.slice().sort((a, b) => s.dir === "V" ? vb(a)[0] - vb(b)[0] : vb(a)[1] - vb(b)[1]);
      const gaps = [];
      for (let i = 1; i < sorted.length; i++) {
        const a = vb(sorted[i - 1]), b = vb(sorted[i]);
        gaps.push(s.dir === "V" ? b[0] - a[2] : b[1] - a[3]);
      }
      const avg = gaps.reduce((x, y) => x + y, 0) / gaps.length;
      s.gap = Math.max(0, Math.round(avg));
    }
    saveSettings(g, s);
    layout(g);
    try { app.select(g); } catch (e) {}
  });
  refresh(true);
}

function update(changes) {
  const { group } = currentGroup();
  if (!group) return;
  undoable("Auto layout", () => {
    const s = Object.assign(getSettings(group), changes);
    saveSettings(group, s);
    layout(topAL(group));
  });
  refresh(true);
}

function addBackground() {
  const { group } = currentGroup();
  if (!group) return;
  if (isGroup(group.parent)) { msg("For a nested group: put a rectangle inside it, select the rectangle and tick “Use as background” in the Selected child section."); return; }
  undoable("Add auto layout background", () => {
    const s = getSettings(group);
    const kids = children(group);
    if (kids.some((k) => label(k, KEY_BG) === "1")) return;
    const host = group.parent;
    const b = vb(group);
    const gName = group.name;
    const layer = group.itemLayer;
    group.ungroup();
    const r = host.rectangles.add(layer, undefined, undefined, { geometricBounds: [b[0] - s.pt, b[1] - s.pl, b[2] + s.pb, b[3] + s.pr] });
    try { r.fillColor = app.activeDocument.swatches.itemByName("Paper"); r.strokeWeight = 0; } catch (e) {}
    setLabel(r, KEY_BG, "1");
    r.sendToBack();
    const ng = app.activeDocument.groups.add([r].concat(kids));
    try { if (gName) ng.name = gName; } catch (e) {}
    saveSettings(ng, s);
    layout(topAL(ng));
    try { app.select(ng); } catch (e) {}
  });
  refresh(true);
}

function setChildFlag(key, on) {
  const { child, group } = currentGroup();
  if (!child) return;
  undoable("Auto layout child", () => {
    setLabel(child, key, on ? "1" : "");
    layout(topAL(group));
  });
  refresh(true);
}

function hugText() {
  const { child, group } = currentGroup();
  if (!child || kind(child) !== "TextFrame") return;
  undoable("Hug text", () => {
    const p = child.textFramePreferences;
    p.autoSizingReferencePoint = ind.AutoSizingReferenceEnum.TOP_LEFT_POINT;
    p.autoSizingType = label(child, KEY_FILL) === "1" ? ind.AutoSizingTypeEnum.HEIGHT_ONLY : ind.AutoSizingTypeEnum.HEIGHT_AND_WIDTH;
    layout(topAL(group));
  });
  refresh(true);
}

function removeAL() {
  const { group } = currentGroup();
  if (!group) return;
  undoable("Remove auto layout", () => setLabel(group, KEY, ""));
  sigCache.delete(group.id);
  refresh(true);
}

function reflowSelected() {
  const { group } = currentGroup();
  if (!group) return;
  undoable("Reflow auto layout", () => layout(topAL(group)));
}

function alGroupsOnSpread() {
  try {
    const items = app.activeWindow.activeSpread.allPageItems;
    const out = [];
    for (let i = 0; i < items.length; i++) if (isGroup(items[i]) && getSettings(items[i])) out.push(items[i]);
    return out;
  } catch (e) { return []; }
}
function reflowAll() {
  undoable("Reflow all auto layouts", () => {
    const tops = new Map();
    alGroupsOnSpread().forEach((g) => { const t = topAL(g); tops.set(t.id, t); });
    tops.forEach((t) => layout(t));
  });
}

// ---------------------------------------------------------------- auto-reflow
function autoTick() {
  if (busy || !$("auto").checked) return;
  try { if (!app.documents.length) return; } catch (e) { return; }
  try { if (app.modalState) return; } catch (e) {}
  const groups = alGroupsOnSpread();
  let justUndone = false;
  try { justUndone = !!app.activeDocument.redoName; } catch (e) {}
  if (justUndone) { groups.forEach((g) => sigCache.set(g.id, signature(g))); return; }   // don't fight Undo
  const dirty = new Map();
  groups.forEach((g) => {
    const sig = signature(g);
    const old = sigCache.get(g.id);
    if (old === undefined) { sigCache.set(g.id, sig); return; }
    if (old !== sig) { const t = topAL(g); dirty.set(t.id, t); }
  });
  if (!dirty.size) return;
  try {
    undoable("Auto-reflow", () => dirty.forEach((t) => layout(t)));
    groups.forEach((g) => sigCache.set(g.id, signature(g)));
  } catch (e) { msg("Auto-reflow: " + e.message); }
}

// ---------------------------------------------------------------- panel UI
let lastSelKey = "";
function setSeg(id, v) {
  document.querySelectorAll("#" + id + " button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
}
function refresh(force) {
  let info;
  try { info = currentGroup(); } catch (e) { return; }
  const key = info.sel.map((o) => { try { return o.id; } catch (e) { return "?"; } }).join(",") + (info.group ? label(info.group, KEY) : "");
  if (!force && key === lastSelKey) return;
  lastSelKey = key;
  msg("");

  const { group, child, sel } = info;
  $("settingsBox").classList.toggle("hidden", !group);
  $("childBox").classList.toggle("hidden", !child);
  $("createBox").classList.toggle("hidden", !!(group && !child) || !sel.length);

  if (!sel.length) { $("status").textContent = "Select a group or several objects."; $("status").className = ""; return; }
  if (!group) { $("status").textContent = sel.length === 1 && isGroup(sel[0]) ? "Group (no auto layout)" : sel.length + " object(s) selected"; $("status").className = ""; return; }

  const s = getSettings(group);
  $("status").textContent = (child ? "Inside auto layout: " : "Auto layout: ") + (group.name || "Group") + " · " + children(group).length + " items";
  $("status").className = "al";
  setSeg("segDir", s.dir); setSeg("segAlign", s.align);
  document.querySelectorAll("#segAlign img.alignIcon").forEach((im) => { im.src = "icons/align-" + (s.dir === "V" ? "v" : "h") + "-" + im.dataset.pos + ".png"; });
  const put = (k, v) => { if (editing !== k) $(k).value = v; };
  put("gap", s.gap); $("justify").value = s.justify;
  ["pt", "pr", "pb", "pl"].forEach((k) => put(k, s[k]));
  $("wMode").value = s.wMode; $("hMode").value = s.hMode;
  put("w", String(Math.round(s.w * 10) / 10)); put("h", String(Math.round(s.h * 10) / 10));
  $("w").disabled = s.wMode !== "fixed"; $("h").disabled = s.hMode !== "fixed";
  const hasBg = children(group).some((k) => label(k, KEY_BG) === "1");
  $("bgInfo").textContent = hasBg ? "Has a background frame (resizes with the layout)." : "No background frame — padding and fixed size are virtual.";
  $("btnBg").classList.toggle("hidden", hasBg);
  if (child) {
    $("fill").checked = label(child, KEY_FILL) === "1";
    $("absolute").checked = label(child, KEY_ABS) === "1";
    $("asBg").checked = label(child, KEY_BG) === "1";
    $("btnHug").classList.toggle("hidden", kind(child) !== "TextFrame");
  }
}

function wire() {
  $("btnCreate").addEventListener("click", () => safe(createAL));
  $("btnReflow").addEventListener("click", () => safe(reflowSelected));
  $("btnReflowAll").addEventListener("click", () => safe(reflowAll));
  $("btnRemove").addEventListener("click", () => safe(removeAL));
  $("btnBg").addEventListener("click", () => safe(addBackground));
  $("btnHug").addEventListener("click", () => safe(hugText));
  $("fill").addEventListener("change", (e) => safe(() => setChildFlag(KEY_FILL, e.target.checked)));
  $("asBg").addEventListener("change", (e) => safe(() => setChildFlag(KEY_BG, e.target.checked)));
  $("absolute").addEventListener("change", (e) => safe(() => setChildFlag(KEY_ABS, e.target.checked)));
  document.querySelectorAll("#segDir button").forEach((b) => b.addEventListener("click", () => safe(() => update({ dir: b.dataset.v }))));
  document.querySelectorAll("#segAlign button").forEach((b) => b.addEventListener("click", () => safe(() => update({ align: b.dataset.v }))));
  [["gap", 0], ["pt", 0], ["pr", 0], ["pb", 0], ["pl", 0], ["w", 100], ["h", 100]].forEach(([k, d]) => bindNumber(k, d));
  $("justify").addEventListener("change", (e) => safe(() => update({ justify: e.target.value })));
  $("wMode").addEventListener("change", (e) => safe(() => update({ wMode: e.target.value })));
  $("hMode").addEventListener("change", (e) => safe(() => update({ hMode: e.target.value })));
  $("auto").addEventListener("change", (e) => {
    try { localStorage.setItem("al.auto", e.target.checked ? "1" : ""); } catch (er) {}
    sigCache.clear();
  });
  try { $("auto").checked = localStorage.getItem("al.auto") === "1"; } catch (e) {}

  setInterval(() => { if (!busy) { try { refresh(false); } catch (e) {} } }, 400);
  setInterval(() => { try { autoTick(); } catch (e) {} }, 700);
}
/** Number fields: apply on Enter, on blur and on change (UXP doesn't fire "change" on Enter reliably). */
function bindNumber(key, def) {
  const el = $(key);
  const apply = () => safe(() => {
    const { group } = currentGroup();
    if (!group) return;
    const v = num(String(el.value).replace(",", "."), def);
    const s = getSettings(group);
    if (s && s[key] !== v) update({ [key]: v });
  });
  el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); apply(); } });
  el.addEventListener("change", apply);
  el.addEventListener("blur", apply);
  el.addEventListener("focus", () => { editing = key; });
  el.addEventListener("blur", () => { if (editing === key) editing = null; });
}
let editing = null;

function safe(fn) {
  try { fn(); } catch (e) { busy = false; msg("Error: " + (e && e.message ? e.message : e)); }
}

// ---------------------------------------------------------------- menu commands (assign shortcuts in Edit › Keyboard Shortcuts)
function command(fn) {
  return { run() { safe(fn); } };
}
try {
  require("uxp").entrypoints.setup({
    panels: { flowframePanel: { show() {}, hide() {} } },
    commands: {
      ffAdd: command(() => {
        const { group, child } = currentGroup();
        if (group && !child) { msg("Already an auto layout."); return; }
        createAL();
      }),
      ffRemove: command(removeAL),
      ffReflow: command(reflowSelected),
      ffReflowAll: command(reflowAll),
    },
  });
} catch (e) { console.error("Flowframe: entrypoints.setup failed", e); }

wire();
refresh(true);
