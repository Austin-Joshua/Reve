import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Attempt session verification if access token exists
    if (localStorage.getItem("reve_access_token")) {
      fetchUser();
    }
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-raven-900 flex items-center justify-center font-mono text-xs text-seagrass-300">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 border-2 border-apricot-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying workspace session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !localStorage.getItem("reve_access_token")) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
