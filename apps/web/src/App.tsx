import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import AuditPage from "@/pages/audit";
import DashboardPage from "@/pages/dashboard";
import LandingPage from "@/pages/landing";
import NotFoundPage from "@/pages/not-found";
import OnboardingPage from "@/pages/onboarding";
import VerifyPage from "@/pages/verify";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/audit/:jobId" element={<AuditPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
