import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { logStorIqDebugBanner } from "./lib/debugLog";
import { debugFlow, installGlobalDebugListeners, logNavigate } from "./lib/debugUi";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import LocationWizard from "./pages/LocationWizard";
import LocationWorkspace from "./pages/LocationWorkspace";
import BulkPage from "./pages/BulkPage";
import MasterDataPage from "./pages/MasterDataPage";
import SettingsPage from "./pages/SettingsPage";

function RouteDebugLogger() {
  const location = useLocation();
  useEffect(() => {
    logNavigate(location.pathname + location.search, { hash: location.hash || undefined });
  }, [location.pathname, location.search, location.hash]);
  return null;
}

export default function App() {
  useEffect(() => {
    logStorIqDebugBanner();
    installGlobalDebugListeners();
    debugFlow("boot", "StorIQ Location SEO Builder started");
  }, []);

  return (
    <AppLayout>
      <RouteDebugLogger />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/locations/new" element={<LocationWizard />} />
        <Route path="/locations/:id" element={<LocationWorkspace />} />
        <Route path="/master-data" element={<MasterDataPage />} />
        <Route path="/bulk" element={<BulkPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
