// static/js/main.js

document.addEventListener("DOMContentLoaded", () => {
  // Grab elements (corrected “s” in withdrawalsContainer)
  const form                = document.getElementById("calc-form");
  const initInput           = document.getElementById("initial-investment");
  const allocInput          = document.getElementById("allocation-a");
  const allocBadge          = document.getElementById("alloc-value");
  const horizonInput        = document.getElementById("horizon");
  const returnsContainer    = document.getElementById("returns-inputs");
  const withdrawalsContainer= document.getElementById("withdrawals-container");
  const addWithdrawBtn      = document.getElementById("add-withdrawal-btn");
  const calcBtn             = document.getElementById("calculate-btn");
  const spinner             = document.getElementById("loading-spinner");
  const kpiCards            = document.getElementById("kpi-cards");
  const chartCard           = document.getElementById("chart-card");
  const resultsAccordion    = document.getElementById("results-accordion");

  let returnInputsA  = [], returnInputsB = [];
  let withdrawalRows = [];
  let balanceChart   = null;

  // Defaults
  const DEFAULT_RETURNS_A = [15.1,2.1,16.0,32.4,13.7,1.4,12.0,21.8,-4.4,31.5];
  const DEFAULT_RETURNS_B = [ 5.5,5.4, 5.3, 5.1, 5.0,4.8, 5.0, 5.1, 4.9, 5.3];

  // 1) Validation
  function validate() {
    const core      = initInput.checkValidity() && allocInput.checkValidity() && horizonInput.checkValidity();
    const returnsOK = returnInputsA.every(i=>i.checkValidity()) && returnInputsB.every(i=>i.checkValidity());
    const wOK       = withdrawalRows.every(row => {
      const y = row.querySelector(".withdrawal-year");
      const a = row.querySelector(".withdrawal-amount");
      return y.checkValidity() && a.checkValidity();
    });
    calcBtn.disabled = !(core && returnsOK && wOK);
    return !calcBtn.disabled;
  }

  // 2) Render returns inputs
  function renderReturnsInputs() {
    const years = +horizonInput.value;
    returnsContainer.innerHTML = "";
    returnInputsA = [];
    returnInputsB = [];
    for (let i=1; i<=years; i++) {
      const colA = document.createElement("div");
      colA.className = "col-md-6";
      colA.innerHTML = `
        <div class="form-floating">
          <input id="retA${i}" class="form-control return-input" type="number"
                 placeholder="A%" min="-100" max="100" step="0.01" required>
          <label for="retA${i}">Year ${i} Return A (%)</label>
          <div class="invalid-feedback">-100 to 100</div>
        </div>`;
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
      [a,b].forEach(inp=>{ inp.addEventListener("input", validate); inp.addEventListener("blur", validate); });
    }
  }

  // 3) Add withdrawal row
  function addWithdrawalRow() {
    const years = +horizonInput.value;
    const row = document.createElement("div");
    row.className = "row g-3 mb-2 withdrawal-row align-items-end";
    row.innerHTML = `
      <div class="col-md-3">
        <label class="form-label">Year</label>
        <select class="form-select withdrawal-year" required>
          ${Array.from({length:years},(_,i)=>`<option>${i+1}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label">Strategy</label>
        <select class="form-select withdrawal-strategy" required>
          <option>A</option><option>B</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Amount (USD)</label>
        <input class="form-control withdrawal-amount" type="number"
               min="0" step="0.01" required>
      </div>
      <div class="col-md-2 text-end">
        <button type="button" class="btn btn-danger btn-sm remove-withdrawal">×</button>
      </div>`;
    // remove handler
    row.querySelector(".remove-withdrawal")
       .addEventListener("click", () => {
         withdrawalsContainer.removeChild(row);
         withdrawalRows = withdrawalRows.filter(r=>r!==row);
         validate();
       });
    withdrawalsContainer.append(row);
    withdrawalRows.push(row);
    // validate on change
    row.querySelector(".withdrawal-year").addEventListener("change", validate);
    row.querySelector(".withdrawal-amount").addEventListener("input", validate);
    validate();
  }

  // 4) Wire up controls
  allocBadge.textContent = `${allocInput.value}%`;
  allocInput.addEventListener("input", () => { allocBadge.textContent = `${allocInput.value}%`; validate(); });
  [initInput, horizonInput].forEach(i=>{ i.addEventListener("input", validate); i.addEventListener("blur",validate); });
  horizonInput.addEventListener("input", () => {
    if (!horizonInput.checkValidity()) return;
    renderReturnsInputs();
    returnInputsA.forEach((i,idx)=>i.value=DEFAULT_RETURNS_A[idx]);
    returnInputsB.forEach((i,idx)=>i.value=DEFAULT_RETURNS_B[idx]);
    withdrawalsContainer.innerHTML="";
    withdrawalRows=[];
    validate();
  });
  addWithdrawBtn.addEventListener("click", addWithdrawalRow);

  // 5) Submission
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!validate()) return;
    spinner.classList.remove("d-none");
    calcBtn.disabled = true;

    const withdrawals = withdrawalRows.map(r=>({
      year:     +r.querySelector(".withdrawal-year").value,
      strategy: r.querySelector(".withdrawal-strategy").value,
      amount:   +r.querySelector(".withdrawal-amount").value
    }));

    const payload = {
      initial_investment: +initInput.value,
      allocation_a:       +allocInput.value,
      returns_a:          returnInputsA.map(i=>+i.value),
      returns_b:          returnInputsB.map(i=>+i.value),
      withdrawals
    };

    const res  = await fetch("/simulate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    spinner.classList.add("d-none");
    calcBtn.disabled = false;

    if (!res.ok) {
      alert(data.error);
      return;
    }
    renderDashboard(returnInputsA.length, data);
  });

  // 6) renderDashboard (reuse your existing, including details logic)

  // 7) INITIAL AUTO‐RUN
  renderReturnsInputs();
  returnInputsA.forEach((i,idx)=>i.value=DEFAULT_RETURNS_A[idx]);
  returnInputsB.forEach((i,idx)=>i.value=DEFAULT_RETURNS_B[idx]);
  allocBadge.textContent = `${allocInput.value}%`;
  validate();
  form.requestSubmit();  // reliably trigger the submit handler
});
