import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import "./lib/i18n"; // Initialize i18n

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import RoleSelect from "@/pages/role-select";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import SessionPage from "@/pages/session";
import ProfilePage from "@/pages/profile";
import VideoCallPage from "@/pages/video-call";

import PatientDashboard from "@/pages/patient/dashboard";
import PsychologistDiscovery from "@/pages/patient/psychologists";
import PsychologistProfilePage from "@/pages/patient/psychologist-profile";
import PsychologistDetailPage from "@/pages/patient/psychologist-detail";
import PatientAppointments from "@/pages/patient/appointments";
import PatientMessages from "@/pages/patient/messages";
import PaymentPage from "@/pages/patient/payment";
import BankTransferCheckout from "@/pages/patient/bank-transfer-checkout";
import PromptPayCheckout from "@/pages/patient/promptpay-checkout";
import BookingSuccess from "@/pages/patient/booking-success";

import PsychologistDashboardPage from "@/pages/psychologist/dashboard";
import PsychologistAppointments from "@/pages/psychologist/appointments";
import PsychologistMessages from "@/pages/psychologist/messages";
import AvailabilitySettings from "@/pages/psychologist/availability";
import PsychologistPaymentHistory from "@/pages/psychologist/payment-history";
import PsychologistSessionNotes from "@/pages/psychologist/session-notes";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminVerify from "@/pages/admin/verify";
import AdminPayments from "@/pages/admin/payments";
import AdminLoginPage from "@/pages/admin/login";
import AdminSettingsPage from "@/pages/admin/settings";
import AdminAppointments from "@/pages/admin/appointments";
import AuditLogsPage from "@/pages/admin/audit";
import PatientPaymentHistory from "@/pages/patient/payment-history";
import SettingsPage from "@/pages/settings";
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

  // Block non-admin users from accessing dashboard routes if they're admin
  if (role === "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Erişim Engellendi</h1>
          <p className="text-muted-foreground">Admin kullanıcılar için ayrı bir panel mevcuttur.</p>
          <Button onClick={() => window.location.href = "/admin"}>
            Admin Paneline Git
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Most specific routes first - with parameters */}
      {/* Payment route MUST come before psychologists/:id to avoid conflicts */}
      <Route path="/dashboard/payment/:id">
        <PaymentPage />
      </Route>
      <Route path="/dashboard/psychologists/:id">
        <PsychologistDetailPage />
      </Route>
      <Route path="/dashboard/session/:id">
        <SessionPage />
      </Route>
      <Route path="/dashboard/video-call/:appointmentId">
        <VideoCallPage />
      </Route>
      <Route path="/dashboard/bank-transfer-checkout">
        <BankTransferCheckout />
      </Route>
      <Route path="/dashboard/promptpay-checkout">
        <PromptPayCheckout />
      </Route>
      <Route path="/dashboard/booking-success">
        <BookingSuccess />
      </Route>

      {/* Then specific paths without parameters */}
      <Route path="/dashboard/psychologists">
        <PsychologistDiscovery />
      </Route>
      <Route path="/dashboard/appointments">
        {role === "psychologist" && <PsychologistAppointments />}
        {role === "patient" && <PatientAppointments />}
        {role === "admin" && <PatientAppointments />}
      </Route>
      <Route path="/dashboard/messages">
        {role === "psychologist" && <PsychologistMessages />}
        {role === "patient" && <PatientMessages />}
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

      <Route path="/dashboard/settings">
        <SettingsPage />
      </Route>
      <Route path="/dashboard/profile">
        <ProfilePage />
      </Route>

      {/* Dashboard home - must be LAST among dashboard routes */}
      <Route path="/dashboard">
        {role === "psychologist" ? (
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

// Wrapper for authenticated psychologist detail page
function AuthenticatedPsychologistDetail() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (!user) return <Landing />;
  if (!profile?.role) return <RoleSelect />;

  return <PsychologistDetailPage />;
}

// Wrapper for authenticated psychologist discovery page
function AuthenticatedPsychologistDiscovery() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (!user) return <Landing />;
  if (!profile?.role) return <RoleSelect />;

  return <PsychologistDiscovery />;
}

