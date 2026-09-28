import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Map,
  BarChart2,
  Bell,
  ScrollText,
  Search,
  ShieldAlert,
  LogOut,
  Cpu,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const mainNavItems = [
    { icon: Map, path: '/dashboard', tooltip: 'Map View' },
    { icon: BarChart2, path: '/analytics', tooltip: 'Analytics' },
    { icon: Bell, path: '/alerts', tooltip: 'Alerts' },
    { icon: ScrollText, path: '/logs', tooltip: 'Audit Log' },
    { icon: Search, path: '/search', tooltip: 'Plate Search' },
    { icon: ShieldAlert, path: '/restricted', tooltip: 'Restricted Vehicles' },
    { icon: Cpu, path: '/ai-detection', tooltip: 'Live AI Detection' },
  ];

  return (
    <aside className="w-16 h-full bg-[#141414] border-r border-[#222222] flex flex-col justify-between shrink-0 select-none py-4 z-20">
      {/* Top Nav Items */}
      <nav className="flex flex-col items-center gap-2 w-full px-2.5">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={item.tooltip}
              className={cn(
                'w-full h-11 flex items-center justify-center transition-all duration-150 relative rounded-[6px]',
                isActive
                  ? 'bg-[#2A2A2A] text-[#F0F0F0] shadow-sm'
                  : 'text-[#888888] hover:text-[#E0E0E0] hover:bg-[#1C1C1C]'
              )}
            >
              {/* Active indicator strip */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-[#3B82F6] rounded-r-full" />
              )}
              <Icon size={20} strokeWidth={1.5} />
            </button>
          );
        })}
      </nav>

      {/* Bottom Nav Items */}
      <div className="flex flex-col items-center gap-2 w-full px-2.5">
        <div className="w-8 h-[1px] bg-[#2A2A2A] mb-2" />

        <button
          onClick={logout}
          title="Sign out"
          className="w-full h-11 flex items-center justify-center rounded-[6px] text-[#EF4444] hover:bg-[#2A1010] hover:text-[#F87171] transition-all duration-150"
        >
          <LogOut size={20} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
