import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../common/BrandLogo";
import { ArrowRight, Terminal, Github, ShieldCheck, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-raven-900 border-t border-raven-700/60 relative text-seagrass-300">
      {/* Final Call to Action Block */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-raven-700/60">
        <div className="rounded-2xl bg-gradient-to-br from-raven-800 to-raven-850 border border-raven-600/70 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-modal">
          <div className="max-w-xl text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-seagrass-50 font-sans tracking-tight">
              Ready to generate without boundaries?
            </h2>
            <p className="mt-2 text-sm text-seagrass-300">
              Access the live diffusion studio. Experience genuine pixel-space synthesis with fine-grained parameter control.
            </p>
          </div>
          <button
            onClick={() => navigate("/studio")}
            className="px-6 py-3.5 rounded-xl bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 text-raven-950 font-semibold text-sm transition-all shadow-glow flex items-center gap-2 shrink-0"
          >
            <span>Launch Reve Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <BrandLogo size="md" withLink={false} />
            <p className="text-xs text-seagrass-400 leading-relaxed">
              Reve is a modern AI-powered visual creation platform uniting raster diffusion inference with structured layer editing.
            </p>
            <div className="pt-2 text-xs font-mono text-seagrass-500">
              STABLE DIFFUSION 1.5 · TESLA T4
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-seagrass-100 font-semibold">
              Product
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/studio" className="hover:text-seagrass-50 transition-colors">
                  Generative Studio
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-seagrass-50 transition-colors">
                  Features & Capabilities
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-seagrass-50 transition-colors">
                  Creative Showcase
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-seagrass-50 transition-colors">
                  4-Step Workflow
                </a>
              </li>
            </ul>
          </div>

          {/* Architecture Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-seagrass-100 font-semibold">
              Architecture & Docs
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#architecture" className="hover:text-seagrass-50 transition-colors">
                  GPU Worker Pipeline
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Austin-Joshua/Reve/tree/main/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-seagrass-50 transition-colors"
                >
                  System Specifications (PRD/TRD)
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

          {/* System Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-seagrass-100 font-semibold">
              Operational Status
            </h3>
            <div className="p-3 rounded-lg bg-raven-850 border border-raven-700 text-xs font-mono space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-semantic-success" />
                <span className="text-seagrass-100">FastAPI Backend: Online</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-semantic-success" />
                <span className="text-seagrass-100">Colab T4 Worker: Connected</span>
              </div>
              <div className="text-[11px] text-seagrass-400 pt-1">
                Policy: ₹0-First Infrastructure
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-raven-800 flex flex-col sm:flex-row items-center justify-between text-xs text-seagrass-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} Reve Creative Platform. Inspired by modern AI visual synthesis.
          </div>
          <div className="flex items-center gap-4 text-xs">
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
