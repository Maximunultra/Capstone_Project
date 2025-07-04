// src/components/Layout.jsx
import React from "react";


const BuyerLayout = ({ children }) => {
  return (
    <div className="flex">
      {/* Main content with left margin to accommodate sidebar */}
      <div className="flex-1 p-6 bg-gray-100 min-h-screen ml-64">
        {children}
      </div>
    </div>
  );
};

export default BuyerLayout;
