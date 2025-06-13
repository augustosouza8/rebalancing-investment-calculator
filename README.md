# RebalanceCalc – Dual‑Strategy Rebalancing Investment Calculator

  

> **RebalanceCalc** is a lightweight Flask application & REST API for modelling two‐asset portfolios under four scenarios: 100 % Strategy A, 100 % Strategy B, No Rebalance, and Annual Rebalance. It lets you feed in custom yearly returns, apply withdrawals in **USD** or **% of balance**, and instantly visualise results in an interactive dashboard powered by Bootstrap 5 and Chart.js.fileciteturn0file0

---

## ✨ Key Features

- **Dual‑strategy engine** – core maths lives in `app/simulation.py`, handling validation, discrete withdrawals and growth for every year.
- **Four comparators out‑of‑the‑box** – see how pure A, pure B, fixed allocation, or annual rebalancing perform side‑by‑side.
- **Withdrawals before growth** – model regular or one‑off withdrawals, either fixed dollars or % of the chosen strategy’s balance.
- **Modern single‑page experience** – one HTML template (`templates/index.html`) with progressive enhancement; default 10‑year demo auto‑runs on load.
- **Self‑documenting JSON API** – `POST /simulate` returns raw arrays so you can embed the engine elsewhere or script it from Python/R.
- **Zero hassle deploy** – no database, no login, just static assets + Flask… ship it anywhere.

---

## 🚀 Quick Start

```bash
# 1) Clone the repo
$ git clone https://github.com/<your‑user>/rebalancing-investment-calculator.git
$ cd rebalancing-investment-calculator

# 2) Create a virtualenv (recommended)
$ python -m venv .venv && source .venv/bin/activate

# 3) Install dependencies
$ pip install -r requirements.txt  # Flask, Werkzeug, etc.

# 4) Run the dev server
$ python simulation_app.py   # http://127.0.0.1:5000/
```

> **Heads‑up:** `requirements.txt` is currently empty – add your preferred versions of **Flask ≥2.3**, **Werkzeug**, **itsdangerous**, and **MarkupSafe** or simply: `pip install flask`.

---

## 🖥️ Using the Web UI

1. Enter an *initial investment*, *allocation to Strategy A* and *investment horizon*.
2. Fine‑tune yearly returns for **A** and **B** (defaults mimic S&P 500 vs. bonds).
3. Add any withdrawals (choose year, strategy, type, value).
4. Click **Run Simulation** – KPI cards, line chart and detailed tables will render instantly.

Dark‑mode toggle 🌙 included!

---

## 🔌 REST API

### `POST /simulate`

| Field                | Type        | Required | Notes                        |
| -------------------- | ----------- | -------- | ---------------------------- |
| `initial_investment` | float ≥0    | ✅        | In dollars                   |
| `allocation_a`       | float 0‑100 | ✅        | Starting % of Strategy A     |
| `returns_a`          | float[]     | ✅        | Length = horizon, −100 → 100 |
| `returns_b`          | float[]     | ✅        | Same length as `returns_a`   |
| `withdrawals`        | object[]    | ⬜        | See below                    |

**Withdrawal object**

```json
{ "year": 3, "strategy": "A", "type": "usd", "value": 5000 }
```

- `strategy` → "A" or "B"
- `type` → `"usd"` (fixed) or `"pct"` (percentage of current balance)
- Validated in `_apply_withdrawals()`; will error if balance turns negative.

**Response (abridged)**

```json
{
  "full_a": [115100.0, 117522.1, …],
  "full_b": [105500.0, 111197.5, …],
  "no_rebalance": [110300.0, …],
  "annual_rebalance": [110300.0, …],
  "annual_rebalance_details": [{"year":1, "pre_a":…, "pre_a_pct":…}]
}
```

---

## 🗂️ Project Layout

```
rebalancing-investment-calculator/
├── simulation_app.py        # Flask factory + dev entrypoint
├── app/
│   ├── routes.py            # /, /healthz, /simulate
│   └── simulation.py        # all finance logic
├── templates/index.html     # Bootstrap dashboard
├── static/js/main.js        # form validation & Chart.js
├── requirements.txt         # add deps here
└── LICENSE                  # MIT
```

---

## 🤝 Contributing

PRs are welcome! If you spot a bug or want a new feature (e.g. monthly intervals, CSV export), open an issue first so we can discuss scope.

```bash
# Lint & format (feel free to add a pre‑commit config)
$ pip install black flake8
$ black . && flake8
```

---

## 📜 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## 📅 Roadmap / Ideas

- Custom **rebalance frequency** (quarterly, monthly)
- Support **more than two** strategies (N‑asset simplex)
- Optional **CSV upload/export**
- **Dockerfile** for containerised deploy
- Basic test suite (pytest) + GitHub Actions CI

*Made with ❤️ & ☕ by *[*@augustosouza8*](https://github.com/augustosouza8)

