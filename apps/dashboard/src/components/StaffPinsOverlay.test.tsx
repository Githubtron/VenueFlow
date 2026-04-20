/**
 * Unit tests for StaffPinsOverlay component.
 * Tests 15.6: staff location map overlay.
 * Requirements 28.1
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaffPinsOverlay, StaffLocation } from './StaffPinsOverlay';

const makeStaff = (overrides: Partial<StaffLocation> = {}): StaffLocation => ({
  staffId: 'staff-1',
  name: 'Alice Smith',
  zoneId: 'zone-1',
  zoneName: 'North Stand',
  specialization: 'security',
  isAvailable: true,
  ...overrides,
});

describe('StaffPinsOverlay', () => {
  it('renders empty state when no staff', () => {
    render(<StaffPinsOverlay staffLocations={[]} />);
    expect(screen.getByText('No staff location data')).toBeInTheDocument();
  });

  it('renders staff name', () => {
    render(<StaffPinsOverlay staffLocations={[makeStaff()]} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders zone name', () => {
    render(<StaffPinsOverlay staffLocations={[makeStaff()]} />);
    expect(screen.getByText('North Stand')).toBeInTheDocument();
  });

  it('falls back to zoneId when zoneName is absent', () => {
    render(<StaffPinsOverlay staffLocations={[makeStaff({ zoneName: undefined })]} />);
    expect(screen.getByText('zone-1')).toBeInTheDocument();
  });

  it('renders specialization badge', () => {
    render(<StaffPinsOverlay staffLocations={[makeStaff({ specialization: 'first_aid' })]} />);
    expect(screen.getByText('first aid')).toBeInTheDocument();
  });

  it('shows staff count in header', () => {
    const staff = [makeStaff({ staffId: 's1' }), makeStaff({ staffId: 's2' })];
    render(<StaffPinsOverlay staffLocations={staff} />);
    expect(screen.getByText('Staff Locations (2)')).toBeInTheDocument();
  });

  it('renders multiple staff members', () => {
    const staff = [
      makeStaff({ staffId: 's1', name: 'Alice' }),
      makeStaff({ staffId: 's2', name: 'Bob' }),
    ];
    render(<StaffPinsOverlay staffLocations={staff} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
