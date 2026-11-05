/* The AI Line: map interactions.
   The page works without this file: every station's text is already in the
   HTML. This script adds: opening a station from the map, the line filter,
   hover previews, "Take a trip", "Next stop" and keyboard shortcuts. */

document.documentElement.classList.add("js");

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const desktop = matchMedia("(min-width: 981px)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const stationsPanel = $("#stations");
const articles = $$(".station");
const nodes = $$(".stn");
const tracks = $$(".track");
const pills = $$(".pill");
const capsules = $$(".capsule");
const map = $(".metro-map");
const poster = $(".poster");
const train = $("#train");
const journey = $("#journey");
const tip = $("#tip");
const board = $("#board");
const boardNow = $("#board-now");
const boardNext = $("#board-next");

// Station order along each line, read from the page so it never drifts.
const routes = {};
$$(".line-group").forEach((group) => {
  routes[group.dataset.line] = $$(".station", group).map((a) => a.id);
});
// Trips are lists of stops and bend points (defined once, in the HTML).
const trips = JSON.parse($("#trips-data").textContent);
const rideOrder = [...routes[1], ...routes[4]];   // line 4 is line 1 carrying on

let current = null;   // id of the open station, or null
let filter = "all";   // "all" or a line number as text
let tripRun = 0;      // changes whenever a trip starts or stops, so old trips quit
let tripName = null;

const nodeOf = (id) => $(`.stn[data-station="${id}"]`);
const nameOf = (id) => $("text", nodeOf(id)).textContent;
// A stop is a station id; a point on the way (a bend in a line) is written [x, y].
const isPoint = (item) => Array.isArray(item);
const posOf = (item) => (isPoint(item) ? { x: item[0], y: item[1] } : { x: +nodeOf(item).dataset.x, y: +nodeOf(item).dataset.y });
const partnersOf = (id) => (nodeOf(id).dataset.partners || "").split(" ").filter(Boolean);
const linesOf = (id) => nodeOf(id).dataset.lines.split(" ");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? Math.min(ms, 1200) : ms));

/* ---- Open and close a station ------------------------------------------ */

function select(id, { focus = false, scroll = false, fromTrip = false, next = null } = {}) {
  const article = document.getElementById(id);
  if (!article || !article.classList.contains("station")) return;
  current = id;

  articles.forEach((a) => a.classList.toggle("is-selected", a === article));
  stationsPanel.dataset.state = "open";

  // Highlight the station, its interchange partners and the lines it sits on.
  nodes.forEach((n) => {
    n.classList.toggle("is-selected", n.dataset.station === id);
    n.classList.toggle("is-partner", partnersOf(id).includes(n.dataset.station));
  });
  capsules.forEach((c) => c.classList.toggle("is-hot", c.dataset.pair.split(" ").includes(id)));
  tracks.forEach((t) => t.classList.toggle("is-active", linesOf(id).includes(t.dataset.line)));

  $("details", article).open = true;
  $("#next").hidden = !desktop.matches || fromTrip;
  board.style.setProperty("--board-line", `var(--l${article.dataset.route})`);
  updateBoard(id, next);
  try { history.replaceState(null, "", "#" + id); } catch (e) { /* file:// previews may refuse */ }

  // A train marker shows "you are here" (during a trip the trip moves it).
  if (!fromTrip && desktop.matches) showTrainAt(id);

  if (focus) $("h4", article).focus({ preventScroll: true });
  const behavior = reducedMotion.matches ? "auto" : "smooth";
  if (scroll && !desktop.matches) article.scrollIntoView({ block: "start", behavior });
  // On mid-size screens the ticket sits under the map, so bring it into view if it is off-screen.
  else if (scroll && stationsPanel.getBoundingClientRect().top > innerHeight - 140) stationsPanel.scrollIntoView({ block: "nearest", behavior });
}

function closeStation() {
  current = null;
  articles.forEach((a) => a.classList.remove("is-selected"));
  stationsPanel.dataset.state = "";
  $("#next").hidden = true;
  nodes.forEach((n) => n.classList.remove("is-selected", "is-partner"));
  capsules.forEach((c) => c.classList.remove("is-hot"));
  tracks.forEach((t) => t.classList.remove("is-active"));
  train.classList.add("hidden");
  updateBoard(null);
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
}

// Previous / next station along the line (line 1 and 4 read as one journey).
function neighbour(id, step) {
  const article = document.getElementById(id);
  const useLine = filter !== "all" && article.dataset.lines.split(" ").includes(filter) ? filter : article.dataset.route;
  const list = filter === "all" && (useLine === "1" || useLine === "4") ? rideOrder : routes[useLine];
  return list[(list.indexOf(id) + step + list.length) % list.length];
}

