"""
Tests for Predictive Pre-Event Simulation Service.
Validates: Requirements 27.1, 27.2, 27.3
"""
from app.simulator import simulate_gate_forecasts, generate_staff_deployment_plan


def test_gate_forecast_total_arrivals_match_attendance():
    distribution = {'zone-a': 0.6, 'zone-b': 0.4}
    forecasts = simulate_gate_forecasts(1000, distribution)
    total = sum(f.expected_arrivals for f in forecasts)
    assert total == 1000


def test_gate_forecast_creates_one_gate_per_zone():
    distribution = {'zone-a': 0.5, 'zone-b': 0.3, 'zone-c': 0.2}
    forecasts = simulate_gate_forecasts(500, distribution)
    assert len(forecasts) == 3


def test_gate_forecast_non_negative_queue_depth():
    distribution = {'zone-a': 1.0}
    forecasts = simulate_gate_forecasts(100, distribution)
    for f in forecasts:
        assert f.peak_queue_depth >= 0


def test_staff_plan_generated_for_each_zone():
    distribution = {'zone-a': 0.5, 'zone-b': 0.5}
    forecasts = simulate_gate_forecasts(200, distribution)
    plan = generate_staff_deployment_plan(200, distribution, forecasts)
    zone_ids = {p.zone_id for p in plan}
    assert 'zone-a' in zone_ids
    assert 'zone-b' in zone_ids


def test_staff_plan_minimum_two_staff_per_zone():
    distribution = {'zone-a': 1.0}
    forecasts = simulate_gate_forecasts(10, distribution)
    plan = generate_staff_deployment_plan(10, distribution, forecasts)
    staff_entries = [p for p in plan if p.role == 'STAFF']
    assert all(p.recommended_staff_count >= 2 for p in staff_entries)


def test_high_density_zone_gets_emergency_staff():
    distribution = {'zone-a': 1.0}
    forecasts = simulate_gate_forecasts(1000, distribution)
    plan = generate_staff_deployment_plan(1000, distribution, forecasts)
    roles = {p.role for p in plan}
    assert 'EMERGENCY' in roles


def test_staff_plan_has_reason_string():
    distribution = {'zone-a': 1.0}
    forecasts = simulate_gate_forecasts(200, distribution)
    plan = generate_staff_deployment_plan(200, distribution, forecasts)
    for p in plan:
        assert len(p.reason) > 0
