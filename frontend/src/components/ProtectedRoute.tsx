import { Navigate } from "react-router-dom";

type Role = "citizen" | "technician" | "admin";

type ProtectedRouteProps = {
  children: React.ReactNode;
  roles?: Role[];
};

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = localStorage.getItem("smartUtilityToken");
  const role = localStorage.getItem("role") as Role | null;

  if (!token) {
    return <Navigate to="/user/login" replace />;
  }

  if (roles && role && !roles.includes(role)) {
    const redirect =
      role === "admin"
        ? "/admin/dashboard"
        : role === "technician"
          ? "/technician/dashboard"
          : "/dashboard";

    return <Navigate to={redirect} replace />;
  }

  return children;
}
