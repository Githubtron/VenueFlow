/**
 * VendorPage — Task 15.8
 *
 * Per-kiosk revenue, footfall, SLA compliance table (ADMIN role).
 * Inventory depletion alert feed. Requirements 30.1, 30.2, 30.4.
 */
import React, { useCallback, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useApi } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { TopBar } from '../components/TopBar';
import { VendorTable, VendorKioskStats } from '../components/VendorTable';
import { InventoryAlertFeed, InventoryAlert } from '../components/InventoryAlertFeed';

interface InventoryAlertMessage {
  type: 'inventory_alert';
  alert: InventoryAlert;
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  body: { flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  row: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' },
};

export function VendorPage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? '';

  const { data: kioskData } = useApi<{ kiosks: VendorKioskStats[] }>(
    venueId ? `/vendors/kiosks?venueId=${venueId}` : null
  );
  const kiosks = kioskData?.kiosks ?? [];

  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);

  const handleInventoryMessage = useCallback((msg: InventoryAlertMessage) => {
    if (msg.type === 'inventory_alert') {
      setInventoryAlerts((prev) => {
        const exists = prev.find((a) => a.alertId === msg.alert.alertId);
        if (exists) return prev;
        return [msg.alert, ...prev].slice(0, 50); // keep last 50
      });
    }
  }, []);

  const { connected } = useWebSocket<InventoryAlertMessage>(
    `inventory:${venueId}`,
    handleInventoryMessage
  );

  return (
    <div style={styles.page}>
      <TopBar title="Vendor Intelligence" connected={connected} />
      <div style={styles.body}>
        <div style={styles.row}>
          <VendorTable kiosks={kiosks} />
          <InventoryAlertFeed alerts={inventoryAlerts} />
        </div>
      </div>
    </div>
  );
}
