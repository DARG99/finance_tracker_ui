import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "./useSession";

export default function GuestOnly() {
  return useSession() ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
