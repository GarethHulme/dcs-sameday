import { type ReactNode, useState } from "react";
import { useAuth, type AuthUser } from "@/lib/auth";
import DCSModuleNav from "@/components/DCSModuleNav";
import { useTheme } from "@/lib/theme";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Briefcase, Users, FileText, Bell, ClipboardList,
  LogOut, Sun, Moon, Menu, X, Zap, UserPlus, ShieldCheck, BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface NavItem {
  label: string;
  href: string;
  icon: any;
}

function getNavItems(user: AuthUser): NavItem[] {
  if (user.role === "driver") {
    return [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Job Board", href: "/jobs", icon: Briefcase },
      { label: "My Jobs", href: "/my-jobs", icon: ClipboardList },
      { label: "Contracts", href: "/contracts", icon: FileText },
      { label: "Alerts", href: "/alerts", icon: Bell },
      { label: "Join Pool", href: "/register-pool", icon: UserPlus },
    ];
  }
  if (user.role === "client") {
    return [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Job Board", href: "/jobs", icon: Briefcase },
      { label: "Post Job", href: "/jobs/new", icon: Zap },
      { label: "Client Portal", href: "/client-portal", icon: BookOpen },
      { label: "Contracts", href: "/contracts", icon: FileText },
      { label: "Alerts", href: "/alerts", icon: Bell },
    ];
  }
  // osm / admin
  return [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Job Board", href: "/jobs", icon: Briefcase },
    { label: "Post Job", href: "/jobs/new", icon: Zap },
    { label: "Driver Pool", href: "/pool", icon: Users },
    { label: "Contracts", href: "/contracts", icon: FileText },
    { label: "Alerts", href: "/alerts", icon: Bell },
    ...(user.role === "admin" ? [{ label: "Audit Log", href: "/audit", icon: ShieldCheck }] : []),
  ];
}

function getMobileNavItems(user: AuthUser): NavItem[] {
  if (user.role === "driver") {
    return [
      { label: "Home", href: "/", icon: LayoutDashboard },
      { label: "Jobs", href: "/jobs", icon: Briefcase },
      { label: "My Jobs", href: "/my-jobs", icon: ClipboardList },
      { label: "Contracts", href: "/contracts", icon: FileText },
      { label: "Alerts", href: "/alerts", icon: Bell },
    ];
  }
  if (user.role === "client") {
    return [
      { label: "Home", href: "/", icon: LayoutDashboard },
      { label: "Jobs", href: "/jobs", icon: Briefcase },
      { label: "Portal", href: "/client-portal", icon: BookOpen },
      { label: "Contracts", href: "/contracts", icon: FileText },
      { label: "Alerts", href: "/alerts", icon: Bell },
    ];
  }
  return [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Jobs", href: "/jobs", icon: Briefcase },
    { label: "Pool", href: "/pool", icon: Users },
    { label: "Contracts", href: "/contracts", icon: FileText },
    { label: "Alerts", href: "/alerts", icon: Bell },
  ];
}

function roleLabel(role: string): string {
  switch (role) {
    case "driver": return "Driver";
    case "osm": return "Manager";
    case "admin": return "Administrator";
    case "client": return "Client";
    default: return role;
  }
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: alerts = [] } = useQuery<any[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 30000,
  });

  if (!user) return null;
  const navItems = getNavItems(user);
  const mobileNavItems = getMobileNavItems(user);
  const unread = (alerts as any[]).filter(a => !a.read).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }} className="bg-background">
      <DCSModuleNav currentModule="same_day" />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* ── Desktop Sidebar ────────────────────────────────── */}
      <aside className="dcs-sidebar" style={{ display: "flex", flexDirection: "column" }}>
        {/* Logo */}
        <div style={{ padding: "20px 24px 18px", borderBottom: "1px solid hsl(var(--sidebar-border))", display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="28" height="25" viewBox="0 0 58 52" fill="none" aria-label="DCS Logo" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4 C4 4 14 4 22 14 C26 19 26 26 26 26 C26 26 26 33 22 38 C14 48 4 48 4 48" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round" className="text-sidebar-foreground" />
            <path d="M54 4 C54 4 44 4 36 14 C32 19 32 26 32 26 C32 26 32 33 36 38 C44 48 54 48 54 48" stroke="hsl(var(--primary))" strokeWidth="7" fill="none" strokeLinecap="round" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground leading-tight">Same Day</p>
            <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3 }} className="text-muted-foreground">DCS Command Suite</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", flex: 1, padding: "8px 0" }}>
          {navItems.map(item => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`dcs-sidebar-nav-item ${active ? "active" : ""}`}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.label === "Alerts" && unread > 0 && (
                    <Badge variant="destructive" className="ml-auto text-[10px] h-5 px-1.5">{unread}</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div style={{ borderTop: "1px solid hsl(var(--sidebar-border))", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "hsl(var(--primary) / 0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "hsl(var(--primary))", flexShrink: 0
            }}>
              {user.name.charAt(0)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }} className="text-sidebar-foreground truncate">{user.name}</p>
              <p style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", lineHeight: 1.2 }}>{roleLabel(user.role)}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={toggle} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0", borderRadius: 4, background: "hsl(var(--sidebar-accent))", cursor: "pointer", border: "none" }}>
              {theme === "dark" ? <Sun size={12} className="text-muted-foreground" /> : <Moon size={12} className="text-muted-foreground" />}
            </button>
            <button onClick={logout} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0", borderRadius: 4, background: "hsl(var(--sidebar-accent))", cursor: "pointer", border: "none" }}>
              <LogOut size={12} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile overlay menu ────────────────────────────── */}
      {mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileMenuOpen(false)} />
          <aside style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 220, background: "hsl(var(--sidebar))", display: "flex", flexDirection: "column", zIndex: 310 }}>
            <div style={{ padding: "16px", borderBottom: "1px solid hsl(var(--sidebar-border))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p className="text-sm font-semibold">DCS Same Day</p>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <nav style={{ flex: 1, padding: "8px 0" }}>
              {navItems.map(item => {
                const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <div className={`dcs-sidebar-nav-item ${active ? "active" : ""}`}>
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div style={{ padding: "12px 16px", borderTop: "1px solid hsl(var(--sidebar-border))" }}>
              <button onClick={logout} className="dcs-sidebar-nav-item w-full">
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main area ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile topbar */}
        <div className="dcs-topbar">
          <button className="dcs-mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={18} className="text-foreground" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="18" viewBox="0 0 58 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4 C4 4 14 4 22 14 C26 19 26 26 26 26 C26 26 26 33 22 38 C14 48 4 48 4 48" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round" />
              <path d="M54 4 C54 4 44 4 36 14 C32 19 32 26 32 26 C32 26 32 33 36 38 C44 48 54 48 54 48" stroke="hsl(var(--primary))" strokeWidth="7" fill="none" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-semibold">Same Day</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={toggle}>
              {theme === "dark" ? <Sun size={16} className="text-muted-foreground" /> : <Moon size={16} className="text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="dcs-page-content">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="dcs-mobile-bottom-nav">
          {mobileNavItems.map(item => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                <Icon size={18} />
                {item.label}
                {item.label === "Alerts" && unread > 0 && (
                  <span style={{ position: "absolute", top: 4, right: "calc(50% - 20px)", background: "hsl(var(--destructive))", color: "white", borderRadius: "50%", width: 14, height: 14, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{unread}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      </div>
    </div>
  );
}
