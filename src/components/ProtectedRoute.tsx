import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: ReactNode;
  allowedRoles?: string[]; // 👈 define which roles can pass
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, role } = useAuth(); // 👈 assuming you store role in AuthContext

  if (!user) {
    return <Navigate to="/" replace />; // not logged in
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    // logged in but wrong role
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
