import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import type { Module } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  TrendingUp,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems: { href: string; icon: React.ComponentType<any>; label: string; module: Module }[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" },
  { href: "/students", icon: GraduationCap, label: "Students", module: "students" },
  { href: "/teachers", icon: Users, label: "Teachers", module: "teachers" },
  { href: "/classes", icon: BookOpen, label: "Classes & Subjects", module: "classes" },
  { href: "/attendance", icon: ClipboardList, label: "Attendance", module: "attendance" },
  { href: "/fees", icon: DollarSign, label: "Fees & Payments", module: "fees" },
  { href: "/results", icon: BarChart3, label: "Results", module: "results" },
  { href: "/report-cards", icon: FileText, label: "Report Cards", module: "reportCards" },
  { href: "/reports", icon: TrendingUp, label: "Reports", module: "reports" },
  { href: "/settings", icon: Settings, label: "Settings", module: "settings" },
];

const roleColors: Record<string, string> = {
  admin: "bg-blue-600 text-white border-blue-500",
  headteacher: "bg-purple-600 text-white border-purple-500",
  teacher: "bg-emerald-600 text-white border-emerald-500",
  accountant: "bg-amber-500 text-white border-amber-400",
  student: "bg-sky-500 text-white border-sky-400",
  parent: "bg-rose-500 text-white border-rose-400",
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, can } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = navItems.filter((item) => can(item.module));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex-col bg-sidebar transition-transform duration-300 lg:static lg:flex lg:translate-x-0",
          mobileOpen ? "flex translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-sidebar-foreground leading-tight">SchoolPro GH</div>
            <div className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wider">Management System</div>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-2">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center text-sidebar-foreground text-xs font-bold flex-shrink-0">
              {user?.fullName?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-sidebar-foreground truncate">{user?.fullName}</div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-4 px-1.5 border capitalize mt-0.5",
                  roleColors[user?.role ?? ""] ?? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border"
                )}
              >
                {user?.role}
              </Badge>
            </div>
            <button
              onClick={logout}
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Shield className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">SchoolPro GH</div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
