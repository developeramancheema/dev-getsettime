"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../providers/AuthProvider";
import { useWorkspaceSettings } from "../../hooks/useWorkspaceSettings";
import { useSubscription } from "@/src/hooks/useSubscription";
import { formatRoleLabel, ROLE_STAFF } from "@/src/constants/roles";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

function ProgressRing({ percent, label }: { percent: number; label: string }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative h-12 w-12">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900">
          {percent}%
        </span>
      </div>
      <span className={`text-xs font-medium ${percent >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
        {label}
      </span>
    </div>
  );
}

function MenuRow({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  return (
    <Link href={item.href} onClick={onNavigate} className="flex items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50/80">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{item.icon}</span>
      <span className="flex-1 text-xs sm:text-sm text-gray-800">{item.label}</span>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </Link>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "WS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user } = useAuth();
  const { workspaceName, general, availability, loading: loadingSettings } = useWorkspaceSettings();
  const { data: subscription } = useSubscription(isOpen);

  const isStaff = user?.user_metadata?.role === ROLE_STAFF;
  const role = (user?.user_metadata?.role as string | undefined) ?? undefined;

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Workspace";

  const accountName = workspaceName || general.accountName || "GetSetTime";
  const workspaceLabel = accountName.includes("Workspace")
    ? accountName
    : `${displayName}'s Workspace`;

  const planLabel = subscription?.plan?.name?.trim()
    ? `${subscription.plan.name} Plan`
    : "Free Plan";

  const roleLabel = role ? formatRoleLabel(role) : "Workspace Owner";

  const readinessPercent = useMemo(() => {
    if (loadingSettings) return 0;
    let score = 0;
    if (accountName && accountName !== "GetSetTime") score += 25;
    if (general.accountName || general.timezone) score += 25;
    if (availability && Object.keys(availability).length > 0) score += 25;
    if (subscription?.plan?.name) score += 25;
    return score;
  }, [accountName, general, availability, subscription, loadingSettings]);

  const readinessLabel = readinessPercent >= 80 ? "Ready" : "Setup";

  const handleNavigate = () => onClose?.();

  const setupItems: MenuItem[] = [
    {
      href: "/services",
      label: "Services",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          <rect width="20" height="14" x="2" y="6" rx="2" />
        </svg>
      ),
    },
    {
      href: "/team-members",
      label: "Providers",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: "/event-type",
      label: "Event Types",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/intakeform",
      label: "Forms",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
      ),
    },
  ];

  const automationItems: MenuItem[] = [
    {
      href: "/workflows",
      label: "Workflows",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
      ),
    },
    {
      href: "/integrations",
      label: "Integrations",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v16.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 12h4" />
          <path d="M10 16h4" />
        </svg>
      ),
    },
    {
      href: "/notifications",
      label: "Reminders",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      ),
    },
  ];

  const adminItems: MenuItem[] = [
    {
      href: "/team-members",
      label: "Team Members",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: "/billings",
      label: "Billing & Plans",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      ),
    },
    {
      href: "/bookings",
      label: "Reports",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <line x1="12" x2="12" y1="20" y2="10" />
          <line x1="18" x2="18" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="16" />
        </svg>
      ),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ];

  const intelligenceItems: MenuItem[] = [
    {
      href: "/integrations",
      label: "Workspace Health",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
        </svg>
      ),
    },
    {
      href: "/settings",
      label: "AI Setup Assistant",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m15 4 1 1 1-1" />
          <path d="m15 4-1 1-1-1" />
          <path d="M9 20h6" />
          <path d="M12 20V8" />
          <path d="m6.5 8 1.5-3 1.5 3" />
          <path d="m15.5 8-1.5-3-1.5 3" />
        </svg>
      ),
    },
    {
      href: "/bookings/new",
      label: "Quick Book with AI",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </svg>
      ),
    },
  ];

  const sections: MenuSection[] = [{ title: "Setup", items: setupItems }];
  if (!isStaff) {
    sections.push(
      { title: "Automation", items: automationItems },
      { title: "Admin", items: adminItems },
      { title: "Intelligence", items: intelligenceItems }
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-16 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 overflow-y-auto bg-slate-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More menu">
      <div className="space-y-4 px-4 py-5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">More</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your workspace and settings.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <Link href="/settings" onClick={handleNavigate} className="flex items-center gap-1">
                <span className="truncate text-[15px] font-semibold text-slate-900">{workspaceLabel}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
                  {planLabel}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  {roleLabel}
                </span>
              </div>
            </div>
            <ProgressRing percent={readinessPercent} label={readinessLabel} />
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {section.items.map((item) => (
                <MenuRow key={`${section.title}-${item.label}`} item={item} onNavigate={handleNavigate} />
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3z" />
                <path d="M21 11h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3z" />
                <path d="M12 11a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z" />
                <path d="M12 3v2" />
                <path d="M12 19v2" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Need help?</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                Visit our Help Center or contact support for assistance.
              </p>
            </div>
            <a
              href="mailto:support@getsettime.com"
              className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