// Wrapper for authenticated video call page
function AuthenticatedVideoCall() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (!user) return <Landing />;
  if (!profile?.role) return <RoleSelect />;

  return <VideoCallPage />;
}

function AdminRouter() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (authLoading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    window.location.href = "/admin/login";
    return null;
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Erişim Reddedildi</h1>
          <p className="text-muted-foreground">Bu alana erişim izniniz bulunmamaktadır.</p>
          <Button onClick={() => window.location.href = "/dashboard"}>
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/admin">
        <AdminDashboard />
      </Route>
      <Route path="/admin/users">
        <AdminUsers />
      </Route>
      <Route path="/admin/verify">
        <AdminVerify />
      </Route>
      <Route path="/admin/appointments">
        <AdminAppointments />
      </Route>
      <Route path="/admin/payments">
        <AdminPayments />
      </Route>
      <Route path="/admin/reports">
        <AdminDashboard />
      </Route>
      <Route path="/admin/audit">
        <AuditLogsPage />
      </Route>
      <Route path="/admin/settings">
        <AdminSettingsPage />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RoleRedirect({ targetRole }: { targetRole: "admin" | "patient" | "psychologist" }) {
  const { user, isLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (isLoading || profileLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (profile?.role !== targetRole) {
    window.location.href = "/dashboard";
    return null;
  }

  window.location.href = "/dashboard";
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="khunjit-theme">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login">
              <LoginPage />
            </Route>
            <Route path="/register">
              <RegisterPage />
            </Route>
            <Route path="/role-select">
              <RoleSelect />
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
            <Route path="/admin/login">
              <AdminLoginPage />
            </Route>
            <Route path="/admin/:rest*">
              <AdminRouter />
            </Route>
            <Route path="/admin">
              <AdminRouter />
            </Route>
            <Route path="/patient/booking-success">
              {() => {
                const { user, isLoading } = useAuth();
                const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
                  queryKey: ["/api/profile"],
                  enabled: !!user,
                });

                if (isLoading || profileLoading) return <LoadingScreen />;
                if (!user) return <Landing />;
                if (!profile?.role) return <RoleSelect />;

                return <BookingSuccess />;
              }}
            </Route>
            <Route path="/patient/:rest*">
              <RoleRedirect targetRole="patient" />
            </Route>
            <Route path="/patient">
              <RoleRedirect targetRole="patient" />
            </Route>
            <Route path="/psychologist/:rest*">
              <RoleRedirect targetRole="psychologist" />
            </Route>
            <Route path="/psychologist">
              <RoleRedirect targetRole="psychologist" />
            </Route>

            {/* Dashboard routes - most specific first */}
            <Route path="/dashboard/payment/:id">
              {() => {
                const { user, isLoading } = useAuth();
                const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
                  queryKey: ["/api/profile"],
                  enabled: !!user,
                });

                if (isLoading || profileLoading) return <LoadingScreen />;
                if (!user) return <Landing />;
                if (!profile?.role) return <RoleSelect />;

                return <PaymentPage />;
              }}
            </Route>
            <Route path="/dashboard/video-call/:appointmentId">
              <AuthenticatedVideoCall />
            </Route>
            <Route path="/dashboard/psychologists/:id">
              <AuthenticatedPsychologistDetail />
            </Route>
            <Route path="/dashboard/psychologists">
              <AuthenticatedPsychologistDiscovery />
            </Route>
            <Route path="/dashboard/booking-success">
              {() => {
                const { user, isLoading } = useAuth();
                const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
                  queryKey: ["/api/profile"],
                  enabled: !!user,
                });

                if (isLoading || profileLoading) return <LoadingScreen />;
                if (!user) return <Landing />;
                if (!profile?.role) return <RoleSelect />;

                return <BookingSuccess />;
              }}
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
