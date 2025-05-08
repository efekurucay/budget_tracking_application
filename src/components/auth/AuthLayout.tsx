
import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  footer?: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  description, 
  footer 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-g15-primary/5 to-g15-secondary/5">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-6">
            <Logo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
        
        {children}
        
        {footer && (
          <div className="mt-6 text-center text-sm text-gray-600">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
