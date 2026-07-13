import { BrowserRouter, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import AuthPage from "../pages/auth/AuthPage";
import Login from "../pages/auth/Login";
import AdminDashboard from "../pages/admin/Dashboard";
import ComplaintDetails from "../pages/citizen/ComplaintDetails";
import CitizenDashboard from "../pages/citizen/Dashboard";
import MyComplaints from "../pages/citizen/MyComplaints";
import NewComplaint from "../pages/citizen/NewComplaint";
import TechnicianDashboard from "../pages/technician/Dashboard";
import MapPage from "../pages/MapPage";
import NotFound from "../pages/NotFound";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/:role/:mode" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["citizen"]}>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-complaint"
          element={
            <ProtectedRoute roles={["citizen"]}>
              <NewComplaint />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints"
          element={
            <ProtectedRoute roles={["citizen"]}>
              <MyComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints/:id"
          element={
            <ProtectedRoute roles={["citizen", "admin", "technician"]}>
              <ComplaintDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technician/dashboard"
          element={
            <ProtectedRoute roles={["technician"]}>
              <TechnicianDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute roles={["citizen", "technician"]}>
              <MapPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
