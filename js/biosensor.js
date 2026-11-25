// BIOSENSOR : lecture d'un fichier de mesures fictif (CSV ou JSON).
// Une mesure = { date, amplitude (degrés, 0 à 180), regularity (%, 0 à 100) }
// CSV  : date;amplitude;regularite      JSON : { "measures": [ {...} ] }

// Transforme le texte du fichier en { measures, errors }
function parseSensorFile(text) {
  text = text.replace(/^\uFEFF/, "").trim(); // Excel ajoute parfois un caractère invisible
  let rows;
  if (text.startsWith("{") || text.startsWith("[")) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { measures: [], errors: ["Le JSON est mal formé."] };
    }
    rows = Array.isArray(data) ? data : data.measures;
    if (!Array.isArray(rows)) return { measures: [], errors: ["Liste « measures » absente du JSON."] };
  } else {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const sep = lines.length && lines[0].includes(";") ? ";" : ",";
    const head = lines.length ? lines[0].split(sep).map(h => h.trim().toLowerCase()) : [];
    const iDate = head.indexOf("date"), iAmp = head.indexOf("amplitude"), iReg = head.indexOf("regularite");
    if (iDate < 0 || iAmp < 0 || iReg < 0) {
      return { measures: [], errors: ["Colonnes attendues : date;amplitude;regularite"] };
    }
    rows = lines.slice(1).map(l => {
      const c = l.split(sep);
      return { date: c[iDate], amplitude: c[iAmp], regularity: c[iReg] };
    });
  }

  const measures = [], errors = [];
  const toNumber = v => v == null || String(v).trim() === "" ? NaN : Number(String(v).replace(",", "."));
  rows.forEach((row, i) => {
    const m = {
      date: String(row && row.date || "").trim(),
      amplitude: toNumber(row && row.amplitude),
      regularity: toNumber(row && row.regularity)
    };
    const ok = isValidDate(m.date) && m.amplitude >= 0 && m.amplitude <= 180 && m.regularity >= 0 && m.regularity <= 100;
    if (ok) measures.push(m);
    else errors.push("Mesure " + (i + 1) + " ignorée : date ou valeur invalide.");
  });
  return { measures, errors };
}

// Attache chaque mesure à la séance d'équithérapie FAITE le même jour
function attachMeasures(patientId, measures, source) {
  let attached = 0;
  const errors = [];
  measures.forEach(m => {
    const s = sessionsOn(patientId, m.date).find(x => x.type === "equi" && x.status === "done");
    if (s) {
      s.sensor = { amplitude: m.amplitude, regularity: m.regularity, source };
      attached++;
    } else {
      errors.push(m.date + " : aucune séance d'équithérapie faite ce jour-là.");
    }
  });
  return { attached, errors };
}

// Séances mesurées, jusqu'à la fin de la semaine affichée
function measuredSessions(patientId, until) {
  return sessionsOf(patientId)
    .filter(s => s.sensor && s.date <= until)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8);
}

// Petite courbe SVG : une seule mesure par graphique, échelle à partir de 0
function lineChart(title, unit, list, key, max) {
  const W = 320, H = 150, L = 34, R = 40, T = 12, B = 24;
  const x = i => list.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (list.length - 1);
  const y = v => H - B - v / max * (H - T - B);
  const pts = list.map((s, i) => ({ x: x(i), y: y(s.sensor[key]), s }));
  const grid = [0, max / 2, max].map(v =>
    `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/>
     <text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`).join("");
  const last = pts[pts.length - 1];
  const dates = list.length > 1
    ? `<text x="${pts[0].x}" y="${H - 6}" text-anchor="start">${formatShort(list[0].date)}</text>
       <text x="${last.x}" y="${H - 6}" text-anchor="end">${formatShort(last.s.date)}</text>`
    : `<text x="${last.x}" y="${H - 6}" text-anchor="middle">${formatShort(last.s.date)}</text>`;
  return `<figure class="chart"><figcaption>${title} (${unit})</figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}, détail dans le tableau">
      ${grid}
      <polyline points="${pts.map(p => p.x + "," + p.y).join(" ")}" class="line"/>
      ${pts.map(p => `<g class="pt"><circle cx="${p.x}" cy="${p.y}" r="14" class="hit"/>
        <circle cx="${p.x}" cy="${p.y}" r="4" class="dot"/>
        <title>${formatShort(p.s.date)} : ${num(p.s.sensor[key])} ${unit}</title></g>`).join("")}
      <text x="${last.x + 8}" y="${last.y + 4}" class="last">${num(last.s.sensor[key])}</text>
      ${dates}
    </svg></figure>`;
}

function sensorSection(patientId, until) {
  const list = measuredSessions(patientId, until);
  const top = Math.max(30, ...list.map(s => Math.ceil(s.sensor.amplitude / 10) * 10));
  const charts = list.length ? `
    <div class="charts">
      ${lineChart("Amplitude du mouvement", "°", list, "amplitude", top)}
      ${lineChart("Régularité du mouvement", "%", list, "regularity", 100)}
    </div>
    <details><summary>Voir les valeurs</summary>
      <table><tr><th>Date</th><th>Amplitude</th><th>Régularité</th></tr>
      ${list.map(s => `<tr><td>${formatShort(s.date)}</td><td>${num(s.sensor.amplitude)} °</td><td>${num(s.sensor.regularity)} %</td></tr>`).join("")}
      </table></details>`
    : `<p class="muted">Aucune mesure pour le moment.</p>`;
  return `<section class="card"><h2>Mouvement en équithérapie</h2>
    <p class="muted">Mesures fictives, affichées sans interprétation médicale.</p>
    ${charts}
    <div class="row no-print">
      <label class="btn">Importer un fichier CSV ou JSON
        <input type="file" id="sensorFile" accept=".csv,.json" class="visually-hidden"></label>
      <button id="sensorSample" class="link">Télécharger un exemple</button>
    </div>
    <div id="sensorResult" role="status"></div>
  </section>`;
}

function bindSensor(patientId) {
  document.getElementById("sensorFile").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const parsed = parseSensorFile(await file.text());
    const result = attachMeasures(patientId, parsed.measures, file.name);
    save();
    render();
    const errors = parsed.errors.concat(result.errors);
    document.getElementById("sensorResult").innerHTML =
      `<p><strong>${result.attached} mesure(s) importée(s).</strong></p>` +
      (errors.length ? `<ul>${errors.map(m => `<li>${esc(m)}</li>`).join("")}</ul>` : "");
  };

  // L'exemple est fabriqué avec les vraies dates des séances, pour que l'import fonctionne.
  document.getElementById("sensorSample").onclick = () => {
    const equi = sessionsOf(patientId).filter(s => s.type === "equi" && s.status === "done")
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!equi.length) return toast("Aucune séance d'équithérapie faite pour ce patient.");
    const lines = equi.map((s, i) => [s.date, 14 + i * 2, Math.min(95, 62 + i * 4)].join(";"));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["date;amplitude;regularite\n" + lines.join("\n") + "\n"], { type: "text/csv" }));
    a.download = "biosensor-exemple.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
}
