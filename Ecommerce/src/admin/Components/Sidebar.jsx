import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Megaphone,
  MessageSquare,
  BarChart4,
  Users,
  Settings,
  LogOut,
  Menu
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar, userRole }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Get the role prefix from localStorage or props
  const rolePrefix = userRole || JSON.parse(localStorage.getItem("user") || '{}').role || 'buyer';

  const navItems = [
    { to: `/${rolePrefix}`, label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
    { to: `/${rolePrefix}/products`, label: "Products", icon: <Package className="w-5 h-5 mr-3" /> },
    // { to: `/${rolePrefix}/orders`, label: "Orders", icon: <ShoppingCart className="w-5 h-5 mr-3" /> },
    { to: `/${rolePrefix}/promotions`, label: "Promotions", icon: <Megaphone className="w-5 h-5 mr-3" /> },
    { to: `/${rolePrefix}/messages`, label: "Messages", icon: <MessageSquare className="w-5 h-5 mr-3" /> },
    { to: `/${rolePrefix}/analytics`, label: "Analytics", icon: <BarChart4 className="w-5 h-5 mr-3" /> },
    { to: `/${rolePrefix}/users`, label: "Sellers", icon: <Users className="w-5 h-5 mr-3" /> },
  ];

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full w-64 z-30 bg-[#e7e0cf] text-[#5c5042] shadow transition-transform duration-700
        ${isOpen ? "translate-x-0" : "-translate-x-64"}
      `}
    >
      <div className="flex items-center justify-between px-4 py-6 mb-4">
        <span className="text-base font-semibold">Artisan</span>
        {/* Burger/X button */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md bg-[#e7e0cf] text-[#5c5042] shadow-none focus:outline-none transition-all"
        >
          <Menu
            className={`w-6 h-6 transition-transform duration-1000 ${isOpen ? "" : "rotate-90"}`}
          />
        </button>
      </div>
      <nav>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex items-center px-3 py-2 rounded transition ${
                  currentPath === item.to
                    ? "bg-white font-semibold"
                    : "hover:bg-white"
                }`}
                onClick={isOpen && window.innerWidth < 640 ? toggleSidebar : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="absolute bottom-0 left-0 w-full px-4 pb-6">
        <hr className="my-4 border-[#d6d1c4]" />
        <Link
          to={`/${rolePrefix}/settings`}
          className={`flex items-center px-3 py-2 rounded hover:bg-white ${
            currentPath === `/${rolePrefix}/settings` ? "bg-white font-semibold" : ""
          }`}
          onClick={isOpen && window.innerWidth < 640 ? toggleSidebar : undefined}
        >
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </Link>
        <button
          className="flex w-full items-center px-3 py-2 rounded hover:bg-white mt-1"
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/login";
          }}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;