import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  Move3D, 
  BarChart4,
  ShoppingCart, 
  Truck,
  LogOut,
  Menu
} from 'lucide-react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      {/* Sidebar */}
      <div
        className={`bg-gray-900 text-gray-300 w-64 space-y-2 px-2 py-5 min-h-screen transition-all duration-300 ${
          isOpen ? "block" : "hidden sm:block"
        }`}
      >
        {/* Brand Logo */}
        <div className="text-2xl font-bold text-white px-4 py-2 mb-6">
          Multi-Warehouse
        </div>
        
        <div className="space-y-1">
          {/* Dashboard */}
          <Link 
            to="/" 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 ${
              currentPath === "/" ? "bg-gray-800 text-white" : ""
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          
          {/* Inventory (Products) */}
          <Link 
            to="/products" 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 ${
              currentPath === "/products" ? "bg-gray-800 text-white" : ""
            }`}
          >
            <Package className="w-5 h-5 mr-3" />
            Inventory
          </Link>
          
          {/* Warehouses */}
          <Link 
            to="/warehouses" 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 ${
              currentPath === "/warehouses" ? "bg-gray-800 text-white" : ""
            }`}
          >
            <Warehouse className="w-5 h-5 mr-3" />
            Warehouses
          </Link>
          
          {/* Transfers */}
          <Link 
            to="/stock-movement" 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 ${
              currentPath === "/stock-movement" ? "bg-gray-800 text-white" : ""
            }`}
          >
            <Move3D className="w-5 h-5 mr-3" />
            Transfers
          </Link>
          
          {/* Reports/Analytics */}
          <Link 
            to="/low-stock" 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 ${
              currentPath === "/low-stock" ? "bg-gray-800 text-white" : ""
            }`}
          >
            <BarChart4 className="w-5 h-5 mr-3" />
            Reports
          </Link>
          
          {/* Order */}
          <Link 
            to="/order" 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 ${
              currentPath === "/order" ? "bg-gray-800 text-white" : ""
            }`}
          >
            <ShoppingCart className="w-5 h-5 mr-3" />
            Order
          </Link>
          
          {/* Supplier */}
          <Link 
            to="/supplier" 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 ${
              currentPath === "/supplier" ? "bg-gray-800 text-white" : ""
            }`}
          >
            <Truck className="w-5 h-5 mr-3" />
            Supplier
          </Link>

           <Link 
            to="/users" 
            className={`flex items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 ${
              currentPath === "/supplier" ? "bg-gray-800 text-white" : ""
            }`}
          >
            <Truck className="w-5 h-5 mr-3" />
            Users
          </Link>
          {/* Logout Button */}
          <button
            className="flex w-full items-center py-3 px-4 rounded-lg hover:bg-gray-800 transition duration-200 text-left"
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile toggle button */}
      <button 
        onClick={toggleSidebar} 
        className="sm:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-900 text-white"
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Sidebar;