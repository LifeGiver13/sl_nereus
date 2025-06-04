
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building2, 
  Briefcase, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NEREUS_LOGO_URL } from '../config/env';

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Applications', href: '/applications' },
  { icon: Users, label: 'Candidates', href: '/candidates' },
  { icon: Building2, label: 'Clients', href: '/clients' },
  { icon: Briefcase, label: 'Jobs', href: '/jobs' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  return (
    <div className={cn(
      "bg-[#000009] border-r border-[#712B71] transition-all duration-300 flex flex-col min-h-screen",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[#712B71]">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <img 
                src={NEREUS_LOGO_URL} 
                alt="Nereus" 
                className="h-8 w-8"
              />
              <span className="text-white font-bold text-lg">Nereus</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="text-[#45f0df] hover:bg-[#712B71] p-1"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && user && (
        <div className="p-4 border-b border-[#712B71]">
          <div className="text-sm text-[#45f0df]">Welcome back,</div>
          <div className="text-white font-medium">{user.username}</div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link to={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left hover:bg-[#712B71] hover:text-white transition-colors",
                      isActive 
                        ? "bg-[#712B71] text-white" 
                        : "text-gray-300",
                      isCollapsed ? "px-2" : "px-3"
                    )}
                  >
                    <Icon size={20} className={cn(isCollapsed ? "" : "mr-3")} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-[#712B71]">
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "w-full justify-start text-red-400 hover:bg-red-500/20 hover:text-red-300",
            isCollapsed ? "px-2" : "px-3"
          )}
        >
          <LogOut size={20} className={cn(isCollapsed ? "" : "mr-3")} />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default AdminSidebar;
