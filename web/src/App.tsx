import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { SitesListPage } from "./pages/SitesListPage";
import { SiteDetailPage } from "./pages/SiteDetailPage";
import { SiteComparePage } from "./pages/SiteComparePage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<SitesListPage />} />
        <Route path="/sites/:id" element={<SiteDetailPage />} />
        <Route path="/sites/:id/compare" element={<SiteComparePage />} />
      </Route>
    </Routes>
  );
}
