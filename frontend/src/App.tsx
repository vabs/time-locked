import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import LandingPage from "@/pages/LandingPage";
import NewDecision from "@/pages/NewDecision";
import DecisionDetail from "@/pages/DecisionDetail";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import type { ReactNode } from "react";

function HomeRoute() {
  return (
    <>
      <SignedIn>
        <Layout>
          <Dashboard />
        </Layout>
      </SignedIn>
      <SignedOut>
        <LandingPage />
      </SignedOut>
    </>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>
        <Layout>{children}</Layout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/new"
          element={
            <ProtectedRoute>
              <NewDecision />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decisions/:id"
          element={
            <ProtectedRoute>
              <DecisionDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
