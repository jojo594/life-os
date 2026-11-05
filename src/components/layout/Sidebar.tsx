import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  Briefcase,
  Building2,
  Network,
  Dumbbell,
  Languages,
  TrendingUp,
  Megaphone,
  BookOpen,
  NotebookPen,
  Lightbulb,
  Map,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}
interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: "Core",
    items: [
      { to: "/", label: "Command", icon: LayoutDashboard },
      { to: "/roadmap", label: "Master Roadmap", icon: Map },
      { to: "/plan", label: "AI Plan", icon: Sparkles },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Build",
    items: [
      { to: "/university", label: "University", icon: GraduationCap },
      { to: "/skills", label: "Skill Tree", icon: Network },
      { to: "/business", label: "Business", icon: Briefcase },
      { to: "/career", label: "Career", icon: Building2 },
    ],
  },
  {
    label: "Body & Mind",
    items: [
      { to: "/fitness", label: "Fitness", icon: Dumbbell },
      { to: "/languages", label: "Languages", icon: Languages },
      { to: "/finance", label: "Finance", icon: TrendingUp },
    ],
  },
  {
    label: "Brand & Knowledge",
    items: [
      { to: "/brand", label: "Personal Brand", icon: Megaphone },
      { to: "/reading", label: "Reading", icon: BookOpen },
      { to: "/journal", label: "Journal", icon: NotebookPen },
      { to: "/ideas", label: "Idea Notebook", icon: Lightbulb },
    ],
  },
];

export const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNav } =
    useStore();

  return (
    <>
      {/* Mobile scrim */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileNav(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 z-40 h-screen glass",
          "transition-transform lg:transition-all duration-200 w-[240px]",
          // mobile slide in/out
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // desktop collapse width
          sidebarCollapsed ? "lg:w-[68px]" : "lg:w-[240px]"
        )}
        style={{ borderTop: 0, borderBottom: 0, borderLeft: 0 }}
      >
        <div className="h-16 flex items-center px-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-ink-800 border border-cyan/35 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-cyan" strokeWidth={1.75} />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col leading-tight">
                <span className="text-[14px] font-medium tracking-tight text-ink-50">
                  Life OS
                </span>
                <span className="font-serif italic text-[11px] text-ink-300 mt-0.5">
                  command center
                </span>
              </div>
            )}
          </div>
          {/* desktop collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="ml-auto w-7 h-7 rounded-lg hidden lg:flex items-center justify-center text-ink-300 hover:bg-ink-50/[0.06] hover:text-ink-50 transition-colors"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 transition-transform",
                sidebarCollapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        <nav className="px-2.5 py-3 space-y-5 overflow-y-auto h-[calc(100vh-4rem)]">
          {sections.map((section) => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <div className="px-2.5 pb-2 font-serif italic text-[12px] font-light text-ink-400 lowercase">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setMobileNav(false)}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] transition-all duration-200",
                        isActive
                          ? "bg-ink-50/[0.06] text-ink-50 border border-ink-50/10"
                          : "text-ink-200 hover:bg-ink-50/[0.04] hover:text-ink-50 border border-transparent"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            "w-[18px] h-[18px] shrink-0 transition-colors",
                            isActive ? "text-cyan" : "text-ink-300 group-hover:text-ink-100"
                          )}
                          strokeWidth={isActive ? 2.25 : 1.75}
                        />
                        {!sidebarCollapsed && (
                          <span className="truncate font-medium">{item.label}</span>
                        )}
                        {isActive && !sidebarCollapsed && (
                          <span className="ml-auto w-1 h-1 rounded-full bg-cyan" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};
