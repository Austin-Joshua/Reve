import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../common/BrandLogo";
import { ArrowRight, Github } from "lucide-react";

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-raven-900 border-t border-raven-700/60 relative text-seagrass-300">
      {/* Final Call to Action Block */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-raven-700/60">
        <div className="rounded-2xl bg-raven-850 border border-raven-700 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-surface">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl font-bold text-seagrass-50 font-sans tracking-tight">
              Your next image starts here.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-seagrass-300">
              Bring an idea into the studio and see where it takes you.
            </p>
          </div>
          <button
            onClick={() => navigate("/studio")}
            className="px-6 py-3.5 rounded-xl bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 text-raven-950 font-semibold text-sm transition-all shadow-surface flex items-center gap-2 shrink-0"
          >
            <span>Start creating</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <BrandLogo size="md" withLink={false} />
            <p className="text-xs text-seagrass-400 leading-relaxed">
              A workspace where ideas become images, and images become something more.
            </p>
          </div>

          {/* Product Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-seagrass-100 font-semibold">
              Product
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#product" className="hover:text-seagrass-50 transition-colors">
                  Workspace
                </a>
              </li>
              <li>
                <a href="#explore" className="hover:text-seagrass-50 transition-colors">
                  Explore
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-seagrass-50 transition-colors">
                  How it works
                </a>
              </li>
              <li>
                <Link to="/studio" className="hover:text-seagrass-50 transition-colors">
                  Open Studio
                </Link>
              </li>
            </ul>
          </div>

          {/* Documentation & Source */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-seagrass-100 font-semibold">
              Documentation
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#about" className="hover:text-seagrass-50 transition-colors">
                  Architecture & Pipeline
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Austin-Joshua/Reve/tree/main/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-seagrass-50 transition-colors"
                >
                  System Specifications
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Austin-Joshua/Reve"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-seagrass-50 transition-colors flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Current Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-seagrass-100 font-semibold">
              Current Status
            </h3>
            <div className="p-3 rounded-xl bg-raven-850 border border-raven-700 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-semantic-success" />
                <span className="text-seagrass-100">Model: Stable Diffusion 1.5</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-semantic-success" />
                <span className="text-seagrass-100">Resolution: 512 × 512 Native</span>
              </div>
              <div className="text-[11px] text-seagrass-400 pt-1 border-t border-raven-800">
                Zero-Cost GPU Infrastructure
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-raven-800 flex flex-col sm:flex-row items-center justify-between text-xs text-seagrass-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} Reve. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>Raven Teal #16292B</span>
            <span>·</span>
            <span>Seagrass Grey #9FB3AB</span>
            <span>·</span>
            <span>Apricot Flare #FF8A1F</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
