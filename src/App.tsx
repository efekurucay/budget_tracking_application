import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, HashRouter, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect } from "react";

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
import GroupDetail from "./pages/GroupDetail";
import JoinGroup from "./pages/JoinGroup";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Upgrade from "./pages/Upgrade";
import Index from "./pages/Index";
import AIAssistant from "./pages/AIAssistant"; // Add AI Assistant page
import AdminDashboard from "./pages/AdminDashboard";
import Showcase from "./pages/Showcase"; // Import Showcase page
import Badges from "./pages/Badges"; // Import Badges page

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
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Eğer yükleme tamamlandıysa ve oturum açılmamışsa, giriş sayfasına yönlendir
      navigate('/signin', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Yükleme sırasında veya zaten doğrulanmışsa içeriği göster
  return (
    <>
      {isLoading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : isAuthenticated ? (
        children
      ) : null}
    </>
  );
};

// Admin route component - only for admin users
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/signin', { replace: true });
      } else if (!user?.isAdmin) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  return (
    <>
      {isLoading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : isAuthenticated && user?.isAdmin ? (
        children
      ) : null}
    </>
  );
};

// Authentication wrapper component
const AuthenticatedApp = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Sayfa yenilendiğinde oturum durumuna göre yönlendirme
  useEffect(() => {
    // Eğer oturum yükleme tamamlandıysa ve kullanıcı oturum açmışsa
    if (!isLoading && isAuthenticated) {
      // Eğer giriş sayfası veya ana sayfa ise dashboard'a yönlendir
      const path = window.location.hash; // /#/path şeklinde
      if (path === '#/' || path === '#/signin' || path === '#/signup') {
        navigate('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
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
        path="/groups/join" 
        element={
          <ProtectedRoute>
            <JoinGroup />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/groups/:groupId" 
        element={
          <ProtectedRoute>
            <GroupDetail />
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
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />
      <Route 
        path="/showcase" 
        element={
          <ProtectedRoute>
            <Showcase />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/badges" 
        element={
          <ProtectedRoute>
            <Badges />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
