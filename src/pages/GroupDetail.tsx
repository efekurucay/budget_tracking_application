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
  Copy,
  ArrowDownRight,
  ArrowUpRight
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

// Grup işlemleri için geliştirilmiş RPC tipi
interface GroupTransaction {
  id: string;
  group_id: string;
  user_id: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
  category?: string | null;
  is_expense: boolean;
}

// İşlem katılımcıları için arayüz
interface TransactionMember {
  id: string;
  transaction_id: string;
  member_id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
}

// İşlem kategorileri
const TRANSACTION_CATEGORIES = [
  { id: "food", name: "Yiyecek", icon: "🍔" },
  { id: "transport", name: "Ulaşım", icon: "🚗" },
  { id: "entertainment", name: "Eğlence", icon: "🎬" },
  { id: "shopping", name: "Alışveriş", icon: "🛒" },
  { id: "utilities", name: "Faturalar", icon: "📱" },
  { id: "housing", name: "Konaklama", icon: "🏠" },
  { id: "health", name: "Sağlık", icon: "💊" },
  { id: "education", name: "Eğitim", icon: "📚" },
  { id: "other", name: "Diğer", icon: "📦" },
];

const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Dialog durumları
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  
  // Form durumları
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDesc, setTransactionDesc] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [isExpense, setIsExpense] = useState(true);
  const [transactionCategory, setTransactionCategory] = useState("other");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  
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
  
  // Grup işlemlerini çek
  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    error: transactionsError,
    isError: isTransactionsError,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ["group-transactions", groupId],
    queryFn: async () => {
      if (!groupId || !user?.id) return [];
      console.log("GroupDetail: Fetching transactions for group:", groupId);
      
      try {
        // RPC fonksiyonu ile işlemleri getir
        const { data, error } = await supabase.rpc('get_group_transactions', { 
          group_id_param: groupId 
        });
        
        if (error) {
          console.error("GroupDetail: RPC error:", error);
          throw error;
        }
        
        if (!data) {
          console.warn("GroupDetail: No transactions returned from RPC function");
          return [];
        }
        
        return data as GroupTransaction[];
      } catch (err) {
        console.error("GroupDetail: Error fetching transactions:", err);
        
        // Ağ hatası veya bağlantı kesintisi kontrolü
        if (err instanceof Error) {
          if (err.message.includes('fetch') || err.message.includes('network') || 
              err.message.includes('timeout') || err.message.includes('connection')) {
            throw new Error("Sunucuya bağlanırken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.");
          }
        }
        
        throw err;
      }
    },
    enabled: !isAuthLoading && !!user?.id && !!groupId && isAuthenticated,
    retry: 3, // Başarısız olursa 3 kez daha dene
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Üstel bekleme
  });
  
  // İşlem için üye bilgilerini getir
  const getTransactionMembers = async (transactionId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_transaction_members', {
        transaction_id_param: transactionId
      });
      
      if (error) {
        console.error("Error fetching transaction members:", error);
        return [];
      }
      
      return data as TransactionMember[];
    } catch (err) {
      console.error("Exception fetching transaction members:", err);
      return [];
    }
  };
  
  // Grup bilgilerini düzenle
  const updateGroupMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string, description: string | null }) => {
      if (!isOwner) throw new Error("Bu işlem için yetkiniz yok");
      if (!groupId) throw new Error("Grup ID bulunamadı");
      
      const { error } = await supabase
        .from("groups")
        .update({ name, description })
        .eq("id", groupId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      toast.success("Grup bilgileri güncellendi");
      setEditGroupOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Grup güncelleme başarısız: ${error.message}`);
    },
  });
  
  // Grup işlemi ekle
  const addTransactionMutation = useMutation({
    mutationFn: async ({ 
      amount, 
      description, 
      date, 
      is_expense,
      category,
      member_ids
    }: { 
      amount: number, 
      description: string, 
      date: string, 
      is_expense: boolean,
      category: string,
      member_ids: string[]
    }) => {
      if (!groupId || !user?.id) throw new Error("Grup veya kullanıcı ID bulunamadı");
      
      // İşlem miktarını pozitif bir sayı olarak ayarla
      const numericAmount = Math.abs(parseFloat(amount.toString()));
      
      try {
        // RPC fonksiyonu ile işlem ekle
        const { data, error } = await supabase.rpc('add_group_transaction', {
          p_group_id: groupId,
          p_user_id: user.id,
          p_amount: numericAmount,
          p_description: description,
          p_date: date,
          p_is_expense: is_expense,
          p_category: category,
          p_member_ids: member_ids.length > 0 ? member_ids : null
        });
          
        if (error) {
          console.error("GroupDetail: RPC error when adding transaction:", error);
          throw error;
        }
        
        return data;
      } catch (err) {
        console.error("GroupDetail: Error adding transaction:", err);
        
        // Ağ hatası veya bağlantı kesintisi kontrolü
        if (err instanceof Error) {
          if (err.message.includes('fetch') || err.message.includes('network') || 
              err.message.includes('timeout') || err.message.includes('connection')) {
            throw new Error("Sunucuya bağlanırken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.");
          } else if (err.message.includes('permission') || err.message.includes('403')) {
            throw new Error("Bu işlemi yapmak için yetkiniz yok. Grup üyesi olduğunuzdan emin olun.");
          }
        }
        
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-transactions", groupId] });
      toast.success("İşlem başarıyla eklendi");
      setAddTransactionOpen(false);
      // Form alanlarını temizle
      setTransactionAmount("");
      setTransactionDesc("");
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setTransactionCategory("other");
      setSelectedMembers([]);
      setIsExpense(true);
    },
    onError: (error: any) => {
      toast.error(`İşlem ekleme başarısız: ${error.message}`);
    },
  });
  
  // Grup silme işlemi
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      if (!isOwner) throw new Error("Bu işlem için yetkiniz yok");
      if (!groupId) throw new Error("Grup ID bulunamadı");
      
      // Önce grup üyelerini sil (cascade yoksa)
      const { error: membersError } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId);
        
      if (membersError) throw membersError;
      
      // Sonra grubu sil
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grup başarıyla silindi");
      navigate("/groups");
    },
    onError: (error: any) => {
      toast.error(`Grup silme başarısız: ${error.message}`);
    },
  });
  
  // Grup silme işlemi onayı (confirm)
  const handleGroupDelete = () => {
    if (confirm("Grubu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      deleteGroupMutation.mutate();
    }
  };
  
  // İşlem ekleme formunu gönder
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Temel doğrulama
    if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
      toast.error("Lütfen geçerli bir miktar girin");
      return;
    }
    
    if (!transactionDesc) {
      toast.error("Lütfen bir açıklama girin");
      return;
    }
    
    addTransactionMutation.mutate({
      amount: parseFloat(transactionAmount),
      description: transactionDesc,
      date: transactionDate,
      is_expense: isExpense,
      category: transactionCategory,
      member_ids: selectedMembers
    });
  };
  
  // Üyelik seçme durumunu değiştir
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };
  
  // Tüm üyeleri seç veya kaldır
  const toggleAllMembers = () => {
    if (selectedMembers.length === members.length) {
      // Hepsini kaldır
      setSelectedMembers([]);
    } else {
      // Hepsini seç
      setSelectedMembers(members.map(member => member.user_id));
    }
  };
  
  // Grup düzenleme formunu gönder
  const handleEditGroup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editName.trim()) {
      toast.error("Grup adı boş olamaz");
      return;
    }
    
    updateGroupMutation.mutate({
      name: editName,
      description: editDescription || null
    });
  };
  
  // Gruptan ayrıl
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !user?.id) throw new Error("Grup veya kullanıcı ID bulunamadı");
      
      // Eğer son sahipse, bu işlemi engelle
      const ownerCount = members.filter(m => m.role === 'owner').length;
      if (isOwner && ownerCount <= 1) {
        throw new Error("Son grup sahibi olduğunuz için gruptan ayrılamazsınız. Önce grubu silin veya başka bir üyeyi sahip yapın.");
      }
      
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gruptan başarıyla ayrıldınız");
      navigate("/groups");
    },
    onError: (error: any) => {
      toast.error(`Gruptan ayrılma başarısız: ${error.message}`);
    },
  });
  
  // Gruptan ayrılma işlemi onayı
  const handleLeaveGroup = () => {
    if (confirm("Gruptan ayrılmak istediğinize emin misiniz?")) {
      leaveGroupMutation.mutate();
    }
  };
  
  // Grup bilgilerini düzenleme formunu aç
  const handleOpenEditForm = () => {
    if (group) {
      setEditName(group.name);
      setEditDescription(group.description || "");
      setEditGroupOpen(true);
    }
  };
  
  // Grup bilgilerini formatla
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };
  
  // Kategori ikonu getiren yardımcı fonksiyon
  const getCategoryIcon = (categoryId: string | null | undefined) => {
    if (!categoryId) return "📦";
    const category = TRANSACTION_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.icon : "📦";
  };
  
  // Kategori adını getiren yardımcı fonksiyon
  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "Diğer";
    const category = TRANSACTION_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.name : "Diğer";
  };
  
  // Transactions tab içeriğini ayırıp Hata Yönetimini Geliştiriyoruz
  const renderTransactionsContent = () => {
    // İşlem yüklenirken göster
    if (isTransactionsLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // Hata durumunda göster
    if (isTransactionsError) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="font-medium text-lg mb-2">İşlem Yüklenemedi</h3>
          <p className="text-sm text-gray-500 mb-4">
            {transactionsError instanceof Error 
              ? transactionsError.message 
              : "İşlemler yüklenirken bir hata oluştu."}
          </p>
          <Button 
            variant="outline" 
            onClick={() => refetchTransactions()}
            className="flex items-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 3V8H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 16V21H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.5C14.8954 2.56228 13.5769 1.90460 12.1571 1.57731C10.7373 1.25002 9.26001 1.25902 7.84476 1.60343C6.42951 1.94783 5.11826 2.61893 4.02513 3.5737C2.93201 4.52847 2.08423 5.73881 1.55469 7.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 20.5C9.10461 21.4377 10.4231 22.0954 11.8429 22.4227C13.2627 22.75 14.74 22.741 16.1552 22.3966C17.5705 22.0522 18.8817 21.3811 19.9749 20.4263C21.068 19.4715 21.9158 18.2612 22.4453 16.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Yeniden Dene
          </Button>
        </div>
      );
    }
    
    // İşlemler boşsa göster
    if (transactions.length === 0) {
      return (
        <div className="text-center py-8">
          <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium">Henüz İşlem Yok</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Bu grupta henüz finansal işlem yapılmamış.
          </p>
          <Button onClick={() => setAddTransactionOpen(true)}>
            İşlem Ekle
          </Button>
        </div>
      );
    }
    
    // İşlem üyeleri ile ilgili state
    const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
    const [transactionMembers, setTransactionMembers] = useState<Record<string, TransactionMember[]>>({});
    const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});
    
    // İşlem üyelerini getir ve göster
    const loadTransactionMembers = async (transactionId: string) => {
      if (transactionMembers[transactionId]?.length > 0) {
        // Zaten yüklenmişse göster/gizle
        setExpandedTransaction(expandedTransaction === transactionId ? null : transactionId);
        return;
      }
      
      setLoadingMembers(prev => ({ ...prev, [transactionId]: true }));
      
      try {
        const members = await getTransactionMembers(transactionId);
        setTransactionMembers(prev => ({ ...prev, [transactionId]: members }));
        setExpandedTransaction(transactionId);
      } catch (error) {
        console.error("Error loading transaction members:", error);
      } finally {
        setLoadingMembers(prev => ({ ...prev, [transactionId]: false }));
      }
    };
    
    // İşlemleri listele
    return (
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div 
            key={transaction.id}
            className="flex flex-col rounded-lg border hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center">
                <div className={`min-w-10 h-10 rounded-full flex items-center justify-center ${
                  transaction.is_expense ? "bg-red-100" : "bg-green-100"
                }`}>
                  {transaction.is_expense ? (
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center text-xs text-gray-500 flex-wrap">
                    <span>{new Date(transaction.date).toLocaleDateString('tr-TR')}</span>
                    <span className="mx-1">•</span>
                    <span>
                      {members.find(m => m.user_id === transaction.user_id)?.profile?.first_name || 'Kullanıcı'}
                    </span>
                    {transaction.category && (
                      <>
                        <span className="mx-1">•</span>
                        <span>
                          {getCategoryIcon(transaction.category)} {getCategoryName(transaction.category)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`font-medium ${
                  transaction.is_expense ? "text-red-600" : "text-green-600"
                }`}>
                  {transaction.is_expense ? "-" : "+"}{formatCurrency(transaction.amount)}
                </div>
                {transaction.is_expense && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    onClick={() => loadTransactionMembers(transaction.id)}
                    disabled={loadingMembers[transaction.id]}
                  >
                    {loadingMembers[transaction.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {expandedTransaction === transaction.id && transactionMembers[transaction.id]?.length > 0 && (
              <div className="px-3 pb-3 pt-1 border-t">
                <div className="text-xs font-medium text-gray-600 mb-2">Dahil Olanlar:</div>
                <div className="flex flex-wrap gap-2">
                  {transactionMembers[transaction.id]?.map(member => (
                    <Badge 
                      key={member.id} 
                      variant="secondary" 
                      className="flex items-center gap-1"
                    >
                      <span className="h-4 w-4 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        {member.first_name?.[0] || member.member_id[0]}
                      </span>
                      <span>
                        {member.first_name 
                          ? `${member.first_name} ${member.last_name || ''}`
                          : `Kullanıcı ${member.member_id.substring(0, 6)}`}
                      </span>
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Kişi başı: <span className="font-medium">{formatCurrency(transaction.amount / transactionMembers[transaction.id].length)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
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
          {!isOwner && (
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleLeaveGroup}
            >
              Gruptan Ayrıl
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
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Grup İşlemleri</h3>
                      <Button 
                        size="sm"
                        onClick={() => setAddTransactionOpen(true)}
                      >
                        <Wallet className="h-4 w-4 mr-2" /> İşlem Ekle
                      </Button>
                    </div>
                    
                    {renderTransactionsContent()}
                  </TabsContent>
                  <TabsContent value="settings">
                    {isOwner ? (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium mb-2">Grup Ayarları</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Grup adı, açıklaması ve diğer ayarları değiştirin.
                          </p>
                          <Button 
                            variant="outline"
                            onClick={handleOpenEditForm}
                          >
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
                            onClick={handleGroupDelete}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Grubu Sil
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="text-center py-6">
                          <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                          <h3 className="text-lg font-medium">Yetki Gerekiyor</h3>
                          <p className="text-sm text-gray-500 mt-1 mb-8">
                            Grup ayarlarını değiştirmek için grup sahibi olmalısınız.
                          </p>
                          <Button 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={handleLeaveGroup}
                          >
                            Gruptan Ayrıl
                          </Button>
                        </div>
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
      
      {/* İşlem Ekleme Dialog'u */}
      <Dialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen}>
        <DialogContent className="lg:max-w-screen-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni İşlem Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTransaction}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="transaction-type" className="text-sm font-medium">
                    İşlem Türü
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isExpense ? "default" : "outline"}
                      className={isExpense ? "bg-red-600 hover:bg-red-700" : ""}
                      onClick={() => setIsExpense(true)}
                    >
                      <ArrowDownRight className="mr-1 h-4 w-4" /> Gider
                    </Button>
                    <Button
                      type="button"
                      variant={!isExpense ? "default" : "outline"}
                      className={!isExpense ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => setIsExpense(false)}
                    >
                      <ArrowUpRight className="mr-1 h-4 w-4" /> Gelir
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="transaction-amount" className="text-sm font-medium">
                    Tutar
                  </label>
                  <Input
                    id="transaction-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="transaction-date" className="text-sm font-medium">
                  Tarih
                </label>
                <Input
                  id="transaction-date"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="transaction-category" className="text-sm font-medium">
                  Kategori
                </label>
                <select
                  id="transaction-category"
                  value={transactionCategory}
                  onChange={(e) => setTransactionCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {TRANSACTION_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="transaction-desc" className="text-sm font-medium">
                  Açıklama
                </label>
                <Input
                  id="transaction-desc"
                  placeholder="Alışveriş, Market, Kira..."
                  value={transactionDesc}
                  onChange={(e) => setTransactionDesc(e.target.value)}
                  required
                />
              </div>
              
              {/* Grup üyeleri seçimi */}
              {isExpense && (
                <div className="space-y-2 border rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">
                      Bu Harcamaya Dahil Olan Üyeler
                    </label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={toggleAllMembers}
                    >
                      {selectedMembers.length === members.length ? "Hepsini Kaldır" : "Hepsini Seç"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {members.map((member) => (
                      <div 
                        key={member.id} 
                        className={`flex items-center p-2 rounded border cursor-pointer ${
                          selectedMembers.includes(member.user_id) 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleMemberSelection(member.user_id)}
                      >
                        <div className={`w-4 h-4 rounded ${
                          selectedMembers.includes(member.user_id) 
                            ? 'bg-blue-500' 
                            : 'border border-gray-300'
                        } mr-3`}>
                          {selectedMembers.includes(member.user_id) && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Avatar className="h-7 w-7 mr-2">
                            <AvatarFallback className="text-xs">
                              {member.profile?.first_name?.[0] || member.user_id[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {member.profile?.first_name && member.profile?.last_name
                              ? `${member.profile.first_name} ${member.profile.last_name}`
                              : `Kullanıcı ${member.user_id.substring(0, 6)}`}
                            {member.user_id === user?.id && " (Sen)"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Bu işleme dahil olan grup üyelerini seçin. İşlem miktarı seçilen üyeler arasında eşit olarak paylaşılacaktır.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddTransactionOpen(false)}>
                İptal
              </Button>
              <Button 
                type="submit"
                disabled={addTransactionMutation.isPending}
              >
                {addTransactionMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...</>
                ) : (
                  "İşlem Ekle"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Grup Düzenleme Dialog'u */}
      <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grup Bilgilerini Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditGroup}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="group-name" className="text-sm font-medium">
                  Grup Adı
                </label>
                <Input
                  id="group-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Grup adı"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-desc" className="text-sm font-medium">
                  Açıklama (İsteğe Bağlı)
                </label>
                <Input
                  id="group-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Grup açıklaması"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditGroupOpen(false)}>
                İptal
              </Button>
              <Button 
                type="submit"
                disabled={updateGroupMutation.isPending}
              >
                {updateGroupMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...</>
                ) : (
                  "Değişiklikleri Kaydet"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GroupDetail; 