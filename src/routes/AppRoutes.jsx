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
import Brands from "../pages/Brands";
import Orders from "../pages/Orders";
import CreateOrder from "../pages/CreateOrder";
import OrderDetails from "../pages/OrderDetails";
import Billing from "../pages/Billing";
import Delivery from "../pages/Delivery";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import { ROUTE_PERMISSIONS } from "./routePermissions";
import UpdateOrder from "../pages/UpdateOrder";
import UserDetails from "../pages/UserDetails";

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated() ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS["/users"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS["/users"]}>
              <UserDetails />
            </ProtectedRoute>
          }
        />
        <Route path="/dealers" element={
          <ProtectedRoute
            allowedRoles={ROUTE_PERMISSIONS["/dealers"]}
          >
            <Dealers />
          </ProtectedRoute>
        } />
        <Route path="/dealers/:id" element={<DealerDetails />} />
        <Route path="/products" element={
          <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS["/products"]}>
            <Products />
          </ProtectedRoute>
        } />
        <Route path="/brands" element={
          <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS["/brands"]}>
            <Brands />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS["/orders"]}>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="/orders/create" element={<CreateOrder />} />
        <Route path="/orders/:id" element={
          <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS["/orders/:id"]}>
            <OrderDetails />
          </ProtectedRoute>
        } />
        <Route
          path="/orders/update/:id"
          element={
            <ProtectedRoute allowedRoles={ROUTE_PERMISSIONS["/orders"]}>
              <UpdateOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedRoute
              allowedRoles={ROUTE_PERMISSIONS["/delivery"]}
            >
              <Delivery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute
              allowedRoles={ROUTE_PERMISSIONS["/billing"]}
            >
              <Billing />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
