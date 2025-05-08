import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
  ArrowRight,
  Loader2,
  AlertCircle,
  Trash2,
  Copy,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  CalendarIcon,
  Check,
  CreditCard,
  RefreshCw,
  Mail
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

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

// Hesaplaşma verisi için arayüz
interface SettlementItem {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  from_user_name: string;
  to_user_name: string;
}

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
  
  // İşlem üyeleri ile ilgili state - Bu satırları renderTransactionsContent'ten ana bileşene taşıyorum
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [transactionMembers, setTransactionMembers] = useState<Record<string, TransactionMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});
  
  // Filtreleme durumları
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Hesaplaşma durumları
  const [showSettlements, setShowSettlements] = useState(false);
  
  // Davet durumları
  const [activeInvitationsOpen, setActiveInvitationsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<Record<string, boolean>>({});
  
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
  const userMember = members.find(member => member.user_id === user?.id);
  const currentUserRole = userMember?.role || '';
  const isOwner = currentUserRole === 'owner' || (group && user?.id === group.created_by);
  
  // Rol bilgisi için debug
  console.log('Debug rol bilgisi:', {
    userId: user?.id,
    groupId,
    groupCreatedBy: group?.created_by,
    isCreator: user?.id === group?.created_by,
    foundMember: !!userMember,
    memberRole: userMember?.role,
    currentUserRole,
    isOwner,
    allMembers: members.map(m => ({ userId: m.user_id, role: m.role }))
  });
  
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
  
  // Grup davetlerini getir
  const {
    data: invitations = [],
    isLoading: isInvitationsLoading,
    error: invitationsError,
    isError: isInvitationsError,
    refetch: refetchInvitations
  } = useQuery<GroupInvitation[]>({
    queryKey: ["group-invitations", groupId],
    queryFn: async () => {
      if (!groupId || !user?.id) return [];
      
      try {
        // Tip güvenliği için as any kullanıyoruz
        const { data, error } = await (supabase as any).rpc('get_group_invitations', { 
          p_group_id: groupId 
        });
        
        if (error) {
          console.error("GroupDetail: RPC error when getting invitations:", error);
          throw error;
        }
        
        if (!data) {
          console.warn("GroupDetail: No invitations returned from RPC function");
          return [];
        }
        
        return data as GroupInvitation[];
      } catch (err) {
        console.error("GroupDetail: Error fetching invitations:", err);
        
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
    enabled: !isAuthLoading && !!user?.id && !!groupId && isAuthenticated && activeInvitationsOpen,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
  
  // Davet kopyalama işlemi
  const handleCopyInvitationCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/groups/join?code=${code}`)
      .then(() => {
        setCopySuccess(prev => ({ ...prev, [code]: true }));
        setTimeout(() => {
          setCopySuccess(prev => ({ ...prev, [code]: false }));
        }, 3000);
        toast.success("Davet bağlantısı kopyalandı");
      })
      .catch(() => toast.error("Kopyalama başarısız oldu"));
  };
  
  // Email ile davet gönder
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Lütfen geçerli bir e-posta adresi girin");
      return;
    }
    
    if (!user?.id || !groupId) {
      toast.error("Davet göndermek için gerekli bilgiler eksik");
      return;
    }
    
    try {
      // RPC fonksiyonu ile davet oluştur
      const { data: invitation, error } = await (supabase as any).rpc('create_group_invitation', {
        p_group_id: groupId,
        p_invited_by: user.id,
        p_email: inviteEmail.trim()
      });
      
      if (error) {
        console.error("Error creating invitation:", error);
        
        if (error.message.includes('already a pending invitation')) {
          toast.error("Bu e-posta adresine zaten bekleyen bir davet var");
        } else {
          toast.error(`Davet gönderme başarısız: ${error.message}`);
        }
        return;
      }
      
      // UI güncelle
      toast.success(`Davet gönderildi: ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      
      // Davetleri yenile
      refetchInvitations();
      
      // Otomatik davet link kopyalama seçeneği
      if (invitation && invitation.invitation_code) {
        const inviteLink = `${window.location.origin}/groups/join?code=${invitation.invitation_code}`;
        
        toast.message("Davet bağlantısı", {
          description: (
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-2">
                Bu bağlantıyı kopyalayıp davet ettiğiniz kişiyle paylaşabilirsiniz:
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 text-gray-800 p-2 rounded text-xs flex-1 overflow-hidden text-ellipsis">
                  {inviteLink}
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="whitespace-nowrap"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success("Bağlantı kopyalandı");
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Kopyala
                </Button>
              </div>
            </div>
          ),
          duration: 8000,
        });
      }
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
  
  // Filtrelenmiş işlemleri hesapla
  const filteredTransactions = transactions.filter(transaction => {
    // Kategori filtreleme
    if (categoryFilter && transaction.category !== categoryFilter) {
      return false;
    }
    
    // Tarih filtreleme
    const transactionDate = new Date(transaction.date);
    
    if (startDateFilter && transactionDate < startDateFilter) {
      return false;
    }
    
    if (endDateFilter) {
      // Bitiş tarihine günün sonunu ekle (23:59:59)
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999);
      
      if (transactionDate > endDate) {
        return false;
      }
    }
    
    return true;
  });
  
  // Filtreleri temizle
  const clearFilters = () => {
    setCategoryFilter(null);
    setStartDateFilter(null);
    setEndDateFilter(null);
  };
  
  // Toplam tutarı hesapla
  const calculateTotal = (transactions: GroupTransaction[]) => {
    const income = transactions
      .filter(t => !t.is_expense)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = transactions
      .filter(t => t.is_expense)
      .reduce((sum, t) => sum + t.amount, 0);
      
    return { income, expense, balance: income - expense };
  };
  
  const totals = calculateTotal(filteredTransactions);
  
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
    
    // Filtre sonucunda işlem kalmadıysa göster
    if (filteredTransactions.length === 0) {
      return (
        <div className="text-center py-8">
          <Filter className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium">Eşleşen İşlem Bulunamadı</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Seçilen filtrelere uygun işlem bulunamadı.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Filtreleri Temizle
          </Button>
        </div>
      );
    }
    
    // İşlemleri listele
    return (
      <div className="space-y-4">
        {/* Özet kartları */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <div className="text-sm text-gray-600 mb-1">Toplam Gelir</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(totals.income)}</div>
          </div>
          <div className="p-4 rounded-lg bg-red-50 border border-red-100">
            <div className="text-sm text-gray-600 mb-1">Toplam Gider</div>
            <div className="text-xl font-bold text-red-600">{formatCurrency(totals.expense)}</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <div className="text-sm text-gray-600 mb-1">Bakiye</div>
            <div className={`text-xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.balance)}
            </div>
          </div>
        </div>
      
        {filteredTransactions.map((transaction) => (
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
  
  // Hesaplaşma verilerini getir
  const {
    data: settlements = [],
    isLoading: isSettlementsLoading,
    error: settlementsError,
    isError: isSettlementsError,
    refetch: refetchSettlements
  } = useQuery<SettlementItem[]>({
    queryKey: ["group-settlements", groupId],
    queryFn: async () => {
      if (!groupId || !user?.id) return [];
      
      try {
        // Tip güvenliği için as any kullanıyoruz
        const { data, error } = await (supabase as any).rpc('calculate_group_settlement', { 
          group_id_param: groupId 
        });
        
        if (error) {
          console.error("GroupDetail: RPC error when getting settlements:", error);
          throw error;
        }
        
        if (!data) {
          console.warn("GroupDetail: No settlements returned from RPC function");
          return [];
        }
        
        // Veriyi doğru tipe dönüştürün
        return data as SettlementItem[];
      } catch (err) {
        console.error("GroupDetail: Error fetching settlements:", err);
        
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
    enabled: !isAuthLoading && !!user?.id && !!groupId && isAuthenticated && showSettlements,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
  
  // Hesaplaşma içeriğini render et
  const renderSettlementsContent = () => {
    // Yükleniyor durumu
    if (isSettlementsLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // Hata durumu
    if (isSettlementsError) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="font-medium text-lg mb-2">Hesaplaşma Verisi Alınamadı</h3>
          <p className="text-sm text-gray-500 mb-4">
            {settlementsError instanceof Error 
              ? settlementsError.message 
              : "Hesaplaşma verileri yüklenirken bir hata oluştu."}
          </p>
          <Button 
            variant="outline" 
            onClick={() => refetchSettlements()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Yeniden Dene
          </Button>
        </div>
      );
    }
    
    // Hesaplaşma yoksa
    if (settlements.length === 0) {
      return (
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium">Hesaplaşma Gerekmiyor</h3>
          <p className="text-sm text-gray-500 mt-1 mb-3">
            Şu anda grup üyeleri arasında hesaplaşma gerektiren bir durum yok.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Not: Hesaplaşma, ortak giderlere katılma durumuna göre hesaplanır.
          </p>
        </div>
      );
    }
    
    // Hesaplaşma listesi
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
          <h4 className="font-medium text-blue-800 flex items-center mb-2">
            <CreditCard className="h-4 w-4 mr-2" /> Hesaplaşma Nasıl Çalışır?
          </h4>
          <p className="text-sm text-blue-700">
            Bu hesaplaşma, grup içindeki ortak giderlere kimlerin ne kadar katıldığı hesaplanarak oluşturulmuştur. 
            Her bir işlemde dahil edilen üyeler arasında eşit miktarda paylaşılır.
          </p>
        </div>
        
        <div className="grid gap-3">
          {settlements.map((item, index) => {
            const iCurrentUser = user?.id === item.from_user_id;
            const isReceivingUser = user?.id === item.to_user_id;
            
            return (
              <div 
                key={`${item.from_user_id}-${item.to_user_id}-${index}`}
                className={`p-4 rounded-lg border ${
                  iCurrentUser 
                    ? 'bg-red-50 border-red-100' 
                    : isReceivingUser 
                      ? 'bg-green-50 border-green-100'
                      : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${
                        iCurrentUser ? 'bg-red-500' : 'bg-blue-500'
                      }`}>
                        {item.from_user_name.charAt(0).toUpperCase()}
                      </div>
                      <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${
                        isReceivingUser ? 'bg-green-500' : 'bg-blue-500'
                      }`}>
                        {item.to_user_name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">
                        {iCurrentUser 
                          ? <span>Ödemeniz Gereken</span>
                          : isReceivingUser
                            ? <span>Size Ödenecek</span>
                            : <span>{item.from_user_name} → {item.to_user_name}</span>
                        }
                      </div>
                      <div className="text-sm text-gray-500">
                        {iCurrentUser 
                          ? `${item.to_user_name} kişisine ödemeniz gerekiyor`
                          : isReceivingUser
                            ? `${item.from_user_name} kişisinden alacaklısınız`
                            : 'Grup üyeleri arası hesaplaşma'
                        }
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold text-lg ${
                    iCurrentUser ? 'text-red-600' : isReceivingUser ? 'text-green-600' : 'text-gray-800'
                  }`}>
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // TabsContent değişikliği - settlements sekmesi ekleyin
  const renderTabsContent = () => {
    return (
      <Tabs defaultValue="transactions">
        <TabsList className="w-full">
          <TabsTrigger value="transactions" className="flex-1">
            <Wallet className="h-4 w-4 mr-2" /> İşlemler
          </TabsTrigger>
          <TabsTrigger value="settlements" className="flex-1" onClick={() => setShowSettlements(true)}>
            <CreditCard className="h-4 w-4 mr-2" /> Hesaplaşma
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            <Settings className="h-4 w-4 mr-2" /> Ayarlar
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Grup İşlemleri</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" /> 
                {showFilters ? "Filtreleri Gizle" : "Filtrele"}
              </Button>
              <Button 
                size="sm"
                onClick={() => setAddTransactionOpen(true)}
              >
                <Wallet className="h-4 w-4 mr-2" /> İşlem Ekle
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="bg-slate-50 p-4 rounded-lg mb-4 border">
              <div className="text-sm font-medium mb-3">İşlemleri Filtrele</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Kategori filtreleme */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Kategori</label>
                  <Select 
                    value={categoryFilter || ""} 
                    onValueChange={(value) => setCategoryFilter(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm kategoriler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tüm kategoriler</SelectItem>
                      {TRANSACTION_CATEGORIES.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Başlangıç tarih filtreleme */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Başlangıç Tarihi</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal w-full"
                        disabled={isTransactionsLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDateFilter ? (
                          format(startDateFilter, "PPP", { locale: tr })
                        ) : (
                          <span>Tarih seçin</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDateFilter || undefined}
                        onSelect={setStartDateFilter}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Bitiş tarih filtreleme */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Bitiş Tarihi</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal w-full"
                        disabled={isTransactionsLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDateFilter ? (
                          format(endDateFilter, "PPP", { locale: tr })
                        ) : (
                          <span>Tarih seçin</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDateFilter || undefined}
                        onSelect={setEndDateFilter}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Filtre temizleme */}
              <div className="mt-3 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearFilters}
                  disabled={!categoryFilter && !startDateFilter && !endDateFilter}
                >
                  Filtreleri Temizle
                </Button>
              </div>
            </div>
          )}
          
          {renderTransactionsContent()}
        </TabsContent>
        
        <TabsContent value="settlements">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Grup Hesaplaşması</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchSettlements()}
              disabled={isSettlementsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSettlementsLoading ? 'animate-spin' : ''}`} /> 
              Yenile
            </Button>
          </div>
          
          {renderSettlementsContent()}
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
                  Şu anki rolünüz: <Badge className="ml-1">
                    {currentUserRole === 'owner' || user?.id === group.created_by ? 'Sahip' : 'Üye'}
                  </Badge>
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
    );
  };
  
  // Aktif davetleri render et
  const renderActiveInvitations = () => {
    if (isInvitationsLoading) {
      return (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }
    
    if (isInvitationsError) {
      return (
        <div className="text-center py-6">
          <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
          <p className="text-sm text-gray-600 mb-3">
            {invitationsError instanceof Error 
              ? invitationsError.message 
              : "Davetler yüklenirken bir hata oluştu."}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchInvitations()}
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Yeniden Dene
          </Button>
        </div>
      );
    }
    
    // Bekleyen davetler
    const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
    
    if (pendingInvitations.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600">
            Şu anda bekleyen bir davet bulunmuyor.
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {pendingInvitations.map(invitation => (
          <div 
            key={invitation.id} 
            className="flex items-center justify-between p-3 rounded-md border bg-white hover:bg-gray-50"
          >
            <div>
              <div className="font-medium">{invitation.email}</div>
              <div className="text-xs text-gray-500">
                <span>Gönderildi: {new Date(invitation.created_at).toLocaleDateString()}</span>
                <span className="mx-1">•</span>
                <span>Sona Eriyor: {new Date(invitation.expires_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`h-8 ${copySuccess[invitation.invitation_code] ? 'bg-green-50 text-green-600' : ''}`}
                onClick={() => handleCopyInvitationCode(invitation.invitation_code)}
              >
                {copySuccess[invitation.invitation_code] ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {copySuccess[invitation.invitation_code] ? "Kopyalandı" : "Linki Kopyala"}
              </Button>
            </div>
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
        
        <div className="space-y-4 lg:space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:gap-6">
            {/* Grup kartı */}
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
                    <Badge>
                      {currentUserRole === 'owner' ? 'Sahip' : 
                       user?.id === group.created_by ? 'Sahip' : 'Üye'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
              
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* İşlemler kartı */}
            <Card className="lg:col-span-2">
              <CardContent>
                {renderTabsContent()}
              </CardContent>
            </Card>
              
            {/* Üyeler kartı - Burayı güncelle */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Üyeler</CardTitle>
                  <CardDescription>Bu gruptaki üyeler ve rolleri</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setActiveInvitationsOpen(!activeInvitationsOpen);
                      if (!activeInvitationsOpen) refetchInvitations();
                    }}
                  >
                    {activeInvitationsOpen ? "Davetleri Gizle" : "Aktif Davetler"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" /> Davet Et
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activeInvitationsOpen && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                      <Mail className="h-4 w-4 mr-1" /> Bekleyen Davetler
                    </h3>
                    {renderActiveInvitations()}
                  </div>
                )}
                
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
                              {member.role === 'owner' || member.user_id === group.created_by 
                                ? 'Sahip' 
                                : 'Üye'}
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
        </div>
      </div>
      
      {/* Davet Etme Dialog'u */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gruba Üye Davet Et</DialogTitle>
            <DialogDescription>
              E-posta adresini girerek kişiyi gruba davet edebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Davet edilen kişiye kopyalayıp paylaşabileceğiniz bir davet bağlantısı oluşturulacaktır.
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
              <Button variant="outline" type="button" onClick={() => setAddTransactionOpen(false)}>
                İptal
              </Button>
              <Button 
                type="submit" 
                disabled={addTransactionMutation.isPending}
              >
                {addTransactionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                İşlem Ekle
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
              <Button variant="outline" type="button" onClick={() => setEditGroupOpen(false)}>
                İptal
              </Button>
              <Button 
                type="submit" 
                disabled={updateGroupMutation.isPending}
              >
                {updateGroupMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Değişiklikleri Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GroupDetail; 