function updateBoard(id, next = null) {
  const now = id || routes[1][0];
  boardNow.textContent = nameOf(now);
  boardNext.textContent = nameOf(next || neighbour(now, 1));   // during a trip, "next" is the trip's next stop
}

/* ---- Filter by line (the line-name pills on the map) -------------------- */

function applyFilter(line) {
  filter = line;
  pills.forEach((p) => p.setAttribute("aria-pressed", String(p.dataset.line === line)));
  map.classList.toggle("is-filtered", line !== "all");
  // A station belongs to the line it is on; the white links to other lines fade while one line is isolated.
  nodes.forEach((n) => n.classList.toggle("dim", line !== "all" && n.dataset.lines.split(" ")[0] !== line));
  tracks.forEach((t) => t.classList.toggle("dim", line !== "all" && t.dataset.line !== line));
  pills.forEach((p) => p.classList.toggle("dim", line !== "all" && p.dataset.line !== line));
  capsules.forEach((c) => c.classList.toggle("dim", line !== "all"));
  // On phones the stations are a list, so hide the lines that are filtered out.
  $$(".line-group").forEach((g) => { g.hidden = line !== "all" && g.dataset.line !== line; });
  if (current && line !== "all" && document.getElementById(current).dataset.route !== line) closeStation();
}
pills.forEach((pill) => {
  const toggle = () => applyFilter(filter === pill.dataset.line ? "all" : pill.dataset.line);
  pill.addEventListener("click", toggle);
  pill.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); } });
});

/* ---- Station events ----------------------------------------------------- */

nodes.forEach((node) => {
  node.addEventListener("click", (event) => { event.preventDefault(); stopTrip(); select(node.dataset.station, { focus: true, scroll: true }); });
  node.addEventListener("keydown", (event) => { if (event.key === " ") { event.preventDefault(); node.dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
  node.addEventListener("mouseenter", () => hover(node));
  node.addEventListener("focus", () => hover(node));
  node.addEventListener("mouseleave", unhover);
  node.addEventListener("blur", unhover);
});
// The dots in each ticket's line diagram jump to that stop.
$$(".strip a").forEach((a) => a.addEventListener("click", (event) => {
  event.preventDefault(); stopTrip();
  select(a.getAttribute("href").slice(1), { focus: true, scroll: true });
}));
$("#next").addEventListener("click", () => { stopTrip(); select(neighbour(current, 1), { focus: true }); });

// Arrow keys move along a line; Escape closes the open station.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && (current || tripName)) {
    const was = current && nodeOf(current);
    stopTrip(); closeStation();
    if (was && desktop.matches) was.focus();
    return;
  }
  const onNode = event.target.closest && event.target.closest(".stn");
  if (onNode && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
    event.preventDefault();
    const id = neighbour(onNode.dataset.station, event.key === "ArrowRight" ? 1 : -1);
    nodeOf(id).focus();
    if (current) select(id);
  }
});

/* ---- Hover preview: a one-line teaser and the lines light up ------------ */

