// POINT D'ENTRÉE : choix de la vue, affichage, petits outils communs.

const main = document.getElementById("main");
const ui = { view: "today", date: today() }; // état d'affichage, non enregistré

const VIEWS = { today: viewToday, week: viewWeek, month: viewMonth, report: viewReport, program: viewProgram, kine: viewKine };

// Protège contre le code HTML glissé dans un texte saisi (titre, fichier importé...)
function esc(text) {
  const codes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, c => codes[c]);
}

let toastTimer;
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

function go(view) {
  ui.view = view;
  render();
  window.scrollTo(0, 0);
}

// On redessine toute la vue après chaque changement : simple et toujours à jour.
function render() {
  const p = currentPatient();
  document.getElementById("patientLine").innerHTML = ui.view === "kine" ? "Espace kiné"
    : `${esc(p.name)} · ${esc(p.programName)}` + (p.id !== MY_ID ? ` <button class="link" id="backBtn">Revenir à mon dossier</button>` : "");
  const back = document.getElementById("backBtn");
  if (back) back.onclick = () => { state.currentPatientId = MY_ID; save(); render(); };

  document.querySelectorAll("#nav button").forEach(b => {
    if (b.dataset.view === ui.view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  VIEWS[ui.view]();
  main.querySelectorAll("[data-session]").forEach(b => b.onclick = () => openSession(b.dataset.session));
}

document.querySelectorAll("#nav button").forEach(b => b.onclick = () => go(b.dataset.view));
document.getElementById("resetBtn").onclick = () => {
  if (!confirm("Effacer les données et recharger la démo ?")) return;
  state = demoState();
  save();
  go("today");
};

load();
render();
