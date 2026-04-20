# VenueFlow Crowd Simulation Guide

## Overview
The Crowd Simulation feature enables event planners and operators to forecast realistic crowd density patterns for large-scale events. This helps validate safety measures, optimize staff deployment, and test gate capacity planning before the actual event.

## Quick Start

### 1. Access the Simulation Dashboard
- **Frontend URL**: http://localhost:5173
- **Path**: `/simulation`
- **Login**: Use the DEV QUICK LOGIN buttons (Admin/Staff/Emergency)

### 2. Configure Your Simulation
1. **Select Event Type** from dropdown:
   - **Concert**: Buildup → Peak → Decline (realistic for music events)
   - **Sports Event**: Pre-event → Halftime Rush → Post-event (realistic for sports)
   - **Gathering**: Steady increase and plateau (realistic for conferences)
   - **Festival**: Multiple waves of activity (realistic for all-day festivals)

2. **Set Duration** (30-600 seconds):
   - Simulations run at 10x speed for time compression
   - Example: 120 seconds simulates a 20-minute realistic event progression

3. **Click "Start Simulation"** to begin

### 3. Monitor Results
- **Real-time Stats**: Total attendees, average density, critical/busy zone counts
- **Progress Bar**: Shows elapsed time and completion percentage
- **Zone Grid**: Live density percentages and status (green/amber/red) for all zones
- **Controls**: Pause/stop/reset at any time

## Event Type Patterns

### Concert Pattern
- **Progression**: Slow buildup (0-60%) → Peak density (60%) → Gradual decline (60-100%)
- **Peak Density**: 95-100% across main zones
- **Zone Variation**: Main Stage sees peak first, concourses and exits peak later
- **Use Case**: Music festivals, concerts, raves

### Sports Event Pattern
- **Progression**: Pre-event activity (0-35%) → Pre-game rush (35-45%) → Halftime lull (45-60%) → Post-game rush (60-80%) → Exit (80-100%)
- **Peak Densities**: Two peaks at pre-game (~80%) and post-game (~75%)
- **Halftime Effect**: Visible dip in entry zones, rise in food/concourse zones
- **Use Case**: Football, basketball, hockey, baseball

### Gathering Pattern
- **Progression**: Steady increase to plateau (0-70%) → Plateau (70-85%) → Gradual decline (85-100%)
- **Peak Density**: 70-80% across zones
- **Plateau Effect**: Zones maintain steady density for extended period
- **Use Case**: Conferences, trade shows, conventions

### Festival Pattern
- **Progression**: Multiple waves of activity with 3-4 peak moments
- **Wave Timing**: Distinct peaks at entertainment stages, meal times, key events
- **Organic Variation**: Realistic up/down fluctuations mimicking crowd movement
- **Use Case**: Multi-day festivals, fairs, exhibitions

## Zone-Specific Behavior

All zones scale relative to their base capacity and event type patterns:

| Zone Type | Multiplier | Capacity | Notes |
|-----------|-----------|----------|-------|
| Main Stage | 1.2x | 5000 | Attractor; highest density during performances |
| VIP Lounge | 0.4x | 500 | Controlled access; limited attendance |
| Food Court | 0.8x | 1000 | Peaks during meal times |
| Gate Entries | 1.1x | 500 ea. | Highest during entry/exit periods |
| Concourses | 0.9x | 2500 | Steady circulation zones |
| Medical | 0.1x | 100 | Minimal occupancy |
| Parking | 0.3x | 800 | Off-premise zone |

## Status Indicators

- **Green (0-49%)**: Safe density; adequate spacing
- **Amber (50-79%)**: Monitor; approaching capacity
- **Red (80-100%)**: Critical; maximum density; safety protocols activate
- **Unavailable**: Zone offline or not in use

## Real-Time Metrics

### Total Attendees
Shows cumulative count across all active zones. Increases during buildup, plateaus at peak, decreases during exit.

### Average Density
Weighted average of all zone densities. Useful for overall venue congestion overview.

### Critical Zones
Count of zones at red status (80%+ density). Triggers when zones exceed safety thresholds.

### Busy Zones
Count of zones at amber status (50-79% density). Indicates increasing congestion requiring monitoring.

## Realistic Features

1. **Organic Variation**: Perlin-like noise applied to prevent unrealistic linear progression
2. **Zone Sequencing**: Different zones reach peak at different times (e.g., gates before main stage)
3. **Capacity-Aware**: Zone densities scale to actual capacities
4. **Event-Type Accuracy**: Pattern shapes match real-world crowd behavior data
5. **Smooth Transitions**: Gradual changes prevent jarring spikes

## Use Cases

### Safety Validation
Run concerts and sports simulations to identify potential bottlenecks at entry/exit zones and validate that staff capacity is sufficient.

### Gate Planning
Sports event simulations show pre-game rush patterns, allowing you to pre-position staff at gates before simulation shows density spike.

### Food Service
Festival simulations reveal when food courts experience peak demand, enabling targeted staffing decisions.

### Emergency Planning
Gathering simulations with steady high density help train staff on sustained-pressure scenarios.

## Technical Details

- **Framework**: React + TypeScript
- **Simulation Engine**: `CrowdSimulator.ts` utility class
- **Update Rate**: 60fps (requestAnimationFrame)
- **Simulation Speed**: 10x compression (1 real second = 10 simulated seconds)
- **Zone Multipliers**: Event-type independent, controlled by zone name patterns
- **Noise Algorithm**: Sine-wave based for organic variation

## Files

- `apps/dashboard/src/utils/CrowdSimulator.ts` - Core simulation engine
- `apps/dashboard/src/components/SimulationLive.tsx` - Live display & controls
- `apps/dashboard/src/pages/SimulationPage.tsx` - Page container & configuration

## Troubleshooting

### Simulation won't start
- Ensure you're logged in (use DEV QUICK LOGIN if needed)
- Check that backend is running: `curl http://localhost:3001/health`
- Verify frontend is running: `curl http://localhost:5173`

### Zones not updating
- Check browser console for errors (F12)
- Try resetting the simulation with the Reset button
- Verify React DevTools shows SimulationLive component state changing

### Density seems unrealistic
- Try different event types to see pattern variations
- Adjust duration to compress/expand time progression
- Check zone capacities in the DEMO_ZONES configuration

## Future Enhancements

- [ ] Save simulation runs to database
- [ ] Export simulation data as CSV
- [ ] Preset capacity configurations for real venues
- [ ] Multi-event scenario planning
- [ ] Real-time heatmap overlay visualization
- [ ] Staff deployment recommendations based on pattern
