// static/js/main.js

document.addEventListener("DOMContentLoaded", () => {
  const form                 = document.getElementById("calc-form");
  const initInput            = document.getElementById("initial-investment");
  const allocInput           = document.getElementById("allocation-a");
  const allocBadge           = document.getElementById("alloc-value");
  const horizonInput         = document.getElementById("horizon");
  const returnsContainer     = document.getElementById("returns-inputs");
  const withdrawalsContainer = document.getElementById("withdrawals-container");
  const addWithdrawBtn       = document.getElementById("add-withdrawal-btn");
  const calcBtn              = document.getElementById("calculate-btn");
  const spinner              = document.getElementById("loading-spinner");
  const kpiCards             = document.getElementById("kpi-cards");
  const chartCard            = document.getElementById("chart-card");
  const resultsAccordion     = document.getElementById("results-accordion");

  let returnInputsA = [], returnInputsB = [], withdrawalRows = [];
  let balanceChart  = null;

  // Default 10-year returns
  const DEFAULT_A = [15.1, 2.1, 16.0, 32.4, 13.7, 1.4, 12.0, 21.8, -4.4, 31.5];
  const DEFAULT_B = [ 5.5, 5.4,  5.3,  5.1, 5.0, 4.8,  5.0,  5.1,  4.9, 5.3];

  // --- 1) VALIDATION ---
  function validate() {
    // Core inputs
    const coreOK = initInput.checkValidity()
                 && allocInput.checkValidity()
                 && horizonInput.checkValidity();

    // Yearly returns inputs
    const returnsOK = returnInputsA.every(i=>i.checkValidity())
                    && returnInputsB.every(i=>i.checkValidity());

    // Withdrawals inputs: check each row’s year, type, and value
    const withdrawalsOK = withdrawalRows.every(row => {
      const yrInput = row.querySelector(".withdrawal-year");
      const typeInput = row.querySelector(".withdrawal-type");
      const valInput  = row.querySelector(".withdrawal-value");
      if (!yrInput.checkValidity() || !typeInput.checkValidity()) return false;
      // If type=usd, value must be ≥0; if pct, 0 ≤ value ≤ 100
      const val = parseFloat(valInput.value);
      if (typeInput.value === "usd") {
        return valInput.checkValidity() && val >= 0;
      } else {
        return valInput.checkValidity() && val >= 0 && val <= 100;
      }
    });

    calcBtn.disabled = !(coreOK && returnsOK && withdrawalsOK);
    return !calcBtn.disabled;
  }

  // --- 2) RENDER RETURNS INPUTS ---
  function renderReturnsInputs() {
    const years = +horizonInput.value;
    returnsContainer.innerHTML = "";
    returnInputsA = [];
    returnInputsB = [];

    for (let i = 1; i <= years; i++) {
      // Strategy A input
      const colA = document.createElement("div");
      colA.className = "col-md-6";
      colA.innerHTML = `
        <div class="form-floating">
          <input id="retA${i}" class="form-control return-input" type="number"
                 placeholder="A%" min="-100" max="100" step="0.01" required>
          <label for="retA${i}">Year ${i} Return A (%)</label>
          <div class="invalid-feedback">-100 to 100</div>
        </div>`;
      // Strategy B input
      const colB = document.createElement("div");
      colB.className = "col-md-6";
      colB.innerHTML = `
        <div class="form-floating">
          <input id="retB${i}" class="form-control return-input" type="number"
                 placeholder="B%" min="-100" max="100" step="0.01" required>
          <label for="retB${i}">Year ${i} Return B (%)</label>
          <div class="invalid-feedback">-100 to 100</div>
        </div>`;
      returnsContainer.append(colA, colB);

      const a = document.getElementById(`retA${i}`);
      const b = document.getElementById(`retB${i}`);
      returnInputsA.push(a);
      returnInputsB.push(b);

      [a, b].forEach(inp => {
        inp.addEventListener("input", validate);
        inp.addEventListener("blur", validate);
      });
    }
  }

  // --- 3) ADD A WITHDRAWAL ROW ---
  function addWithdrawalRow() {
    const years = +horizonInput.value;
    const row = document.createElement("div");
    row.className = "row g-3 mb-2 withdrawal-row align-items-end";

    // Row now has: Year select, Strategy select, Type select, Value input, and Remove button
    row.innerHTML = `
      <div class="col-md-2">
        <label class="form-label">Year</label>
        <select class="form-select withdrawal-year" required>
          ${Array.from({length:years}, (_,i) => `<option>${i+1}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label">Strategy</label>
        <select class="form-select withdrawal-strategy" required>
          <option>A</option><option>B</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label">Type</label>
        <select class="form-select withdrawal-type" required>
          <option value="usd">USD</option>
          <option value="pct">% of balance</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Value</label>
        <input class="form-control withdrawal-value" type="number"
               min="0" step="0.01" required>
        <div class="form-text">
          If USD: withdrawal in dollars.  
          If %: percent of that strategy’s balance (0–100).
        </div>
      </div>
      <div class="col-md-2 text-end">
        <button type="button" class="btn btn-danger btn-sm remove-withdrawal">×</button>
      </div>`;

    // Bind the remove button
    row.querySelector(".remove-withdrawal")
       .addEventListener("click", () => {
         withdrawalsContainer.removeChild(row);
         withdrawalRows = withdrawalRows.filter(r => r !== row);
         validate();
       });

    // When any of these inputs change, re-validate
    row.querySelector(".withdrawal-year")
       .addEventListener("change", validate);
    row.querySelector(".withdrawal-type")
       .addEventListener("change", validate);
    row.querySelector(".withdrawal-value")
       .addEventListener("input", validate);

    withdrawalsContainer.append(row);
    withdrawalRows.push(row);
    validate();
  }

  // --- 4) WIRE UP CORE CONTROLS ---
  // Allocation slider badge
  allocBadge.textContent = `${allocInput.value}%`;
  allocInput.addEventListener("input", () => {
    allocBadge.textContent = `${allocInput.value}%`;
    validate();
  });

  // Validate on blur/input for initial & horizon
  [initInput, horizonInput].forEach(i => {
    i.addEventListener("input", validate);
    i.addEventListener("blur", validate);
  });

  // When horizon changes, re-render returns and clear withdrawals
  horizonInput.addEventListener("input", () => {
    if (!horizonInput.checkValidity()) return;
    renderReturnsInputs();
    returnInputsA.forEach((inp, idx) => inp.value = DEFAULT_A[idx]);
    returnInputsB.forEach((inp, idx) => inp.value = DEFAULT_B[idx]);
    withdrawalsContainer.innerHTML = "";
    withdrawalRows = [];
    validate();
  });

  // “Add Withdrawal” button
  addWithdrawBtn.addEventListener("click", addWithdrawalRow);

  // --- 5) FORM SUBMIT HANDLER ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    spinner.classList.remove("d-none");
    calcBtn.disabled = true;

    // Build the payload's withdrawals list
    const withdrawals = withdrawalRows.map(row => {
      const year     = parseInt(row.querySelector(".withdrawal-year").value, 10);
      const strategy = row.querySelector(".withdrawal-strategy").value;
      const type     = row.querySelector(".withdrawal-type").value;    // "usd" or "pct"
      const val      = parseFloat(row.querySelector(".withdrawal-value").value);

      return { year, strategy, type, value: val };
    });

    const payload = {
      initial_investment: parseFloat(initInput.value),
      allocation_a:       parseFloat(allocInput.value),
      returns_a:          returnInputsA.map(i => parseFloat(i.value)),
      returns_b:          returnInputsB.map(i => parseFloat(i.value)),
      withdrawals
    };

    const res  = await fetch("/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    spinner.classList.add("d-none");
    calcBtn.disabled = false;

    if (!res.ok) {
      alert(data.error);
      return;
    }

    // --- 6) RENDER THE DASHBOARD RESULTS ---

    // 6a) KPI Cards
    kpiCards.innerHTML = "";
    const scenarios = [
      ["100% A",       data.full_a],
      ["100% B",       data.full_b],
      ["No Rebalance", data.no_rebalance],
      ["Annual Rebalance", data.annual_rebalance]
    ];
    scenarios.forEach(([title, arr]) => {
      const last = arr[arr.length - 1].toFixed(2);
      kpiCards.innerHTML += `
        <div class="col-sm-6 col-lg-3">
          <div class="card text-center shadow-sm">
            <div class="card-body">
              <h6 class="card-title">${title}</h6>
              <h4 class="display-6">$${last}</h4>
            </div>
          </div>
        </div>`;
    });
    kpiCards.style.display = "flex";
    kpiCards.classList.add("flex-wrap");

    // 6b) Chart.js Line Chart
    const ctx = document.getElementById("balance-chart").getContext("2d");
    if (balanceChart) balanceChart.destroy();
    balanceChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: Array.from({ length: returnInputsA.length }, (_, i) => `Yr ${i+1}`),
        datasets: scenarios.map(([t, arr]) => ({
          label: t,
          data: arr,
          tension: 0.3
        }))
      },
      options: { responsive: true }
    });
    chartCard.style.display = "block";

    // 6c) Detailed Results Accordion
    resultsAccordion.innerHTML = "";
    scenarios.forEach(([title, arr], idx) => {
      const paneId = `detail${idx}`;
      let tableHead, tableBody;

      if (title === "Annual Rebalance") {
        // Use the detailed breakdown from data.annual_rebalance_details
        tableHead = `
          <tr class="table-primary">
            <th>Year</th>
            <th>A Before</th><th>A %</th>
            <th>B Before</th><th>B %</th>
            <th>Total After</th>
          </tr>`;
        tableBody = data.annual_rebalance_details.map(d => `
          <tr>
            <th scope="row">${d.year}</th>
            <td>${d.pre_a.toFixed(2)}</td>
            <td>${d.pre_a_pct.toFixed(2)}%</td>
            <td>${d.pre_b.toFixed(2)}</td>
            <td>${d.pre_b_pct.toFixed(2)}%</td>
            <td>${d.post_total.toFixed(2)}</td>
          </tr>`).join("");
      } else {
        // Simple two-column table
        tableHead = `
          <tr class="table-primary">
            <th>Year</th>
            <th>Balance</th>
          </tr>`;
        tableBody = arr.map((v, i) => `
          <tr>
            <th scope="row">${i+1}</th>
            <td>${v.toFixed(2)}</td>
          </tr>`).join("");
      }

      resultsAccordion.innerHTML += `
        <div class="accordion-item">
          <h2 class="accordion-header">
            <button class="accordion-button ${idx ? 'collapsed' : ''}"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#${paneId}">
              ${title} Details
            </button>
          </h2>
          <div id="${paneId}" class="accordion-collapse collapse ${idx ? '' : 'show'}">
            <div class="accordion-body p-0">
              <table class="table table-striped mb-0">
                <thead>${tableHead}</thead>
                <tbody>${tableBody}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    });

    resultsAccordion.style.display = "block";
    resultsAccordion.scrollIntoView({ behavior: "smooth" });
  });

  // --- 7) AUTO-RUN ON LOAD ---
  renderReturnsInputs();
  returnInputsA.forEach((i, idx) => i.value = DEFAULT_A[idx]);
  returnInputsB.forEach((i, idx) => i.value = DEFAULT_B[idx]);
  allocBadge.textContent = `${allocInput.value}%`;
  validate();
  form.requestSubmit(); // triggers our submit handler
});
