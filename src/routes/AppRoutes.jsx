// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import NotFound from "../pages/NotFound";
import Layout from "../layouts/Layout";
import Users from "../pages/User";
import Dealers from "../pages/Dealers";
import DealerDetails from "../pages/DealerDetails";
import Products from "../pages/Products";
import ProductDetails from "../pages/ProductDetails";
import Brands from "../pages/Brands";
import Orders from "../pages/Orders";
import CreateOrder from "../pages/CreateOrder";
import OrderDetails from "../pages/OrderDetails";
import Billing from "../pages/Billing";
import Delivery from "../pages/Delivery";
import UpdateOrder from "../pages/UpdateOrder";
import UserDetails from "../pages/UserDetails";
import CompanyDetails from "../pages/CompanyDetails";
import DataUpload from "../pages/DataUpload";
import PurchaseAnalytics from "../pages/Purchaseanalytics";

import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* ── Public ── */}
      <Route
        path="/login"
        element={
          isAuthenticated()
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />

      {/* ── Protected ── */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetails />} />

        <Route path="/dealers" element={<Dealers />} />
        <Route path="/dealers/:id" element={<DealerDetails />} />

        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />

        <Route path="/brands" element={<Brands />} />

        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/create" element={<CreateOrder />} />
        <Route path="/orders/:id" element={<OrderDetails />} />

        <Route path="/delivery" element={<Delivery />} />
        <Route path="/billing" element={<Billing />} />

        <Route path="/company-details" element={<CompanyDetails />} />
        <Route path="/data-upload" element={<DataUpload />} />
        <Route path="/purchase-analytics" element={<PurchaseAnalytics />} />
      </Route>

      {/* ── 404 ── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}