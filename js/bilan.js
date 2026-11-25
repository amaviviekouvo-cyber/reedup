// BILAN hebdomadaire + export (impression / PDF)

function reportMessage(w) {
  if (w.due === 0) return "Aucune séance échue pour l'instant sur cette semaine.";
  if (w.adherence === 100) return "Toutes les séances échues ont été faites. Bravo pour la régularité.";
  if (w.adherence >= 70) return "Une bonne semaine : l'essentiel des séances a été fait.";
  if (w.adherence >= 40) return "Une semaine en partie suivie. Chaque séance faite compte.";
  return "Semaine difficile, et c'est une information utile. On peut en parler au kiné pour adapter le rythme.";
}

function compareText(now, before, unit) {
  if (now == null || before == null) return "Pas de comparaison possible";
  const diff = Math.round((now - before) * 10) / 10;
  if (diff === 0) return "Stable par rapport à la semaine précédente";
  return (diff > 0 ? "+" : "−") + num(Math.abs(diff)) + " " + unit + " par rapport à la semaine précédente";
}

function tile(label, value, note) {
  return `<div class="tile"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
}

function viewReport() {
  const id = state.currentPatientId;
  const monday = mondayOf(ui.date);
  const w = weekStats(id, monday);
  const b = weekStats(id, addDays(monday, -7));
  const reasons = Object.entries(w.reasons).sort((x, y) => y[1] - x[1]);
  const patient = currentPatient();
  main.innerHTML = weekNav("Bilan, " + weekTitle(monday).toLowerCase()) + `
    <p class="print-only">${esc(patient.name)} · ${esc(patient.programName)}</p>
    <section class="card"><p class="message">${reportMessage(w)}</p>
      <p>${w.done} faite(s), ${w.missed} manquée(s), ${w.upcoming} à venir${w.moved ? ", " + w.moved + " déplacée(s) dans la semaine" : ""}.</p></section>
    <div class="tiles">
      ${tile("Assiduité", pct(w.adherence), compareText(w.adherence, b.adherence, "points"))}
      ${tile("Minutes", w.minutesDone + " / " + w.minutesPlanned, "faites / prévues")}
      ${tile("Douleur moyenne", num(w.pain) + " / 10", compareText(w.pain, b.pain, "point(s)"))}
      ${tile("Fatigue moyenne", num(w.fatigue) + " / 10", compareText(w.fatigue, b.fatigue, "point(s)"))}
    </div>
    <section class="card"><h2>Raisons de report</h2>
      ${reasons.length ? `<ul>${reasons.map(([r, n]) => `<li>${esc(r)} : ${n}</li>`).join("")}</ul>` : `<p class="muted">Aucun report cette semaine.</p>`}</section>
    ${sensorSection(id, addDays(monday, 6))}
    <button class="btn no-print" id="printBtn">Exporter en PDF / imprimer</button>`;
  bindNav(addDays(monday, -7), addDays(monday, 7));
  bindSensor(id);
  // Le titre de la page devient le nom proposé pour le fichier PDF
  document.getElementById("printBtn").onclick = () => {
    document.title = "ReedUp-bilan-" + monday;
    window.print();
    document.title = "ReedUp";
  };
}
