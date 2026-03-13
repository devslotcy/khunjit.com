import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Brain,
  Home,
  Search,
  Calendar,
  MessageCircle,
  CreditCard,
  Settings,
  LogOut,
  User,
  Clock,
  FileText,
  DollarSign,
  Users,
  CheckCircle,
  Shield,
  BarChart3,
  AlertCircle
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "patient" | "psychologist" | "admin";
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();

  const patientMenuItems = [
    { title: t('navigation.patient.home'), url: "/dashboard", icon: Home },
    { title: t('navigation.patient.findPsychologist'), url: "/dashboard/psychologists", icon: Search },
    { title: t('navigation.patient.appointments'), url: "/dashboard/appointments", icon: Calendar },
    { title: t('navigation.patient.messages'), url: "/dashboard/messages", icon: MessageCircle },
    { title: t('navigation.patient.paymentHistory'), url: "/dashboard/payment-history", icon: CreditCard },
  ];

  const psychologistMenuItems = [
    { title: t('navigation.psychologist.home'), url: "/dashboard", icon: Home },
    { title: t('navigation.psychologist.appointments'), url: "/dashboard/appointments", icon: Calendar },
    { title: t('navigation.psychologist.availability'), url: "/dashboard/availability", icon: Clock },
    { title: t('navigation.psychologist.messages'), url: "/dashboard/messages", icon: MessageCircle },
    { title: t('navigation.psychologist.sessionNotes'), url: "/dashboard/notes", icon: FileText },
    { title: t('navigation.psychologist.earnings'), url: "/dashboard/earnings", icon: DollarSign },
  ];

  const adminMenuItems = [
    { title: t('navigation.admin.overview'), url: "/admin", icon: BarChart3 },
    { title: t('navigation.admin.users'), url: "/admin/users", icon: Users },
    { title: t('navigation.admin.verification'), url: "/admin/verify", icon: CheckCircle },
    { title: t('navigation.admin.appointments'), url: "/admin/appointments", icon: Calendar },
    { title: t('navigation.admin.payments'), url: "/admin/payments", icon: CreditCard },
    { title: t('navigation.admin.auditLog'), url: "/admin/audit", icon: Shield },
    { title: t('navigation.admin.settings'), url: "/admin/settings", icon: Settings },
  ];

  const menuItems = role === "admin" 
    ? adminMenuItems 
    : role === "psychologist" 
    ? psychologistMenuItems 
    : patientMenuItems;

  const sidebarStyle = {
    "--sidebar-width": "280px",
    "--sidebar-width-icon": "4rem",
  };

  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return t('navigation.roles.admin');
      case "psychologist":
        return t('navigation.roles.psychologist');
      default:
        return t('navigation.roles.patient');
    }
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold">KhunJit</span>
                <p className="text-xs text-muted-foreground">{getRoleLabel()} Paneli</p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{t('navigation.menuLabel')}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url}
                        tooltip={item.title}
                      >
                        <Link href={item.url} data-testid={`nav-${item.url.split('/').pop()}`}>
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-2" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                    </span>
                    <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {role !== "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="flex items-center gap-2" data-testid="menu-profile">
                      <User className="w-4 h-4" />
                      {t(`navigation.${role}.profile`)}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    href={role === "admin" ? "/admin/settings" : "/dashboard/settings"}
                    className="flex items-center gap-2"
                    data-testid="menu-settings"
                  >
                    <Settings className="w-4 h-4" />
                    {t(`navigation.${role}.settings`)}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive"
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t(`navigation.${role}.logout`)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 gap-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-2 md:p-6">
            <div className="overflow-hidden">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
