import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import Signup from "./signup/Signup";
import Login from "./login/Login";
import Dashboard from "./dashboard/Dashboard";
import RequireAuth from "./auth/RequireAuth";

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
        children: [{ path: "/dashboard", element: <Dashboard /> }],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
