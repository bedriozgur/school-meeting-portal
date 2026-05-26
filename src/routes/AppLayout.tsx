import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <main className="page-shell">
      <Outlet />
    </main>
  );
}
