"""
Simulation Service REST endpoints.
Validates: Requirements 27.1, 27.2, 27.3
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from app.models import SimulationRequest, SimulationResult
from app.simulator import simulate_gate_forecasts, generate_staff_deployment_plan

router = APIRouter()

# In-memory simulation store (replace with PostgreSQL in production)
_simulations: dict[str, SimulationResult] = {}


@router.post('/simulation/{venue_id}/run')
async def run_simulation(venue_id: str, request: SimulationRequest):
    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    gate_forecasts = simulate_gate_forecasts(
        request.expected_attendance,
        request.seat_zone_distribution,
    )

    staff_plan = generate_staff_deployment_plan(
        request.expected_attendance,
        request.seat_zone_distribution,
        gate_forecasts,
    )

    result = SimulationResult(
        simulation_run_id=run_id,
        venue_id=venue_id,
        event_id=request.event_id,
        status='completed',
        gate_forecasts=gate_forecasts,
        staff_deployment_plan=staff_plan,
        created_at=now,
        completed_at=now,
    )

    _simulations[run_id] = result
    return {'simulation_run_id': run_id, 'status': 'completed'}


@router.get('/simulation/{venue_id}/runs/{run_id}')
async def get_simulation(venue_id: str, run_id: str):
    result = _simulations.get(run_id)
    if not result or result.venue_id != venue_id:
        raise HTTPException(status_code=404, detail='Simulation run not found')
    return result.model_dump()


@router.get('/simulation/{venue_id}/gate-forecast')
async def get_gate_forecast(venue_id: str, event_id: str):
    # Return latest simulation for this event
    for result in reversed(list(_simulations.values())):
        if result.venue_id == venue_id and result.event_id == event_id:
            return {'venue_id': venue_id, 'event_id': event_id, 'gate_forecasts': [f.model_dump() for f in result.gate_forecasts]}
    raise HTTPException(status_code=404, detail='No simulation found for this event')


@router.get('/simulation/{venue_id}/staff-plan')
async def get_staff_plan(venue_id: str, event_id: str):
    for result in reversed(list(_simulations.values())):
        if result.venue_id == venue_id and result.event_id == event_id:
            return {'venue_id': venue_id, 'event_id': event_id, 'staff_plan': [p.model_dump() for p in result.staff_deployment_plan]}
    raise HTTPException(status_code=404, detail='No simulation found for this event')
