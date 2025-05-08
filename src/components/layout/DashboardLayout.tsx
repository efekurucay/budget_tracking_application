import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  BarChart2, 
  Home, 
  PieChart, 
  Wallet, 
  Target, 
  Users, 
  Settings, 
  LogOut,
  MessageSquare,
  Award,
  Bell,
  User,
  ShieldAlert,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, to, active }) => {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-g15-primary text-white"
          : "text-gray-700 hover:bg-g15-primary/10"
      )}
    >
      <div className="mr-3 text-lg">{icon}</div>
      <span>{label}</span>
    </Link>
  );
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    {
      icon: <Home size={20} />,
      label: t("dashboard.pageTitle", "Dashboard"),
      to: "/dashboard",
    },
    {
      icon: <Wallet size={20} />,
      label: t("transactions.pageTitle", "Transactions"),
      to: "/transactions",
    },
    {
      icon: <Target size={20} />,
      label: t("goals.pageTitle", "Goals"),
      to: "/goals",
    },
    {
      icon: <PieChart size={20} />,
      label: t("budget.pageTitle", "Budget"),
      to: "/budget",
    },
    {
      icon: <BarChart2 size={20} />,
      label: t("reports.pageTitle", "Reports"),
      to: "/reports",
    },
    {
      icon: <Users size={20} />,
      label: t("group.pageTitle", "Groups"),
      to: "/groups",
    },
    {
      icon: <Award size={20} />,
      label: "Showcase",
      to: "/showcase",
    },
  ];
  
  // Add premium items for Pro users
  const premiumItems = user?.isPro ? [
    {
      icon: <MessageSquare size={20} />,
      label: t("aiAssistant.pageTitle", "AI Assistant"),
      to: "/ai-assistant",
    }
  ] : [];

  // Add admin items
  const adminItems = user?.isAdmin ? [
    {
      icon: <ShieldAlert size={20} />,
      label: t("admin.pageTitle", "Admin Dashboard"),
      to: "/admin",
    }
  ] : [];

  const getInitials = () => {
    if (!user) return "G";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 md:flex-row">
      {/* Mobile Header */}
      {isMobile && (
        <header className="flex items-center justify-between border-b bg-white p-4 md:hidden">
          <Logo />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <Logo />
                  {user?.isPro && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-g15-accent text-g15-accent-foreground">
                      PRO
                    </span>
                  )}
                  {user?.isAdmin && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-white">
                      ADMIN
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                  {navItems.map((item) => (
                    <NavItem
                      key={item.to}
                      icon={item.icon}
                      label={item.label}
                      to={item.to}
                      active={location.pathname === item.to}
                    />
                  ))}
                  
                  {premiumItems.length > 0 && (
                    <>
                      <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500">
                        PRO FEATURES
                      </div>
                      {premiumItems.map((item) => (
                        <NavItem
                          key={item.to}
                          icon={item.icon}
                          label={item.label}
                          to={item.to}
                          active={location.pathname === item.to}
                        />
                      ))}
                    </>
                  )}
                  
                  {adminItems.length > 0 && (
                    <>
                      <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500">
                        ADMIN
                      </div>
                      {adminItems.map((item) => (
                        <NavItem
                          key={item.to}
                          icon={item.icon}
                          label={item.label}
                          to={item.to}
                          active={location.pathname === item.to}
                        />
                      ))}
                    </>
                  )}
                </div>

                <div className="p-4 border-t mt-auto">
                  {!user?.isPro && (
                    <Button
                      variant="outline"
                      className="w-full mb-4 border-g15-accent text-g15-accent hover:bg-g15-accent hover:text-g15-accent-foreground"
                      onClick={() => {
                        navigate("/upgrade");
                        setIsOpen(false);
                      }}
                    >
                      {t("upgrade.upgradeToPro", "Upgrade to Pro")}
                    </Button>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="bg-g15-primary text-white">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{user?.firstName} {user?.lastName}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[120px]">{user?.email}</div>
                      </div>
                    </div>

                    <div className="flex space-x-1">
                      <LanguageSwitcher />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout}>
                        <LogOut size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-64 bg-white border-r shadow-sm flex flex-col h-full hidden md:flex">
          <div className="p-4 border-b">
            <Logo />
            {user?.isPro && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-g15-accent text-g15-accent-foreground">
                PRO
              </span>
            )}
            {user?.isAdmin && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-white">
                ADMIN
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => (
              <NavItem
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                active={location.pathname === item.to}
              />
            ))}
            
            {premiumItems.length > 0 && (
              <>
                <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500">
                  PRO FEATURES
                </div>
                {premiumItems.map((item) => (
                  <NavItem
                    key={item.to}
                    icon={item.icon}
                    label={item.label}
                    to={item.to}
                    active={location.pathname === item.to}
                  />
                ))}
              </>
            )}
            
            {adminItems.length > 0 && (
              <>
                <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-500">
                  ADMIN
                </div>
                {adminItems.map((item) => (
                  <NavItem
                    key={item.to}
                    icon={item.icon}
                    label={item.label}
                    to={item.to}
                    active={location.pathname === item.to}
                  />
                ))}
              </>
            )}
          </div>

          <div className="p-4 border-t mt-auto">
            {!user?.isPro && (
              <Button
                variant="outline"
                className="w-full mb-4 border-g15-accent text-g15-accent hover:bg-g15-accent hover:text-g15-accent-foreground"
                onClick={() => navigate("/upgrade")}
              >
                {t("upgrade.upgradeToPro", "Upgrade to Pro")}
              </Button>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback className="bg-g15-primary text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{user?.firstName} {user?.lastName}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[120px]">{user?.email}</div>
                </div>
              </div>

              <div className="flex space-x-1">
                <LanguageSwitcher />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("settings.pageTitle", "My Account")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User size={16} className="mr-2" />
                      {t("settings.profile", "Profile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/notifications")}>
                      <Bell size={16} className="mr-2" />
                      {t("notifications.pageTitle", "Notifications")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings size={16} className="mr-2" />
                      {t("settings.pageTitle", "Settings")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut size={16} className="mr-2" />
                      {t("auth.logout", "Logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
