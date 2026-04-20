/**
 * Unit tests for AnomalyAlertPanel.
 * Tests 15.2: anomaly alert rendering and deployment recommendations.
 * Requirements 6.3, 6.4
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnomalyAlertPanel, AnomalyAlert } from './AnomalyAlertPanel';

const makeAlert = (overrides: Partial<AnomalyAlert> = {}): AnomalyAlert => ({
  alertId: 'alert-1',
  venueId: 'venue-1',
  zoneId: 'zone-1',
  zoneName: 'North Stand',
  eventId: 'event-1',
  currentDensityPercent: 92,
  threshold: 80,
  detectedAt: new Date().toISOString(),
  status: 'active',
  deploymentRecommendation: 'Deploy 3 additional staff to North Stand',
  ...overrides,
});

describe('AnomalyAlertPanel', () => {
  it('renders empty state when no alerts', () => {
    render(<AnomalyAlertPanel alerts={[]} />);
    expect(screen.getByText('No active anomaly alerts')).toBeInTheDocument();
  });

  it('displays active alert with zone name prominently', () => {
    render(<AnomalyAlertPanel alerts={[makeAlert()]} />);
    // Zone name appears in the alert header span (and also in the recommendation text)
    const matches = screen.getAllByText(/North Stand/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows density percentage and threshold', () => {
    render(<AnomalyAlertPanel alerts={[makeAlert()]} />);
    expect(screen.getByText(/92%/)).toBeInTheDocument();
    expect(screen.getByText(/80%/)).toBeInTheDocument();
  });

  it('displays deployment recommendation when present', () => {
    render(<AnomalyAlertPanel alerts={[makeAlert()]} />);
    expect(
      screen.getByText(/Deploy 3 additional staff to North Stand/)
    ).toBeInTheDocument();
  });

  it('does not show recommendation when absent', () => {
    render(
      <AnomalyAlertPanel
        alerts={[makeAlert({ deploymentRecommendation: undefined })]}
      />
    );
    expect(screen.queryByText(/Deploy/)).not.toBeInTheDocument();
  });

  it('shows acknowledge button for active alerts', () => {
    const onAck = vi.fn();
    render(<AnomalyAlertPanel alerts={[makeAlert()]} onAcknowledge={onAck} />);
    const btn = screen.getByRole('button', { name: /acknowledge/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls onAcknowledge with alertId when button clicked', () => {
    const onAck = vi.fn();
    render(<AnomalyAlertPanel alerts={[makeAlert()]} onAcknowledge={onAck} />);
    fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
    expect(onAck).toHaveBeenCalledWith('alert-1');
  });

  it('shows alert count badge for active alerts', () => {
    const alerts = [makeAlert({ alertId: 'a1' }), makeAlert({ alertId: 'a2' })];
    render(<AnomalyAlertPanel alerts={alerts} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not show acknowledge button for acknowledged alerts', () => {
    const onAck = vi.fn();
    render(
      <AnomalyAlertPanel
        alerts={[makeAlert({ status: 'acknowledged' })]}
        onAcknowledge={onAck}
      />
    );
    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
  });

  it('uses zoneId as fallback when zoneName is absent', () => {
    render(<AnomalyAlertPanel alerts={[makeAlert({ zoneName: undefined })]} />);
    expect(screen.getByText(/zone-1/)).toBeInTheDocument();
  });
});
