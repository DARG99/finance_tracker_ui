import { Navigate, Outlet } from "react-router-dom";
import { authService } from "../services/authService";

export default function RequireAuth() {
  return authService.isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}
