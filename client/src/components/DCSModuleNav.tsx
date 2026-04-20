// DCSModuleNav — Cross-module navigation bar for all DCS Command Suite modules
// Drop this file into any module at client/src/components/DCSModuleNav.tsx
// Then render <DCSModuleNav currentModule="command_centre" /> at the top of the app shell.

import { useState, useEffect, useRef } from "react";

type ModuleEntry = {
  key: string;
  label: string;
  shortLabel: string;
  url: string;
  icon: string; // SVG path data
};

const AUTH_PORTAL_URL = "https://dcs-command-suite-auth-production.up.railway.app/";

const LIVE_MODULES: ModuleEntry[] = [
  {
    key: "command_centre",
    label: "Command Centre",
    shortLabel: "Command",
    url: "https://dcs-logistics-production-a167.up.railway.app/",
    // LayoutGrid icon
    icon: "M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z",
  },
  {
    key: "recruitment_compliance",
    label: "Recruitment & Compliance",
    shortLabel: "Recruit",
    url: "https://dcs-recruitment-compliance-production.up.railway.app/",
    // ShieldCheck icon
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-1.5-6l4-4-1.4-1.4-2.6 2.6-1.3-1.3L7.8 13.3l2.7 2.7z",
  },
  {
    key: "fleet_management",
    label: "Fleet Management",
    shortLabel: "Fleet",
    url: "https://dcs-fleet-production.up.railway.app/#/",
    // Truck icon
    icon: "M1 3h15v13H1V3zm15 5h4l3 4v4h-2m-3 0H7m0 0a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z",
  },
  {
    key: "amazon_management",
    label: "Amazon Management",
    shortLabel: "Amazon",
    url: "https://dcs-logistics-portal-production.up.railway.app/#/",
    // Package icon
    icon: "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  },
  {
    key: "roster_control",
    label: "Roster & Control",
    shortLabel: "Roster",
    url: "https://dcs-roster-production.up.railway.app/",
    // CalendarCheck icon
    icon: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18m-9 4l2 2 4-4",
  },
  {
    key: "same_day",
    label: "Same Day",
    shortLabel: "Same Day",
    url: "https://dcs-sameday-production.up.railway.app/",
    // Clock icon
    icon: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4v6l4 2",
  },
];

export default function DCSModuleNav({ currentModule }: { currentModule: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [open]);

  const currentMod = LIVE_MODULES.find(m => m.key === currentModule);

  return (
    <div
      style={{
        position: "relative",
        zIndex: 9999,
        width: "100%",
        height: 36,
        minHeight: 36,
        background: "linear-gradient(135deg, hsl(170 30% 6%), hsl(170 25% 8%))",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 12,
        gap: 0,
        flexShrink: 0,
      }}
    >
      {/* DCS Logo / Home link */}
      <a
        href={AUTH_PORTAL_URL}
        title="Back to DCS Command Suite"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          textDecoration: "none",
          color: "hsl(160 65% 45%)",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "-0.01em",
          padding: "4px 8px 4px 4px",
          borderRadius: 4,
          transition: "background 0.15s",
          marginRight: 4,
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
          <path d="M8 8 L20 4 L20 18 L8 14Z" fill="hsl(160 65% 38%)" opacity="0.9" />
          <path d="M20 4 L32 8 L32 22 L20 18Z" fill="hsl(160 65% 45%)" opacity="0.8" />
          <path d="M8 18 L20 22 L20 36 L8 32Z" fill="hsl(160 65% 30%)" opacity="0.7" />
          <path d="M20 22 L32 26 L32 36 L20 36Z" fill="hsl(160 65% 38%)" opacity="0.6" />
        </svg>
        <span style={{ display: "inline-block" }}>DCS</span>
      </a>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", marginRight: 4, flexShrink: 0 }} />

      {/* Module switcher dropdown */}
      <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 4,
            border: "none",
            background: open ? "rgba(255,255,255,0.08)" : "transparent",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
        >
          {currentMod?.shortLabel ?? "Module"}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              minWidth: 220,
              background: "hsl(170 30% 9%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              overflow: "hidden",
              padding: 4,
            }}
          >
            {LIVE_MODULES.map(mod => {
              const isCurrent = mod.key === currentModule;
              return (
                <a
                  key={mod.key}
                  href={mod.url}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 6,
                    textDecoration: "none",
                    color: isCurrent ? "hsl(160 65% 50%)" : "rgba(255,255,255,0.7)",
                    fontSize: 12,
                    fontWeight: isCurrent ? 600 : 400,
                    background: isCurrent ? "rgba(26,122,94,0.12)" : "transparent",
                    transition: "background 0.12s",
                    cursor: isCurrent ? "default" : "pointer",
                  }}
                  onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                  onClick={e => { if (isCurrent) e.preventDefault(); setOpen(false); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isCurrent ? "hsl(160 65% 50%)" : "rgba(255,255,255,0.45)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={mod.icon} />
                  </svg>
                  <span style={{ flex: 1 }}>{mod.label}</span>
                  {isCurrent && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "hsl(160 65% 45%)",
                      background: "rgba(26,122,94,0.15)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      letterSpacing: "0.03em",
                    }}>
                      CURRENT
                    </span>
                  )}
                </a>
              );
            })}

            {/* Divider + back to portal */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
            <a
              href={AUTH_PORTAL_URL}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 6,
                textDecoration: "none",
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                fontWeight: 500,
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
              </svg>
              <span>Back to Command Suite Portal</span>
            </a>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Quick module links — desktop only */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }} className="dcs-module-nav-links">
        {LIVE_MODULES.filter(m => m.key !== currentModule).map(mod => (
          <a
            key={mod.key}
            href={mod.url}
            title={mod.label}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              textDecoration: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: 10,
              fontWeight: 500,
              transition: "background 0.12s, color 0.12s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            {mod.shortLabel}
          </a>
        ))}
      </div>

      {/* Inline responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .dcs-module-nav-links { display: none !important; }
        }
      `}</style>
    </div>
  );
}
