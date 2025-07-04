import React from "react";
import { Link } from "react-router-dom";

const LandingLayout = ({ children }) => (
  <div className="min-h-screen bg-[#f8f5f1] flex flex-col">
    {/* Top Navigation */}
    <nav className="flex items-center justify-between px-12 py-8 border-b border-gray-200">
      <div className="text-2xl font-bold text-[#5c5042]">Artisan</div>
      <div className="flex items-center gap-8">
        <Link to="/" className="text-[#c08a4b] font-medium">Home</Link>
        <Link to="/products" className="text-[#5c5042] hover:text-[#c08a4b]">Products</Link>
        <Link to="/about" className="text-[#5c5042] hover:text-[#c08a4b]">About</Link>
      </div>
      <div className="flex items-center gap-6">
        <button className="text-[#5c5042] hover:text-[#c08a4b]">
          <span className="material-icons">search</span>
        </button>
        <button className="text-[#5c5042] hover:text-[#c08a4b]">
          <span className="material-icons">shopping_cart</span>
        </button>
        <Link to="/login">
          <button className="bg-[#a48a6d] text-white px-5 py-2 rounded shadow font-medium hover:bg-[#c08a4b]">
            Sign In
          </button>
        </Link>
      </div>
    </nav>
    {/* Main Content */}
    <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
      {children}
    </main>
  </div>
);

export default LandingLayout;