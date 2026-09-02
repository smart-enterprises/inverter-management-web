// Login.jsx — Material Design 3
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { MdVisibility, MdVisibilityOff, MdBolt } from "react-icons/md";
import { Button, Banner } from "../components/m3";
import { T } from "../components/m3/tokens";

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
  const fieldStyle = {
    border: `1px solid ${T.outline}`,
    borderRadius: T.cornerExtraSmall,
    backgroundColor: T.surface,
    color: T.onSurface,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: T.surfaceContainerLow }}
    >
      <div className="w-full max-w-md">

        {/* LOGIN CARD */}
        <div
          className="p-8"
          style={{
            backgroundColor: T.surface,
            borderRadius: T.cornerExtraLarge,
            boxShadow: T.elevation1,
          }}
        >

          {/* HEADER */}
          <div className="flex flex-col items-center text-center mb-8">
            <div
              className="w-14 h-14 flex items-center justify-center mb-4"
              style={{
                borderRadius: T.cornerLarge,
                backgroundColor: T.primary,
                color: T.onPrimary,
              }}
            >
              <MdBolt size={30} />
            </div>

            <h1 className="m3-headline-small" style={{ color: T.onSurface }}>
              Smart Enterprises
            </h1>

            <p className="m3-body-medium mt-2" style={{ color: T.onSurfaceVariant }}>
              Sign in to access your dashboard
            </p>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="mb-6">
              <Banner tone="error">{error}</Banner>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* EMAIL */}
            <div>
              <label
                htmlFor="email"
                className="block m3-label-large"
                style={{ color: T.onSurfaceVariant }}
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
                className="mt-1.5 w-full px-4 h-12 m3-body-medium focus:outline-none disabled:opacity-50"
                style={fieldStyle}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="password"
                className="block m3-label-large"
                style={{ color: T.onSurfaceVariant }}
              >
                Password
              </label>

              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full px-4 pr-12 h-12 m3-body-medium focus:outline-none disabled:opacity-50"
                  style={fieldStyle}
                />

                {/* PASSWORD TOGGLE */}
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  style={{ color: T.onSurfaceVariant }}
                >
                  {showPassword ? (
                    <MdVisibilityOff size={20} />
                  ) : (
                    <MdVisibility size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <Button
              variant="filled"
              type="submit"
              disabled={loading}
              className="w-full"
              style={{ height: 48 }}
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
