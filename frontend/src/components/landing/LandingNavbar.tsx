import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../common/BrandLogo";
import { ArrowRight, Menu, X, Sparkles, Terminal, Shield } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

export const LandingNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-glass border-b border-raven-700/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <BrandLogo size="md" />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-seagrass-300">
          <a
            href="#features"
            className="hover:text-seagrass-50 transition-colors py-1"
          >
            Features
          </a>
          <a
            href="#showcase"
            className="hover:text-seagrass-50 transition-colors py-1"
          >
            Showcase
          </a>
          <a
            href="#workflow"
            className="hover:text-seagrass-50 transition-colors py-1"
          >
            Workflow
          </a>
          <a
            href="#architecture"
            className="hover:text-seagrass-50 transition-colors py-1 flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-apricot-500" />
            <span>Architecture</span>
          </a>
          <a
            href="https://github.com/Austin-Joshua/Reve"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-seagrass-50 transition-colors py-1"
          >
            GitHub
          </a>
        </nav>

        {/* CTA Controls */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-seagrass-400">
                {user?.email || "Creator"}
              </span>
              <button
                onClick={() => navigate("/studio")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 text-raven-950 font-semibold text-sm transition-colors shadow-surface"
              >
                <span>Enter Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-seagrass-300 hover:text-seagrass-50 px-3 py-2 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <button
                onClick={() => navigate("/studio")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 text-raven-950 font-semibold text-sm transition-colors shadow-surface"
              >
                <span>Start Creating</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-seagrass-300 hover:text-seagrass-50 hover:bg-raven-700/60"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-raven-850 border-b border-raven-700 px-4 pt-3 pb-6 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-seagrass-200 hover:bg-raven-700"
          >
            Features
          </a>
          <a
            href="#showcase"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-seagrass-200 hover:bg-raven-700"
          >
            Showcase
          </a>
          <a
            href="#workflow"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-seagrass-200 hover:bg-raven-700"
          >
            Workflow
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-seagrass-200 hover:bg-raven-700"
          >
            Architecture
          </a>
          <div className="pt-3 border-t border-raven-700/60 flex flex-col gap-2">
            {!isAuthenticated && (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg border border-seagrass-400/25 text-seagrass-100 font-medium text-sm"
              >
                Sign In
              </Link>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/studio");
              }}
              className="w-full text-center py-2.5 rounded-lg bg-apricot-500 text-raven-950 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <span>{isAuthenticated ? "Enter Studio" : "Start Creating"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