// The first sentence of each station, taken from its own text (tags and [n] links are elements, so they are skipped).
const teasers = {};
articles.forEach((a) => {
  const p = $(".copy p", a);
  const text = [...p.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
  const first = (text.match(/^.+?[.!?](?=\s|$)/) || [text])[0];
  teasers[a.id] = first.length > 120 ? first.slice(0, 117).trimEnd() + "…" : first;
});

function hover(node) {
  if (tripName) return;
  const lines = node.dataset.lines.split(" ");
  map.classList.add("is-hover");
  tracks.forEach((t) => t.classList.toggle("soft", !lines.includes(t.dataset.line)));
  pills.forEach((p) => p.classList.toggle("soft", !lines.includes(p.dataset.line)));
  if (!desktop.matches) return;
  const id = node.dataset.station;
  tip.replaceChildren();
  const title = document.createElement("b"); title.textContent = nameOf(id);
  const body = document.createTextNode(teasers[id]);
  const hint = document.createElement("small"); hint.textContent = "Click to open";
  tip.append(title, body, hint);
  tip.hidden = false;
  // Place the tip under the station, or above it near the bottom edge.
  const pr = poster.getBoundingClientRect(), nr = $(".ring, .dot", node).getBoundingClientRect();
  const left = Math.min(Math.max(8, nr.left + nr.width / 2 - pr.left - tip.offsetWidth / 2), pr.width - tip.offsetWidth - 8);
  let top = nr.bottom - pr.top + 16;
  if (top + tip.offsetHeight > pr.height - 8) top = nr.top - pr.top - tip.offsetHeight - 16;
  tip.style.left = left + "px"; tip.style.top = top + "px";
}
function unhover() {
  map.classList.remove("is-hover");
  tracks.forEach((t) => t.classList.remove("soft"));
  pills.forEach((p) => p.classList.remove("soft"));
  tip.hidden = true;
}

/* ---- White links: hover one to see which stations share the cause ----- */

capsules.forEach((capsule) => {
  const ids = capsule.dataset.pair.split(" ");
  capsule.addEventListener("mouseenter", () => {
    if (tripName || !desktop.matches) return;
    ids.forEach((id) => nodeOf(id).classList.add("is-partner"));
    tip.replaceChildren();
    const title = document.createElement("b"); title.textContent = "Same cause";
    tip.append(title, document.createTextNode(ids.map(nameOf).join(" · ")));
    tip.hidden = false;
    const pr = poster.getBoundingClientRect(), cr = capsule.getBoundingClientRect();
    const left = Math.min(Math.max(8, cr.right - pr.left + 14), pr.width - tip.offsetWidth - 8);
    const top = Math.min(Math.max(8, cr.top - pr.top + cr.height / 2 - tip.offsetHeight / 2), pr.height - tip.offsetHeight - 8);
    tip.style.left = left + "px"; tip.style.top = top + "px";
  });
  capsule.addEventListener("mouseleave", () => {
    ids.forEach((id) => nodeOf(id).classList.toggle("is-partner", !!current && partnersOf(current).includes(id)));
    tip.hidden = true;
  });
});

/* ---- The train and "Take a trip" ---------------------------------------- */

function placeTrain(item, angle = 0) {
  const { x, y } = posOf(item);
  train.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
}
const angleBetween = (a, b) => {
  const p = posOf(a), q = posOf(b);
  return (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
};

// Put the train on a station with a small pop (no travelling between rows).
function showTrainAt(id) {
  train.style.transitionDuration = "0s";
  placeTrain(id);
  train.classList.remove("hidden", "pop");
  void train.offsetWidth;                 // restart the animation
  train.classList.add("pop");
  requestAnimationFrame(() => { train.style.transitionDuration = ""; });
}

async function startTrip(name) {
  stopTrip();
  const run = ++tripRun;
  tripName = name;
  unhover();
  $$(".trip-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.trip === name)));
  const items = trips[name];
  const stops = items.filter((item) => !isPoint(item));

  // Draw the whole route as an amber highlight under the lines.
  journey.setAttribute("d", "M" + items.map((item) => { const p = posOf(item); return `${p.x} ${p.y}`; }).join(" L"));
  journey.style.setProperty("--trip-time", "1.2s");
  journey.classList.remove("on"); void journey.getBoundingClientRect(); journey.classList.add("on");

  train.classList.remove("hidden", "pop");
  train.style.transitionDuration = "0s";
  placeTrain(items[0], angleBetween(items[0], items[1]));
  await wait(80);
  train.style.transitionDuration = "";

  for (let i = 0; i < items.length; i++) {
    if (run !== tripRun) return;
    if (i > 0) {
      // The train turns to face the way it travels. Bends are passed quickly; stations are stops.
      train.style.transitionDuration = isPoint(items[i]) ? ".35s" : "";
      placeTrain(items[i], angleBetween(items[i - 1], items[i]));
      await wait(isPoint(items[i]) ? 380 : 1100);
      if (run !== tripRun) return;
    }
    if (isPoint(items[i])) continue;
    const next = stops[stops.indexOf(items[i]) + 1] || null;
    select(items[i], { fromTrip: true, next });
    await wait(3800);
  }
  if (run === tripRun) stopTrip();
}

function stopTrip() {
  if (!tripName) return;
  tripRun++;
  tripName = null;
  $$(".trip-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
  journey.classList.remove("on");
  train.classList.add("hidden");
}
$$(".trip-btn").forEach((b) => b.addEventListener("click", () => (tripName === b.dataset.trip ? stopTrip() : startTrip(b.dataset.trip))));

// One quiet pass along line 1 when the page loads.
function introPass() {
  if (reducedMotion.matches || !desktop.matches) return;
  train.style.transitionDuration = "0s";
  placeTrain("data");
  train.classList.remove("hidden");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    train.style.transitionDuration = "2.6s";
    placeTrain("check");
    setTimeout(() => { if (!current && !tripName) train.classList.add("hidden"); train.style.transitionDuration = ""; }, 3000);
  }));
}

/* ---- Start-up ----------------------------------------------------------- */

train.classList.add("hidden");
updateBoard(null);

// On phones every station is an accordion, closed until opened.
function syncLayout() {
  if (!desktop.matches) $$(".station details").forEach((d) => { d.open = false; });
  else if (current) $("details", document.getElementById(current)).open = true;
}
desktop.addEventListener("change", syncLayout);
syncLayout();

// A link such as ...#fakes opens that station straight away.
function openFromHash() {
  const id = location.hash.slice(1);
  if (id && document.getElementById(id)?.classList.contains("station")) select(id, { scroll: true });
}
window.addEventListener("hashchange", openFromHash);
openFromHash();
if (!current) introPass();
