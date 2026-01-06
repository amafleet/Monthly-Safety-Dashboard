// ===== Violation Details Table with Subtotals =====
const tbody = document.getElementById("detailsBody");
tbody.innerHTML = "";

// Group records by Delivery Associate
const groupedByDA = {};

data.forEach(row => {
  const da = row["Delivery Associate"] || "(Unknown)";
  if (!groupedByDA[da]) groupedByDA[da] = [];
  groupedByDA[da].push(row);
});

// Sort Delivery Associates by total violations (DESC)
const sortedDAs = Object.keys(groupedByDA).sort((a, b) => {
  const aCount = groupedByDA[a].filter(r => isViolation(r["Review Details"])).length;
  const bCount = groupedByDA[b].filter(r => isViolation(r["Review Details"])).length;
  return bCount - aCount;
});

// Build table
sortedDAs.forEach(da => {
  let subtotal = 0;

  groupedByDA[da].forEach(row => {
    const review = row["Review Details"] ?? "None";
    const violation = isViolation(review);

    if (violation) subtotal++;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row["Date"] ?? ""}</td>
      <td>${da}</td>
      <td>${row["Metric Type"] ?? ""}</td>
      <td>${row["Metric Subtype"] ?? ""}</td>
      <td>${reviewLabel(review)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Subtotal row (violations only)
  const subtotalRow = document.createElement("tr");
  subtotalRow.style.fontWeight = "bold";
  subtotalRow.style.background = "#eef2f7";
  subtotalRow.innerHTML = `
    <td colspan="4">Subtotal – ${da}</td>
    <td>${subtotal}</td>
  `;
  tbody.appendChild(subtotalRow);
});
