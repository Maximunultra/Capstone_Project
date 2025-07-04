// src/components/Layout.jsx
import React from "react";
import Sidebar from "./Sidebar";

const AdminLayout = ({ children }) => {
  return (
    <div className="flex">
      {/* Fixed sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 z-20 bg-white shadow">
        <Sidebar />
      </div>
      {/* Main content with left margin to accommodate sidebar */}
      <div className="flex-1 p-6 bg-gray-100 min-h-screen ml-64">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
