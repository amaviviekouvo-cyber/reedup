// PROGRAMME récurrent : un formulaire génère des séances ordinaires,
// reliées entre elles par le même programId.

// Renvoie la liste des dates (fonction pure, facile à vérifier)
function programDates(start, weeks, days) {
  const dates = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    if (days.includes(weekday(d))) dates.push(d);
  }
  return dates;
}

// Les programmes ne sont pas stockés à part : on les retrouve en
// regroupant les séances. Il reste donc une seule source de données.
function listPrograms(patientId) {
  const groups = {};
  sessionsOf(patientId).forEach(s => {
    if (s.programId) (groups[s.programId] = groups[s.programId] || []).push(s);
  });
  return Object.entries(groups).map(([id, list]) => {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const remaining = list.filter(s => s.status === "todo" && s.date >= today());
    const ref = remaining[0] || list[list.length - 1];
    const days = [...new Set((remaining.length ? remaining : list).map(s => weekday(s.date)))].sort();
    return { id, title: ref.title, duration: ref.duration, days, end: list[list.length - 1].date,
      done: list.filter(s => s.status === "done").length, remaining };
  });
}

function viewProgram() {
  const patient = currentPatient();
  const programs = listPrograms(patient.id);
  main.innerHTML = `<h1>Programme</h1>
    <section class="card"><form id="nameForm" class="row">
      <label class="grow">Nom du programme <input name="name" required maxlength="60" value="${esc(patient.programName)}"></label>
      <button class="btn light">Renommer</button></form></section>
    <section class="card"><h2>Créer des séances récurrentes</h2>
      <form id="progForm">
        <label>Titre <input name="title" required maxlength="60" placeholder="Ex. Mobilité du bassin"></label>
        <div class="cols"><label>Type <select name="type">${typeOptions("exo")}</select></label>
        <label>Durée (min) <input type="number" name="duration" min="1" max="240" value="20" required></label></div>
        <fieldset><legend>Jours</legend><div class="days">${DAY_NAMES.map((n, i) =>
          `<label class="inline"><input type="checkbox" name="days" value="${i}"> ${n}</label>`).join("")}</div></fieldset>
        <div class="cols"><label>À partir du <input type="date" name="start" value="${today()}" min="${today()}" required></label>
        <label>Pendant (semaines) <input type="number" name="weeks" min="1" max="26" value="6" required></label></div>
        <p id="preview" class="muted" role="status"></p>
        <button class="btn">Créer le programme</button></form></section>
    <section class="card"><h2>Séances récurrentes</h2>
      ${programs.length ? programs.map(p => `<div class="prog"><div><strong>${esc(p.title)}</strong>, ${p.duration} min<br>
        <span class="muted">${p.days.map(d => DAY_NAMES[d]).join(", ")} · jusqu'au ${formatShort(p.end)} · ${p.done} faite(s), ${p.remaining.length} à venir</span></div>
        ${p.remaining.length ? `<button class="link danger" data-stop="${esc(p.id)}">Arrêter</button>` : ""}</div>`).join("")
      : `<p class="muted">Aucune pour le moment.</p>`}
      <p class="muted">Pour modifier une séance, ouvre-la depuis la vue Semaine.</p></section>`;

  const form = document.getElementById("progForm");
  const read = () => {
    const f = new FormData(form);
    const start = f.get("start"), weeks = Math.min(26, Number(f.get("weeks")) || 0);
    return { title: f.get("title").trim(), type: f.get("type"), duration: Number(f.get("duration")),
      dates: isValidDate(start) ? programDates(start, weeks, f.getAll("days").map(Number)) : [] };
  };
  form.oninput = () => {
    const n = read().dates.length;
    document.getElementById("preview").textContent = n ? n + " séance(s) seront créées." : "Choisis au moins un jour.";
  };
  form.onsubmit = e => {
    e.preventDefault();
    const { dates, ...v } = read();
    if (!v.title || !dates.length) return toast("Choisis un titre et au moins un jour.");
    const programId = newId();
    dates.forEach(date => state.sessions.push({ id: newId(), patientId: patient.id, ...v, date, status: "todo", programId }));
    save();
    render();
    toast(dates.length + " séances créées.");
  };
  document.getElementById("nameForm").onsubmit = e => {
    e.preventDefault();
    patient.programName = new FormData(e.target).get("name").trim() || patient.programName;
    save();
    render();
    toast("Programme renommé.");
  };
  main.querySelectorAll("[data-stop]").forEach(b => b.onclick = () => {
    const p = programs.find(x => x.id === b.dataset.stop);
    if (!confirm("Supprimer les " + p.remaining.length + " séances à venir ? L'historique est conservé.")) return;
    state.sessions = state.sessions.filter(s => !p.remaining.includes(s));
    save();
    render();
  });
}
