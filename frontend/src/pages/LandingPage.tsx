import React, { useEffect } from "react";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";
import { ShowcaseSection } from "../components/landing/ShowcaseSection";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { WorkspaceSection } from "../components/landing/WorkspaceSection";
import { ArchitectureSection } from "../components/landing/ArchitectureSection";
import { Footer } from "../components/landing/Footer";

export const LandingPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-raven-800 text-seagrass-50 font-sans selection:bg-apricot-500/30">
      <LandingNavbar />
      <main>
        <HeroSection />
        <WorkflowSection />
        <ShowcaseSection />
        <WorkspaceSection />
        <ArchitectureSection />
      </main>
      <Footer />
    </div>
  );
};
