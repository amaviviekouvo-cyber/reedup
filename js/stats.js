// CALCULS : des fonctions qui lisent les séances et renvoient des nombres.
// Elles ne dessinent rien, ce qui les rend faciles à vérifier.

function average(numbers) {
  if (numbers.length === 0) return null;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

// Une séance reportée a-t-elle une remplaçante entre ces deux dates ?
// On suit toute la chaîne : une remplaçante peut être reportée à son tour.
function hasReplacementBetween(s, all, from, to) {
  return all.some(r => r.reportedFrom === s.id &&
    ((r.date >= from && r.date <= to) || hasReplacementBetween(r, all, from, to)));
}

// Donne l'état réel d'une séance : "done", "missed", "upcoming" ou "moved".
// moved = reportée mais replacée dans la même semaine : elle ne compte pas,
//         c'est sa remplaçante qui compte.
function outcome(s, all) {
  if (s.status === "done") return "done";
  if (s.status === "reported") {
    const from = mondayOf(s.date);
    return hasReplacementBetween(s, all, from, addDays(from, 6)) ? "moved" : "missed";
  }
  return s.date < today() ? "missed" : "upcoming";
}

// Compte les séances entre deux dates
function count(patientId, from, to) {
  const all = sessionsOf(patientId);
  const list = all.filter(s => s.date >= from && s.date <= to);
  const r = { done: 0, missed: 0, upcoming: 0, moved: 0, minutesDone: 0, minutesPlanned: 0, reasons: {} };
  const pains = [], fatigues = [];
  list.forEach(s => {
    const o = outcome(s, all);
    r[o]++;
    if (o !== "moved") r.minutesPlanned += s.duration;
    if (o === "done") {
      r.minutesDone += s.duration;
      if (s.pain != null) pains.push(s.pain);
      if (s.fatigue != null) fatigues.push(s.fatigue);
    }
    if (s.status === "reported") {
      const reason = s.reason || "Sans raison précisée";
      r.reasons[reason] = (r.reasons[reason] || 0) + 1;
    }
  });
  // Assiduité : les séances encore à venir ne sont pas comptées comme manquées.
  const due = r.done + r.missed;
  r.due = due;
  r.adherence = due ? Math.round(100 * r.done / due) : null;
  r.pain = average(pains);
  r.painCount = pains.length;
  r.fatigue = average(fatigues);
  r.reports = list.filter(s => s.status === "reported").length;
  return r;
}

function weekStats(patientId, monday) {
  return count(patientId, monday, addDays(monday, 6));
}

// ---------- Repères doux pour le kiné ----------
// Seuils choisis pour la démo, sans valeur clinique.
const PAIN_RISE = 1;    // hausse de la moyenne (sur 10)
const MIN_VALUES = 2;   // nombre minimal de notes de chaque côté
const MAX_REPORTS = 2;  // reports sur 14 jours

function alertsFor(patientId) {
  const t = today();
  const last = count(patientId, addDays(t, -6), t);
  const before = count(patientId, addDays(t, -13), addDays(t, -7));
  const alerts = [];
  if (last.painCount >= MIN_VALUES && before.painCount >= MIN_VALUES && last.pain - before.pain >= PAIN_RISE) {
    alerts.push("La douleur déclarée augmente : " + num(before.pain) + " puis " + num(last.pain) +
      " sur 10 (7 derniers jours). À aborder ensemble.");
  }
  const reports = last.reports + before.reports;
  if (reports >= MAX_REPORTS) {
    alerts.push(reports + " séances reportées sur 14 jours. Le rythme est peut-être à réajuster.");
  }
  return { last, alerts };
}

// Couleur d'un jour dans la vue Mois
function dayLevel(patientId, date) {
  const c = count(patientId, date, date);
  if (c.due + c.upcoming === 0) return { level: c.moved ? "moved" : "none", c };
  if (c.due === 0) return { level: "upcoming", c };
  if (c.done === 0) return { level: c.upcoming ? "upcoming" : "missed", c };
  return { level: c.missed || c.upcoming ? "part" : "full", c };
}

// ---------- Affichage des nombres ----------
function num(n) {
  return n == null ? "–" : n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function pct(n) {
  return n == null ? "–" : n + " %";
}
