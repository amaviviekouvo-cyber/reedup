// FENÊTRE SÉANCE : modifier, marquer comme faite, reporter, supprimer.

const dialog = document.getElementById("dialog");

function typeOptions(selected) {
  return Object.keys(TYPES).map(k => `<option value="${k}" ${k === selected ? "selected" : ""}>${TYPES[k]}</option>`).join("");
}

function scale(name, label, value) {
  return `<label>${label} : <output>${value}</output> / 10
    <input type="range" name="${name}" min="0" max="10" step="1" value="${value}"
      oninput="this.parentNode.querySelector('output').value = this.value"></label>`;
}

function showDialog(html) {
  dialog.innerHTML = html + `<button class="link" data-close>Fermer</button>`;
  dialog.querySelector("[data-close]").onclick = () => dialog.close();
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function finish(message) {
  save();
  dialog.close();
  render();
  toast(message);
}

// Les séances suivantes du même programme, encore à faire (celle-ci comprise)
function followingSessions(s) {
  return state.sessions.filter(x => x.programId && x.programId === s.programId &&
    x.patientId === s.patientId && x.status === "todo" && x.date >= s.date);
}

// "Toutes les suivantes" : titre, type et durée changent partout.
// La date ne décale que les séances du même jour de la semaine
// (déplacer le mercredi au jeudi ne doit pas toucher les lundis).
function applyEdit(s, values, scope) {
  const oldDate = s.date;
  const list = scope === "next" ? followingSessions(s) : [s];
  const shift = daysBetween(oldDate, values.date);
  list.forEach(x => {
    if (weekday(x.date) === weekday(oldDate)) x.date = addDays(x.date, shift);
    x.title = values.title;
    x.type = values.type;
    x.duration = values.duration;
  });
}

function scopeField(s) {
  if (!s.programId || followingSessions(s).length < 2) return "";
  return `<fieldset><legend>Appliquer à</legend>
    <label class="inline"><input type="radio" name="scope" value="one" checked> cette séance seulement</label>
    <label class="inline"><input type="radio" name="scope" value="next"> toutes les suivantes</label></fieldset>`;
}

function editForm(s, date) {
  return `<form id="editForm"><h3>${s ? "Modifier" : "Nouvelle séance"}</h3>
    <label>Titre <input name="title" required maxlength="60" value="${s ? esc(s.title) : ""}"></label>
    <div class="cols">
      <label>Type <select name="type">${typeOptions(s ? s.type : "exo")}</select></label>
      <label>Durée (min) <input type="number" name="duration" min="1" max="240" required value="${s ? s.duration : 20}"></label>
    </div>
    <label>Date <input type="date" name="date" required value="${s ? s.date : date}"></label>
    ${s ? scopeField(s) : ""}
    <button class="btn">Enregistrer</button></form>`;
}

function readEdit(form) {
  const f = new FormData(form);
  return { title: f.get("title").trim(), type: f.get("type"), duration: Number(f.get("duration")), date: f.get("date") };
}

function openNewSession(date) {
  showDialog(editForm(null, date));
  document.getElementById("editForm").onsubmit = e => {
    e.preventDefault();
    const v = readEdit(e.target);
    if (!v.title) return toast("Donne un titre à la séance.");
    state.sessions.push({ id: newId(), patientId: state.currentPatientId, status: "todo", ...v });
    finish("Séance ajoutée.");
  };
}

function openSession(id) {
  const s = getSession(id);
  const t = today();
  let body = `<h2>${esc(s.title)}</h2><p class="muted">${TYPES[s.type]}, ${s.duration} min, ${formatDate(s.date)}</p>`;

  if (s.status === "reported") {
    const next = state.sessions.find(x => x.reportedFrom === s.id);
    body += `<p>Séance reportée${next ? " au " + formatDate(next.date) : ""}.<br>Raison : ${esc(s.reason || "non précisée")}</p>`;
  } else {
    if (s.date <= t) {
      body += `<form id="doneForm"><h3>${s.status === "done" ? "Séance faite" : "Marquer comme faite"}</h3>
        ${scale("pain", "Douleur", s.pain ?? 0)}${scale("fatigue", "Fatigue", s.fatigue ?? 0)}
        <div class="row"><button class="btn">${s.status === "done" ? "Mettre à jour" : "Séance faite"}</button>
        ${s.status === "done" ? `<button type="button" class="btn light" id="undoBtn">Remettre à faire</button>` : ""}</div></form>`;
    } else {
      body += `<p class="muted">Cette séance est à venir : tu pourras la cocher le jour venu.</p>`;
    }
    if (s.status === "todo") {
      const min = s.date >= t ? addDays(s.date, 1) : t; // toujours plus tard que l'originale
      body += `<form id="reportForm"><h3>Reporter</h3><p class="muted">Ça arrive. On trouve juste un autre moment.</p>
        <div class="cols"><label>Nouvelle date <input type="date" name="date" required min="${min}" value="${min}"></label>
        <label>Raison <select name="reason"><option>Manque de temps</option><option>Fatigue</option><option>Douleur</option><option>Imprévu</option><option>Autre</option></select></label></div>
        <button class="btn light">Reporter la séance</button></form>` + editForm(s);
    }
  }
  body += `<button class="link danger" id="deleteBtn">Supprimer</button> `;
  showDialog(body);

  const on = (elId, event, fn) => { const el = document.getElementById(elId); if (el) el[event] = fn; };
  on("doneForm", "onsubmit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    Object.assign(s, { status: "done", pain: Number(f.get("pain")), fatigue: Number(f.get("fatigue")) });
    finish("Séance enregistrée.");
  });
  on("undoBtn", "onclick", () => {
    s.status = "todo";
    delete s.pain; delete s.fatigue; delete s.sensor;
    finish("Séance remise à faire.");
  });
  on("reportForm", "onsubmit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    reportSession(s, f.get("date"), f.get("reason"));
    finish("Séance reportée. Aucun souci.");
  });
  on("editForm", "onsubmit", e => {
    e.preventDefault();
    const v = readEdit(e.target);
    if (!v.title) return toast("Donne un titre à la séance.");
    applyEdit(s, v, new FormData(e.target).get("scope") || "one");
    finish("Modification enregistrée.");
  });
  on("deleteBtn", "onclick", () => confirmDelete(s));
}

function confirmDelete(s) {
  const following = s.status === "todo" && s.programId ? followingSessions(s) : [];
  showDialog(`<h2>Supprimer la séance ?</h2><p>${esc(s.title)}, ${formatDate(s.date)}</p>
    <div class="row"><button class="btn" data-del="one">Cette séance seulement</button>
    ${following.length > 1 ? `<button class="btn light" data-del="next">Toutes les suivantes (${following.length})</button>` : ""}</div>`);
  dialog.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const remove = b.dataset.del === "next" ? following : [s];
    state.sessions = state.sessions.filter(x => !remove.includes(x));
    finish("Suppression effectuée.");
  });
}
