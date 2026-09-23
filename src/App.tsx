import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import Signup from "./signup/Signup";
import Login from "./login/Login";
import Dashboard from "./dashboard/Dashboard";
import RequireAuth from "./auth/RequireAuth";
import AddTransaction from "./transactions/AddTransaction";
import AuthenticatedLayout from "./auth/AuthenticatedLayout";
import Transactions from "./transactions/Transactions";
import Profile from "./profile/Profile";

const Layout = () => (
  <div className="App">
    <Outlet />
  </div>
);

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Signup /> },
      { path: "/login", element: <Login /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AuthenticatedLayout />,
            children: [
              { path: "/dashboard", element: <Dashboard /> },
              { path: "/profile", element: <Profile /> },
              { path: "/transactions", element: <Transactions /> },
              { path: "/transactions/new", element: <AddTransaction /> },
            ],
          },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
