import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../common/BrandLogo";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

export const LandingNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-glass border-b border-raven-700/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <BrandLogo size="md" />

        {/* Minimal Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-seagrass-300">
          <a
            href="#product"
            className="hover:text-seagrass-50 transition-colors py-1"
          >
            Product
          </a>
          <a
            href="#explore"
            className="hover:text-seagrass-50 transition-colors py-1"
          >
            Explore
          </a>
          <a
            href="#how-it-works"
            className="hover:text-seagrass-50 transition-colors py-1"
          >
            How it works
          </a>
          <a
            href="#about"
            className="hover:text-seagrass-50 transition-colors py-1"
          >
            About
          </a>
        </nav>

        {/* CTA Controls */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-medium text-seagrass-300 hover:text-seagrass-50 px-3 py-2 rounded-lg transition-colors"
          >
            Sign in
          </Link>
          <button
            onClick={() => navigate("/studio")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 text-raven-950 font-semibold text-sm transition-colors shadow-surface"
          >
            <span>Open Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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
            href="#product"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-seagrass-200 hover:bg-raven-700"
          >
            Product
          </a>
          <a
            href="#explore"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-seagrass-200 hover:bg-raven-700"
          >
            Explore
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-seagrass-200 hover:bg-raven-700"
          >
            How it works
          </a>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-seagrass-200 hover:bg-raven-700"
          >
            About
          </a>
          <div className="pt-3 border-t border-raven-700/60 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg border border-seagrass-400/25 text-seagrass-100 font-medium text-sm"
            >
              Sign in
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/studio");
              }}
              className="w-full text-center py-2.5 rounded-lg bg-apricot-500 text-raven-950 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
