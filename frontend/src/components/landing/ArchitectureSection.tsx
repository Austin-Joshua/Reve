import React from "react";
import { Cpu, Shield, Cloud, RefreshCw, Terminal, CheckCircle2 } from "lucide-react";

export const ArchitectureSection: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-raven-800 border-t border-raven-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono uppercase tracking-widest text-apricot-500 mb-2 font-semibold">
            About the pipeline
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-seagrass-50 font-sans tracking-tight">
            Built around a real workflow.
          </h2>
          <p className="mt-3 text-seagrass-300 text-sm sm:text-base leading-relaxed">
            Reve runs on a genuine raster diffusion pipeline connected to dedicated GPU compute.
            We are transparent about our supported models and real operating constraints.
          </p>
        </div>

        {/* 3 Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Pillar 1: Genuine Raster Diffusion */}
          <div className="rounded-2xl border border-raven-700 bg-raven-850 p-6 flex flex-col justify-between shadow-surface">
            <div>
              <div className="w-10 h-10 rounded-xl bg-raven-800 border border-raven-700 flex items-center justify-center text-apricot-500 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-seagrass-50 font-sans mb-2">
                Stable Diffusion 1.5
              </h3>
              <p className="text-xs sm:text-sm text-seagrass-300 leading-relaxed mb-4">
                Currently integrated and active. Generates real pixel-space rasters at native <code className="text-seagrass-100">512 × 512</code> resolution with Euler_A sampling.
              </p>
            </div>
            <div className="pt-4 border-t border-raven-700/60 text-xs font-mono text-seagrass-400">
              <span className="text-semantic-success font-semibold">Live Integration</span> · 512 × 512 Output
            </div>
          </div>

          {/* Pillar 2: Outbound Long-Polling Protocol */}
          <div className="rounded-2xl border border-raven-700 bg-raven-850 p-6 flex flex-col justify-between shadow-surface">
            <div>
              <div className="w-10 h-10 rounded-xl bg-raven-800 border border-raven-700 flex items-center justify-center text-apricot-500 mb-4">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-seagrass-50 font-sans mb-2">
                Outbound GPU Polling
              </h3>
              <p className="text-xs sm:text-sm text-seagrass-300 leading-relaxed mb-4">
                The remote Google Colab GPU worker polls the backend over outbound HTTPS. When idle, the backend returns HTTP 204 with no ports exposed to the public.
              </p>
            </div>
            <div className="pt-4 border-t border-raven-700/60 text-xs font-mono text-seagrass-400">
              <span className="text-seagrass-200 font-semibold">Zero-Cost Infrastructure</span> · Colab T4
            </div>
          </div>

          {/* Pillar 3: Model Transparency */}
          <div className="rounded-2xl border border-raven-700 bg-raven-850 p-6 flex flex-col justify-between shadow-surface">
            <div>
              <div className="w-10 h-10 rounded-xl bg-raven-800 border border-raven-700 flex items-center justify-center text-apricot-500 mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-seagrass-50 font-sans mb-2">
                Model Transparency
              </h3>
              <p className="text-xs sm:text-sm text-seagrass-300 leading-relaxed mb-4">
                We do not simulate AI or claim unavailable models work. High-parameter models (such as FLUX.1 and SDXL) are planned roadmap milestones and cannot currently generate on this instance.
              </p>
            </div>
            <div className="pt-4 border-t border-raven-700/60 text-xs font-mono text-seagrass-400">
              <span className="text-apricot-400 font-semibold">FLUX & SDXL:</span> Planned Milestones
            </div>
          </div>
        </div>

        {/* Technical Infrastructure Summary Strip */}
        <div className="rounded-xl border border-raven-700 bg-raven-900 p-5 text-xs font-mono flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-semantic-success" />
            <span className="text-seagrass-100 font-semibold">Active Backend: FastAPI (Python 3.15 Async)</span>
            <span className="text-seagrass-500">·</span>
            <span className="text-seagrass-300">Database: SQLite / PostgreSQL</span>
          </div>
          <div className="flex items-center gap-4 text-seagrass-400">
            <span>Storage: <span className="text-seagrass-200">S3 / Local Fallback</span></span>
            <span>Security: <span className="text-seagrass-200">JWT + Constant-Time Token</span></span>
          </div>
        </div>
      </div>
    </section>
  );
};
