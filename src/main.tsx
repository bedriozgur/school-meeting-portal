import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { AppLayout } from "./routes/AppLayout";
import { AdminDashboardPage } from "./routes/AdminDashboardPage";
import { AdminClassFormPage } from "./routes/AdminClassFormPage";
import { AdminClassesPage } from "./routes/AdminClassesPage";
import { AdminEventAssignmentsPage } from "./routes/AdminEventAssignmentsPage";
import { AdminEventDetailPage } from "./routes/AdminEventDetailPage";
import { AdminEventFormPage } from "./routes/AdminEventFormPage";
import { AdminEventsPage } from "./routes/AdminEventsPage";
import { AdminImportPage } from "./routes/AdminImportPage";
import { AdminLoginPage } from "./routes/AdminLoginPage";
import { AdminPilotChecklistPage } from "./routes/AdminPilotChecklistPage";
import { AdminQrPage } from "./routes/AdminQrPage";
import { AdminPlaceholderPage } from "./routes/AdminPlaceholderPage";
import { AdminStudentsPage } from "./routes/AdminStudentsPage";
import { AdminStudentFormPage } from "./routes/AdminStudentFormPage";
import { AdminTeacherFormPage } from "./routes/AdminTeacherFormPage";
import { AdminTeachersPage } from "./routes/AdminTeachersPage";
import { AdminLayout } from "./components/AdminLayout";
import { LandingPage } from "./routes/LandingPage";
import { MeetingPage } from "./routes/MeetingPage";
import { ProtectedAdminRoute } from "./routes/ProtectedAdminRoute";
import { ProtectedStaffRoute } from "./routes/ProtectedStaffRoute";
import { StaffDashboardPage } from "./routes/StaffDashboardPage";
import { StaffLoginPage } from "./routes/StaffLoginPage";
import { StudentDashboardPage } from "./routes/StudentDashboardPage";
import { ThemeProvider } from "./theme/ThemeProvider";
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
      { path: "/staff/login", element: <StaffLoginPage /> },
      {
        element: <ProtectedStaffRoute />,
        children: [{ path: "/staff", element: <StaffDashboardPage /> }],
      },
      { path: "/admin/login", element: <AdminLoginPage /> },
      {
        element: <ProtectedAdminRoute />,
        children: [
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: "pilot-checklist", element: <AdminPilotChecklistPage /> },
              { path: "events", element: <AdminEventsPage /> },
              { path: "events/new", element: <AdminEventFormPage /> },
              { path: "events/:eventId", element: <AdminEventDetailPage /> },
              { path: "events/:eventId/edit", element: <AdminEventFormPage /> },
              { path: "events/:eventId/duplicate", element: <AdminEventFormPage /> },
              {
                path: "events/:eventId/assignments",
                element: <AdminEventAssignmentsPage />,
              },
              {
                path: "students",
                element: <AdminStudentsPage />,
              },
              { path: "students/new", element: <AdminStudentFormPage /> },
              {
                path: "students/:studentId/edit",
                element: <AdminStudentFormPage />,
              },
              {
                path: "teachers",
                element: <AdminTeachersPage />,
              },
              { path: "teachers/new", element: <AdminTeacherFormPage /> },
              {
                path: "teachers/:teacherId/edit",
                element: <AdminTeacherFormPage />,
              },
              {
                path: "classes",
                element: <AdminClassesPage />,
              },
              { path: "classes/new", element: <AdminClassFormPage /> },
              {
                path: "classes/:classId/edit",
                element: <AdminClassFormPage />,
              },
              {
                path: "import",
                element: <AdminImportPage />,
              },
              {
                path: "qr",
                element: <AdminQrPage />,
              },
              {
                path: "staff",
                element: <AdminPlaceholderPage titleKey="admin.nav.staff" />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
