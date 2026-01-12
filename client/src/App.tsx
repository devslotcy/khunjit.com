import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import RoleSelect from "@/pages/role-select";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import SessionPage from "@/pages/session";

import PatientDashboard from "@/pages/patient/dashboard";
import PsychologistDiscovery from "@/pages/patient/psychologists";
import PsychologistProfilePage from "@/pages/patient/psychologist-profile";
import PatientAppointments from "@/pages/patient/appointments";
import PatientMessages from "@/pages/patient/messages";
import PaymentPage from "@/pages/patient/payment";

import PsychologistDashboardPage from "@/pages/psychologist/dashboard";
import AvailabilitySettings from "@/pages/psychologist/availability";
import PsychologistPaymentHistory from "@/pages/psychologist/payment-history";
import PsychologistSessionNotes from "@/pages/psychologist/session-notes";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminVerify from "@/pages/admin/verify";
import AdminPayments from "@/pages/admin/payments";
import PatientPaymentHistory from "@/pages/patient/payment-history";
import LegalPage from "@/pages/legal";
import type { UserProfile } from "@shared/schema";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    </div>
  );
}

function AuthenticatedRouter() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (authLoading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Landing />;
  }

  if (!profile?.role) {
    return <RoleSelect />;
  }

  const role = profile.role as "patient" | "psychologist" | "admin";

  return (
    <Switch>
      <Route path="/dashboard">
        {role === "admin" ? (
          <AdminDashboard />
        ) : role === "psychologist" ? (
          <PsychologistDashboardPage />
        ) : (
          <PatientDashboard />
        )}
      </Route>

      <Route path="/dashboard/psychologists">
        <PsychologistDiscovery />
      </Route>
      <Route path="/dashboard/psychologists/:id">
        <PsychologistProfilePage />
      </Route>
      <Route path="/dashboard/appointments">
        {role === "psychologist" ? (
          <PsychologistDashboardPage />
        ) : (
          <PatientAppointments />
        )}
      </Route>
      <Route path="/dashboard/messages">
        <PatientMessages />
      </Route>
      <Route path="/dashboard/payment/:id">
        <PaymentPage />
      </Route>
      <Route path="/dashboard/session/:id">
        <SessionPage />
      </Route>

      <Route path="/dashboard/availability">
        <AvailabilitySettings />
      </Route>
      <Route path="/dashboard/earnings">
        <PsychologistPaymentHistory />
      </Route>
      <Route path="/dashboard/notes">
        <PsychologistSessionNotes />
      </Route>
      <Route path="/dashboard/payment-history">
        <PatientPaymentHistory />
      </Route>

      <Route path="/dashboard/users">
        <AdminUsers />
      </Route>
      <Route path="/dashboard/verify">
        <AdminVerify />
      </Route>
      <Route path="/dashboard/payments">
        <AdminPayments />
      </Route>
      <Route path="/dashboard/reports">
        <AdminDashboard />
      </Route>
      <Route path="/dashboard/audit">
        <AdminDashboard />
      </Route>
      <Route path="/dashboard/settings">
        <AdminDashboard />
      </Route>
      <Route path="/dashboard/profile">
        {role === "admin" ? (
          <AdminDashboard />
        ) : role === "psychologist" ? (
          <PsychologistDashboardPage />
        ) : (
          <PatientDashboard />
        )}
      </Route>

      <Route path="/">
        {() => {
          window.location.href = "/dashboard";
          return null;
        }}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function PublicPsychologistDiscovery() {
  const { user } = useAuth();
  
  if (user) {
    window.location.href = "/dashboard/psychologists";
    return null;
  }
  
  return <PsychologistDiscovery isPublic />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="mindwell-theme">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login">
              <LoginPage />
            </Route>
            <Route path="/register">
              <RegisterPage />
            </Route>
            <Route path="/find-psychologist">
              <PublicPsychologistDiscovery />
            </Route>
            <Route path="/legal/:slug">
              <LegalPage />
            </Route>
            <Route path="/legal">
              <LegalPage />
            </Route>
            <Route path="/dashboard/:rest*">
              <AuthenticatedRouter />
            </Route>
            <Route path="/dashboard">
              <AuthenticatedRouter />
            </Route>
            <Route path="/">
              <AuthenticatedRouter />
            </Route>
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
