import { createBrowserRouter, Navigate } from "react-router";
import RootLayout from "./layouts/RootLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import LoansPage from "./pages/LoansPage";
import UsersPage from "./pages/UsersPage";
import TrashPage from "./pages/TrashPage";
import ProtectedRoute from "../components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute allowedRoles={["admin", "student"]}>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: DashboardPage },
      { path: "inventory", Component: InventoryPage },
      { path: "loans", Component: LoansPage },
      {
        path: "users",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "trash",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <TrashPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
