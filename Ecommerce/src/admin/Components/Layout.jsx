// src/components/Layout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen((v) => !v)} />
      {/* Burger/X button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-2 rounded-md bg-[#e7e0cf] text-[#5c5042] shadow transition-all"
        >
          {/* X icon */}
          <svg
            className="w-6 h-6 transition-transform duration-300 rotate-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "sm:ml-64" : ""}`}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
