import React, { useEffect } from "react";
import { StudioWorkspace } from "../features/studio/StudioWorkspace";

export const StudioPage: React.FC = () => {
  useEffect(() => {
    document.title = "Reve Studio — Generative Visual Workspace";
  }, []);

  return <StudioWorkspace />;
};
