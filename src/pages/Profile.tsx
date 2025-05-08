import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, Award, Award as AwardIcon, Check, CalendarClock, Target, Wallet, ChevronRight, 
         PiggyBank, AlertTriangle, ShieldCheck, RefreshCw, LockIcon, Trophy, Sparkles, Medal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Badge tipi
interface UserBadge {
  id: string;
  badge: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    points: number;
  }
  earned_at: string;
  is_public: boolean;
}

const Profile = () => {
  const { user, isLoading: isAuthLoading, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // User data loading
  const { data: userStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get counts from database
      const [transactionsResult, goalsResult, groupsResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("id", { count: "exact" })
          .eq("user_id", user.id),
        supabase
          .from("goals")
          .select("id", { count: "exact" })
          .eq("user_id", user.id),
        supabase
          .from("group_members")
          .select("id", { count: "exact" })
          .eq("user_id", user.id),
      ]);

      return {
        transactions: transactionsResult.count || 0,
        goals: goalsResult.count || 0,
        groups: groupsResult.count || 0,
      };
    },
    enabled: !!user?.id,
  });
  
  // Kullanıcının rozetlerini çek
  const { data: userBadges, isLoading: isBadgesLoading } = useQuery<UserBadge[]>({
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          id, 
          earned_at,
          is_public,
          badge:badges(id, name, description, icon, points)
        `)
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
        
      if (error) throw error;
      
      return data as unknown as UserBadge[];
    },
    enabled: !!user?.id,
  });

  // Profil güncelleme
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Local state update
      updateUser({
        ...user,
        firstName,
        lastName,
      });

      return true;
    },
    onSuccess: () => {
      toast.success(t("profile.updateSuccess", "Profil güncellendi"));
    },
    onError: (error: any) => {
      toast.error(
        `${t("profile.updateError", "Profil güncellenirken hata")}: ${error.message}`
      );
    },
  });

  // Rozet gizlilik ayarını değiştir
  const toggleBadgeVisibilityMutation = useMutation({
    mutationFn: async ({ badgeId, isPublic }: { badgeId: string, isPublic: boolean }) => {
      if (!user?.id) throw new Error("User not found");

      const { error } = await supabase
        .from("user_badges")
        .update({ is_public: isPublic })
        .eq("id", badgeId)
        .eq("user_id", user.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-badges", user?.id] });
    },
    onError: (error: any) => {
      toast.error(`Rozet ayarı güncellenirken hata: ${error.message}`);
    },
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate();
  };
  
  const handleToggleBadgeVisibility = (badgeId: string, currentVisibility: boolean) => {
    toggleBadgeVisibilityMutation.mutate({
      badgeId,
      isPublic: !currentVisibility
    });
  };

  // Rozet ikonu gösterimi için yardımcı fonksiyon
  const renderBadgeIcon = (iconName: string | null) => {
    const iconMap: Record<string, React.ReactNode> = {
      "Star": <AwardIcon className="h-5 w-5" />,
      "Award": <Award className="h-5 w-5" />,
      "Trophy": <Trophy className="h-5 w-5" />,
      "Crown": <Medal className="h-5 w-5" />,
      "Target": <Target className="h-5 w-5" />,
      "PieChart": <PiggyBank className="h-5 w-5" />,
      "Sparkles": <Sparkles className="h-5 w-5" />,
      "Zap": <ShieldCheck className="h-5 w-5" />,
      "Users": <User className="h-5 w-5" />,
      "Calendar": <CalendarClock className="h-5 w-5" />,
      "CalendarCheck": <Check className="h-5 w-5" />,
      "PiggyBank": <PiggyBank className="h-5 w-5" />,
      "CheckCircle": <Check className="h-5 w-5" />,
      "Flag": <Award className="h-5 w-5" />,
      "BarChart2": <Award className="h-5 w-5" />,
    };
    
    return iconName && iconMap[iconName] ? iconMap[iconName] : <Award className="h-5 w-5" />;
  };

  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">
              <User className="h-4 w-4 mr-2" />
              {t("profile.generalInfo", "Genel Bilgiler")}
            </TabsTrigger>
            <TabsTrigger value="badges">
              <Award className="h-4 w-4 mr-2" />
              {t("profile.badges", "Rozetler")}
            </TabsTrigger>
            <TabsTrigger value="stats">
              <PiggyBank className="h-4 w-4 mr-2" />
              {t("profile.stats", "İstatistikler")}
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.personalInfo", "Kişisel Bilgiler")}</CardTitle>
                <CardDescription>
                  {t("profile.updateInfo", "Profilinizi güncelleyin")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarFallback className="text-2xl">
                      {firstName.charAt(0)}
                      {lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">
                    {firstName} {lastName}
                  </h2>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <div className="flex mt-2">
                    {user?.isPro ? (
                      <Badge className="bg-g15-accent text-white">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Pro
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Standard
                      </Badge>
                    )}
                    {user?.isAdmin && (
                      <Badge className="ml-2 bg-red-600 text-white">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("profile.firstName", "Ad")}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("profile.lastName", "Soyad")}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("profile.email", "E-posta")}</Label>
                  <div className="flex">
                    <Input id="email" value={user?.email} disabled />
                    <Mail className="h-4 w-4 text-gray-400 absolute right-10 top-2/4 transform -translate-y-2/4" />
                  </div>
                </div>
                {!user?.isPro && (
                  <div className="bg-gray-50 p-4 rounded-md border mt-4">
                    <div className="flex items-center">
                      <LockIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="font-medium">
                        {t("profile.upgradeToPro", "Pro'ya Yükseltin")}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {t(
                        "profile.proDescription",
                        "Pro özelliklere erişmek için hesabınızı yükseltin."
                      )}
                    </p>
                    <Button
                      className="w-full mt-2"
                      onClick={() => navigate("/upgrade")}
                    >
                      {t("profile.upgradeButton", "Pro'ya Yükselt")}
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  {t("common.cancel", "İptal")}
                </Button>
                <Button
                  onClick={handleUpdateProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.saving", "Kaydediliyor")}
                    </>
                  ) : (
                    t("common.saveChanges", "Değişiklikleri Kaydet")
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{t("profile.myBadges", "Rozetlerim")}</CardTitle>
                    <CardDescription>
                      {t("profile.badgesDescription", "Başarılarınız ve kazandığınız rozetler")}
                    </CardDescription>
                  </div>
                  <Button onClick={() => navigate("/badges")} variant="outline" className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    Rozet Kataloğu
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isBadgesLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : userBadges && userBadges.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userBadges.map((badge) => (
                      <div key={badge.id} className="bg-gray-50 rounded-lg p-4 border hover:border-g15-accent transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-g15-accent/10 flex items-center justify-center mr-3">
                              {badge.badge.icon ? (
                                renderBadgeIcon(badge.badge.icon)
                              ) : (
                                <Award className="h-5 w-5 text-g15-accent" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium">{badge.badge.name}</h3>
                              <p className="text-xs text-gray-500">
                                {new Date(badge.earned_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            title={badge.is_public ? "Bu rozet showcase'de gösteriliyor" : "Bu rozet gizli"}
                            onClick={() => handleToggleBadgeVisibility(badge.id, badge.is_public)}
                          >
                            {badge.is_public ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <LockIcon className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        {badge.badge.description && (
                          <p className="mt-2 text-sm text-gray-600">{badge.badge.description}</p>
                        )}
                        <div className="mt-2 flex justify-between items-center">
                          <Badge variant="outline" className="bg-g15-accent/5">
                            {badge.badge.points} Puan
                          </Badge>
                          {!user?.isPro && !badge.is_public && (
                            <div className="flex items-center text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Pro olmadan paylaşılamaz
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Award className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium">Henüz Rozet Kazanmadınız</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                      İşlem ekleyerek, hedefler oluşturarak ve bütçe kategorileri ekleyerek rozet kazanabilirsiniz.
                    </p>
                    <Button className="mt-4" onClick={() => navigate("/transactions")}>
                      <Wallet className="mr-2 h-4 w-4" />
                      İşlem Ekle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.myStats", "İstatistiklerim")}</CardTitle>
                <CardDescription>
                  {t("profile.statsDescription", "Kullanım istatistikleriniz")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : userStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center mb-2">
                        <Wallet className="h-5 w-5 text-g15-primary mr-2" />
                        <h3 className="font-medium">{t("common.transactions", "İşlemler")}</h3>
                      </div>
                      <p className="text-2xl font-bold">{userStats.transactions}</p>
                      <p className="text-sm text-gray-500">
                        {t("profile.transactionsDescription", "Toplam işlem")}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center mb-2">
                        <Target className="h-5 w-5 text-g15-primary mr-2" />
                        <h3 className="font-medium">{t("common.goals", "Hedefler")}</h3>
                      </div>
                      <p className="text-2xl font-bold">{userStats.goals}</p>
                      <p className="text-sm text-gray-500">
                        {t("profile.goalsDescription", "Oluşturulan hedef")}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center mb-2">
                        <User className="h-5 w-5 text-g15-primary mr-2" />
                        <h3 className="font-medium">{t("common.groups", "Gruplar")}</h3>
                      </div>
                      <p className="text-2xl font-bold">{userStats.groups}</p>
                      <p className="text-sm text-gray-500">
                        {t("profile.groupsDescription", "Üye olunan grup")}
                      </p>
                    </div>
                    
                    {user && (
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center mb-2">
                          <Award className="h-5 w-5 text-g15-primary mr-2" />
                          <h3 className="font-medium">{t("profile.points", "Puanlar")}</h3>
                        </div>
                        <p className="text-2xl font-bold">{user.points || 0}</p>
                        <p className="text-sm text-gray-500">
                          {t("profile.pointsDescription", "Toplam kazanılan puan")}
                        </p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center mb-2">
                        <CalendarClock className="h-5 w-5 text-g15-primary mr-2" />
                        <h3 className="font-medium">Üyelik Süresi</h3>
                      </div>
                      <p className="text-2xl font-bold">
                        {user ? Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                      </p>
                      <p className="text-sm text-gray-500">
                        Gün
                      </p>
                    </div>
                    
                    {userBadges && (
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center mb-2">
                          <Trophy className="h-5 w-5 text-g15-primary mr-2" />
                          <h3 className="font-medium">Rozetler</h3>
                        </div>
                        <p className="text-2xl font-bold">{userBadges.length}</p>
                        <p className="text-sm text-gray-500">
                          Kazanılan rozet
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p>{t("profile.statsError", "İstatistikler yüklenemedi")}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        queryClient.invalidateQueries({
                          queryKey: ["user-stats", user?.id],
                        })
                      }
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      {t("common.refresh", "Yenile")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
