import { Database, Layers, LayoutDashboard, PlusCircle, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/locations/new", label: "New Location", icon: PlusCircle },
  { to: "/master-data", label: "Master Data", icon: Database },
  { to: "/bulk", label: "Bulk Builder", icon: Layers },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storiq-app">
      <header className="storiq-header">
        <div className="storiq-header-inner">
          <div className="storiq-brand">
            <img
              src="/brand-logo-header.png"
              alt="StorIQ"
              className="storiq-brand-logo"
              width={118}
              height={40}
            />
            <div>
              <div className="storiq-brand-title">StorIQ</div>
              <div className="storiq-brand-subtitle">Location SEO Builder · My Garage Self Storage</div>
            </div>
          </div>
          <div className="storiq-header-actions">
            <ThemeToggle />
            <nav className="storiq-nav" aria-label="Main navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `storiq-nav-link${isActive ? " storiq-nav-link--active" : ""}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="storiq-main">{children}</main>
    </div>
  );
}
