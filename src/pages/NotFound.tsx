
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 animate-fade-in max-w-md mx-auto px-4">
        <div className="text-g15-primary font-bold text-7xl">404</div>
        
        <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
        
        <p className="text-gray-600">
          We couldn't find the page you were looking for.
          <br />
          The page <code className="text-g15-primary bg-g15-primary/10 px-1 py-0.5 rounded">{location.pathname}</code> doesn't exist.
        </p>
        
        <Button asChild className="bg-g15-primary hover:bg-g15-primary/90">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
