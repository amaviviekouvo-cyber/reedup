// DATES : toutes les dates de l'appli sont du texte "AAAA-MM-JJ".
// Avantage : on peut les comparer avec < et > comme des mots du dictionnaire.

function toISO(d) {
  const two = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
}

// On se place à midi pour éviter les décalages d'heure d'été / d'hiver.
function fromISO(iso) {
  return new Date(iso + "T12:00:00");
}

function today() {
  return toISO(new Date());
}

function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// Nombre de jours entre deux dates (b - a)
function daysBetween(a, b) {
  return Math.round((fromISO(b) - fromISO(a)) / 86400000);
}

// 0 = lundi ... 6 = dimanche (JavaScript compte à partir du dimanche)
function weekday(iso) {
  return (fromISO(iso).getDay() + 6) % 7;
}

function mondayOf(iso) {
  return addDays(iso, -weekday(iso));
}

// Vérifie le format ET que le jour existe (refuse le 31 février)
function isValidDate(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && toISO(fromISO(iso)) === iso;
}

const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function formatDate(iso, options) {
  return fromISO(iso).toLocaleDateString("fr-FR", options || { weekday: "long", day: "numeric", month: "long" });
}

function formatShort(iso) {
  return formatDate(iso, { day: "numeric", month: "short" });
}
