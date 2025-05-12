import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import { toast } from "@/components/ui/sonner";
import { Loader2, Chrome } from "lucide-react"; // Import Chrome icon for Google

const SignIn = () => {
  const { login, signInWithGoogle, isLoading, isAuthenticated } = useAuth(); // Add signInWithGoogle
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false); // For email/password sign-in
  const [signingInWithGoogle, setSigningInWithGoogle] = useState(false); // For Google sign-in
  const [error, setError] = useState<string | null>(null);
  const [loginTimeout, setLoginTimeout] = useState<NodeJS.Timeout | null>(null);

  // İlk render sırasında ve isAuthenticated değiştiğinde kontrol et
  useEffect(() => {
    console.log("SignIn component loading, isAuthenticated:", isAuthenticated);
    if (isAuthenticated && !isLoading) {
      console.log("User is already authenticated, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Login başarılı olduğunda da kontrol et
  useEffect(() => {
    if (isAuthenticated && !signingIn && !signingInWithGoogle && !isLoading) {
      console.log("Login completed, isAuthenticated changed to true, redirecting...");
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, signingIn, signingInWithGoogle, isLoading, navigate]);

  // Timeout temizleme için useEffect
  useEffect(() => {
    return () => {
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
      console.log("Attempting email/password login...", new Date().toISOString());
      const timeout = setTimeout(() => {
        console.log("Login timeout occurred");
        setSigningIn(false);
        setError("Login is taking too long. Please try again.");
        toast.error("Login timeout. Please try again.");
      }, 30000);
      setLoginTimeout(timeout);
      await login(email, password);
      if (loginTimeout) clearTimeout(loginTimeout);
      if (!isLoading) {
        console.log("Email/Password login successful, attempting direct navigation");
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      if (loginTimeout) clearTimeout(loginTimeout);
      console.error("Email/Password login error in component:", error);
      setError(error.message || "Failed to sign in");
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setSigningInWithGoogle(true);
      console.log("Attempting Google login...", new Date().toISOString());
      await signInWithGoogle();
      // Yönlendirme Supabase tarafından yönetilecek, bu nedenle burada doğrudan navigate çağrısı yok.
      // Başarı/hata durumları AuthContext'teki onAuthStateChange tarafından ele alınacak.
    } catch (error: any) {
      console.error("Google Sign-In error in component:", error);
      setError(error.message || "Failed to sign in with Google.");
      toast.error(error.message || "Failed to sign in with Google.");
      setSigningInWithGoogle(false);
    }
    // setSigningInWithGoogle(false) OAuth akışında genellikle burada çağrılmaz,
    // çünkü sayfa yönlendirmesi olur. Ancak hata durumunda false'a çekmek iyi olabilir.
  };

  if (isLoading && !isAuthenticated) { // Sadece kimlik doğrulaması yüklenirken ve kullanıcı doğrulanmamışken yükleme ekranı göster
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
            disabled={signingIn || signingInWithGoogle}
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
            disabled={signingIn || signingInWithGoogle}
          />
        </div>
        <Button type="submit" className="w-full" disabled={signingIn || signingInWithGoogle}>
          {signingIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          type="button" 
          className="w-full" 
          onClick={handleGoogleSignIn}
          disabled={signingIn || signingInWithGoogle}
        >
          {signingInWithGoogle ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Chrome className="mr-2 h-4 w-4" /> // Google icon
          )}
          Sign in with Google
        </Button>
        

        
   
      </form>
    </AuthLayout>
  );
};

export default SignIn;
