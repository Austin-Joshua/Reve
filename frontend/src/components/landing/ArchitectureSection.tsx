import React from "react";
import { Terminal, Shield, Cpu, RefreshCw, Zap, Server, Database, Cloud } from "lucide-react";

export const ArchitectureSection: React.FC = () => {
  return (
    <section id="architecture" className="py-24 bg-raven-800 border-t border-raven-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-apricot-500 mb-2 font-semibold">
            <Terminal className="w-3.5 h-3.5" />
            <span>Infrastructure Engineering</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-seagrass-50 font-sans tracking-tight">
            ₹0-First Remote GPU Worker Architecture
          </h2>
          <p className="mt-3 text-seagrass-300 text-sm sm:text-base leading-relaxed">
            A hardened, decoupled outbound polling architecture connecting free ephemeral GPU compute
            to a resilient local FastAPI backend without opening incoming public ports.
          </p>
        </div>

        {/* Technical Architecture Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Outbound Polling Worker */}
          <div className="rounded-xl border border-raven-700 bg-raven-900 p-6 flex flex-col justify-between shadow-surface">
            <div>
              <div className="w-10 h-10 rounded-lg bg-raven-800 border border-raven-700 flex items-center justify-center text-apricot-500 mb-4">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-seagrass-50 font-sans">
                Outbound Long-Polling
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-seagrass-300 leading-relaxed">
                The Colab worker polls <code className="text-apricot-400">/internal/worker/jobs/poll</code> every 2 seconds.
                When no job is queued, the backend returns HTTP 204 No Content with zero compute overhead.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-raven-800 text-[11px] font-mono text-seagrass-400">
              <span className="text-semantic-success font-semibold">HTTP 204</span> · In-Memory Async Event Dispatch
            </div>
          </div>

          {/* Card 2: Constant-Time Token Security */}
          <div className="rounded-xl border border-raven-700 bg-raven-900 p-6 flex flex-col justify-between shadow-surface">
            <div>
              <div className="w-10 h-10 rounded-lg bg-raven-800 border border-raven-700 flex items-center justify-center text-seagrass-200 mb-4">
                <Shield className="w-5 h-5 text-apricot-500" />
              </div>
              <h3 className="text-lg font-semibold text-seagrass-50 font-sans">
                Constant-Time Verification
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-seagrass-300 leading-relaxed">
                All internal worker endpoints verify <code className="text-seagrass-100">X-Worker-Token</code> using
                Python <code className="text-seagrass-100">secrets.compare_digest</code> to defend against timing attacks.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-raven-800 text-[11px] font-mono text-seagrass-400">
              <span className="text-apricot-500 font-semibold">Zero Leaks</span> · Environment-Enforced Secrets
            </div>
          </div>

          {/* Card 3: Dual Storage Fallback */}
          <div className="rounded-xl border border-raven-700 bg-raven-900 p-6 flex flex-col justify-between shadow-surface">
            <div>
              <div className="w-10 h-10 rounded-lg bg-raven-800 border border-raven-700 flex items-center justify-center text-seagrass-200 mb-4">
                <Cloud className="w-5 h-5 text-apricot-500" />
              </div>
              <h3 className="text-lg font-semibold text-seagrass-50 font-sans">
                Hybrid Storage Fallback
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-seagrass-300 leading-relaxed">
                Generated rasters stream to S3 / MinIO storage. If MinIO is offline, the backend
                gracefully degrades to local disk storage without dropping generation outputs.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-raven-800 text-[11px] font-mono text-seagrass-400">
              <span className="text-seagrass-200 font-semibold">100% Uptime</span> · Transparent Local Fallback
            </div>
          </div>
        </div>

        {/* Live System Specification Strip */}
        <div className="mt-8 rounded-xl border border-raven-700/80 bg-raven-950 p-5 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-semantic-success animate-pulse" />
            <span className="text-seagrass-100 font-semibold">Google Colab Worker 01</span>
            <span className="text-seagrass-500">|</span>
            <span className="text-seagrass-300">GPU: NVIDIA Tesla T4 (15.0 GB VRAM)</span>
          </div>
          <div className="flex items-center gap-6 text-seagrass-400">
            <span>MODEL: <span className="text-apricot-400">runwayml/stable-diffusion-v1-5</span></span>
            <span>BACKEND: <span className="text-seagrass-100">FastAPI Async (Port 8000)</span></span>
            <span>QUEUE: <span className="text-seagrass-100">In-Memory / Redis</span></span>
          </div>
        </div>
      </div>
    </section>
  );
};
