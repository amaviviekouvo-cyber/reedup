// VUE KINÉ : une ligne par patient, calculée à partir des mêmes séances.

function viewKine() {
  const monday = mondayOf(today());
  const rows = state.patients.map(p => ({ p, w: weekStats(p.id, monday), prev: weekStats(p.id, addDays(monday, -7)), ...alertsFor(p.id) }));
  // Les patients à regarder d'abord passent en tête
  rows.sort((a, b) => b.alerts.length - a.alerts.length);
  main.innerHTML = `<h1>Vue kiné</h1>
    <p class="muted">Patients fictifs. Les repères invitent à échanger avec le patient, ils ne posent aucun diagnostic.</p>
    <div class="patients">${rows.map(r => `<section class="card">
      <div class="row between"><div><h2>${esc(r.p.name)}</h2><span class="muted">${esc(r.p.programName)}</span></div>
        <button class="btn light" data-open="${r.p.id}">Voir le bilan</button></div>
      <div class="tiles">
        ${tile("Assiduité de la semaine", pct(r.w.adherence), r.w.done + " / " + r.w.due + " échue(s), semaine préc. " + pct(r.prev.adherence))}
        ${tile("Douleur moyenne", num(r.last.pain) + " / 10", "7 derniers jours")}
      </div>
      ${r.alerts.length ? r.alerts.map(a => `<p class="soft-alert"><strong>À regarder.</strong> ${a}</p>`).join("")
        : `<p class="muted">Pas de point particulier.</p>`}</section>`).join("")}</div>`;
  main.querySelectorAll("[data-open]").forEach(b => b.onclick = () => {
    state.currentPatientId = b.dataset.open;
    save();
    ui.date = today();
    go("report");
  });
}
