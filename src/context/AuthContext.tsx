import React, { createContext, useContext, useState, useEffect } from "react";
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
  user: UserProfile | null;          // Oturum açmış kullanıcının profil bilgileri veya null
  isAuthenticated: boolean;         // Kullanıcının oturum açıp açmadığı bilgisi
  isLoading: boolean;               // Kimlik doğrulama durumunun yüklenip yüklenmediği
  login: (email: string, password: string) => Promise<void>; // Giriş fonksiyonu
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<void>; // Kayıt fonksiyonu
  logout: () => Promise<void>;        // Çıkış fonksiyonu
  refreshUserProfile: () => Promise<void>; // Kullanıcı profilini manuel yenileme fonksiyonu
}

// AuthContext'i oluştur
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context'i kullanmak için özel bir hook (useAuth)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider"); // Provider dışında kullanılırsa hata fırlat
  }
  return context;
};

// Ana AuthProvider bileşeni
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null); // Kullanıcı state'i, başlangıçta null
  const [isLoading, setIsLoading] = useState(true);          // Yükleme state'i, başlangıçta true
  const navigate = useNavigate();                           // Yönlendirme için hook

  // Kullanıcı profilini Supabase'den çekmek için asenkron fonksiyon
  const fetchUserProfile = async (userId: string, userEmail: string): Promise<UserProfile | null> => {
    console.log(`[${new Date().toISOString()}] AuthContext: Profil çekiliyor:`, userId);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, is_pro, points, is_admin")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Resource not found (Profile doesn't exist yet)
          console.warn(`[${new Date().toISOString()}] AuthContext: Profil bulunamadı (PGRST116), muhtemelen yeni kullanıcı:`, userId);
          
          // Yeni profil oluşturma girişimi
          try {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert([{ id: userId, first_name: "", last_name: "" }]);
            
            if (insertError) {
              console.error("AuthContext: Yeni profil oluşturma hatası:", insertError);
            } else {
              console.log("AuthContext: Yeni profil oluşturuldu:", userId);
            }
          } catch (insertErr) {
            console.error("AuthContext: Profil oluşturma işlemi sırasında hata:", insertErr);
          }
          
          // Yeni kullanıcı için varsayılan profil döndür
          return { 
            id: userId, 
            email: userEmail, 
            firstName: "", 
            lastName: "", 
            isPro: false, 
            points: 0, 
            isAdmin: false 
          };
        } else {
          console.error("AuthContext: Profil çekme hatası:", error);
          throw error;
        }
      }

      if (data) {
        console.log("AuthContext: Profil verileri başarıyla alındı");
        return {
          id: data.id,
          email: userEmail,
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          isPro: data.is_pro || false,
          points: data.points || 0,
          isAdmin: data.is_admin || false,
        };
      }
      console.warn("AuthContext: Profil verisi bulunamadı ama hata da yok");
      return { 
        id: userId, 
        email: userEmail, 
        firstName: "", 
        lastName: "", 
        isPro: false, 
        points: 0, 
        isAdmin: false 
      };
    } catch (error) {
      console.error("AuthContext: Profil çekme işleminde beklenmeyen hata:", error);
      // Hata durumunda varsayılan profil döndür - bu, uygulamanın çalışmaya devam etmesini sağlar
      return { 
        id: userId, 
        email: userEmail, 
        firstName: "", 
        lastName: "", 
        isPro: false, 
        points: 0, 
        isAdmin: false 
      };
    }
  };

  // Auth state listener and initial check
  useEffect(() => {
    console.log("AuthContext: Setting up listener and initial session check");
    let isMounted = true; // Bileşen bağlantısını takip etmek için
    setIsLoading(true); // Ensure loading state is true initially

    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return; // Component unmounted, don't update state
      
      if (error) {
        console.error("AuthContext: Error getting initial session:", error);
        setIsLoading(false); // End loading even if there's an error
        return;
      }
      
      console.log("AuthContext: Initial session check complete", session ? "Session exists" : "No session");
      
      if (session?.user) {
        loadUserSession(session.user);
        // loadUserSession will set isLoading to false in finally block
      } else {
        setUser(null);
        setIsLoading(false);
      }
    }).catch(err => {
      if (!isMounted) return;
      console.error("AuthContext: Unexpected error in getSession:", err);
      setIsLoading(false); // End loading on unexpected error
    });

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AuthContext: Auth state changed: ${event}`, session ? "Session exists" : "No session");
        
        if (!isMounted) return; // Bileşen bağlı değilse işleme devam etme
        
        // Handle different auth events
        if (['SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) {
          setIsLoading(true); // Kimlik durumu değiştiğinde yüklemeyi başlat
          if (session?.user) {
            await loadUserSession(session.user);
            // loadUserSession will set isLoading to false in finally block
          } else {
            // Normalde buraya ulaşılmamalı, ama güvenlik için ekledik
            setUser(null);
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("AuthContext: SIGNED_OUT event, clearing user");
          setUser(null);
          setIsLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          // Bu durumda bir şey yapma, getSession zaten işlemi gerçekleştirdi
          console.log("AuthContext: INITIAL_SESSION event, already handled by getSession");
        }
      }
    );

    return () => {
      console.log("AuthContext: Cleaning up auth listener");
      isMounted = false; // Bileşen unmount edildiğinde flag'i güncelle
      subscription.unsubscribe();
    };
  }, []); // Only run on component mount

  // Load user session based on session user
  const loadUserSession = async (sessionUser: User | null) => {
    try {
      if (sessionUser) {
        console.log("AuthContext: Session found, fetching profile...", sessionUser.id);
        const profile = await fetchUserProfile(sessionUser.id, sessionUser.email || "");
        setUser(profile);
        console.log("AuthContext: User state set with profile data.", profile);
      } else {
        console.log("AuthContext: No active session, clearing user state");
        setUser(null);
      }
    } catch (err) {
      console.error("AuthContext: Error while fetching profile during session load:", err);
      // Profil çekme hatası olsa bile oturumun varlığını kabul et, varsayılan profille devam et
      if (sessionUser) {
        const defaultProfile = { 
          id: sessionUser.id, 
          email: sessionUser.email || "", 
          firstName: "", 
          lastName: "", 
          isPro: false, 
          points: 0, 
          isAdmin: false 
        };
        setUser(defaultProfile);
        console.log("AuthContext: Error recovery - setting default profile", defaultProfile);
      } else {
        setUser(null);
      }
    } finally {
      // Her durumda yükleme durumunu false yap
      console.log("AuthContext: Setting isLoading to false");
      setIsLoading(false);
    }
  }

  // Giriş fonksiyonu
  const login = async (email: string, password: string) => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    console.log(`${logPrefix} Giriş deneniyor:`, email);
    try {
      // Supabase ile giriş yapmayı dene
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      // Hata varsa fırlat
      if (error) throw error;
      // Başarı mesajı gösterilebilir, state güncellemesi onAuthStateChange ile olacak
      toast.success("Login successful! Redirecting...");
    } catch (error: any) {
      // Hata olursa logla ve toast mesajı göster
      toast.error(`Login failed: ${error.message}`);
      console.error(`${logPrefix} Login hatası:`, error);
      throw error; // Hatayı çağıran yere (SignIn component'i) geri fırlat
    }
    // Not: Başarılı giriş sonrası isLoading'i onAuthStateChange yönetecek.
  };

  // Kayıt fonksiyonu
  const signup = async (firstName: string, lastName: string, email: string, password: string) => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    console.log(`${logPrefix} Kayıt deneniyor:`, email);
    try {
      // Supabase ile kayıt olmayı dene
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Bu bilgiler auth.users tablosundaki raw_user_meta_data sütununa gider
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error; // Hata varsa fırlat
      // Kullanıcı verisi dönmediyse veya user null ise hata fırlat
      if (!data.user) throw new Error("Signup successful but no user data returned from Supabase.");

      // Kayıt başarılı olduktan sonra 'profiles' tablosunu manuel olarak güncelle.
      // Supabase trigger'ı (handle_new_user) profili otomatik oluşturmalı,
      // ancak bu update isimleri eklemeyi garanti eder (trigger meta_data'yı işlemezse diye).
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() }) // updated_at eklendi
        .eq('id', data.user.id); // Sadece yeni oluşturulan kullanıcının profilini güncelle

      if (profileUpdateError) {
        // Profil güncelleme hatası kritik değil, sadece logla
        console.warn(`${logPrefix} Kayıt sonrası profil güncelleme hatası:`, profileUpdateError.message);
      }

      // Başarı mesajı göster ve onboarding sayfasına yönlendir
      toast.success("Account created successfully! Please check your email for verification if enabled.");
      navigate("/onboarding");

    } catch (error: any) {
      // Hata olursa logla ve toast mesajı göster
      toast.error(`Signup failed: ${error.message}`);
      console.error(`${logPrefix} Signup hatası:`, error);
      throw error; // Hatayı çağıran yere (SignUp component'i) geri fırlat
    }
    // Not: Başarılı kayıt sonrası isLoading'i onAuthStateChange yönetecek.
  };

  // Çıkış fonksiyonu
  const logout = async () => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    console.log(`${logPrefix} Kullanıcı çıkış yapıyor.`);
    try {
      // Supabase'den çıkış yap
      const { error } = await supabase.auth.signOut();
      if (error) throw error; // Hata varsa fırlat
      // setUser(null) onAuthStateChange tarafından yapılacak ama anında UI tepkisi için burada da yapılabilir
      // setUser(null);
      toast.info("You've been logged out.");
      navigate("/signin"); // Giriş sayfasına yönlendir
    } catch (error: any) {
      // Hata olursa logla ve toast mesajı göster
      console.error(`${logPrefix} Logout hatası:`, error);
      toast.error(`Logout failed: ${error.message}`);
    }
    // Not: Başarılı/başarısız çıkış sonrası isLoading'i onAuthStateChange yönetecek.
  };

  // Kullanıcı profilini manuel olarak yenileme fonksiyonu
  const refreshUserProfile = async () => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext:`;
    // Önce mevcut Supabase oturumunu al
    const { data: { session } } = await supabase.auth.getSession();
    // Oturum varsa ve context'teki kullanıcı ile aynıysa
    if (session?.user) {
        console.log(`${logPrefix} Kullanıcı profili manuel yenileniyor...`);
        setIsLoading(true); // Yenileme sırasında yükleniyor göster
        // updateUserState fonksiyonunu çağırarak profili tekrar çek ve state'i güncelle
        // Bu fonksiyon isLoading'i false yapacak.
        // isMounted referansını burada oluşturup iletmek gerekir ama basitlik için şimdilik direkt çağırıyoruz.
        // Gerçek kullanımda, bu fonksiyonun çağrıldığı yerde bir 'iptal' mekanizması olması daha iyi olabilir.
        await loadUserSession(session.user); // Basit isMounted simülasyonu
    } else {
        console.warn(`${logPrefix} Manuel profil yenileme yapılamıyor, aktif oturum yok.`);
    }
  };

  // Context'in dışarıya sağlayacağı değerler
  const authContextValue: AuthContextType = {
    user,
    isAuthenticated: !!user, // user null değilse true
    isLoading,
    login,
    signup,
    logout,
    refreshUserProfile
  };

  // Provider'ı ve içindeki çocuk bileşenleri döndür
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};