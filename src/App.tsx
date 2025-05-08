
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Goals from "./pages/Goals";
import Budget from "./pages/Budget";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Groups from "./pages/Groups";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Upgrade from "./pages/Upgrade";
import Index from "./pages/Index";
import AIAssistant from "./pages/AIAssistant"; // Add AI Assistant page

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};

// Authentication wrapper component
const AuthenticatedApp = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/signin" element={<SignIn />} />
    <Route path="/signup" element={<SignUp />} />
    <Route 
      path="/dashboard" 
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/goals" 
      element={
        <ProtectedRoute>
          <Goals />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/budget" 
      element={
        <ProtectedRoute>
          <Budget />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/transactions" 
      element={
        <ProtectedRoute>
          <Transactions />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/reports" 
      element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/groups" 
      element={
        <ProtectedRoute>
          <Groups />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/ai-assistant" 
      element={
        <ProtectedRoute>
          <AIAssistant />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/profile" 
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/settings" 
      element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/notifications" 
      element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/upgrade" 
      element={
        <ProtectedRoute>
          <Upgrade />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/onboarding" 
      element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } 
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
