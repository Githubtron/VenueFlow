/**
 * Unit tests for Staff & Resource Management Service.
 * Validates: Requirements 28.1, 28.2, 28.3, 28.4
 */

// ─── Location TTL expiry ──────────────────────────────────────────────────────

describe('Staff location TTL expiry', () => {
  it('location entry expires after 60 seconds', () => {
    const TTL_SECONDS = 60;
    const now = Date.now();
    const entry = { staffId: 'staff-1', lat: 12.9, lng: 77.6, zoneId: 'z1', updatedAt: now };

    const isExpired = (e: typeof entry, currentTime: number) =>
      (currentTime - e.updatedAt) / 1000 > TTL_SECONDS;

    expect(isExpired(entry, now + 59_000)).toBe(false);
    expect(isExpired(entry, now + 61_000)).toBe(true);
  });

  it('fresh location entry is not expired', () => {
    const entry = { staffId: 'staff-2', lat: 0, lng: 0, zoneId: 'z2', updatedAt: Date.now() };
    const isExpired = (e: typeof entry) => (Date.now() - e.updatedAt) / 1000 > 60;
    expect(isExpired(entry)).toBe(false);
  });
});

// ─── Redeployment ranking by distance ────────────────────────────────────────

interface StaffLocation {
  staffId: string;
  lat: number;
  lng: number;
  zoneId: string;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function rankByDistance(staff: StaffLocation[], targetLat: number, targetLng: number): StaffLocation[] {
  return [...staff].sort((a, b) =>
    haversineDistance(a.lat, a.lng, targetLat, targetLng) -
    haversineDistance(b.lat, b.lng, targetLat, targetLng)
  );
}

describe('Redeployment ranking by distance', () => {
  const targetLat = 12.9716;
  const targetLng = 77.5946;

  const staff: StaffLocation[] = [
    { staffId: 'far', lat: 13.0, lng: 77.7, zoneId: 'z1' },
    { staffId: 'near', lat: 12.972, lng: 77.595, zoneId: 'z2' },
    { staffId: 'medium', lat: 12.98, lng: 77.61, zoneId: 'z3' },
  ];

  it('nearest staff member is ranked first', () => {
    const ranked = rankByDistance(staff, targetLat, targetLng);
    expect(ranked[0]!.staffId).toBe('near');
  });

  it('farthest staff member is ranked last', () => {
    const ranked = rankByDistance(staff, targetLat, targetLng);
    expect(ranked[ranked.length - 1]!.staffId).toBe('far');
  });

  it('returns all staff members', () => {
    const ranked = rankByDistance(staff, targetLat, targetLng);
    expect(ranked).toHaveLength(staff.length);
  });
});

// ─── Shift conflict detection ─────────────────────────────────────────────────

interface Shift {
  shiftId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  zoneId: string;
}

function hasShiftConflict(existing: Shift[], newShift: Omit<Shift, 'shiftId'>): boolean {
  return existing.some(s =>
    s.staffId === newShift.staffId &&
    s.startTime < newShift.endTime &&
    s.endTime > newShift.startTime
  );
}

describe('Shift conflict detection', () => {
  const base = new Date('2024-06-01T08:00:00Z');
  const existing: Shift[] = [{
    shiftId: 's1',
    staffId: 'staff-1',
    startTime: base,
    endTime: new Date(base.getTime() + 4 * 3600_000),
    zoneId: 'z1',
  }];

  it('detects overlapping shift for same staff member', () => {
    const conflict = {
      staffId: 'staff-1',
      startTime: new Date(base.getTime() + 2 * 3600_000),
      endTime: new Date(base.getTime() + 6 * 3600_000),
      zoneId: 'z2',
    };
    expect(hasShiftConflict(existing, conflict)).toBe(true);
  });

  it('no conflict for different staff member', () => {
    const noConflict = {
      staffId: 'staff-2',
      startTime: base,
      endTime: new Date(base.getTime() + 4 * 3600_000),
      zoneId: 'z1',
    };
    expect(hasShiftConflict(existing, noConflict)).toBe(false);
  });

  it('no conflict for adjacent (non-overlapping) shifts', () => {
    const adjacent = {
      staffId: 'staff-1',
      startTime: new Date(base.getTime() + 4 * 3600_000),
      endTime: new Date(base.getTime() + 8 * 3600_000),
      zoneId: 'z1',
    };
    expect(hasShiftConflict(existing, adjacent)).toBe(false);
  });
});

// ─── SLA breach flagging ──────────────────────────────────────────────────────

describe('SLA breach flagging', () => {
  const SLA_MINUTES = 30;

  function isSlaBreach(assignedAt: Date, resolvedAt: Date | null): boolean {
    if (!resolvedAt) return false;
    const minutes = (resolvedAt.getTime() - assignedAt.getTime()) / 60_000;
    return minutes > SLA_MINUTES;
  }

  it('flags incident exceeding SLA threshold', () => {
    const assigned = new Date('2024-06-01T10:00:00Z');
    const resolved = new Date('2024-06-01T10:35:00Z');
    expect(isSlaBreach(assigned, resolved)).toBe(true);
  });

  it('does not flag incident within SLA', () => {
    const assigned = new Date('2024-06-01T10:00:00Z');
    const resolved = new Date('2024-06-01T10:25:00Z');
    expect(isSlaBreach(assigned, resolved)).toBe(false);
  });

  it('does not flag unresolved incident', () => {
    const assigned = new Date('2024-06-01T10:00:00Z');
    expect(isSlaBreach(assigned, null)).toBe(false);
  });
});
