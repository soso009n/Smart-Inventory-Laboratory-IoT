import { createBrowserRouter } from "react-router";
import RootLayout from "./layouts/RootLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import LoansPage from "./pages/LoansPage";
import UsersPage from "./pages/UsersPage";
import TrashPage from "./pages/TrashPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "inventory", Component: InventoryPage },
      { path: "loans", Component: LoansPage },
      { path: "users", Component: UsersPage },
      { path: "trash", Component: TrashPage },
    ],
  },
]);
