import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle, Users, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

// Davet tipi
interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  email: string;
  invitation_code: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// Grup detayı tipi
interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  owner_name: string;
  member_count: number;
}

const JoinGroup = () => {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  
  // Durum değişkenleri
  const [invitationCode, setInvitationCode] = useState<string>(searchParams.get("code") || "");
  const [isManualEntry, setIsManualEntry] = useState<boolean>(!searchParams.get("code"));
  
  // Davet bilgisini getir
  const {
    data: invitation,
    isLoading: isInvitationLoading,
    error: invitationError,
    isError: isInvitationError,
    refetch: refetchInvitation,
  } = useQuery<GroupInvitation>({
    queryKey: ["group-invitation", invitationCode],
    queryFn: async () => {
      if (!invitationCode) {
        throw new Error(t("error.no_invitation_code", "Davet kodu bulunamadı"));
      }
      
      try {
        const { data, error } = await (supabase as any).rpc("get_invitation_by_code", {
          p_invitation_code: invitationCode
        });
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          throw new Error(t("error.invalid_invitation", "Geçersiz veya süresi dolmuş davet kodu"));
        }
        
        return data as GroupInvitation;
      } catch (err) {
        console.error("Error fetching invitation:", err);
        throw err;
      }
    },
    enabled: !isAuthLoading && !!invitationCode && invitationCode.length > 0,
    retry: false,
  });
  
  // Grup bilgisini getir
  const {
    data: groupDetails,
    isLoading: isGroupLoading,
    error: groupError,
    isError: isGroupError,
  } = useQuery<GroupDetails>({
    queryKey: ["group-details", invitation?.group_id],
    queryFn: async () => {
      if (!invitation?.group_id) {
        throw new Error(t("error.no_group_found", "Grup bilgisi bulunamadı"));
      }
      
      try {
        // Basitleştirilmiş sorgu
        const { data, error } = await supabase
          .from("groups")
          .select(`
            id, 
            name, 
            description, 
            created_by,
            created_at
          `)
          .eq("id", invitation.group_id)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          throw new Error(t("error.group_not_found", "Grup bulunamadı"));
        }
        
        // Oluşturucu bilgilerini ayrı sorgula
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", data.created_by)
          .single();
        
        // Üye sayısını ayrı sorgula
        const { count: memberCount } = await supabase
          .from("group_members")
          .select("id", { count: 'exact', head: true })
          .eq("group_id", data.id);
        
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          owner_id: data.created_by,
          created_at: data.created_at,
          owner_name: ownerData 
            ? `${ownerData.first_name || ''} ${ownerData.last_name || ''}`.trim() || 'Bilinmeyen'
            : 'Bilinmeyen',
          member_count: memberCount || 0
        };
      } catch (err) {
        console.error("Error fetching group details:", err);
        throw err;
      }
    },
    enabled: !isAuthLoading && !!invitation?.group_id,
    retry: false,
  });
  
  // Gruba katıl
  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !invitationCode) {
        throw new Error(t("error.missing_data", "Gruba katılmak için gerekli bilgiler eksik"));
      }
      
      const { data, error } = await (supabase as any).rpc("join_group_by_code", {
        p_invitation_code: invitationCode,
        p_user_id: user.id
      });
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success(t("success.joined_group", "Gruba başarıyla katıldınız"));
      navigate(`/groups`);
    },
    onError: (error: any) => {
      console.error("Error joining group:", error);
      
      if (error.message.includes("already a member")) {
        toast.error(t("error.already_member", "Zaten bu grubun üyesisiniz"));
        setTimeout(() => navigate(`/groups`), 2000);
      } else {
        toast.error(
          t("error.joining_failed", "Gruba katılma başarısız: {{message}}", { 
            message: error.message 
          })
        );
      }
    }
  });
  
  // Davet kodunu kontrol etme ve URL'den alıp kullanma
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setInvitationCode(code);
      setIsManualEntry(false);
    }
  }, [searchParams]);
  
  // Yükleniyor durumunda ekran
  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>{t("common.loading", "Yükleniyor...")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Giriş yapmamış kullanıcıyı giriş sayfasına yönlendir
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate("/signin?redirect=/groups/join" + (invitationCode ? `?code=${invitationCode}` : ""));
    }
  }, [isAuthLoading, isAuthenticated, navigate, invitationCode]);
  
  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refetchInvitation();
  };
  
  const renderContent = () => {
    // Manuel giriş formunu göster
    if (isManualEntry || !invitationCode) {
      return (
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>{t("join_group.title", "Gruba Katıl")}</CardTitle>
            <CardDescription>
              {t("join_group.description", "Davet kodunu girerek bir gruba katılabilirsiniz")}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleManualCodeSubmit}>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="invitationCode" className="text-sm font-medium block mb-1">
                    {t("join_group.invitation_code", "Davet Kodu")}
                  </label>
                  <Input
                    id="invitationCode"
                    placeholder={t("join_group.enter_code", "Davet kodunu girin")}
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/groups")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> 
                {t("common.back", "Geri")}
              </Button>
              <Button 
                type="submit" 
                disabled={!invitationCode || invitationCode.length < 6}
              >
                {t("join_group.verify_code", "Kodu Doğrula")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      );
    }
    
    // Davet yükleniyor
    if (isInvitationLoading) {
      return (
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 pb-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p>{t("join_group.loading_invitation", "Davet bilgileri alınıyor...")}</p>
          </CardContent>
        </Card>
      );
    }
    
    // Davet hatalı
    if (isInvitationError) {
      return (
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 pb-4">
            <div className="text-center mb-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("join_group.invalid_invitation", "Geçersiz Davet")}</h3>
              <p className="text-gray-500">
                {invitationError instanceof Error 
                  ? invitationError.message 
                  : t("join_group.invitation_error", "Davet kodu geçersiz veya süresi dolmuş")}
              </p>
            </div>
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate("/groups")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> 
                {t("common.back", "Geri")}
              </Button>
              <Button 
                onClick={() => setIsManualEntry(true)}
              >
                {t("join_group.try_another_code", "Başka Kod Dene")}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // Grup yükleniyor
    if (isGroupLoading) {
      return (
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 pb-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p>{t("join_group.loading_group", "Grup bilgileri alınıyor...")}</p>
          </CardContent>
        </Card>
      );
    }
    
    // Grup hatalı
    if (isGroupError) {
      return (
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 pb-4">
            <div className="text-center mb-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("join_group.group_error", "Grup Bulunamadı")}</h3>
              <p className="text-gray-500">
                {groupError instanceof Error 
                  ? groupError.message 
                  : t("join_group.group_not_found", "Grup bilgileri bulunamadı")}
              </p>
            </div>
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate("/groups")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> 
                {t("common.back", "Geri")}
              </Button>
              <Button 
                onClick={() => setIsManualEntry(true)}
              >
                {t("join_group.try_another_code", "Başka Kod Dene")}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // Gruba katılma onayı
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>{t("join_group.confirm_join", "Gruba Katıl")}</CardTitle>
          <CardDescription>
            {t("join_group.confirm_description", "Aşağıdaki gruba katılmak üzeresiniz")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-primary/5 rounded-lg mb-4">
            <h3 className="text-lg font-medium mb-1">{groupDetails?.name}</h3>
            {groupDetails?.description && (
              <p className="text-gray-600 mb-2">{groupDetails.description}</p>
            )}
            <div className="flex items-center text-sm text-gray-500">
              <span>{t("group.owner", "Grup Sahibi")}: {groupDetails?.owner_name}</span>
              <span className="mx-2">•</span>
              <span className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {groupDetails?.member_count} {t("group.members", "Üye")}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/groups")}
          >
            {t("common.cancel", "İptal")}
          </Button>
          <Button 
            onClick={() => joinGroupMutation.mutate()}
            disabled={joinGroupMutation.isPending}
          >
            {joinGroupMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("join_group.joining", "Katılıyor...")}</>
            ) : (
              t("join_group.join_group", "Gruba Katıl")
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("join_group.title", "Gruba Katıl")}
          </h1>
          <p className="text-gray-500">
            {t("join_group.subtitle", "Davet kodu ile bir gruba katılın")}
          </p>
        </div>
        
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default JoinGroup; 