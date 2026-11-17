import React from "react";
import { Link } from "react-router-dom";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  withLink?: boolean;
  tagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  withLink = true,
  tagline = false,
}) => {
  const sizeMap = {
    sm: { icon: "w-6 h-6", text: "text-base", dot: "w-1.5 h-1.5" },
    md: { icon: "w-8 h-8", text: "text-lg", dot: "w-2 h-2" },
    lg: { icon: "w-10 h-10", text: "text-2xl", dot: "w-2.5 h-2.5" },
  };

  const content = (
    <div className="flex items-center gap-2.5 group select-none">
      {/* Geometric Monogram */}
      <div
        className={`${sizeMap[size].icon} relative rounded-lg bg-raven-700 border border-seagrass-400/25 flex items-center justify-center overflow-hidden transition-colors group-hover:border-apricot-500/50 shadow-surface`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Subtle structural grid lines */}
          <path
            d="M8 8V24M8 8H18C20.2091 8 22 9.79086 22 12C22 14.2091 20.2091 16 18 16H8M15 16L23 24"
            stroke="#9FB3AB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Apricot Flare focal point */}
          <circle cx="18" cy="12" r="2.2" fill="#FF8A1F" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`${sizeMap[size].text} font-bold tracking-wider text-seagrass-50 font-sans`}
          >
            REVE
          </span>
          <span className="text-[10px] uppercase tracking-widest font-mono text-apricot-500 font-semibold px-1 py-0.5 rounded bg-apricot-500/10 border border-apricot-500/20">
            STUDIO
          </span>
        </div>
        {tagline && (
          <span className="text-[11px] text-seagrass-400 tracking-wide mt-0.5">
            AI Visual Creation Platform
          </span>
        )}
      </div>
    </div>
  );

  if (withLink) {
    return (
      <Link to="/" className="inline-flex focus-visible:ring-2 focus-visible:ring-apricot-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
};
