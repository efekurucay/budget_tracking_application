
import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
}

const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = "md", 
  variant = "full" 
}) => {
  const sizeClasses = {
    sm: variant === "full" ? "text-xl" : "text-lg",
    md: variant === "full" ? "text-2xl" : "text-xl",
    lg: variant === "full" ? "text-3xl" : "text-2xl"
  };

  return (
    <div className={cn(
      "font-bold flex items-center",
      sizeClasses[size],
      className
    )}>
      <span className="text-g15-primary">G</span>
      <span className="text-g15-secondary">15</span>
      {variant === "full" && (
        <div className="ml-1 text-sm font-medium text-gray-500 flex flex-row">
          <span className="mx-0.5">Goals</span>
          <span className="mx-0.5">Groups</span>
          <span className="mx-0.5">Genius</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
