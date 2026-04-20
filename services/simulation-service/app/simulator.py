"""
Digital twin crowd flow simulation engine.
Validates: Requirements 27.1, 27.2, 27.3
"""
import math
from datetime import datetime, timezone
from app.models import GateForecast, StaffDeploymentPlan

# Arrival distribution: most attendees arrive 60-15 min before event start
ARRIVAL_WINDOWS = [
    {'offset_minutes': -90, 'fraction': 0.05},
    {'offset_minutes': -60, 'fraction': 0.20},
    {'offset_minutes': -45, 'fraction': 0.35},
    {'offset_minutes': -30, 'fraction': 0.25},
    {'offset_minutes': -15, 'fraction': 0.10},
    {'offset_minutes': -5,  'fraction': 0.05},
]

GATE_THROUGHPUT_PER_MINUTE = 25  # people per gate per minute
STAFF_PER_100_ATTENDEES = 2      # baseline staffing ratio


def simulate_gate_forecasts(
    expected_attendance: int,
    seat_zone_distribution: dict[str, float],
    gates: list[dict] | None = None,
) -> list[GateForecast]:
    """
    Compute per-gate expected arrival rates and peak queue depths.
    gates: list of {gate_id, zone_id, capacity}
    If gates not provided, creates one gate per zone.
    """
    if not gates:
        gates = [
            {'gate_id': f'gate-{zone_id}', 'zone_id': zone_id, 'capacity': 500}
            for zone_id in seat_zone_distribution
        ]

    forecasts = []
    for gate in gates:
        zone_id = gate['zone_id']
        zone_fraction = seat_zone_distribution.get(zone_id, 1.0 / len(gates))
        zone_attendees = int(expected_attendance * zone_fraction)

        # Find peak arrival window
        peak_window = max(ARRIVAL_WINDOWS, key=lambda w: w['fraction'])
        peak_arrivals = int(zone_attendees * peak_window['fraction'])
        peak_queue = max(0, peak_arrivals - GATE_THROUGHPUT_PER_MINUTE * 5)

        forecasts.append(GateForecast(
            gate_id=gate['gate_id'],
            zone_id=zone_id,
            expected_arrivals=zone_attendees,
            peak_queue_depth=peak_queue,
            peak_time_offset_minutes=abs(peak_window['offset_minutes']),
        ))

    return forecasts


def generate_staff_deployment_plan(
    expected_attendance: int,
    seat_zone_distribution: dict[str, float],
    gate_forecasts: list[GateForecast],
) -> list[StaffDeploymentPlan]:
    """
    Generate recommended staff deployment plan based on simulation results.
    Validates: Requirements 27.3
    """
    plan = []

    for forecast in gate_forecasts:
        zone_attendees = forecast.expected_arrivals
        base_staff = max(2, math.ceil(zone_attendees / 100 * STAFF_PER_100_ATTENDEES))

        # Extra staff if peak queue is high
        extra = math.ceil(forecast.peak_queue_depth / 50)
        total_staff = base_staff + extra

        plan.append(StaffDeploymentPlan(
            zone_id=forecast.zone_id,
            recommended_staff_count=total_staff,
            role='STAFF',
            reason=f'Expected {zone_attendees} attendees, peak queue {forecast.peak_queue_depth}',
        ))

        # Add security staff for high-density zones
        if zone_attendees > 500:
            plan.append(StaffDeploymentPlan(
                zone_id=forecast.zone_id,
                recommended_staff_count=max(1, total_staff // 3),
                role='EMERGENCY',
                reason=f'High-density zone ({zone_attendees} attendees) — security coverage',
            ))

    return plan
