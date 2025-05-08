import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, AlertCircle, UserCheck, Users, CreditCard, Star, Check, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

// Kullanıcı profili tipi
interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
  is_pro: boolean | null;
  is_admin: boolean | null;
  points: number | null;
}

// Yükseltme talebi tipi
interface UpgradeRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  user_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const AdminDashboard = () => {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Kullanıcı listesi için durum değişkenleri
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Kullanıcı listesi sorgusu
  const {
    data: usersData,
    isLoading: isUsersLoading,
    error: usersError,
    isError: isUsersError,
  } = useQuery({
    queryKey: ["admin-users", currentPage, pageSize],
    queryFn: async () => {
      if (!user?.id) return { users: [], count: 0 };
      
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // Profilleri çek
      const { data: profiles, error, count } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, created_at, updated_at, is_pro, is_admin, points", { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return { 
        users: profiles as UserProfile[], 
        count: count || 0 
      };
    },
    enabled: !isAuthLoading && !!user?.id && isAuthenticated && user.isAdmin,
  });
  
  // Yükseltme talepleri sorgusu
  const {
    data: upgradeRequests,
    isLoading: isRequestsLoading,
    error: requestsError,
    isError: isRequestsError,
    refetch: refetchRequests,
  } = useQuery<UpgradeRequest[]>({
    queryKey: ["admin-upgrade-requests"],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Yükseltme taleplerini çek, join ile kullanıcı bilgilerini de al
      const { data, error } = await supabase
        .from("upgrade_requests")
        .select(`
          id, user_id, status, created_at, notes, approved_by, approved_at,
          user_profile:profiles(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data as unknown as UpgradeRequest[];
    },
    enabled: !isAuthLoading && !!user?.id && isAuthenticated && user.isAdmin,
  });
  
  // Yükseltme talebini onaylama
  const approveRequestMutation = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string, userId: string }) => {
      if (!user?.id) throw new Error("Yetki yok");
      
      // Transaction başlat - hem talebi güncelle hem de kullanıcıyı pro yap
      const { error: updateError } = await supabase
        .from("upgrade_requests")
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);
        
      if (updateError) throw updateError;
      
      // Kullanıcıyı pro yap
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_pro: true })
        .eq('id', userId);
        
      if (profileError) throw profileError;
      
      // Bildirim gönder
      await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: 'pro_upgrade',
          title: 'Pro Üyelik Onaylandı',
          message: 'Pro üyelik talebiniz onaylandı. Artık tüm Pro özelliklere erişebilirsiniz.',
          read: false
        });
        
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Pro üyelik talebi onaylandı");
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`İşlem başarısız: ${error.message}`);
    },
  });
  
  // Yükseltme talebini reddetme
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string, userId: string }) => {
      if (!user?.id) throw new Error("Yetki yok");
      
      // Talebi güncelle
      const { error: updateError } = await supabase
        .from("upgrade_requests")
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);
        
      if (updateError) throw updateError;
      
      // Bildirim gönder
      await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: 'pro_upgrade_rejected',
          title: 'Pro Üyelik Talebi Reddedildi',
          message: 'Pro üyelik talebiniz şu anda reddedildi. Daha fazla bilgi için lütfen iletişime geçin.',
          read: false
        });
        
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Pro üyelik talebi reddedildi");
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
    },
    onError: (error: any) => {
      toast.error(`İşlem başarısız: ${error.message}`);
    },
  });
  
  // Kullanıcıyı pro yapma (direkt admin tarafından)
  const makeUserProMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id) throw new Error("Yetki yok");
      
      // Kullanıcıyı pro yap
      const { error } = await supabase
        .from("profiles")
        .update({ is_pro: true })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Bildirim gönder
      await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: 'pro_upgrade',
          title: 'Pro Üyelik Verildi',
          message: 'Hesabınız Pro üyeliğe yükseltildi. Artık tüm Pro özelliklere erişebilirsiniz.',
          read: false
        });
        
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Kullanıcı Pro üyeliğe yükseltildi");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`İşlem başarısız: ${error.message}`);
    },
  });
  
  // Kullanıcıdan pro'yu kaldırma
  const removeUserProMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user?.id) throw new Error("Yetki yok");
      
      // Kullanıcının pro'sunu kaldır
      const { error } = await supabase
        .from("profiles")
        .update({ is_pro: false })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Bildirim gönder
      await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: 'pro_downgrade',
          title: 'Pro Üyelik Kaldırıldı',
          message: 'Hesabınızın Pro üyeliği kaldırıldı.',
          read: false
        });
        
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Kullanıcının Pro üyeliği kaldırıldı");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`İşlem başarısız: ${error.message}`);
    },
  });
  
  // Admin yetkisi kontrolü ve yükleme ekranı
  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  // Giriş yapmamış kullanıcıyı yönlendir
  if (!isAuthenticated || !user) {
    navigate("/signin");
    return null;
  }
  
  // Admin değilse erişim engelle
  if (!user.isAdmin) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" />
                Erişim Engellendi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Bu sayfaya erişim yetkiniz bulunmamaktadır. Sadece admin kullanıcıları bu sayfaya erişebilir.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Dashboard'a Dön
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  // Sayfalama fonksiyonları
  const totalPages = Math.ceil((usersData?.count || 0) / pageSize);
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Uygulama yönetimi ve kullanıcı işlemleri</p>
        </div>
        
        <Tabs defaultValue="upgrade-requests">
          <TabsList className="mb-4">
            <TabsTrigger value="upgrade-requests" className="flex items-center gap-1">
              <Star className="h-4 w-4" /> Pro Üyelik Talepleri
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Kullanıcılar
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upgrade-requests">
            <Card>
              <CardHeader>
                <CardTitle>Pro Üyelik Talepleri</CardTitle>
                <CardDescription>
                  Kullanıcılardan gelen Pro üyelik taleplerini yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isRequestsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : isRequestsError ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                    <p className="text-center text-gray-600">
                      {requestsError instanceof Error 
                        ? requestsError.message 
                        : "Yükseltme talepleri yüklenirken bir hata oluştu."}
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => refetchRequests()}
                    >
                      Yeniden Dene
                    </Button>
                  </div>
                ) : upgradeRequests && upgradeRequests.length > 0 ? (
                  <div className="space-y-3">
                    {upgradeRequests
                      .filter(req => req.status === 'pending')
                      .map(request => (
                        <div 
                          key={request.id} 
                          className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                        >
                          <div className="flex items-center">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>
                                {request.user_profile?.first_name?.[0] || request.user_id[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <p className="font-medium">
                                {request.user_profile?.first_name 
                                  ? `${request.user_profile.first_name} ${request.user_profile.last_name || ''}`
                                  : `Kullanıcı ${request.user_id.substring(0, 6)}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                Talep Tarihi: {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approveRequestMutation.mutate({ 
                                requestId: request.id, 
                                userId: request.user_id 
                              })}
                              disabled={approveRequestMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" /> Onayla
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => rejectRequestMutation.mutate({ 
                                requestId: request.id, 
                                userId: request.user_id 
                              })}
                              disabled={rejectRequestMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" /> Reddet
                            </Button>
                          </div>
                        </div>
                      ))}
                    
                    {upgradeRequests.filter(req => req.status === 'pending').length === 0 && (
                      <div className="text-center py-8">
                        <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium">Bekleyen Talep Yok</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Şu anda bekleyen Pro üyelik talebi bulunmuyor.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium">Bekleyen Talep Yok</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Şu anda bekleyen Pro üyelik talebi bulunmuyor.
                    </p>
                  </div>
                )}
                
                {/* Geçmiş Talepler */}
                {upgradeRequests && upgradeRequests.some(req => req.status !== 'pending') && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-gray-600 mb-3">Geçmiş Talepler</h3>
                    <div className="space-y-2">
                      {upgradeRequests
                        .filter(req => req.status !== 'pending')
                        .map(request => (
                          <div 
                            key={request.id} 
                            className="flex items-center justify-between p-3 border rounded-md bg-gray-50"
                          >
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {request.user_profile?.first_name?.[0] || request.user_id[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="ml-3">
                                <p className="font-medium">
                                  {request.user_profile?.first_name 
                                    ? `${request.user_profile.first_name} ${request.user_profile.last_name || ''}`
                                    : `Kullanıcı ${request.user_id.substring(0, 6)}`}
                                </p>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Badge variant={request.status === 'approved' ? "success" : "destructive"} className="mr-2">
                                    {request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                                  </Badge>
                                  <span>{new Date(request.approved_at || '').toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Tüm Kullanıcılar</CardTitle>
                <CardDescription>
                  Sistemdeki tüm kullanıcıları görüntüleyin ve yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isUsersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : isUsersError ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                    <p className="text-center text-gray-600">
                      {usersError instanceof Error 
                        ? usersError.message 
                        : "Kullanıcılar yüklenirken bir hata oluştu."}
                    </p>
                  </div>
                ) : usersData && usersData.users.length > 0 ? (
                  <div>
                    <div className="rounded-md border">
                      <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 font-medium text-sm">
                        <div className="col-span-5">Kullanıcı</div>
                        <div className="col-span-2 text-center">Üyelik</div>
                        <div className="col-span-2 text-center">Admin</div>
                        <div className="col-span-2 text-center">Puan</div>
                        <div className="col-span-1 text-right">İşlem</div>
                      </div>
                      {usersData.users.map(userProfile => (
                        <div key={userProfile.id} className="grid grid-cols-12 gap-2 p-3 border-t items-center">
                          <div className="col-span-5 flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback>
                                {userProfile.first_name?.[0] || userProfile.id[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {userProfile.first_name 
                                  ? `${userProfile.first_name} ${userProfile.last_name || ''}`
                                  : `Kullanıcı ${userProfile.id.substring(0, 6)}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(userProfile.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-2 text-center">
                            <Badge variant={userProfile.is_pro ? "default" : "secondary"}>
                              {userProfile.is_pro ? 'Pro' : 'Standart'}
                            </Badge>
                          </div>
                          <div className="col-span-2 text-center">
                            <Badge variant={userProfile.is_admin ? "destructive" : "outline"}>
                              {userProfile.is_admin ? 'Admin' : 'Üye'}
                            </Badge>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="font-medium">{userProfile.points || 0}</span>
                          </div>
                          <div className="col-span-1 text-right">
                            {userProfile.is_pro ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 text-red-600 hover:bg-red-50"
                                onClick={() => removeUserProMutation.mutate(userProfile.id)}
                                disabled={removeUserProMutation.isPending}
                              >
                                Pro'yu Kaldır
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                className="h-8 bg-blue-600 hover:bg-blue-700"
                                onClick={() => makeUserProMutation.mutate(userProfile.id)}
                                disabled={makeUserProMutation.isPending}
                              >
                                Pro Yap
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Sayfalama */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <p className="text-sm text-gray-600">
                          Toplam {usersData.count} kullanıcı, Sayfa {currentPage} / {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                          >
                            Önceki
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                          >
                            Sonraki
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium">Kullanıcı Bulunamadı</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Sistemde kayıtlı kullanıcı bulunmuyor.
                    </p>
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

export default AdminDashboard; 