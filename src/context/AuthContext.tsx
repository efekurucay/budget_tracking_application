import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner"; // shadcn/ui sonner varsayılıyor
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Kullanıcı profilinin arayüzü (interface)
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isPro: boolean;
  points: number;
  isAdmin: boolean;
}

// AuthContext'in tip tanımı
interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>; // Google ile giriş fonksiyonu
  refreshUserProfile: () => Promise<void>;
}

// AuthContext'i oluştur
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context'i kullanmak için özel bir hook (useAuth)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Ana AuthProvider bileşeni
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('g15-user-profile');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  useEffect(() => {
    if (user) {
      localStorage.setItem('g15-user-profile', JSON.stringify(user));
    } else {
      localStorage.removeItem('g15-user-profile');
    }
  }, [user]);

  const fetchUserProfile = async (userId: string, userEmail: string): Promise<UserProfile> => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext FetchProfile:`;
    console.log(`${logPrefix} Kullanıcı ${userId} için çekiliyor...`);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, is_pro, points, is_admin")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`${logPrefix} Profil bulunamadı (PGRST116), varsayılan oluşturuluyor:`, userId);
          try {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert([{ id: userId, first_name: "", last_name: "" }]);
            if (insertError && insertError.code !== '23505') {
              console.error(`${logPrefix} Yeni profil oluşturma hatası:`, insertError);
            } else if (!insertError) {
              console.log(`${logPrefix} Yeni profil satırı oluşturuldu:`, userId);
            }
          } catch (insertErr) {
            console.error(`${logPrefix} Profil oluşturma istisnası:`, insertErr);
          }
          return { id: userId, email: userEmail, firstName: "", lastName: "", isPro: false, points: 0, isAdmin: false };
        } else {
          console.error(`${logPrefix} Profil çekme hatası:`, error);
          return { id: userId, email: userEmail, firstName: "", lastName: "", isPro: false, points: 0, isAdmin: false };
        }
      }
      if (data) {
        console.log(`${logPrefix} Profil başarıyla çekildi.`);
        return {
          id: data.id, email: userEmail, firstName: data.first_name || "", lastName: data.last_name || "",
          isPro: data.is_pro || false, points: data.points || 0, isAdmin: data.is_admin || false,
        };
      }
      console.warn(`${logPrefix} Veri yok/hata yok, varsayılan kullanılıyor.`);
      return { id: userId, email: userEmail, firstName: "", lastName: "", isPro: false, points: 0, isAdmin: false };
    } catch (error) {
      console.error(`${logPrefix} İstisna:`, error);
      return { id: userId, email: userEmail, firstName: "", lastName: "", isPro: false, points: 0, isAdmin: false };
    }
  };

  const updateUserState = async (sessionUser: User | null) => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext updateUserState:`;
    try {
      if (sessionUser) {
        console.log(`${logPrefix} Oturum var, profil çekiliyor:`, sessionUser.id);
        const profile = await fetchUserProfile(sessionUser.id, sessionUser.email || "");
        if (isMounted.current) setUser(profile);
      } else {
        console.log(`${logPrefix} Oturum yok, kullanıcı null yapılıyor.`);
        if (isMounted.current) setUser(null);
      }
    } catch (err) {
      console.error(`${logPrefix} Profil çekme hatası:`, err);
      if (isMounted.current) setUser(null);
    } finally {
      if (isMounted.current) {
        console.log(`${logPrefix} Yükleme durumu false yapılıyor.`);
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext useEffect:`;
    isMounted.current = true;
    console.log(`${logPrefix} Başlıyor, isLoading=true`);
    setIsLoading(true);

    let initialCheckCompleted = false; // Renamed for clarity and to avoid ESLint issue with reassigning const

    const checkAuthOnPageLoad = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error(`${logPrefix} Oturum kontrolü hatası:`, error);
          if (isMounted.current) {
            setUser(null);
          }
          return;
        }
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id, session.user.email || "");
          if (isMounted.current) {
            setUser(profile);
          }
        } else {
          if (isMounted.current) setUser(null);
        }
      } catch (error) {
        console.error(`${logPrefix} Sayfa yüklenme kontrolü hatası:`, error);
        if (isMounted.current) setUser(null);
      } finally {
        if (isMounted.current) setIsLoading(false);
        initialCheckCompleted = true; // Mark initial check as done
      }
    };
    
    checkAuthOnPageLoad();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`${logPrefix} onAuthStateChange olayı: ${event}`);
        if (!isMounted.current) return;

        // Only update if initial page load check is complete,
        // or if the event is not INITIAL_SESSION (which is handled by checkAuthOnPageLoad)
        if (!initialCheckCompleted || event === 'INITIAL_SESSION' && !session) { // Also handle INITIAL_SESSION if session is null (e.g. after logout)
          console.log(`${logPrefix} onAuthStateChange - Olay atlanıyor (initialCheckCompleted: ${initialCheckCompleted}, event: ${event}).`);
          return;
        }
        
        console.log(`${logPrefix} onAuthStateChange - State güncelleniyor (event: ${event})...`);
        await updateUserState(session?.user || null);
      }
    );

    return () => {
      console.log(`${logPrefix} useEffect cleanup.`);
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    console.log(`${logPrefix} Giriş deneniyor:`, email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Login successful! Redirecting...");
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id, data.user.email || "");
        setUser(profile);
        console.log(`${logPrefix} Login başarılı, dashboard'a yönlendiriliyor...`);
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast.error(`Login failed: ${error.message}`);
      console.error(`${logPrefix} Login hatası:`, error);
      throw error;
    }
  };

  const signup = async (firstName: string, lastName: string, email: string, password: string) => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    console.log(`${logPrefix} Kayıt deneniyor:`, email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Signup successful but no user data returned from Supabase.");
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() })
        .eq('id', data.user.id);
      if (profileUpdateError) {
        console.warn(`${logPrefix} Kayıt sonrası profil güncelleme hatası:`, profileUpdateError.message);
      }
      toast.success("Account created successfully! Please check your email for verification if enabled.");
      navigate("/onboarding");
    } catch (error: any) {
      toast.error(`Signup failed: ${error.message}`);
      console.error(`${logPrefix} Signup hatası:`, error);
      throw error;
    }
  };

  const logout = async () => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    console.log(`${logPrefix} Kullanıcı çıkış yapıyor.`);
    try {
      setUser(null);
      localStorage.removeItem('g15-user-profile');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.info("You've been logged out.");
      localStorage.clear();
      window.location.href = window.location.origin + '/#/signin';
    } catch (error: any) {
      console.error(`${logPrefix} Logout hatası:`, error);
      toast.error(`Logout failed: ${error.message}`);
      window.location.href = window.location.origin + '/#/signin';
    }
  };

  const refreshUserProfile = async () => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log(`${logPrefix} Kullanıcı profili manuel yenileniyor...`);
      setIsLoading(true);
      await updateUserState(session.user);
    } else {
      console.warn(`${logPrefix} Manuel profil yenileme yapılamıyor, aktif oturum yok.`);
      setIsLoading(false);
    }
  };

  // Google ile giriş fonksiyonu
  const signInWithGoogle = async () => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    console.log(`${logPrefix} Google ile giriş deneniyor.`);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname.includes('/index.html') ? '/index.html' : ''}`,
        },
      });
      if (error) {
        toast.error(`Google login failed: ${error.message}`);
        console.error(`${logPrefix} Google login hatası:`, error);
        throw error;
      }
    } catch (error: any) {
      toast.error(`Google login failed: ${error.message}`);
      console.error(`${logPrefix} Google login hatası (catch):`, error);
    }
  };

  const authContextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    signInWithGoogle,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
