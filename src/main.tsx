import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./routes/AppLayout";
import { LandingPage } from "./routes/LandingPage";
import { MeetingPage } from "./routes/MeetingPage";
import { StudentDashboardPage } from "./routes/StudentDashboardPage";
import "./styles.css";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/meeting/:meetingCode", element: <MeetingPage /> },
      {
        path: "/meeting/:meetingCode/student/:schoolNumber",
        element: <StudentDashboardPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
