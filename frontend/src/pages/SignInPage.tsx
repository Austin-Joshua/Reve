import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/common/BrandLogo";
import { api } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import { ArrowRight, Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

export const SignInPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { access_token, refresh_token } = res.data;
      localStorage.setItem("reve_access_token", access_token);
      if (refresh_token && rememberMe) {
        localStorage.setItem("reve_refresh_token", refresh_token);
      } else {
        localStorage.removeItem("reve_refresh_token");
      }

      await fetchUser();
      navigate("/studio");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === "object"
          ? detail?.message || "Invalid email or password."
          : detail || err.message || "Failed to sign in. Please verify your credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-raven-800 flex flex-col md:flex-row font-sans selection:bg-apricot-500/30">
      {/* ------------------------------------------------------------------ */}
      {/* LEFT COLUMN: Visual Brand Atmosphere                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden lg:flex lg:w-1/2 bg-raven-900 border-r border-raven-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle radial depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_20%_20%,rgba(39,71,74,0.35),transparent_70%)] pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <BrandLogo size="md" />
        </div>

        {/* Center Artwork Showcase */}
        <div className="relative z-10 max-w-lg my-auto space-y-6">
          <div className="rounded-2xl border border-raven-700 bg-raven-850 overflow-hidden shadow-modal">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-raven-950">
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
                alt="Reve Architecture Study"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-raven-950/80 backdrop-blur border border-seagrass-400/20 text-[11px] font-mono text-seagrass-200">
                512 × 512 · Raster Diffusion Output
              </div>
            </div>
            <div className="p-4 bg-raven-850 border-t border-raven-700/60">
              <div className="text-xs text-seagrass-300 font-mono">
                "Minimalist concrete cantilevered pavilion overlooking dark turquoise ocean, raw architectural finish"
              </div>
            </div>
          </div>

          <div>
            <blockquote className="text-lg font-medium text-seagrass-50 leading-relaxed font-sans">
              "A workspace where ideas become images, and images become something more."
            </blockquote>
            <p className="mt-2 text-xs font-mono text-seagrass-400">
              Reve Creative Platform · Built for deliberate exploration
            </p>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 text-xs font-mono text-seagrass-500 flex items-center justify-between">
          <span>Stable Diffusion 1.5</span>
          <span>Zero-Cost Compute Engine</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT COLUMN: Sign-In Interface                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex justify-center mb-4">
            <BrandLogo size="md" />
          </div>

          {/* Heading Block */}
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-apricot-500 font-semibold mb-2">
              YOUR CREATIVE WORKSPACE
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-seagrass-50 font-sans">
              Welcome back.
            </h1>
            <p className="mt-2 text-sm text-seagrass-300">
              Pick up where your ideas left off.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label
                htmlFor="signin-email"
                className="block text-xs font-mono uppercase text-seagrass-200 mb-1.5 font-medium"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-seagrass-400 absolute left-3.5 top-3.5" />
                <input
                  id="signin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-raven-900 border border-raven-700 text-seagrass-50 placeholder-seagrass-500 text-sm focus:border-apricot-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="signin-password"
                  className="block text-xs font-mono uppercase text-seagrass-200 font-medium"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-seagrass-400 absolute left-3.5 top-3.5" />
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-raven-900 border border-raven-700 text-seagrass-50 placeholder-seagrass-500 text-sm focus:border-apricot-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-seagrass-400 hover:text-seagrass-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-seagrass-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-raven-900 border-raven-700 text-apricot-500 focus:ring-apricot-500/50"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 disabled:opacity-50 text-raven-950 font-semibold text-sm transition-all shadow-surface flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-raven-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Text */}
          <div className="text-center pt-4 border-t border-raven-700/60 text-xs text-seagrass-400">
            <span>New to Reve? </span>
            <Link
              to="/register"
              className="text-apricot-400 hover:text-apricot-300 font-semibold transition-colors"
            >
              Create an account.
            </Link>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="text-xs font-mono text-seagrass-400 hover:text-seagrass-200 transition-colors"
            >
              &larr; Back to overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
