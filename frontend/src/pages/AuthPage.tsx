import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BrandLogo } from "../components/common/BrandLogo";
import { api } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import { ArrowRight, Lock, Mail, AlertCircle, CheckCircle2, User, KeyRound, Sparkles } from "lucide-react";

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        await api.post("/auth/register", {
          email,
          password,
          full_name: fullName.trim() || undefined,
        });
      }

      // Login to obtain JWT token
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.access_token;
      const refreshToken = res.data.refresh_token;

      localStorage.setItem("reve_access_token", token);
      if (refreshToken) {
        localStorage.setItem("reve_refresh_token", refreshToken);
      }

      await fetchUser();
      navigate("/studio");
    } catch (err: any) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Authentication failed. Please verify credentials.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Access Helper
  const handleQuickDemo = async () => {
    setError(null);
    setIsLoading(true);
    const demoEmail = "creator@reve.ai";
    const demoPass = "ReveStudio2026!";

    try {
      // Attempt register first in case it's a fresh database
      try {
        await api.post("/auth/register", {
          email: demoEmail,
          password: demoPass,
          full_name: "Reve Creator",
        });
      } catch {
        // Already registered, proceed to login
      }

      const res = await api.post("/auth/login", {
        email: demoEmail,
        password: demoPass,
      });

      localStorage.setItem("reve_access_token", res.data.access_token);
      if (res.data.refresh_token) {
        localStorage.setItem("reve_refresh_token", res.data.refresh_token);
      }
      await fetchUser();
      navigate("/studio");
    } catch (err: any) {
      // If backend is running without DB seed or unreachable, allow local workspace access
      localStorage.setItem("reve_access_token", "dev-local-session-token");
      navigate("/studio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-raven-800 flex flex-col justify-center items-center px-4 py-12 relative">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(39,71,74,0.3),transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="lg" tagline={true} />
        </div>

        {/* Card Box */}
        <div className="rounded-2xl border border-raven-700 bg-raven-900 p-8 shadow-modal">
          {/* Tab buttons */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-raven-950 rounded-xl mb-6 border border-raven-800 text-xs font-semibold">
            <button
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                !isRegister
                  ? "bg-raven-750 text-seagrass-50 border border-apricot-500/30 shadow-surface"
                  : "text-seagrass-400 hover:text-seagrass-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                isRegister
                  ? "bg-raven-750 text-seagrass-50 border border-apricot-500/30 shadow-surface"
                  : "text-seagrass-400 hover:text-seagrass-200"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-mono uppercase text-seagrass-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-seagrass-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alan Turing"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-raven-850 border border-raven-700 text-seagrass-50 placeholder-seagrass-500 text-sm focus:border-apricot-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase text-seagrass-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-seagrass-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@reve.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-raven-850 border border-raven-700 text-seagrass-50 placeholder-seagrass-500 text-sm focus:border-apricot-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-seagrass-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-seagrass-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-raven-850 border border-raven-700 text-seagrass-50 placeholder-seagrass-500 text-sm focus:border-apricot-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-lg bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 text-raven-950 font-semibold text-sm transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-raven-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? "Create Account & Enter" : "Sign In to Studio"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-6 pt-5 border-t border-raven-800 text-center">
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-raven-800 hover:bg-raven-750 border border-seagrass-400/20 text-seagrass-200 text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-apricot-500" />
              <span>Instant Creator Access (One-Click Demo)</span>
            </button>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-xs font-mono text-seagrass-400 hover:text-seagrass-100 transition-colors"
          >
            &larr; Back to Public Overview
          </Link>
        </div>
      </div>
    </div>
  );
};
