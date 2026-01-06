const DATA_FILE = "./data/safety-2025-12.json";

fetch(DATA_FILE)
  .then(response => {
    if (!response.ok) {
      throw new Error("Failed to load JSON");
    }
    return response.json();
  })
  .then(data => {
    console.log("Loaded records:", data.length);
    buildDashboard(data);
  })
  .catch(error => {
    console.error("Error loading JSON:", error);
  });

function buildDashboard(data) {
  document.getElementById("totalEvents").textContent = data.length;

  let violations = 0;
  let nonViolations = 0;

  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  data.forEach(item => {
    const isViolation =
      item["Review Details"] === "None" ||
      item["Review Details"] === "Dispute Denied" ||
      item["Review Details"] === "Dispute Closed";

    if (isViolation) violations++;
    else nonViolations++;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item["Date"]}</td>
      <td>${item["Delivery Associate"]}</td>
      <td>${item["Metric Type"]}</td>
      <td>${item["Metric Subtype"]}</td>
      <td>${isViolation ? "Yes - Violation" : "No - Violation (Approved)"}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("violations").textContent = violations;
  document.getElementById("nonViolations").textContent = nonViolations;
}
