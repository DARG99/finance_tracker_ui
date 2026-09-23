import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "./useSession";

export default function RequireAuth() {
  return useSession() ? <Outlet /> : <Navigate to="/login" replace />;
}
