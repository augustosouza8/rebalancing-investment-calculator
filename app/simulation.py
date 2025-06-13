"""
app/simulation.py

Handles discrete withdrawals—both USD‐based and %‐based—applied before growth,
then runs all four scenarios (Full A, Full B, No Rebalance, Annual Rebalance with details).
"""

from typing import List, Dict, Tuple


def _validate_inputs(
    initial: float,
    allocation_a: float,
    returns_a: List[float],
    returns_b: List[float],
    withdrawals: List[Dict],
) -> None:
    # Basic checks for initial, allocation, returns
    if initial < 0:
        raise ValueError(f"Initial investment must be ≥ 0; got {initial}")
    if not 0 <= allocation_a <= 100:
        raise ValueError(f"Allocation to A must be between 0 and 100; got {allocation_a}")
    if len(returns_a) != len(returns_b):
        raise ValueError("Length of returns_a and returns_b must match")
    if len(returns_a) < 1:
        raise ValueError("Horizon must be at least 1 year")
    for idx, r in enumerate(returns_a, start=1):
        if not -100 <= r <= 100:
            raise ValueError(f"Strategy A return for year {idx} out of range: {r}")
    for idx, r in enumerate(returns_b, start=1):
        if not -100 <= r <= 100:
            raise ValueError(f"Strategy B return for year {idx} out of range: {r}")

    # Withdrawals: must have year, strategy, type, and value
    for w in withdrawals:
        if not isinstance(w.get("year"), int) or w["year"] < 1:
            raise ValueError(f"Invalid withdrawal year: {w}")
        if w.get("strategy") not in ("A", "B"):
            raise ValueError(f"Invalid withdrawal strategy: {w}")
        if w.get("type") not in ("usd", "pct"):
            raise ValueError(f"Invalid withdrawal type: {w}")
        # If USD, value ≥ 0; if pct, 0 ≤ value ≤ 100
        val = w.get("value", None)
        if val is None or val < 0:
            raise ValueError(f"Withdrawal value must be ≥ 0: {w}")
        if w["type"] == "pct" and val > 100:
            raise ValueError(f"Percentage withdrawal must be ≤ 100: {w}")


def _apply_withdrawals(
    balance: float,
    year: int,
    strategy: str,
    withdrawals: List[Dict],
) -> float:
    """
    Subtract every withdrawal matching (year, strategy).
    If type="usd", simply do balance -= value.
    If type="pct", do balance -= (value% of current balance).
    Apply them **in the order they appear** in the list.
    Raises if balance goes negative.
    """
    for w in withdrawals:
        if w["year"] == year and w["strategy"] == strategy:
            if w["type"] == "usd":
                amt = w["value"]
            else:  # "pct"
                amt = (w["value"] / 100.0) * balance

            balance -= amt
            if balance < 0:
                raise ValueError(
                    f"Year {year}: withdrawing {amt:.2f} from {strategy} pushes balance negative"
                )
    return balance


def simulate_full_strategy_a(
    initial: float,
    returns_a: List[float],
    withdrawals: List[Dict] = [],
) -> List[float]:
    if initial < 0:
        raise ValueError("Initial investment must be ≥ 0")
    balances = []
    balance = initial

    for year, r in enumerate(returns_a, start=1):
        # 1) Apply any withdrawals for Strategy A in this year
        balance = _apply_withdrawals(balance, year, "A", withdrawals)
        # 2) Grow by return A
        balance *= (1 + r / 100)
        balances.append(round(balance, 2))

    return balances


def simulate_full_strategy_b(
    initial: float,
    returns_b: List[float],
    withdrawals: List[Dict] = [],
) -> List[float]:
    if initial < 0:
        raise ValueError("Initial investment must be ≥ 0")
    balances = []
    balance = initial

    for year, r in enumerate(returns_b, start=1):
        balance = _apply_withdrawals(balance, year, "B", withdrawals)
        balance *= (1 + r / 100)
        balances.append(round(balance, 2))

    return balances


def simulate_no_rebalance(
    initial: float,
    allocation_a: float,
    returns_a: List[float],
    returns_b: List[float],
    withdrawals: List[Dict] = [],
) -> List[float]:
    _validate_inputs(initial, allocation_a, returns_a, returns_b, withdrawals)

    balance_a = initial * (allocation_a / 100.0)
    balance_b = initial * ((100.0 - allocation_a) / 100.0)
    totals = []

    for year, (ra, rb) in enumerate(zip(returns_a, returns_b), start=1):
        # Apply withdrawals before growth
        balance_a = _apply_withdrawals(balance_a, year, "A", withdrawals)
        balance_b = _apply_withdrawals(balance_b, year, "B", withdrawals)

        # Grow
        balance_a *= (1 + ra / 100)
        balance_b *= (1 + rb / 100)

        totals.append(round(balance_a + balance_b, 2))

    return totals


def simulate_annual_rebalance_with_details(
    initial: float,
    allocation_a: float,
    returns_a: List[float],
    returns_b: List[float],
    withdrawals: List[Dict] = [],
) -> Tuple[List[float], List[Dict]]:
    _validate_inputs(initial, allocation_a, returns_a, returns_b, withdrawals)

    balance_a = initial * (allocation_a / 100.0)
    balance_b = initial * ((100.0 - allocation_a) / 100.0)

    post_totals = []
    details = []

    for year, (ra, rb) in enumerate(zip(returns_a, returns_b), start=1):
        # 1) Apply withdrawals
        balance_a = _apply_withdrawals(balance_a, year, "A", withdrawals)
        balance_b = _apply_withdrawals(balance_b, year, "B", withdrawals)

        # 2) Grow
        balance_a *= (1 + ra / 100)
        balance_b *= (1 + rb / 100)
        total_pre = balance_a + balance_b

        # 3) Capture details
        pre_a = round(balance_a, 2)
        pre_b = round(balance_b, 2)
        pct_a = round((balance_a / total_pre) * 100, 2) if total_pre else 0.0
        pct_b = round((balance_b / total_pre) * 100, 2) if total_pre else 0.0
        post_total = round(total_pre, 2)

        details.append({
            "year":       year,
            "pre_a":      pre_a,
            "pre_a_pct":  pct_a,
            "pre_b":      pre_b,
            "pre_b_pct":  pct_b,
            "post_total": post_total,
        })
        post_totals.append(post_total)

        # 4) Rebalance for next year
        balance_a = total_pre * (allocation_a / 100.0)
        balance_b = total_pre * ((100.0 - allocation_a) / 100.0)

    return post_totals, details
