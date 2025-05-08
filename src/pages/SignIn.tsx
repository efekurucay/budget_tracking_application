import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

const SignIn = () => {
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginTimeout, setLoginTimeout] = useState<NodeJS.Timeout | null>(null);

  // İlk render sırasında ve isAuthenticated değiştiğinde kontrol et
  useEffect(() => {
    console.log("SignIn component loading, isAuthenticated:", isAuthenticated);
    
    // Eğer zaten giriş yapılmışsa hemen yönlendir
    if (isAuthenticated && !isLoading) {
      console.log("User is already authenticated, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Login başarılı olduğunda da kontrol et
  useEffect(() => {
    // Eğer login işlemi bitmiş ve giriş yapılmışsa dashboard'a yönlendir
    if (isAuthenticated && !signingIn && !isLoading) {
      console.log("Login completed, isAuthenticated changed to true, redirecting...");
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, signingIn, isLoading, navigate]);

  // Timeout temizleme için useEffect
  useEffect(() => {
    return () => {
      // Komponent unmount edildiğinde timeout'u temizle
      if (loginTimeout) {
        clearTimeout(loginTimeout);
      }
    };
  }, [loginTimeout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      setError(null);
      setSigningIn(true);
      console.log("Attempting login...", new Date().toISOString());
      
      // 30 saniye sonra otomatik olarak timeout göster
      const timeout = setTimeout(() => {
        console.log("Login timeout occurred");
        setSigningIn(false);
        setError("Login is taking too long. Please try again.");
        toast.error("Login timeout. Please try again.");
      }, 30000);
      
      setLoginTimeout(timeout);
      
      await login(email, password);
      
      // Başarılı olursa timeout'u temizle
      if (loginTimeout) {
        clearTimeout(loginTimeout);
      }
      
      // Login işlemi sonrası tekrar bir yönlendirme deneyebiliriz
      if (!isLoading) {
        console.log("Login successful, attempting direct navigation");
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      // Hata durumunda timeout'u temizle
      if (loginTimeout) {
        clearTimeout(loginTimeout);
      }
      
      console.error("Login error in component:", error);
      setError(error.message || "Failed to sign in");
    } finally {
      setSigningIn(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Welcome Back"
      description="Enter your credentials to access your account"
      footer={
        <div className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link to="/signup" className="text-g15-primary hover:underline">
            Create one
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="g15-input"
            disabled={signingIn}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-sm text-g15-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="g15-input"
            disabled={signingIn}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={signingIn}>
          {signingIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-500">Demo Account</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Button
            type="button"
            className="w-full"
            variant="outline"
            onClick={() => {
              setEmail("demo@g15finance.com");
              setPassword("demo123456");
            }}
            disabled={signingIn}
          >
            Use Demo Account
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default SignIn;
