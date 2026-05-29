import { Outlet } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";

export function AdminAuthBoundary() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
