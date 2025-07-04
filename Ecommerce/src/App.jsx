// App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";

// Admin Components
import AdminDashboard from "./admin/Pages/Dashboard";
import AdminLayout from "./admin/Components/Layout";

// Buyer Components
import BuyerDashboard from "./user_buyer/Pages/Dashboard";
import LandingLayout from "./user_buyer/Components/LandingLayout";

// Seller Components
import SellerDashboard from "./user_seller/Pages/Dashboard";
import SellerLayout from "./user_seller/Components/Layout";

// Shared Components
import Login from "./Login";
import ForgotPassword from "./Components/ForgotPassword";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setIsAuthenticated(true);
      setUserRole(userData.role);
    }
  }, []);

  const handleAuthChange = (authStatus, role) => {
    setIsAuthenticated(authStatus);
    setUserRole(role);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onAuthChange={handleAuthChange} />} />

        <Route 
          path="/forgot-password" 
          element={<ForgotPassword />} 
        />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <PrivateRoute isAuthenticated={isAuthenticated} allowedRole="admin" userRole={userRole}>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
              </Routes>
            </AdminLayout>
          </PrivateRoute>
        } />

        {/* Seller Routes */}
        <Route path="/seller/*" element={
          <PrivateRoute isAuthenticated={isAuthenticated} allowedRole="seller" userRole={userRole}>
            <SellerLayout>
              <Routes>
                <Route path="/" element={<SellerDashboard />} />
                <Route path="/dashboard" element={<SellerDashboard />} />
              </Routes>
            </SellerLayout>
          </PrivateRoute>
        } />

        {/* Buyer Routes - Default for authenticated buyers and public access */}
        <Route path="/buyer/*" element={
          <LandingLayout onAuthChange={handleAuthChange} isAuthenticated={isAuthenticated} userRole={userRole}>
            <Routes>
              <Route path="/" element={<BuyerDashboard />} />
              {/* <Route path="/dashboard" element={<BuyerDashboard />} /> */}
            </Routes>
          </LandingLayout>
        } />

        {/* Default Route - Always show Buyer UI */}
        <Route path="/" element={
          isAuthenticated && userRole !== 'buyer' ? (
            <Navigate to={`/${userRole}`} replace />
          ) : (
            <Navigate to="/buyer" replace />
          )
        } />

        {/* Catch all route */}
        <Route path="*" element={
          isAuthenticated ? (
            <Navigate to={`/${userRole}`} replace />
          ) : (
            <Navigate to="/buyer" replace />
          )
        } />
      </Routes>
    </Router>
  );
};

const PrivateRoute = ({ children, isAuthenticated, allowedRole, userRole }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== allowedRole) return <Navigate to={`/${userRole}`} replace />;
  return children;
};

export default App;