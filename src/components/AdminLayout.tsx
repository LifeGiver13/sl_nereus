
import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(() => {
      return (
        localStorage.getItem("sidebarCollapsed") ===
        "true"
      );
    });

  const toggleSidebar = () => {
    const next = !isSidebarCollapsed;

    setIsSidebarCollapsed(next);

    localStorage.setItem(
      "sidebarCollapsed",
      String(next)
    );
  };
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
