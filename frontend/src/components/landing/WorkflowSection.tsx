import React, { useState } from "react";
import { MessageSquare, Cpu, Sliders, CheckCircle2 } from "lucide-react";

interface WorkflowStep {
  number: string;
  title: string;
  action: string;
  description: string;
  guidance: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    number: "01",
    title: "Describe",
    action: "Define subject and details",
    description: "Write a clear description of what you want to see. Set the subject, environment, lighting and perspective. Use the negative prompt to exclude unwanted visual artifacts.",
    guidance: "Specific visual attributes produce more consistent results than generic modifiers.",
  },
  {
    number: "02",
    title: "Generate",
    action: "Send to diffusion model",
    description: "Your request is dispatched to the integrated Stable Diffusion 1.5 pipeline. The model resolves your text description into a 512 × 512 pixel-space raster image.",
    guidance: "Progress is tracked step-by-step so you always know the state of your render.",
  },
  {
    number: "03",
    title: "Refine",
    action: "Review and iterate",
    description: "Inspect the generated output at 1:1 scale. Adjust guidance scale or step counts, lock in a seed to explore subtle variations, or load the result into an image-to-image workflow.",
    guidance: "Each output is saved to your recent work so you can revisit prompts and seeds at any time.",
  },
];

export const WorkflowSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const current = WORKFLOW_STEPS[activeStep];

  return (
    <section id="how-it-works" className="py-24 bg-raven-850 border-t border-raven-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono uppercase tracking-widest text-apricot-500 mb-2 font-semibold">
            How it works
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-seagrass-50 font-sans tracking-tight">
            From an idea to an image.
          </h2>
          <p className="mt-3 text-seagrass-300 text-sm sm:text-base leading-relaxed">
            A three-step creative flow designed to keep you close to your visual direction.
          </p>
        </div>

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div
              key={step.title}
              onClick={() => setActiveStep(idx)}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all cursor-pointer ${
                activeStep === idx
                  ? "bg-raven-750 border-apricot-500/50 shadow-surface"
                  : "bg-raven-900 border-raven-700 hover:border-seagrass-400/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-mono font-bold ${activeStep === idx ? "text-apricot-500" : "text-seagrass-400"}`}>
                    {step.number}
                  </span>
                  <span className="text-[11px] font-mono text-seagrass-400">
                    {step.action}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-seagrass-50 font-sans mb-3">
                  {step.title}
                </h3>

                <p className="text-sm text-seagrass-300 leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div className="pt-4 border-t border-raven-700/60 text-xs text-seagrass-400 font-mono flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-apricot-500 shrink-0 mt-0.5" />
                <span>{step.guidance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
