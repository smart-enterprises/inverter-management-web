import React, { useEffect } from "react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

/* ================= LOGOUT SYNC LISTENER ================= */
const LogoutListener = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "logout-event") navigate("/login");
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [navigate]);

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <LogoutListener>
            <AppRoutes />
          </LogoutListener>
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
