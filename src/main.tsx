import { Suspense, StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./routes/AppLayout";
import { LandingPage } from "./routes/LandingPage";
import { ThemeProvider } from "./theme/ThemeProvider";

const AdminDashboardPage = lazy(() =>
  import("./routes/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminClassFormPage = lazy(() =>
  import("./routes/AdminClassFormPage").then((module) => ({
    default: module.AdminClassFormPage,
  })),
);
const AdminClassesPage = lazy(() =>
  import("./routes/AdminClassesPage").then((module) => ({
    default: module.AdminClassesPage,
  })),
);
const AdminEventAssignmentsPage = lazy(() =>
  import("./routes/AdminEventAssignmentsPage").then((module) => ({
    default: module.AdminEventAssignmentsPage,
  })),
);
const AdminEventDetailPage = lazy(() =>
  import("./routes/AdminEventDetailPage").then((module) => ({
    default: module.AdminEventDetailPage,
  })),
);
const AdminEventFormPage = lazy(() =>
  import("./routes/AdminEventFormPage").then((module) => ({
    default: module.AdminEventFormPage,
  })),
);
const AdminEventsPage = lazy(() =>
  import("./routes/AdminEventsPage").then((module) => ({
    default: module.AdminEventsPage,
  })),
);
const AdminImportPage = lazy(() =>
  import("./routes/AdminImportPage").then((module) => ({
    default: module.AdminImportPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import("./routes/AdminLoginPage").then((module) => ({
    default: module.AdminLoginPage,
  })),
);
const AdminPilotChecklistPage = lazy(() =>
  import("./routes/AdminPilotChecklistPage").then((module) => ({
    default: module.AdminPilotChecklistPage,
  })),
);
const AdminPlaceholderPage = lazy(() =>
  import("./routes/AdminPlaceholderPage").then((module) => ({
    default: module.AdminPlaceholderPage,
  })),
);
const AdminQrPage = lazy(() =>
  import("./routes/AdminQrPage").then((module) => ({
    default: module.AdminQrPage,
  })),
);
const AdminSchoolUsersPage = lazy(() =>
  import("./routes/AdminSchoolUsersPage").then((module) => ({
    default: module.AdminSchoolUsersPage,
  })),
);
const AdminStudentFormPage = lazy(() =>
  import("./routes/AdminStudentFormPage").then((module) => ({
    default: module.AdminStudentFormPage,
  })),
);
const AdminStudentsPage = lazy(() =>
  import("./routes/AdminStudentsPage").then((module) => ({
    default: module.AdminStudentsPage,
  })),
);
const AdminTeacherFormPage = lazy(() =>
  import("./routes/AdminTeacherFormPage").then((module) => ({
    default: module.AdminTeacherFormPage,
  })),
);
const AdminTeachersPage = lazy(() =>
  import("./routes/AdminTeachersPage").then((module) => ({
    default: module.AdminTeachersPage,
  })),
);
const AdminLayout = lazy(() =>
  import("./components/AdminLayout").then((module) => ({
    default: module.AdminLayout,
  })),
);
const AdminAuthBoundary = lazy(() =>
  import("./routes/AdminAuthBoundary").then((module) => ({
    default: module.AdminAuthBoundary,
  })),
);
const MeetingPage = lazy(() =>
  import("./routes/MeetingPage").then((module) => ({
    default: module.MeetingPage,
  })),
);
const ProtectedAdminRoute = lazy(() =>
  import("./routes/ProtectedAdminRoute").then((module) => ({
    default: module.ProtectedAdminRoute,
  })),
);
const ProtectedStaffRoute = lazy(() =>
  import("./routes/ProtectedStaffRoute").then((module) => ({
    default: module.ProtectedStaffRoute,
  })),
);
const StaffDashboardPage = lazy(() =>
  import("./routes/StaffDashboardPage").then((module) => ({
    default: module.StaffDashboardPage,
  })),
);
const StaffLoginPage = lazy(() =>
  import("./routes/StaffLoginPage").then((module) => ({
    default: module.StaffLoginPage,
  })),
);
const StudentDashboardPage = lazy(() =>
  import("./routes/StudentDashboardPage").then((module) => ({
    default: module.StudentDashboardPage,
  })),
);
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
      {
        path: "/admin",
        element: <AdminAuthBoundary />,
        children: [
          { path: "login", element: <AdminLoginPage /> },
          {
            element: <ProtectedAdminRoute />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminDashboardPage /> },
                  { path: "pilot-checklist", element: <AdminPilotChecklistPage /> },
                  { path: "school-users", element: <AdminSchoolUsersPage /> },
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
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl items-center justify-center">
            <div
              aria-label="Loading"
              className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent"
            />
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </ThemeProvider>
  </StrictMode>,
);
