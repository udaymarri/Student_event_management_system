import React, { useState, useEffect } from "react";
import { AuthForm } from "./components/AuthForm";
import { AdminDashboard } from "./components/AdminDashboard";
import { StudentDashboard } from "./components/StudentDashboard";
import { Toaster } from "./components/ui/sonner";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "student";
  department?: string;
  year?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on app load
    const storedUser = localStorage.getItem("sms_user");
    const storedToken = localStorage.getItem("sms_token");

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (error) {
        console.error("Error parsing stored session:", error);
        localStorage.removeItem("sms_user");
        localStorage.removeItem("sms_token");
      }
    }

    setIsLoading(false);
  }, []);

  const handleAuth = (
    authenticatedUser: User,
    accessToken: string,
  ) => {
    setUser(authenticatedUser);
    setToken(accessToken);

    // Store session in localStorage
    localStorage.setItem(
      "sms_user",
      JSON.stringify(authenticatedUser),
    );
    localStorage.setItem("sms_token", accessToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);

    // Clear stored session
    localStorage.removeItem("sms_user");
    localStorage.removeItem("sms_token");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <>
        <AuthForm onAuth={handleAuth} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <>
      {user.role === "admin" ? (
        <AdminDashboard
          user={user}
          token={token}
          onLogout={handleLogout}
        />
      ) : (
        <StudentDashboard
          user={user}
          token={token}
          onLogout={handleLogout}
        />
      )}
      <Toaster position="top-right" />
    </>
  );
}