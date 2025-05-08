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
  const [user, setUser] = useState<UserProfile | null>(() => {
    // İlk render sırasında localStorage'dan kullanıcı bilgisini al (eğer varsa)
    const savedUser = localStorage.getItem('g15-user-profile');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(true); // Başlangıçta HER ZAMAN true
  const navigate = useNavigate();
  // Component'in bağlı olup olmadığını takip etmek için useRef
  const isMounted = useRef(true);

  // Kullanıcı değiştiğinde localStorage'a yedekle
  useEffect(() => {
    if (user) {
      localStorage.setItem('g15-user-profile', JSON.stringify(user));
    } else {
      localStorage.removeItem('g15-user-profile');
    }
  }, [user]);

  // Kullanıcı profilini Supabase'den çekmek için asenkron fonksiyon
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
        if (error.code === 'PGRST116') { // Profil henüz yok
          console.warn(`${logPrefix} Profil bulunamadı (PGRST116), varsayılan oluşturuluyor:`, userId);
           // Profil yoksa varsayılan bir tane oluşturmayı deneyelim (opsiyonel ama iyi pratik)
           try {
             const { error: insertError } = await supabase
               .from("profiles")
               .insert([{ id: userId, first_name: "", last_name: "" }]); // Sadece ID ile oluştur
             if (insertError && insertError.code !== '23505') { // 23505 = unique_violation (zaten varsa)
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
            // Diğer hatalarda da varsayılan döndür
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
      return { id: userId, email: userEmail, firstName: "", lastName: "", isPro: false, points: 0, isAdmin: false }; // Hata durumunda varsayılan
    }
  };

  // Oturum durumuna göre kullanıcı state'ini yöneten fonksiyon
  const updateUserState = async (sessionUser: User | null) => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext updateUserState:`;
    try {
      if (sessionUser) {
        console.log(`${logPrefix} Oturum var, profil çekiliyor:`, sessionUser.id);
        const profile = await fetchUserProfile(sessionUser.id, sessionUser.email || "");
        if (isMounted.current) setUser(profile); // Sadece component bağlıysa güncelle
      } else {
        console.log(`${logPrefix} Oturum yok, kullanıcı null yapılıyor.`);
        if (isMounted.current) setUser(null);
      }
    } catch (err) {
      console.error(`${logPrefix} Profil çekme hatası:`, err);
      if (isMounted.current) setUser(null);
    } finally {
      // Bu fonksiyon çağrıldığında YÜKLEME BİTMİŞ DEMEKTİR.
      if (isMounted.current) {
          console.log(`${logPrefix} Yükleme durumu false yapılıyor.`);
          setIsLoading(false);
      }
    }
  }

  // Kimlik doğrulama durumu dinleyicisi ve başlangıç kontrolü
  useEffect(() => {
    const logPrefix = `[${new Date().toISOString()}] AuthContext useEffect:`;
    isMounted.current = true;
    console.log(`${logPrefix} Başlıyor, isLoading=true`);
    setIsLoading(true);

    // Sayfa yüklendiğinde oturum bilgisini kontrol et
    const checkAuthOnPageLoad = async () => {
      try {
        // Supabase oturum bilgisini al
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error(`${logPrefix} Oturum kontrolü hatası:`, error);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          // Oturum varsa profili getir
          const profile = await fetchUserProfile(session.user.id, session.user.email || "");
          if (isMounted.current) {
            setUser(profile);
          }
        } else {
          // Oturum yoksa kullanıcıyı null yap
          if (isMounted.current) setUser(null);
        }
      } catch (error) {
        console.error(`${logPrefix} Sayfa yüklenme kontrolü hatası:`, error);
        if (isMounted.current) setUser(null);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };
    
    checkAuthOnPageLoad();

    let initialCheckDone = false; // Başlangıç kontrolü ve listener çakışmasını önlemek için

    // 2. Auth State Dinleyicisi
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`${logPrefix} onAuthStateChange olayı: ${event}`);
        if (!isMounted.current) return;

        // Eğer başlangıç kontrolü henüz bitmediyse (çok hızlı tetiklenirse)
        // veya INITIAL_SESSION olayıysa (getSession zaten halletti), bekle.
        if (!initialCheckDone || event === 'INITIAL_SESSION') {
          console.log(`${logPrefix} onAuthStateChange - Olay atlanıyor (checkDone: ${initialCheckDone}, event: ${event}).`);
          // Eğer INITIAL_SESSION ise ve checkInitialSession hala bitmemişse diye
          // isLoading'i burada false yapmaya gerek YOK, checkInitialSession'ın finally'si yapar.
          return;
        }

        console.log(`${logPrefix} onAuthStateChange - State güncelleniyor (event: ${event})...`);
        // Diğer tüm olaylar için (SIGNED_IN, SIGNED_OUT, USER_UPDATED vb.) state'i güncelle.
        // Burada tekrar isLoading=true yapmaya gerek yok, direkt güncelleme yeterli.
        await updateUserState(session?.user || null); // Bu fonksiyon isLoading'i false yapar
      }
    );

    // Cleanup
    return () => {
      console.log(`${logPrefix} useEffect cleanup.`);
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []); // Sadece mount'ta çalışır

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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        console.log(`${logPrefix} Kullanıcı profili manuel yenileniyor...`);
        setIsLoading(true); // Manuel yenilemede loading göster
        // updateUserState, isLoading'i tekrar false yapacak
        await updateUserState(session.user);
    } else {
        console.warn(`${logPrefix} Manuel profil yenileme yapılamıyor, aktif oturum yok.`);
        setIsLoading(false); // Oturum yoksa da loading bitmeli
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