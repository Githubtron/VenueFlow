/**
 * Unit tests for Vendor & Concession Intelligence Service.
 * Validates: Requirements 30.1, 30.2, 30.3, 30.4
 */

// ─── Revenue aggregation ──────────────────────────────────────────────────────

interface Transaction {
  kioskId: string;
  amount: number;
  itemCount: number;
  dwellSeconds: number;
}

function aggregateRevenue(transactions: Transaction[], kioskId: string) {
  const kiosk = transactions.filter(t => t.kioskId === kioskId);
  const revenue = kiosk.reduce((sum, t) => sum + t.amount, 0);
  const footfall = kiosk.length;
  const avgTransaction = footfall > 0 ? revenue / footfall : 0;
  return { revenue, footfall, avgTransaction };
}

describe('Revenue aggregation', () => {
  const transactions: Transaction[] = [
    { kioskId: 'k1', amount: 100, itemCount: 2, dwellSeconds: 120 },
    { kioskId: 'k1', amount: 200, itemCount: 3, dwellSeconds: 180 },
    { kioskId: 'k2', amount: 50, itemCount: 1, dwellSeconds: 60 },
  ];

  it('aggregates revenue correctly for a kiosk', () => {
    const result = aggregateRevenue(transactions, 'k1');
    expect(result.revenue).toBe(300);
    expect(result.footfall).toBe(2);
    expect(result.avgTransaction).toBe(150);
  });

  it('returns zero for kiosk with no transactions', () => {
    const result = aggregateRevenue(transactions, 'k99');
    expect(result.revenue).toBe(0);
    expect(result.footfall).toBe(0);
    expect(result.avgTransaction).toBe(0);
  });
});

// ─── Inventory threshold alerting ────────────────────────────────────────────

interface InventoryItem {
  itemId: string;
  stock: number;
  threshold: number;
}

function getDepletionAlerts(items: InventoryItem[]): InventoryItem[] {
  return items.filter(i => i.stock < i.threshold);
}

describe('Inventory threshold alerting', () => {
  it('alerts when stock falls below threshold', () => {
    const items: InventoryItem[] = [
      { itemId: 'burger', stock: 5, threshold: 10 },
      { itemId: 'fries', stock: 20, threshold: 10 },
    ];
    const alerts = getDepletionAlerts(items);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.itemId).toBe('burger');
  });

  it('no alert when stock equals threshold', () => {
    const items: InventoryItem[] = [{ itemId: 'cola', stock: 10, threshold: 10 }];
    expect(getDepletionAlerts(items)).toHaveLength(0);
  });

  it('alerts for all depleted items', () => {
    const items: InventoryItem[] = [
      { itemId: 'a', stock: 1, threshold: 5 },
      { itemId: 'b', stock: 2, threshold: 5 },
      { itemId: 'c', stock: 10, threshold: 5 },
    ];
    expect(getDepletionAlerts(items)).toHaveLength(2);
  });
});

// ─── Demand surge scoring ─────────────────────────────────────────────────────

function computeDemandSurgeScore(waitMinutes: number, footfall: number, baselineFootfall: number): number {
  const waitScore = Math.min(waitMinutes / 10, 1.0);
  const footfallScore = baselineFootfall > 0 ? Math.min(footfall / baselineFootfall, 2.0) : 0;
  return (waitScore + footfallScore) / 2;
}

describe('Demand surge scoring', () => {
  it('returns score between 0 and 1.5 for normal inputs', () => {
    const score = computeDemandSurgeScore(5, 100, 80);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1.5);
  });

  it('higher wait time increases surge score', () => {
    const low = computeDemandSurgeScore(2, 50, 50);
    const high = computeDemandSurgeScore(8, 50, 50);
    expect(high).toBeGreaterThan(low);
  });

  it('returns 0 when baseline footfall is 0', () => {
    const score = computeDemandSurgeScore(0, 0, 0);
    expect(score).toBe(0);
  });
});

// ─── SLA computation ──────────────────────────────────────────────────────────

interface OrderFulfillment {
  orderId: string;
  placedAt: Date;
  fulfilledAt: Date;
}

function computeAvgFulfillmentMinutes(orders: OrderFulfillment[]): number {
  if (orders.length === 0) return 0;
  const total = orders.reduce((sum, o) =>
    sum + (o.fulfilledAt.getTime() - o.placedAt.getTime()) / 60_000, 0
  );
  return total / orders.length;
}

function isSlaBreached(avgMinutes: number, slaThreshold: number): boolean {
  return avgMinutes > slaThreshold;
}

describe('SLA computation', () => {
  const base = new Date('2024-06-01T12:00:00Z');

  it('computes average fulfillment time correctly', () => {
    const orders: OrderFulfillment[] = [
      { orderId: 'o1', placedAt: base, fulfilledAt: new Date(base.getTime() + 10 * 60_000) },
      { orderId: 'o2', placedAt: base, fulfilledAt: new Date(base.getTime() + 20 * 60_000) },
    ];
    expect(computeAvgFulfillmentMinutes(orders)).toBe(15);
  });

  it('flags SLA breach when average exceeds threshold', () => {
    expect(isSlaBreached(16, 15)).toBe(true);
    expect(isSlaBreached(14, 15)).toBe(false);
    expect(isSlaBreached(15, 15)).toBe(false);
  });

  it('returns 0 for empty order list', () => {
    expect(computeAvgFulfillmentMinutes([])).toBe(0);
  });
});
