// VUES PATIENT : Aujourd'hui, Semaine, Mois.

function sessionCard(s, draggable) {
  const label = { done: "Faite", reported: "Reportée", todo: s.date < today() ? "Non faite" : "À faire" }[s.status];
  const scores = s.status === "done" && s.pain != null ? ` · douleur ${s.pain}, fatigue ${s.fatigue}` : "";
  return `<button class="session ${s.type} ${s.status}" data-session="${s.id}" ${draggable && s.status === "todo" ? 'draggable="true"' : ""}>
    <strong>${s.status === "done" ? "✓ " : ""}${esc(s.title)}</strong>
    <span>${TYPES[s.type]} · ${s.duration} min</span><span>${label}${scores}</span></button>`;
}

function viewToday() {
  const list = sessionsOn(state.currentPatientId, today()).filter(s => s.status !== "reported");
  const done = list.filter(s => s.status === "done").length;
  const p = list.length ? Math.round(100 * done / list.length) : 0;
  main.innerHTML = `<h1>${formatDate(today())}</h1>
    <section class="card">
      ${list.length ? `<p><strong>${p} %</strong> de ta journée, ${done} séance(s) sur ${list.length}</p>
        <div class="bar" role="progressbar" aria-label="Progression" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><div style="width:${p}%"></div></div>
        <div class="list">${list.map(s => `<div class="check-row">
          <input type="checkbox" data-check="${s.id}" ${s.status === "done" ? "checked" : ""} aria-label="Faite : ${esc(s.title)}">${sessionCard(s)}</div>`).join("")}</div>`
      : `<p>Rien de prévu aujourd'hui. Le repos fait aussi partie du programme.</p>`}
    </section>
    <button class="btn light" id="addBtn">Ajouter une séance</button>`;
  // Cocher ouvre la fenêtre pour noter douleur et fatigue
  main.querySelectorAll("[data-check]").forEach(c => c.onclick = e => { e.preventDefault(); openSession(c.dataset.check); });
  document.getElementById("addBtn").onclick = () => openNewSession(today());
}

function weekNav(title) {
  return `<div class="week-nav"><button class="btn light no-print" id="prev" aria-label="Précédent">←</button>
    <h1>${title}</h1><button class="btn light no-print" id="next" aria-label="Suivant">→</button>
    <button class="link no-print" id="now">Revenir à aujourd'hui</button></div>`;
}

function bindNav(prev, next) {
  document.getElementById("prev").onclick = () => { ui.date = prev; render(); };
  document.getElementById("next").onclick = () => { ui.date = next; render(); };
  document.getElementById("now").onclick = () => { ui.date = today(); render(); };
}

function weekTitle(monday) {
  return "Semaine du " + formatShort(monday) + " au " + formatDate(addDays(monday, 6), { day: "numeric", month: "short", year: "numeric" });
}

function viewWeek() {
  const monday = mondayOf(ui.date);
  let html = weekNav(weekTitle(monday)) + `<p class="muted">Glisse une séance vers un autre jour, ou touche-la pour l'ouvrir.</p><div class="week">`;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    html += `<div class="day ${d === today() ? "is-today" : ""}" data-day="${d}">
      <div class="day-head">${formatDate(d, { weekday: "short", day: "numeric" })}
        <button class="plus" data-add="${d}" aria-label="Ajouter une séance ${formatDate(d)}">+</button></div>
      ${sessionsOn(state.currentPatientId, d).map(s => sessionCard(s, true)).join("")}</div>`;
  }
  main.innerHTML = html + "</div>";
  bindNav(addDays(monday, -7), addDays(monday, 7));
  main.querySelectorAll("[data-add]").forEach(b => b.onclick = () => openNewSession(b.dataset.add));

  // Glisser-déposer : on transporte l'id de la séance
  main.querySelectorAll("[draggable]").forEach(el => el.ondragstart = e => e.dataTransfer.setData("text/plain", el.dataset.session));
  main.querySelectorAll("[data-day]").forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add("over"); };
    col.ondragleave = () => col.classList.remove("over");
    col.ondrop = e => {
      e.preventDefault();
      col.classList.remove("over");
      const s = getSession(e.dataTransfer.getData("text/plain"));
      if (!s || s.status !== "todo") return;
      s.date = col.dataset.day;
      save();
      render();
    };
  });
}

const LEVELS = {
  full: ["✓", "Tout fait"], part: ["◐", "En partie"], missed: ["○", "Non fait"], upcoming: ["·", "À venir"], moved: ["→", "Déplacé"]
};

function viewMonth() {
  const first = ui.date.slice(0, 7) + "-01";
  const nextMonth = addDays(first, 32).slice(0, 7) + "-01";
  const last = addDays(nextMonth, -1);
  const m = count(state.currentPatientId, first, last);
  let cells = "";
  for (let i = 0; i < weekday(first); i++) cells += "<div></div>";
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const { level, c } = dayLevel(state.currentPatientId, d);
    const info = level === "none" ? "Pas de séance" : level === "moved" ? "Séance déplacée dans la semaine"
      : LEVELS[level][1] + ", " + c.done + " séance(s) sur " + (c.due + c.upcoming);
    cells += `<button class="cell ${level} ${d === today() ? "is-today" : ""}" data-goto="${d}" title="${info}" aria-label="${formatDate(d)} : ${info}">
      <span>${Number(d.slice(8))}</span><b>${level === "none" ? "" : LEVELS[level][0]}</b></button>`;
  }
  main.innerHTML = weekNav(formatDate(first, { month: "long", year: "numeric" })) +
    `<section class="card"><p><strong>Assiduité : ${pct(m.adherence)}</strong> (${m.done} faite(s) sur ${m.due} échue(s), ${m.upcoming} à venir)</p>
    <div class="month">${DAY_NAMES.map(n => `<div class="month-head">${n.slice(0, 3)}</div>`).join("")}${cells}</div>
    <div class="legend">${Object.keys(LEVELS).map(k => `<span><i class="cell ${k}">${LEVELS[k][0]}</i>${LEVELS[k][1]}</span>`).join("")}</div></section>`;
  bindNav(addDays(first, -1).slice(0, 7) + "-01", nextMonth);
  main.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => { ui.date = b.dataset.goto; go("week"); });
}
