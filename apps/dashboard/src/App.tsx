import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { AuthGuard, RbacGuard } from './auth/RbacGuard';
import { EventProvider } from './context/EventContext';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { VenueConfigPage } from './pages/VenueConfigPage';
import { SimulationPage } from './pages/SimulationPage';
import { VendorPage } from './pages/VendorPage';
import { EventSwitcherPage } from './pages/EventSwitcherPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { ThreatIncidentPage } from './pages/ThreatIncidentPage';
import { MedicalTriagePage } from './pages/MedicalTriagePage';
import { CompliancePage } from './pages/CompliancePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SponsorAnalyticsPage } from './pages/SponsorAnalyticsPage';

const styles: Record<string, React.CSSProperties> = {
  app: { display: 'flex', minHeight: '100vh' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  unauthorized: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    flexDirection: 'column',
    gap: 12,
    color: '#94a3b8',
  },
};

function UnauthorizedPage() {
  return (
    <main style={styles.unauthorized} role="main">
      <span style={{ fontSize: 40 }} aria-hidden="true">🔒</span>
      <h2 style={{ color: '#e2e8f0', fontSize: 18 }}>Access Denied</h2>
      <p style={{ fontSize: 14 }}>You don't have permission to view this page.</p>
    </main>
  );
}

/** Layout wrapper that includes the sidebar for authenticated routes */
function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.app}>
      <Sidebar />
      <div style={styles.content}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <EventProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected routes — all require authentication */}
          <Route
            path="/live-map"
            element={
              <AuthGuard>
                <RbacGuard feature="heatmap">
                  <DashboardLayout>
                    <LiveMapPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* ADMIN-only: venue configuration (Req 6.7) */}
          <Route
            path="/venue-config"
            element={
              <AuthGuard>
                <RbacGuard feature="venue_config">
                  <DashboardLayout>
                    <VenueConfigPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* ADMIN-only: pre-event simulation (Req 27.1-27.3) */}
          <Route
            path="/simulation"
            element={
              <AuthGuard>
                <RbacGuard feature="simulation">
                  <DashboardLayout>
                    <SimulationPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* ADMIN-only: vendor intelligence (Req 30.1, 30.2, 30.4) */}
          <Route
            path="/vendors"
            element={
              <AuthGuard>
                <RbacGuard feature="vendor_intelligence">
                  <DashboardLayout>
                    <VendorPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* ADMIN-only: event switcher (Req 19.2) */}
          <Route
            path="/events/switch"
            element={
              <AuthGuard>
                <RbacGuard feature="event_switcher">
                  <DashboardLayout>
                    <EventSwitcherPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* EMERGENCY + ADMIN: emergency control panel (Req 5.1-5.5) */}
          <Route
            path="/emergency"
            element={
              <AuthGuard>
                <RbacGuard feature="emergency_panel">
                  <DashboardLayout>
                    <EmergencyPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* STAFF + ADMIN + EMERGENCY: threat alerts (Req 18.1, 18.2, 23.1, 23.2) */}
          <Route
            path="/threats"
            element={
              <AuthGuard>
                <RbacGuard feature="threat_alerts">
                  <DashboardLayout>
                    <ThreatIncidentPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* STAFF + ADMIN + EMERGENCY: medical triage (Req 29.1, 29.2, 29.4) */}
          <Route
            path="/medical/triage"
            element={
              <AuthGuard>
                <RbacGuard feature="medical_triage">
                  <DashboardLayout>
                    <MedicalTriagePage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* ADMIN only: compliance and audit (Req 33.1-33.4) */}
          <Route
            path="/compliance"
            element={
              <AuthGuard>
                <RbacGuard feature="venue_config">
                  <DashboardLayout>
                    <CompliancePage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* STAFF + ADMIN: analytics (Req 17.1, 17.2, 17.3, 6.6, 26.2) */}
          <Route
            path="/analytics"
            element={
              <AuthGuard>
                <RbacGuard feature="analytics">
                  <DashboardLayout>
                    <AnalyticsPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* ADMIN only: sponsor analytics (Req 34.1, 34.2, 34.3) */}
          <Route
            path="/sponsors"
            element={
              <AuthGuard>
                <RbacGuard feature="vendor_intelligence">
                  <DashboardLayout>
                    <SponsorAnalyticsPage />
                  </DashboardLayout>
                </RbacGuard>
              </AuthGuard>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/live-map" replace />} />
          <Route path="*" element={<Navigate to="/live-map" replace />} />        </Routes>
      </BrowserRouter>
      </EventProvider>
    </AuthProvider>
  );
}
