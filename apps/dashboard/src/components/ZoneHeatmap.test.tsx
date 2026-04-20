/**
 * Unit tests for ZoneHeatmap component.
 * Tests 15.1: zone headcount display and color-coded status.
 * Requirements 6.1
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoneHeatmap, ZoneSnapshot } from './ZoneHeatmap';

const makeZone = (overrides: Partial<ZoneSnapshot> = {}): ZoneSnapshot => ({
  zoneId: 'zone-1',
  name: 'North Stand',
  currentCount: 350,
  densityPercent: 70,
  status: 'amber',
  capacity: 500,
  ...overrides,
});

describe('ZoneHeatmap', () => {
  it('renders empty state when no zones', () => {
    render(<ZoneHeatmap zones={[]} />);
    expect(screen.getByText('No zone data available')).toBeInTheDocument();
  });

  it('renders zone name and headcount', () => {
    render(<ZoneHeatmap zones={[makeZone()]} />);
    expect(screen.getByText('North Stand')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
  });

  it('renders density percentage for non-unavailable zones', () => {
    render(<ZoneHeatmap zones={[makeZone({ densityPercent: 70, capacity: 500 })]} />);
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it('shows "Data unavailable" for unavailable zones', () => {
    render(<ZoneHeatmap zones={[makeZone({ status: 'unavailable' })]} />);
    expect(screen.getByText('Data unavailable')).toBeInTheDocument();
  });

  it('renders multiple zones', () => {
    const zones = [
      makeZone({ zoneId: 'z1', name: 'Zone A' }),
      makeZone({ zoneId: 'z2', name: 'Zone B' }),
      makeZone({ zoneId: 'z3', name: 'Zone C' }),
    ];
    render(<ZoneHeatmap zones={zones} />);
    expect(screen.getByText('Zone A')).toBeInTheDocument();
    expect(screen.getByText('Zone B')).toBeInTheDocument();
    expect(screen.getByText('Zone C')).toBeInTheDocument();
  });

  it('calls onZoneClick with zoneId when clicked', () => {
    const onClick = vi.fn();
    render(<ZoneHeatmap zones={[makeZone()]} onZoneClick={onClick} />);
    fireEvent.click(screen.getByRole('listitem'));
    expect(onClick).toHaveBeenCalledWith('zone-1');
  });

  it('shows staff count when staff pins are in zone', () => {
    render(
      <ZoneHeatmap
        zones={[makeZone()]}
        staffPins={[
          { staffId: 's1', name: 'Alice', zoneId: 'zone-1' },
          { staffId: 's2', name: 'Bob', zoneId: 'zone-1' },
        ]}
      />
    );
    expect(screen.getByText(/2 staff/)).toBeInTheDocument();
  });

  it('does not show staff count when no staff in zone', () => {
    render(
      <ZoneHeatmap
        zones={[makeZone()]}
        staffPins={[{ staffId: 's1', name: 'Alice', zoneId: 'other-zone' }]}
      />
    );
    expect(screen.queryByText(/staff/)).not.toBeInTheDocument();
  });

  it('renders status badge for each zone', () => {
    render(<ZoneHeatmap zones={[makeZone({ status: 'red' })]} />);
    expect(screen.getByText('red')).toBeInTheDocument();
  });
});
