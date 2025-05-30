"""
app/simulation.py

Implements discrete withdrawal events in all simulations.
"""

from typing import List, Dict, Tuple


def _validate_inputs(
    initial: float,
    allocation_a: float,
    returns_a: List[float],
    returns_b: List[float],
    withdrawals: List[Dict],
) -> None:
    # existing checks...
    # plus validate withdrawal structure
    for w in withdrawals:
        if not isinstance(w.get("year"), int) or w["year"] < 1:
            raise ValueError(f"Invalid withdrawal year: {w}")
        if w.get("strategy") not in ("A", "B"):
            raise ValueError(f"Invalid withdrawal strategy: {w}")
        if w.get("amount", -1) < 0:
            raise ValueError(f"Invalid withdrawal amount: {w}")


def _apply_withdrawals(
    balance: float,
    year: int,
    strategy: str,
    withdrawals: List[Dict],
) -> float:
    """
    Subtract all withdrawals matching this year & strategy.
    Throws if you try to withdraw more than the balance.
    """
    total = sum(
        w["amount"]
        for w in withdrawals
        if w["year"] == year and w["strategy"] == strategy
    )
    new_balance = balance - total
    if new_balance < 0:
        raise ValueError(
            f"Year {year} withdrawal of {total:.2f} from {strategy} exceeds balance."
        )
    return new_balance


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
        # **Withdrawal before growth**
        balance = _apply_withdrawals(balance, year, "A", withdrawals)
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

    balance_a = initial * (allocation_a / 100)
    balance_b = initial * ((100 - allocation_a) / 100)
    totals = []

    for year, (ra, rb) in enumerate(zip(returns_a, returns_b), start=1):
        balance_a = _apply_withdrawals(balance_a, year, "A", withdrawals)
        balance_b = _apply_withdrawals(balance_b, year, "B", withdrawals)
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

    balance_a = initial * (allocation_a / 100)
    balance_b = initial * ((100 - allocation_a) / 100)

    post_totals = []
    details = []

    for year, (ra, rb) in enumerate(zip(returns_a, returns_b), start=1):
        balance_a = _apply_withdrawals(balance_a, year, "A", withdrawals)
        balance_b = _apply_withdrawals(balance_b, year, "B", withdrawals)

        balance_a *= (1 + ra / 100)
        balance_b *= (1 + rb / 100)
        total_pre = balance_a + balance_b

        pre_a = round(balance_a, 2)
        pre_b = round(balance_b, 2)
        pct_a = round((balance_a / total_pre) * 100, 2) if total_pre else 0.0
        pct_b = round((balance_b / total_pre) * 100, 2) if total_pre else 0.0
        post_total = round(total_pre, 2)

        details.append({
            "year": year,
            "pre_a": pre_a,
            "pre_a_pct": pct_a,
            "pre_b": pre_b,
            "pre_b_pct": pct_b,
            "post_total": post_total,
        })
        post_totals.append(post_total)

        # rebalance for next year
        balance_a = total_pre * (allocation_a / 100)
        balance_b = total_pre * ((100 - allocation_a) / 100)

    return post_totals, details
