const DATA_FILE = "data/safety-2025-03.json";

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
    console.error("Error:", error);
  });

function buildDashboard(data) {
  document.getElementById("totalEvents").textContent = data.length;

  let violations = 0;
  let nonViolations = 0;

  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  data.forEach(item => {
    // Violation logic
    if (
      item["Review Details"] === "Dispute Denied" ||
      item["Review Details"] === "None"
    ) {
      violations++;
    } else {
      nonViolations++;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item["Date"]}</td>
      <td>${item["Delivery Associate"]}</td>
      <td>${item["Metric Type"]}</td>
      <td>${item["Metric Subtype"]}</td>
      <td>${item["Review Details"]}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("violations").textContent = violations;
  document.getElementById("nonViolations").textContent = nonViolations;
}
