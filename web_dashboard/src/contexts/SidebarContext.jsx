import React, { createContext, useContext, useState } from 'react';

// Create context for sidebar state
const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarValue = {
    isCollapsed,
    setIsCollapsed,
    toggleSidebar: () => setIsCollapsed(!isCollapsed),
  };

  return (
    <SidebarContext.Provider value={sidebarValue}>
      {children}
    </SidebarContext.Provider>
  );
};
