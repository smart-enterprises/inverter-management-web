import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* ================= REDIRECT IF ALREADY AUTHENTICATED ================= */
  useEffect(() => {
    if (isAuthenticated()) {
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, location, isAuthenticated]);

  /* ================= INPUT CHANGE ================= */
  const handleChange = (e) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (error) setError("");
  };

  /* ================= PASSWORD TOGGLE ================= */
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  /* ================= LOGIN SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await login(formData.email, formData.password);

      if (!result?.success) {
        setError(result?.message || "Login failed");
        return;
      }

      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">

        {/* LOGIN CARD */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">

          {/* HEADER */}
          <div className="text-center mb-8">

            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Smart Enterprises
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              Sign in to access your dashboard
            </p>

          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* EMAIL */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="username"
                disabled={loading}
                className="
                  mt-1 w-full
                  rounded-xl
                  border border-gray-200
                  px-4 py-2.5
                  text-sm
                  placeholder:text-gray-400
                  focus:outline-none
                  focus:ring-2 focus:ring-blue-400
                  focus:border-blue-400
                  transition
                "
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border border-gray-200
                    px-4 py-2.5 pr-10
                    text-sm
                    placeholder:text-gray-400
                    focus:outline-none
                    focus:ring-2 focus:ring-blue-400
                    focus:border-blue-400
                    transition
                  "
                />

                {/* PASSWORD TOGGLE */}
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                  className="
                    absolute
                    inset-y-0 right-0
                    flex items-center
                    pr-3
                    text-gray-400
                    hover:text-gray-600
                    transition
                  "
                >
                  {showPassword ? (
                    <FiEyeOff size={18} />
                  ) : (
                    <FiEye size={18} />
                  )}
                </button>
              </div>

            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                flex items-center justify-center
                rounded-xl
                bg-gradient-to-r from-[#9333EA] to-[#7e22ce]
                text-white
                text-sm font-semibold
                py-2.5
                shadow-sm
                hover:opacity-95
                focus:outline-none
                focus:ring-2 focus:ring-blue-500
                focus:ring-offset-2
                transition
                disabled:opacity-60
                disabled:cursor-not-allowed
              "
            >
              {loading ? (
                <div className="flex items-center gap-2">

                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>

                  Signing in...

                </div>
              ) : (
                "Sign in"
              )}

            </button>

          </form>
        </div>

      </div>
    </div >
  );
}
