import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const patientMenuItems = [
  { title: "Ana Sayfa", url: "/dashboard", icon: Home },
  { title: "Psikolog Bul", url: "/dashboard/psychologists", icon: Search },
  { title: "Randevularım", url: "/dashboard/appointments", icon: Calendar },
  { title: "Mesajlar", url: "/dashboard/messages", icon: MessageCircle },
  { title: "Ödeme Geçmişi", url: "/dashboard/payments", icon: CreditCard },
];

const psychologistMenuItems = [
  { title: "Ana Sayfa", url: "/dashboard", icon: Home },
  { title: "Randevular", url: "/dashboard/appointments", icon: Calendar },
  { title: "Müsaitlik", url: "/dashboard/availability", icon: Clock },
  { title: "Mesajlar", url: "/dashboard/messages", icon: MessageCircle },
  { title: "Seans Notları", url: "/dashboard/notes", icon: FileText },
  { title: "Kazançlar", url: "/dashboard/earnings", icon: DollarSign },
];

const adminMenuItems = [
  { title: "Genel Bakış", url: "/dashboard", icon: BarChart3 },
  { title: "Kullanıcılar", url: "/dashboard/users", icon: Users },
  { title: "Psikolog Doğrulama", url: "/dashboard/verify", icon: CheckCircle },
  { title: "Randevular", url: "/dashboard/appointments", icon: Calendar },
  { title: "Ödemeler", url: "/dashboard/payments", icon: CreditCard },
  { title: "Şikayet Mesajları", url: "/dashboard/reports", icon: AlertCircle },
  { title: "Denetim Günlüğü", url: "/dashboard/audit", icon: Shield },
  { title: "Ayarlar", url: "/dashboard/settings", icon: Settings },
];

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

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
        return "Yönetici";
      case "psychologist":
        return "Psikolog";
      default:
        return "Hasta";
    }
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold">MindWell</span>
                <p className="text-xs text-muted-foreground">{getRoleLabel()} Paneli</p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menü</SidebarGroupLabel>
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
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2" data-testid="menu-profile">
                    <User className="w-4 h-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2" data-testid="menu-settings">
                    <Settings className="w-4 h-4" />
                    Ayarlar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout()} 
                  className="text-destructive focus:text-destructive"
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 gap-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
