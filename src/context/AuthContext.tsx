import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isPro: boolean;
  points: number;
  isAdmin: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// LocalStorage anahtar sabiti
const AUTH_STORAGE_KEY = 'g15_user';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Save user to localStorage when user changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        console.log("User saved to localStorage", new Date().toISOString());
      } catch (e) {
        console.error("Failed to save user to localStorage:", e);
      }
    }
  }, [user]);

  // Load user from localStorage on init
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser && !user) {
          console.log("Loading user from localStorage", new Date().toISOString());
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    };
    
    // Sayfa ilk yüklendiğinde localStorage'dan kullanıcıyı yükle
    loadStoredUser();
  }, []);

  // Fetch user profile data from Supabase
  const fetchUserProfile = async (userId: string) => {
    console.log("Fetching user profile for:", userId);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      if (data) {
        console.log("Profile data retrieved successfully");
        return {
          id: data.id,
          email: "", // Will be set from auth user
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          isPro: data.is_pro || false,
          points: data.points || 0,
          isAdmin: data.is_admin || false,
        };
      }
      console.log("No profile data found");
      return null;
    } catch (error) {
      console.error("Exception in fetchUserProfile:", error);
      return null;
    }
  };

  // Setup auth state listener
  useEffect(() => {
    console.log("Setting up auth state listener");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth state changed: ${event}`, new Date().toISOString());
        setIsLoading(true);
        
        if (session?.user) {
          console.log("Session user found, fetching profile");
          try {
            const profile = await fetchUserProfile(session.user.id);
            
            if (profile) {
              console.log("Setting user with profile data");
              setUser({
                ...profile,
                email: session.user.email || "",
              });
            } else {
              // If profile fetch failed, at least set basic user info
              console.log("Profile fetch failed, setting basic user info");
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                firstName: "",
                lastName: "",
                isPro: false,
                points: 0,
                isAdmin: false
              });
            }
          } catch (err) {
            console.error("Error in auth state change handler:", err);
            // Yine de kullanıcıyı ayarlayalım
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              firstName: "",
              lastName: "",
              isPro: false,
              points: 0,
              isAdmin: false
            });
          }
        } else {
          if (event === 'SIGNED_OUT') {
            console.log("User signed out, clearing data");
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
        
        setIsLoading(false);
      }
    );

    // Check current session
    const initAuth = async () => {
      console.log("Initializing auth...", new Date().toISOString());
      setIsLoading(true);
      try {
        // Attempt to get session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        console.log("Session check:", session ? "Active session found" : "No active session");
        
        if (session?.user) {
          try {
            console.log("Fetching profile for authenticated user");
            const profile = await fetchUserProfile(session.user.id);
            
            if (profile) {
              console.log("Setting user with fetched profile");
              setUser({
                ...profile,
                email: session.user.email || "",
              });
            } else {
              // If profile fetch failed, set basic user info
              console.log("Profile fetch failed, setting basic user info");
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                firstName: "",
                lastName: "",
                isPro: false,
                points: 0,
                isAdmin: false
              });
            }
          } catch (profileError) {
            console.error("Error fetching profile during init:", profileError);
            // Regardless of profile error, set basic user from session
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              firstName: "",
              lastName: "",
              isPro: false,
              points: 0,
              isAdmin: false
            });
          }
        } else {
          // Try to get user from localStorage if no active session
          const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
          
          if (storedUser) {
            console.log("No active session, but found stored user data");
            try {
              // Attempt to restore from localStorage
              const parsedUser = JSON.parse(storedUser);
              
              try {
                // Validate stored user by checking session
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                
                if (refreshError || !refreshData.session) {
                  console.log("Stored user invalid, clearing localStorage", refreshError);
                  localStorage.removeItem(AUTH_STORAGE_KEY);
                  setUser(null);
                } else {
                  // Session refresh worked, set user from localStorage
                  console.log("Session refreshed successfully, using stored user");
                  setUser(parsedUser);
                }
              } catch (refreshError) {
                console.error("Session refresh exception:", refreshError);
                // Hata durumunda localStorage'dan kullanıcıyı yine de deneyelim
                console.log("Using localStorage user despite refresh error");
                setUser(parsedUser);
              }
            } catch (e) {
              console.error("Failed to parse stored user:", e);
              localStorage.removeItem(AUTH_STORAGE_KEY);
              setUser(null);
            }
          } else {
            console.log("No session and no stored user");
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
        
        // Fallback to localStorage in case of error
        try {
          const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
          if (storedUser) {
            console.log("Using localStorage as fallback due to auth error");
            setUser(JSON.parse(storedUser));
          } else {
            setUser(null);
          }
        } catch (e) {
          console.error("Failed to use localStorage fallback:", e);
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      console.log("Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Attempting login for:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error from Supabase:", error);
        throw error;
      }

      if (data.user) {
        console.log("Login successful, fetching profile");
        try {
          const profile = await fetchUserProfile(data.user.id);
          
          if (profile) {
            console.log("Setting user with profile after login");
            setUser({
              ...profile,
              email: data.user.email || "",
            });
            
            toast.success("Login successful! Welcome back.");
            navigate("/dashboard");
          } else {
            // If profile fetch failed, at least set basic user info
            console.log("Profile fetch failed after login, setting basic user info");
            setUser({
              id: data.user.id,
              email: data.user.email || "",
              firstName: "",
              lastName: "",
              isPro: false,
              points: 0,
              isAdmin: false
            });
            
            toast.success("Login successful! Welcome back.");
            navigate("/dashboard");
          }
        } catch (profileError) {
          console.error("Error fetching profile after login:", profileError);
          // Set basic user info even if profile fetch fails
          setUser({
            id: data.user.id,
            email: data.user.email || "",
            firstName: "",
            lastName: "",
            isPro: false,
            points: 0,
            isAdmin: false
          });
          
          toast.success("Login successful!");
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast.error(`Login failed: ${error.message}`);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Attempting signup for:", email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        console.error("Signup error from Supabase:", error);
        throw error;
      }

      if (data.user) {
        console.log("Signup successful, updating profile");
        // Update the profile with first name and last name
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            first_name: firstName,
            last_name: lastName,
          })
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Error updating profile after signup:", profileError);
        }
        
        toast.success("Account created successfully!");
        navigate("/onboarding");
      }
    } catch (error: any) {
      toast.error(`Signup failed: ${error.message}`);
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("Logging out user");
      await supabase.auth.signOut();
      setUser(null);
      // Clear localStorage when logging out
      localStorage.removeItem(AUTH_STORAGE_KEY);
      console.log("User data cleared from localStorage");
      toast.info("You've been logged out.");
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
