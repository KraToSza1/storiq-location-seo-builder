import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import LocationWizard from "./pages/LocationWizard";
import LocationWorkspace from "./pages/LocationWorkspace";
import BulkPage from "./pages/BulkPage";
import MasterDataPage from "./pages/MasterDataPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <AppLayout>
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
