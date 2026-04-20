/**
 * Unit tests for VendorTable component.
 * Tests 15.8: vendor kiosk data binding.
 * Requirements 30.1, 30.4
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VendorTable, VendorKioskStats } from './VendorTable';

const makeKiosk = (overrides: Partial<VendorKioskStats> = {}): VendorKioskStats => ({
  kioskId: 'kiosk-1',
  kioskName: 'Burger Shack',
  vendorName: 'FastFood Co',
  revenue: 12500,
  footfall: 340,
  slaCompliant: true,
  avgWaitMinutes: 3.5,
  zoneId: 'zone-1',
  zoneName: 'Food Court',
  ...overrides,
});

describe('VendorTable', () => {
  it('renders empty state when no kiosks', () => {
    render(<VendorTable kiosks={[]} />);
    expect(screen.getByText('No kiosk data available')).toBeInTheDocument();
  });

  it('renders kiosk name and vendor name', () => {
    render(<VendorTable kiosks={[makeKiosk()]} />);
    expect(screen.getByText('Burger Shack')).toBeInTheDocument();
    expect(screen.getByText('FastFood Co')).toBeInTheDocument();
  });

  it('renders revenue formatted with dollar sign', () => {
    render(<VendorTable kiosks={[makeKiosk({ revenue: 12500 })]} />);
    expect(screen.getByText('$12,500')).toBeInTheDocument();
  });

  it('renders footfall count', () => {
    render(<VendorTable kiosks={[makeKiosk({ footfall: 340 })]} />);
    expect(screen.getByText('340')).toBeInTheDocument();
  });

  it('shows Compliant badge for SLA-compliant kiosk', () => {
    render(<VendorTable kiosks={[makeKiosk({ slaCompliant: true })]} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });

  it('shows Breach badge for non-compliant kiosk', () => {
    render(<VendorTable kiosks={[makeKiosk({ slaCompliant: false })]} />);
    expect(screen.getByText('Breach')).toBeInTheDocument();
  });

  it('renders zone name', () => {
    render(<VendorTable kiosks={[makeKiosk()]} />);
    expect(screen.getByText('Food Court')).toBeInTheDocument();
  });

  it('falls back to zoneId when zoneName is absent', () => {
    render(<VendorTable kiosks={[makeKiosk({ zoneName: undefined })]} />);
    expect(screen.getByText('zone-1')).toBeInTheDocument();
  });

  it('renders multiple kiosks', () => {
    const kiosks = [
      makeKiosk({ kioskId: 'k1', kioskName: 'Pizza Place' }),
      makeKiosk({ kioskId: 'k2', kioskName: 'Ice Cream' }),
    ];
    render(<VendorTable kiosks={kiosks} />);
    expect(screen.getByText('Pizza Place')).toBeInTheDocument();
    expect(screen.getByText('Ice Cream')).toBeInTheDocument();
  });

  it('renders average wait time', () => {
    render(<VendorTable kiosks={[makeKiosk({ avgWaitMinutes: 3.5 })]} />);
    expect(screen.getByText('3.5 min')).toBeInTheDocument();
  });
});
