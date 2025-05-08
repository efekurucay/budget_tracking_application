import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, PlusCircle, Award, Target, Globe, Share2, Send, SparkleIcon, TrophyIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Tip tanımlamaları
interface ShowcaseItem {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  badge_id: string | null;
  goal_id: string | null;
  user_profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  goal?: {
    name: string;
    target_amount: number;
    current_amount: number | null;
  } | null;
  badge?: {
    name: string;
    icon: string | null;
    description: string | null;
  } | null;
}

interface Badge {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  points: number;
}

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number | null;
  completed_at: string | null;
}

const Showcase = () => {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // State for new showcase form
  const [newShowcaseDialog, setNewShowcaseDialog] = useState(false);
  const [content, setContent] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  
  // Fetch all showcase items
  const {
    data: showcaseItems,
    isLoading: isShowcaseLoading,
    error: showcaseError,
    isError: isShowcaseError,
  } = useQuery<ShowcaseItem[]>({
    queryKey: ["showcase-items"],
    queryFn: async () => {
      try {
        console.log("Showcase sorgusu başlatılıyor...");
        // Önce basit bir sorgu deneyelim
        const { data, error } = await supabase
          .from("showcase")
          .select("id, user_id, content, created_at, badge_id, goal_id")
          .order("created_at", { ascending: false });
          
        if (error) {
          console.error("Showcase sorgu hatası:", error);
          throw error;
        }
        
        console.log("Showcase veri sonucu:", data);
        
        // Temel veriyi aldıktan sonra ekstra bilgileri manuel ekleyelim
        const enhancedData = await Promise.all(
          (data || []).map(async (item) => {
            // Kullanıcı profili bilgilerini al
            const { data: profileData } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", item.user_id)
              .single();
              
            // Badge bilgilerini al (varsa)
            let badgeData = null;
            if (item.badge_id) {
              const { data: badge } = await supabase
                .from("badges")
                .select("name, icon, description")
                .eq("id", item.badge_id)
                .single();
              badgeData = badge;
            }
            
            // Goal bilgilerini al (varsa)
            let goalData = null;
            if (item.goal_id) {
              const { data: goal } = await supabase
                .from("goals")
                .select("name, target_amount, current_amount")
                .eq("id", item.goal_id)
                .single();
              goalData = goal;
            }
            
            return {
              ...item,
              user_profile: profileData,
              badge: badgeData,
              goal: goalData
            };
          })
        );
        
        return enhancedData as unknown as ShowcaseItem[];
      } catch (error) {
        console.error("Showcase veri çekme hatası:", error);
        throw error;
      }
    },
    enabled: true,
  });
  
  // Fetch user's badges
  const {
    data: userBadges,
    isLoading: isBadgesLoading,
  } = useQuery<Badge[]>({
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          badge:badges(id, name, icon, description, points)
        `)
        .eq("user_id", user.id);
        
      if (error) throw error;
      
      return data.map(item => item.badge) as Badge[];
    },
    enabled: !isAuthLoading && isAuthenticated && newShowcaseDialog,
  });
  
  // Fetch user's goals
  const {
    data: userGoals,
    isLoading: isGoalsLoading,
  } = useQuery<Goal[]>({
    queryKey: ["user-goals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("goals")
        .select("id, name, target_amount, current_amount, completed_at")
        .eq("user_id", user.id);
        
      if (error) throw error;
      
      return data as Goal[];
    },
    enabled: !isAuthLoading && isAuthenticated && newShowcaseDialog,
  });
  
  // Add new showcase item
  const addShowcaseMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not logged in");
      if (!content.trim()) throw new Error("Content cannot be empty");
      
      const { data, error } = await supabase
        .from("showcase")
        .insert({
          user_id: user.id,
          content: content.trim(),
          badge_id: selectedBadgeId === " " ? null : selectedBadgeId,
          goal_id: selectedGoalId === " " ? null : selectedGoalId
        })
        .select();
        
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      setContent("");
      setSelectedBadgeId(null);
      setSelectedGoalId(null);
      setNewShowcaseDialog(false);
      queryClient.invalidateQueries({ queryKey: ["showcase-items"] });
      toast.success("Başarıyla paylaşıldı!");
    },
    onError: (error: any) => {
      toast.error(`Paylaşım başarısız: ${error.message}`);
    },
  });
  
  const handleAddShowcase = () => {
    addShowcaseMutation.mutate();
  };
  
  // Loading state
  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Showcase</h1>
            <p className="text-gray-600">Topluluğun başarılarını görün ve kendinizinkini paylaşın</p>
          </div>
          {isAuthenticated && (
            <Button onClick={() => setNewShowcaseDialog(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Başarını Paylaş
            </Button>
          )}
        </div>
        
        {isShowcaseLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isShowcaseError ? (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600">Hata</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Showcase verileri yüklenirken bir hata oluştu.</p>
              {showcaseError && (
                <div className="p-2 bg-red-100 border border-red-300 rounded text-sm">
                  <p className="font-medium">Hata detayı:</p>
                  <p className="text-red-700 mt-1">
                    {showcaseError instanceof Error 
                      ? showcaseError.message 
                      : JSON.stringify(showcaseError)}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mr-2"
              >
                Sayfayı Yenile
              </Button>
            </CardFooter>
          </Card>
        ) : showcaseItems && showcaseItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showcaseItems.map((item) => (
              <Card key={item.id} className="border-g15-accent/20 hover:border-g15-accent/50 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="bg-g15-primary text-white">
                          {item.user_profile?.first_name?.[0] || item.user_id[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {item.user_profile?.first_name 
                            ? `${item.user_profile.first_name} ${item.user_profile.last_name || ''}`
                            : `Kullanıcı ${item.user_id.substring(0, 6)}`}
                        </CardTitle>
                        <CardDescription>
                          {new Date(item.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div>
                      {(item.badge_id || item.goal_id) && (
                        <Badge variant="outline" className="flex items-center">
                          {item.badge_id ? (
                            <>
                              <Award className="h-3 w-3 mr-1" />
                              {item.badge?.name || "Rozet"}
                            </>
                          ) : (
                            <>
                              <Target className="h-3 w-3 mr-1" />
                              {item.goal?.name || "Hedef"}
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                  
                  {/* Goal details if attached */}
                  {item.goal_id && item.goal && (
                    <div className="mt-4 bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center mb-2">
                        <Target className="h-4 w-4 text-g15-primary mr-1" />
                        <h4 className="font-medium">{item.goal.name}</h4>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Hedef: {item.goal.target_amount.toLocaleString()} ₺</span>
                        {item.goal.current_amount !== null && (
                          <span>İlerleme: {item.goal.current_amount.toLocaleString()} ₺</span>
                        )}
                      </div>
                      {item.goal.current_amount !== null && (
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-g15-accent" 
                            style={{ 
                              width: `${Math.min(100, (item.goal.current_amount / item.goal.target_amount) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Badge details if attached */}
                  {item.badge_id && item.badge && (
                    <div className="mt-4 bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center mb-1">
                        <Award className="h-4 w-4 text-g15-primary mr-1" />
                        <h4 className="font-medium">{item.badge.name}</h4>
                      </div>
                      {item.badge.description && (
                        <p className="text-sm text-gray-600">{item.badge.description}</p>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 pb-3">
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4 mr-1" /> Paylaş
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Henüz Paylaşım Yok</h3>
              <p className="text-gray-600 mb-6">
                İlk paylaşımı siz yapın ve topluluğu başlatın!
              </p>
              {isAuthenticated && (
                <Button onClick={() => setNewShowcaseDialog(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Başarını Paylaş
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Add Showcase Dialog */}
      <Dialog open={newShowcaseDialog} onOpenChange={setNewShowcaseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Başarını Paylaş</DialogTitle>
            <DialogDescription>
              Topluluğa bir hedef veya rozet paylaşın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="showcase-content">Mesajınız</Label>
              <Textarea
                id="showcase-content"
                placeholder="Başarınızı veya hedefinizi nasıl gerçekleştirdiğinizi paylaşın..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badge">Rozet (Opsiyonel)</Label>
                <Select
                  value={selectedBadgeId || " "}
                  onValueChange={(value) => {
                    setSelectedBadgeId(value === " " ? null : value);
                    // Bir rozet seçilirse hedef seçimini temizle
                    if (value && value !== " ") setSelectedGoalId(null);
                  }}
                >
                  <SelectTrigger id="badge">
                    <SelectValue placeholder="Rozet seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Rozet Yok</SelectItem>
                    {isBadgesLoading ? (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : userBadges && userBadges.length > 0 ? (
                      userBadges.map((badge) => (
                        <SelectItem key={badge.id} value={badge.id}>
                          {badge.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-badges" disabled>Rozetiniz yok</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goal">Hedef (Opsiyonel)</Label>
                <Select
                  value={selectedGoalId || " "}
                  onValueChange={(value) => {
                    setSelectedGoalId(value === " " ? null : value);
                    // Bir hedef seçilirse rozet seçimini temizle
                    if (value && value !== " ") setSelectedBadgeId(null);
                  }}
                >
                  <SelectTrigger id="goal">
                    <SelectValue placeholder="Hedef seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Hedef Yok</SelectItem>
                    {isGoalsLoading ? (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : userGoals && userGoals.length > 0 ? (
                      userGoals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-goals" disabled>Hedefiniz yok</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNewShowcaseDialog(false)}
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={!content.trim() || addShowcaseMutation.isPending}
              onClick={handleAddShowcase}
            >
              {addShowcaseMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Paylaşılıyor...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Paylaş</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Showcase;