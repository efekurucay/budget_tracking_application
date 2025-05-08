import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  UserPlus,
  Wallet,
  Settings,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
  Copy
} from "lucide-react";

// Grup için arayüz tanımları
interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: string;
  joined_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
  } | null;
}

const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  
  // Grup bilgilerini çek
  const {
    data: group,
    isLoading: isGroupLoading,
    error: groupError,
    isError: isGroupError,
  } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      if (!groupId || !user?.id) return null;
      console.log("GroupDetail: Fetching group data for:", groupId);
      
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();
        
      if (error) throw error;
      return data as Group;
    },
    enabled: !isAuthLoading && !!user?.id && !!groupId && isAuthenticated,
  });
  
  // Grup üyelerini çek
  const {
    data: members = [],
    isLoading: isMembersLoading,
    error: membersError,
    isError: isMembersError,
  } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      if (!groupId || !user?.id) return [];
      console.log("GroupDetail: Fetching group members for:", groupId);
      
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          *,
          profile:profiles(first_name, last_name)
        `)
        .eq("group_id", groupId);
        
      if (error) throw error;
      return data as GroupMember[];
    },
    enabled: !isAuthLoading && !!user?.id && !!groupId && isAuthenticated,
  });
  
  // Kullanıcının bu gruptaki rolünü belirle
  const currentUserRole = members.find(member => member.user_id === user?.id)?.role || '';
  const isOwner = currentUserRole === 'owner';
  
  // Grup ID'sini kopyala
  const handleCopyGroupId = () => {
    if (groupId) {
      navigator.clipboard.writeText(groupId)
        .then(() => toast.success("Grup ID'si panoya kopyalandı"))
        .catch(() => toast.error("Kopyalama başarısız oldu"));
    }
  };
  
  // Gruptan kullanıcı çıkar
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!isOwner) throw new Error("Bu işlem için yetkiniz yok");
      
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast.success("Üye gruptan çıkarıldı");
    },
    onError: (error: any) => {
      toast.error(`Üye çıkarma başarısız: ${error.message}`);
    },
  });
  
  // Email ile davet gönder
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Lütfen geçerli bir e-posta adresi girin");
      return;
    }
    
    try {
      toast.success(`Davet gönderildi: ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      // Burada gerçek davet sistemi eklenecek
    } catch (error: any) {
      toast.error(`Davet gönderme başarısız: ${error.message}`);
    }
  };
  
  // Yükleme durumları
  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Kimlik doğrulanıyor...</span>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!isAuthenticated || !user) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 text-center">
          <p>Bu sayfayı görüntülemek için <a href="/signin" className="text-primary underline">giriş yapın</a>.</p>
        </div>
      </DashboardLayout>
    );
  }
  
  if (isGroupLoading || isMembersLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <Button 
            variant="ghost" 
            className="mb-4" 
            onClick={() => navigate('/groups')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Gruplara Dön
          </Button>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <span>Grup bilgileri yükleniyor...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (isGroupError || !group) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <Button 
            variant="ghost" 
            className="mb-4" 
            onClick={() => navigate('/groups')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Gruplara Dön
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
                <AlertCircle className="mr-2 h-5 w-5" />
                Grup Bulunamadı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Bu grup bulunamadı veya erişim izniniz yok.</p>
              <p className="text-sm text-red-600 mt-2">
                {groupError instanceof Error ? groupError.message : "Bilinmeyen hata"}
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => navigate('/groups')}
              >
                Gruplara Dön
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/groups')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Gruplara Dön
          </Button>
          {isOwner && (
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                // Grup silme işlemi eklenecek
                toast.info("Grup silme özelliği henüz aktif değil");
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Grubu Sil
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sol Kolon - Grup Bilgileri ve Üyeler */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>
                  {new Date(group.created_at).toLocaleDateString('tr-TR')} tarihinde oluşturuldu
                </CardDescription>
              </CardHeader>
              <CardContent>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Grup ID:</span>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2 truncate max-w-[100px]">{groupId}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={handleCopyGroupId}
                      >
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rolünüz:</span>
                    <Badge>{currentUserRole || 'üye'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Üyeler</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" /> Davet Et
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Henüz üye bulunmuyor</p>
                  ) : (
                    members.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>
                              {member.profile?.first_name?.[0] || member.user_id[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {member.profile?.first_name && member.profile?.last_name
                                ? `${member.profile.first_name} ${member.profile.last_name}`
                                : `Kullanıcı ${member.user_id.substring(0, 6)}`}
                            </p>
                            <Badge 
                              variant={member.role === 'owner' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                        
                        {isOwner && member.user_id !== user.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-gray-500 hover:text-red-600" 
                            onClick={() => removeMemberMutation.mutate(member.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sağ Kolon - İçerik Sekmeleri */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <Tabs defaultValue="transactions">
                  <TabsList className="w-full">
                    <TabsTrigger value="transactions" className="flex-1">
                      <Wallet className="h-4 w-4 mr-2" /> İşlemler
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1">
                      <Settings className="h-4 w-4 mr-2" /> Ayarlar
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="transactions">
                  <TabsContent value="transactions">
                    <div className="text-center py-12">
                      <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium">Henüz İşlem Yok</h3>
                      <p className="text-sm text-gray-500 mt-1 mb-6">
                        Bu grupta henüz finansal işlem yapılmamış.
                      </p>
                      <Button>
                        İşlem Ekle
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="settings">
                    {isOwner ? (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium mb-2">Grup Ayarları</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Grup adı, açıklaması ve diğer ayarları değiştirin.
                          </p>
                          <Button variant="outline">
                            Grup Bilgilerini Düzenle
                          </Button>
                        </div>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-medium mb-2 text-red-600">Tehlikeli İşlemler</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Bu işlemler geri alınamaz.
                          </p>
                          <Button 
                            variant="destructive"
                            onClick={() => {
                              // Grup silme işlemi eklenecek
                              toast.info("Grup silme özelliği henüz aktif değil");
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Grubu Sil
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium">Yetki Gerekiyor</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Ayarları değiştirmek için grup sahibi olmalısınız.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Davet Etme Dialog'u */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gruba Üye Davet Et</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              E-posta adresini girerek kişiyi gruba davet edebilirsiniz.
            </p>
            <Input
              type="email"
              placeholder="ornek@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleInvite}>
              Davet Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GroupDetail; 