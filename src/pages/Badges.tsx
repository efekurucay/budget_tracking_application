import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Award, Search, Medal, Trophy, Target, Filter, CheckCircle2, 
  PiggyBank, Wallet, Users, CalendarCheck, Star, ChevronRight, Loader2, 
  LockIcon, ShieldCheck, Sparkles, BarChart2 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// Badge tip tanımı
interface BadgeType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  points: number;
  condition_type: string;
  condition_value: number;
  is_secret: boolean;
  is_earned?: boolean; // Kullanıcının bu rozete sahip olup olmadığını belirtir
}

const Badges = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Tüm rozet verilerini çek
  const { data: allBadges, isLoading: isBadgesLoading } = useQuery<BadgeType[]>({
    queryKey: ["badges-catalog"],
    queryFn: async () => {
      // İlk olarak tüm rozetleri çek (gizli olanlar hariç)
      const { data: badges, error } = await supabase
        .from("badges")
        .select("*")
        .eq("is_secret", false)
        .order("condition_value", { ascending: true });
        
      if (error) throw error;
      
      // Kullanıcı giriş yapmışsa
      if (user?.id) {
        // Kullanıcının sahip olduğu rozetleri çek
        const { data: userBadges, error: userBadgesError } = await supabase
          .from("user_badges")
          .select("badge_id")
          .eq("user_id", user.id);
          
        if (userBadgesError) throw userBadgesError;
        
        // Kullanıcının sahip olduğu rozetleri işaretle
        const userBadgeIds = userBadges.map(ub => ub.badge_id);
        
        return badges.map(badge => ({
          ...badge,
          is_earned: userBadgeIds.includes(badge.id)
        }));
      }
      
      return badges;
    },
    enabled: !isAuthLoading,
  });
  
  // Filtrelenmiş rozetleri elde et
  const filteredBadges = allBadges?.filter(badge => 
    badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (badge.description && badge.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    badge.condition_type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Rozet koşul açıklaması için yardımcı fonksiyon
  const getBadgeConditionText = (badge: BadgeType) => {
    const conditionType = badge.condition_type;
    const value = badge.condition_value;
    
    const conditionMap: Record<string, string> = {
      "transaction_count": `${value} işlem ekle`,
      "goal_count": `${value} hedef oluştur`,
      "completed_goal": `${value} hedef tamamla`,
      "budget_count": `${value} bütçe kategorisi oluştur`,
      "group_creation": `${value} grup oluştur`,
      "login_streak": `${value} gün boyunca uygulamayı kullan`,
      "pro_subscription": "Pro üyeliğe geç",
      "saving_goal": `${value} tasarruf hedefi oluştur`,
      "secret_achievement": "Gizli bir başarı elde et"
    };
    
    return conditionMap[conditionType] || `${conditionType}: ${value}`;
  };
  
  // Rozet ikonu gösterimi için yardımcı fonksiyon
  const renderBadgeIcon = (iconName: string | null) => {
    const iconMap: Record<string, React.ReactNode> = {
      "Star": <Star className="h-6 w-6" />,
      "Award": <Award className="h-6 w-6" />,
      "Trophy": <Trophy className="h-6 w-6" />,
      "Crown": <Medal className="h-6 w-6" />,
      "Target": <Target className="h-6 w-6" />,
      "PieChart": <PiggyBank className="h-6 w-6" />,
      "Sparkles": <Sparkles className="h-6 w-6" />,
      "Zap": <ShieldCheck className="h-6 w-6" />,
      "Users": <Users className="h-6 w-6" />,
      "Calendar": <CalendarCheck className="h-6 w-6" />,
      "CalendarCheck": <CalendarCheck className="h-6 w-6" />,
      "PiggyBank": <PiggyBank className="h-6 w-6" />,
      "CheckCircle": <CheckCircle2 className="h-6 w-6" />,
      "Flag": <Award className="h-6 w-6" />,
      "BarChart2": <BarChart2 className="h-6 w-6" />,
    };
    
    return iconName && iconMap[iconName] ? iconMap[iconName] : <Award className="h-6 w-6" />;
  };
  
  // Rozet tipi rengini döndüren yardımcı fonksiyon
  const getBadgeTypeColor = (conditionType: string) => {
    const colorMap: Record<string, string> = {
      "transaction_count": "bg-green-100 text-green-800",
      "goal_count": "bg-blue-100 text-blue-800",
      "completed_goal": "bg-purple-100 text-purple-800",
      "budget_count": "bg-orange-100 text-orange-800",
      "group_creation": "bg-pink-100 text-pink-800",
      "login_streak": "bg-indigo-100 text-indigo-800",
      "pro_subscription": "bg-g15-accent/20 text-g15-accent",
      "saving_goal": "bg-yellow-100 text-yellow-800",
      "secret_achievement": "bg-gray-100 text-gray-800"
    };
    
    return colorMap[conditionType] || "bg-gray-100 text-gray-800";
  };
  
  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rozet Kataloğu</h1>
            <p className="text-gray-600">Başarılarınızı takip edin ve ödüller kazanın</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Rozet ara..." 
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/profile')}>
              Profilim <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Rozet İstatistikleri */}
        {user && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-g15-accent/10 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Trophy className="h-5 w-5 text-g15-accent mr-2" />
                    <h3 className="font-medium">Kazanılan Rozetler</h3>
                  </div>
                  <p className="text-2xl font-bold">
                    {allBadges?.filter(b => b.is_earned).length || 0}
                    <span className="text-sm font-normal text-gray-600 ml-2">/ {allBadges?.length || 0}</span>
                  </p>
                  <div className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-g15-accent" 
                      style={{ 
                        width: allBadges?.length 
                          ? `${Math.min(100, ((allBadges.filter(b => b.is_earned).length / allBadges.length) * 100))}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Star className="h-5 w-5 text-amber-500 mr-2" />
                    <h3 className="font-medium">Toplam Puan</h3>
                  </div>
                  <p className="text-2xl font-bold">
                    {user.points || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Rozetlerden kazanılan puanlar
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <LockIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="font-medium">Kilitli Rozetler</h3>
                  </div>
                  <p className="text-2xl font-bold">
                    {allBadges ? allBadges.length - (allBadges.filter(b => b.is_earned).length || 0) : 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Henüz kazanılmamış rozetler
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Rozet Listesi */}
        {isBadgesLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBadges && filteredBadges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBadges.map((badge) => (
              <Card 
                key={badge.id} 
                className={`overflow-hidden transition-all ${badge.is_earned ? 'border-g15-accent/50 shadow-md' : 'border-gray-200'}`}
              >
                <div className={`h-3 w-full ${badge.is_earned ? 'bg-g15-accent' : 'bg-gray-200'}`}></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className={`h-14 w-14 rounded-full ${badge.is_earned ? 'bg-g15-accent/10' : 'bg-gray-100'} flex items-center justify-center mr-3`}>
                        {badge.is_earned ? (
                          <div className="text-g15-accent">
                            {badge.icon ? renderBadgeIcon(badge.icon) : <Award className="h-6 w-6" />}
                          </div>
                        ) : (
                          <div className="text-gray-400">
                            {badge.icon ? renderBadgeIcon(badge.icon) : <Award className="h-6 w-6" />}
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className={badge.is_earned ? 'text-g15-accent' : ''}>{badge.name}</CardTitle>
                        <CardDescription>
                          {badge.points} Puan
                        </CardDescription>
                      </div>
                    </div>
                    {badge.is_earned && (
                      <Badge className="bg-green-100 text-green-800 font-medium">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Kazanıldı
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-3">{badge.description}</p>
                  
                  <Badge variant="outline" className={getBadgeTypeColor(badge.condition_type)}>
                    {getBadgeConditionText(badge)}
                  </Badge>
                </CardContent>
                <CardFooter className="pt-0 flex justify-between">
                  {badge.is_earned ? (
                    <Button 
                      variant="outline" 
                      className="text-g15-accent border-g15-accent/20 hover:bg-g15-accent/10"
                      onClick={() => navigate('/showcase')}
                    >
                      Showcase'de Paylaş
                    </Button>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Bu rozeti kazanmak için gerekli koşulları sağlayın.
                    </p>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Filter className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-medium">Aramanıza Uygun Rozet Bulunamadı</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-4">
                    "{searchQuery}" için herhangi bir rozet bulunamadı
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery('')}
                  >
                    Aramayı Temizle
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium">Rozet Bulunamadı</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Henüz rozet tanımlanmamış
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Badges; 