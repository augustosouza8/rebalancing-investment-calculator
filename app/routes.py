"""
app/routes.py
Defines HTTP routes, now handling withdrawals.
"""

from flask import Blueprint, jsonify, render_template, request
from werkzeug.exceptions import BadRequest

from app.simulation import (
    simulate_full_strategy_a,
    simulate_full_strategy_b,
    simulate_no_rebalance,
    simulate_annual_rebalance_with_details,
)

bp = Blueprint("sim", __name__)


@bp.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@bp.route("/healthz", methods=["GET"])
def health_check():
    return jsonify(status="ok")


@bp.route("/simulate", methods=["POST"])
def simulate():
    try:
        data = request.get_json(force=True)
        init = float(data["initial_investment"])
        alloc = float(data["allocation_a"])
        ra = [float(x) for x in data["returns_a"]]
        rb = [float(x) for x in data["returns_b"]]
        withdrawals = data.get("withdrawals", [])
    except (KeyError, TypeError, ValueError) as e:
        raise BadRequest(f"Invalid payload: {e}")

    try:
        full_a = simulate_full_strategy_a(init, ra, withdrawals)
        full_b = simulate_full_strategy_b(init, rb, withdrawals)
        no_rb = simulate_no_rebalance(init, alloc, ra, rb, withdrawals)
        annual_totals, annual_details = simulate_annual_rebalance_with_details(
            init, alloc, ra, rb, withdrawals
        )
    except ValueError as e:
        return jsonify(error=str(e)), 400

    return jsonify(
        full_a=full_a,
        full_b=full_b,
        no_rebalance=no_rb,
        annual_rebalance=annual_totals,
        annual_rebalance_details=annual_details,
    )
