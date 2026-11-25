// DONNÉES : l'objet "state" est la seule source de données de l'appli.
// state = {
//   currentPatientId,
//   patients: [{ id, name, programName }],
//   sessions: [{ id, patientId, title, type, duration, date, status,
//                pain?, fatigue?, reason?, reportedFrom?, programId?, sensor? }]
// }

const STORAGE_KEY = "reedup-v1";
const MY_ID = "p1"; // le patient "propriétaire" de l'appli ; les autres servent à la vue kiné
const TYPES = { exo: "Exercices", kine: "Kiné", equi: "Équithérapie" };

let state;

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    alert("Impossible d'enregistrer les données dans ce navigateur.");
  }
}

function load() {
  let old = null;
  try {
    old = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) { /* données illisibles : on repart de la démo */ }
  state = old && Array.isArray(old.sessions) ? migrate(old) : demoState();
  save();
}

// L'ancienne version n'avait qu'un patient : on lui rattache ses séances
// et on ajoute les autres patients fictifs, sans rien perdre.
function migrate(old) {
  if (Array.isArray(old.patients)) return old;
  const demo = demoState();
  demo.patients[0].programName = old.programName || demo.patients[0].programName;
  const mine = old.sessions.map(s => ({ ...s, patientId: MY_ID }));
  demo.sessions = mine.concat(demo.sessions.filter(s => s.patientId !== MY_ID));
  return demo;
}

function currentPatient() {
  return state.patients.find(p => p.id === state.currentPatientId);
}

function sessionsOf(patientId) {
  return state.sessions.filter(s => s.patientId === patientId);
}

function sessionsOn(patientId, date) {
  return sessionsOf(patientId).filter(s => s.date === date);
}

function getSession(id) {
  return state.sessions.find(s => s.id === id);
}

// Reporter = l'originale garde sa trace, une nouvelle séance est créée.
// La copie n'a pas de programId : c'est une séance isolée.
function reportSession(s, newDate, reason) {
  s.status = "reported";
  s.reason = reason;
  state.sessions.push({
    id: newId(), patientId: s.patientId, title: s.title, type: s.type,
    duration: s.duration, date: newDate, status: "todo", reportedFrom: s.id
  });
}

// ---------- Données de démonstration (fictives) ----------

function demoState() {
  const monday = mondayOf(today());
  const now = today();
  const sessions = [];

  // pain = [semaine -4, -3, -2, -1, semaine en cours]
  // skip = séances manquées, report = séances reportées ("semaine:jour")
  function fill(patientId, plan, pain, skip, report) {
    for (let w = -4; w <= 2; w++) {
      plan.forEach(([day, title, type, duration]) => {
        const date = addDays(monday, w * 7 + day);
        const key = w + ":" + day;
        const s = { id: newId(), patientId, title, type, duration, date, status: "todo" };
        if (type === "exo") s.programId = "demo-" + patientId;
        sessions.push(s);
        const p = pain[Math.min(w, 0) + 4];
        if (report[key]) {
          s.status = "reported";
          s.reason = report[key];
          delete s.programId;
          const d2 = addDays(date, 1);
          const copy = { id: newId(), patientId, title, type, duration, date: d2, status: "todo", reportedFrom: s.id };
          if (d2 < now) Object.assign(copy, { status: "done", pain: p, fatigue: p + 1 });
          sessions.push(copy);
        } else if (date < now && !skip.includes(key)) {
          Object.assign(s, { status: "done", pain: p, fatigue: Math.min(10, p + day % 3) });
          // La séance la plus récente reste sans mesure, pour tester l'import.
          if (type === "equi" && w < -1) {
            s.sensor = { amplitude: 14 + (w + 4) * 2.5, regularity: 62 + (w + 4) * 5, source: "démo" };
          }
        }
      });
    }
  }

  const exo = (day, title) => [day, title, "exo", 20];
  fill("p1", [exo(0, "Mobilité du bassin"), [1, "Séance chez le kiné", "kine", 30], exo(2, "Mobilité du bassin"),
    [4, "Équithérapie au pas", "equi", 45], exo(5, "Mobilité du bassin")],
    [5, 4, 4, 3, 3], ["-3:5", "-1:5"], { "-2:2": "Fatigue", "-1:0": "Manque de temps" });
  fill("p2", [exo(0, "Renforcement du genou"), exo(2, "Renforcement du genou"), exo(4, "Renforcement du genou"),
    exo(6, "Renforcement du genou")], [2, 2, 2, 4, 6], ["-1:4"], {});
  fill("p3", [exo(0, "Mobilité de l'épaule"), exo(1, "Mobilité de l'épaule"), exo(3, "Mobilité de l'épaule"),
    exo(5, "Mobilité de l'épaule")], [3, 3, 3, 3, 3], ["-2:5"],
    { "-1:1": "Manque de temps", "-1:3": "Fatigue", "0:0": "Manque de temps" });
  fill("p4", [exo(0, "Équilibre debout"), exo(1, "Équilibre debout"), [3, "Équithérapie au pas", "equi", 45],
    exo(6, "Équilibre debout")], [4, 4, 3, 2, 2], [], {});

  return {
    currentPatientId: MY_ID,
    patients: [
      { id: "p1", name: "Camille D.", programName: "Programme équithérapie" },
      { id: "p2", name: "Sacha M.", programName: "Rééducation du genou" },
      { id: "p3", name: "Noa L.", programName: "Rééducation de l'épaule" },
      { id: "p4", name: "Alix R.", programName: "Équilibre et équithérapie" }
    ],
    sessions
  };
}
