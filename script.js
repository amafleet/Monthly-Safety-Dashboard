/* =========================
   CONFIG — update monthly
========================= */
const DATA_FILE = "./data/safety-2025-12.json";

/* =========================
   Violation rules
========================= */
function isViolation(review) {
  return review === "None" || review === "Dispute Denied" || review === "Dispute Closed";
}

function reviewLabel(review) {
  if (review === "Dispute Approved") return "No - Violation (Dispute Approved)";
  return "Yes - Violation";
}

/* =========================
   Load JSON and build
========================= */
const fileNameOnly = DATA_FILE.split("/").pop();
document.getElementById("fileTitle").textContent = `Data Source: ${fileNameOnly}`;

fetch(DATA_FILE)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status} when loading ${DATA_FILE}`);
    return res.json();
  })
  .then(data => {
    if (!Array.isArray(data)) data = [data];
    buildSummaryAndCharts(data, fileNameOnly);
    buildViolationTable(data); // includes subtotals, grand total, toggles, export
  })
  .catch(err => {
    const box = document.getElementById("errorBox");
    box.style.display = "block";
    box.innerHTML = `
      <b>Dashboard could not load the JSON file.</b><br><br>
      Tried to load: <code>${DATA_FILE}</code><br>
      Error: <code>${err.message}</code><br><br>
      <b>Fix checklist:</b>
      <ul>
        <li>Confirm the JSON exists at: <code>.../data/${fileNameOnly}</code></li>
        <li>Folder must be named exactly <code>data</code> (lowercase)</li>
        <li>Filename must match exactly <code>${fileNameOnly}</code></li>
      </ul>
    `;
    console.error(err);
  });

/* =========================
   Summary + Charts
========================= */
function buildSummaryAndCharts(data, fileLabel) {
  let violations = 0;
  let nonViolations = 0;

  const daCounts = {};
  const metricCounts = {};

  data.forEach(row => {
    const review = row["Review Details"] ?? "None";
    const v = isViolation(review);

    if (v) {
      violations++;
      const da = row["Delivery Associate"] || "(Unknown)";
      const mt = row["Metric Type"] || "(Unknown)";
      daCounts[da] = (daCounts[da] || 0) + 1;
      metricCounts[mt] = (metricCounts[mt] || 0) + 1;
    } else {
      nonViolations++;
    }
  });

  document.getElementById("totalEvents").textContent = data.length;
  document.getElementById("violations").textContent = violations;
  document.getElementById("nonViolations").textContent = nonViolations;

  buildDAChart(daCounts, fileLabel);
  buildMetricChart(metricCounts, fileLabel);
}

function buildDAChart(counts, fileLabel) {
  const names = Object.keys(counts).sort((a, b) => a.localeCompare(b));
  const values = names.map(n => counts[n]);

  Plotly.newPlot("daChart", [{
    x: names,
    y: values,
    type: "bar"
  }], {
    title: `Violation Count per Delivery Associate – ${fileLabel}`,
    xaxis: {
      tickangle: -45,
      tickfont: { size: 10 },
      automargin: true
    },
    yaxis: { title: "Violations" },
    margin: { t: 60, l: 60, r: 20, b: 160 }
  }, { responsive: true });
}

function buildMetricChart(counts, fileLabel) {
  const metrics = Object.keys(counts).sort((a, b) => a.localeCompare(b));
  const values = metrics.map(m => counts[m]);

  Plotly.newPlot("metricChart", [{
    x: metrics,
    y: values,
    type: "bar"
  }], {
    title: `Violation Count per Metric Type – ${fileLabel}`,
    xaxis: {
      tickangle: -30,
      tickfont: { size: 11 },
      automargin: true
    },
    yaxis: { title: "Violations" },
    margin: { t: 60, l: 60, r: 20, b: 130 }
  }, { responsive: true });
}

/* =========================
   Violation Details Table:
   - grouped by DA
   - subtotal per DA (violations only)
   - grand total row
   - collapse/expand
   - export to Excel
========================= */
function buildViolationTable(data) {
  const tbody = document.getElementById("detailsBody");
  const tfoot = document.getElementById("grandTotalFoot");
  tbody.innerHTML = "";
  tfoot.innerHTML = "";

  // Group rows by Delivery Associate
  const grouped = {};
  data.forEach(row => {
    const da = row["Delivery Associate"] || "(Unknown)";
    (grouped[da] ||= []).push(row);
  });

  // Sort Delivery Associates by total violations (DESC)
  const sortedDAs = Object.keys(grouped).sort((a, b) => {
    const av = grouped[a].filter(r => isViolation((r["Review Details"] ?? "None"))).length;
    const bv = grouped[b].filter(r => isViolation((r["Review Details"] ?? "None"))).length;
    return bv - av;
  });

  let grandTotal = 0;

  sortedDAs.forEach((da, idx) => {
    const groupId = `grp_${idx}`;
    const rows = grouped[da];

    const subtotal = rows.reduce((acc, r) => {
      const review = r["Review Details"] ?? "None";
      return acc + (isViolation(review) ? 1 : 0);
    }, 0);

    grandTotal += subtotal;

    // Header row (toggle)
    const headerTr = document.createElement("tr");
    headerTr.className = "group-header";
    headerTr.innerHTML = `
      <td class="toggle" data-group-id="${groupId}">▼</td>
      <td colspan="5">${da} — Violations: ${subtotal}</td>
    `;
    tbody.appendChild(headerTr);

    // Detail rows (show ALL rows; label yes/no)
    rows.forEach(r => {
      const review = r["Review Details"] ?? "None";
      const tr = document.createElement("tr");
      tr.className = `group-row ${groupId}`;
      tr.innerHTML = `
        <td></td>
        <td>${r["Date"] ?? ""}</td>
        <td>${da}</td>
        <td>${r["Metric Type"] ?? ""}</td>
        <td>${r["Metric Subtype"] ?? ""}</td>
        <td>${reviewLabel(review)}</td>
      `;
      tbody.appendChild(tr);
    });

    // Subtotal row
    const subtotalTr = document.createElement("tr");
    subtotalTr.className = `subtotal group-row ${groupId}`;
    subtotalTr.innerHTML = `
      <td></td>
      <td colspan="4">Subtotal – ${da} (counts Yes - Violation only)</td>
      <td>${subtotal}</td>
    `;
    tbody.appendChild(subtotalTr);
  });

  // Grand total footer
  const gt = document.createElement("tr");
  gt.innerHTML = `
    <td colspan="5">GRAND TOTAL (Yes - Violation only)</td>
    <td>${grandTotal}</td>
  `;
  tfoot.appendChild(gt);

  wireUpToggles();
  wireUpExpandCollapseAll();
  wireUpExcelExport();
}

function wireUpToggles() {
  const tbody = document.getElementById("detailsBody");

  // Click toggle (▼ / ▶) to collapse/expand a group
  tbody.addEventListener("click", (e) => {
    const toggleCell = e.target.closest(".toggle");
    if (!toggleCell) return;

    const groupId = toggleCell.dataset.groupId;
    const rows = tbody.querySelectorAll(`.group-row.${groupId}`);

    const allHidden = Array.from(rows).every(r => r.classList.contains("hidden-row"));
    rows.forEach(r => r.classList.toggle("hidden-row", !allHidden));
    toggleCell.textContent = allHidden ? "▼" : "▶";
  });
}

function setAllGroups(expand) {
  const tbody = document.getElementById("detailsBody");
  const toggles = tbody.querySelectorAll(".group-header .toggle");

  toggles.forEach(t => {
    const groupId = t.dataset.groupId;
    const rows = tbody.querySelectorAll(`.group-row.${groupId}`);
    rows.forEach(r => r.classList.toggle("hidden-row", !expand));
    t.textContent = expand ? "▼" : "▶";
  });
}

function wireUpExpandCollapseAll() {
  document.getElementById("expandAllBtn").onclick = () => setAllGroups(true);
  document.getElementById("collapseAllBtn").onclick = () => setAllGroups(false);
}

function wireUpExcelExport() {
  document.getElementById("downloadExcelBtn").onclick = () => {
    // Tip: If you want ALL rows in export, click Expand All first.
    const table = document.getElementById("violationTable");
    const wb = XLSX.utils.table_to_book(table, { sheet: "Violations" });
    XLSX.writeFile(wb, "Monthly_Safety_Violations.xlsx");
  };
}
