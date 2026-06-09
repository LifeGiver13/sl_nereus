
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import ApplicationDetail from "./pages/ApplicationDetail";
import People from "./pages/People";
import UserDetail from "./pages/UserDetail";
import UserEdit from "./pages/UserEdit";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ShiftManagement from "./pages/ShiftManagement";
import PositionManagement from "./pages/PositionManagement";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import JobCreate from "./pages/JobCreate";
import JobEdit from "./pages/JobEdit";
import JobFill from "./pages/JobFill";
import Settings from "./pages/Settings";
import SkillsManagement from "./pages/SkillsManagement";
import Timesheets from "./pages/Timesheets";
import CategorySkillsPage from "./pages/CategorySkillsPage";
import ApplicationFormCreate from "./pages/ApplicationFormCreate";
import ContentPages from "./pages/ContentPages";
import LandingPageEditor from "./pages/LandingPageEditor";
import StartPageEditor from "./pages/StartPageEditor";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import { DocumentProvider } from "./contexts/DocumentContext";
import CustomAddition from "./pages/UpdateTimesheet";
import { TimesheetCustomFieldsProvider } from "./contexts/TimesheetContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <TimesheetCustomFieldsProvider>
          <DocumentProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/applications"
                  element={
                    <ProtectedRoute>
                      <Applications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/application/:id"
                  element={
                    <ProtectedRoute>
                      <ApplicationDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/people"
                  element={
                    <ProtectedRoute>
                      <People />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/user/:id"
                  element={
                    <ProtectedRoute>
                      <UserDetail />
                    </ProtectedRoute>
                  }
                />

              


                <Route
                  path="/user/:id/edit"
                  element={
                    <ProtectedRoute>
                      <UserEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clients"
                  element={
                    <ProtectedRoute>
                      <Clients />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/client/:id"
                  element={
                    <ProtectedRoute>
                      <ClientDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/client/:clientId/shifts"
                  element={
                    <ProtectedRoute>
                      <ShiftManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/client/:clientId/positions"
                  element={
                    <ProtectedRoute>
                      <PositionManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/jobs"
                  element={
                    <ProtectedRoute>
                      <Jobs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/jobs/create"
                  element={
                    <ProtectedRoute>
                      <JobCreate />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/jobs/edit/:id"
                  element={
                    <ProtectedRoute>
                      <JobEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/job/:id"
                  element={
                    <ProtectedRoute>
                      <JobDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/job/:id/fill"
                  element={
                    <ProtectedRoute>
                      <JobFill />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/timesheets"
                  element={
                    <ProtectedRoute>
                      <Timesheets />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/skills"
                  element={
                    <ProtectedRoute>
                      <SkillsManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/skills/category/:categoryId"
                  element={
                    <ProtectedRoute>
                      <CategorySkillsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/content/pages"
                  element={
                    <ProtectedRoute>
                      <ContentPages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/content/pages/landing-page"
                  element={
                    <ProtectedRoute>
                      <LandingPageEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/content/pages/start-page"
                  element={
                    <ProtectedRoute>
                      <StartPageEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/application-forms/create"
                  element={
                    <ProtectedRoute>
                      <ApplicationFormCreate />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DocumentProvider>
        </TimesheetCustomFieldsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
