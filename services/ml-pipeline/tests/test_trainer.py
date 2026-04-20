"""
Tests for ML Pipeline retraining.

Property 30: Post-Event Retraining Promotion Guard
Feature: venueflow-platform, Property 30: Post-Event Retraining Promotion Guard
Validates: Requirements 26.2

Property 29: ML Model Version Traceability
Feature: venueflow-platform, Property 29: ML Model Version Traceability
Validates: Requirements 26.2
"""
import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st
from app.trainer import should_promote, run_retraining, get_current_model, get_model_versions, _model_registry


def clear_registry():
    _model_registry.clear()


# ── Unit tests ────────────────────────────────────────────────────────────────

def test_should_promote_when_new_mape_lower():
    assert should_promote(0.10, 0.15) is True


def test_should_not_promote_when_new_mape_equal():
    assert should_promote(0.15, 0.15) is False


def test_should_not_promote_when_new_mape_higher():
    assert should_promote(0.20, 0.15) is False


@pytest.mark.asyncio
async def test_retraining_promotes_better_model():
    clear_registry()
    # Seed a current model with high MAPE
    from app.trainer import register_model, promote_model
    register_model({'version_id': 'v0', 'service_id': 'svc-test', 'mape': 0.20, 'is_active': True, 'trained_at': '2024-01-01', 'training_event_ids': [], 's3_model_path': 's3://test'})

    # Training data that produces low MAPE
    training_data = [{'predicted': 5.0, 'actual': 5.1}] * 100
    result = await run_retraining('svc-test', 'event-1', training_data)

    if result['new_mape'] < 0.20:
        assert result['promoted'] is True
    else:
        assert result['promoted'] is False


@pytest.mark.asyncio
async def test_retraining_does_not_promote_worse_model():
    clear_registry()
    from app.trainer import register_model
    register_model({'version_id': 'v0', 'service_id': 'svc-worse', 'mape': 0.05, 'is_active': True, 'trained_at': '2024-01-01', 'training_event_ids': [], 's3_model_path': 's3://test'})

    # Training data that produces high MAPE
    training_data = [{'predicted': 10.0, 'actual': 1.0}] * 10
    result = await run_retraining('svc-worse', 'event-2', training_data)
    assert result['promoted'] is False


@pytest.mark.asyncio
async def test_version_id_recorded_in_result():
    clear_registry()
    result = await run_retraining('svc-version', 'event-3', [])
    assert 'version_id' in result
    assert len(result['version_id']) > 0


# ── Property 30: Post-Event Retraining Promotion Guard ───────────────────────

@given(
    new_mape=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
    current_mape=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
)
@settings(max_examples=200)
def test_promotion_guard_iff_strictly_better(new_mape, current_mape):
    """Property 30: New model promoted iff new_mape < current_mape."""
    result = should_promote(new_mape, current_mape)
    expected = new_mape < current_mape
    assert result == expected


# ── Property 29: ML Model Version Traceability ───────────────────────────────

@pytest.mark.asyncio
@given(event_id=st.text(min_size=3, max_size=20))
@settings(max_examples=50)
async def test_every_retraining_produces_traceable_version(event_id):
    """Property 29: Every retraining run produces a version_id in the registry."""
    assume(len(event_id) >= 3)
    service_id = f'svc-trace-{event_id[:5]}'
    result = await run_retraining(service_id, event_id, [])
    versions = get_model_versions(service_id)
    version_ids = [v['version_id'] for v in versions]
    assert result['version_id'] in version_ids
