import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { 
  Plus, 
  Target,
  Pencil,
  Trash2,
  Award,
  Calendar,
  Presentation,
  PiggyBank
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Types for goals
interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Form validation schema
const goalSchema = z.object({
  name: z.string().min(1, "Hedef adı gereklidir"),
  target_amount: z.coerce.number().positive("Hedef tutarı pozitif olmalıdır"),
  current_amount: z.coerce.number().min(0, "Mevcut tutar negatif olamaz").optional(),
});

// Update progress schema
const progressSchema = z.object({
  current_amount: z.coerce.number().min(0, "Mevcut tutar negatif olamaz"),
});

const Goals = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Form for creating new goal
  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      target_amount: 0,
      current_amount: 0,
    },
  });

  // Form for updating goal progress
  const updateForm = useForm<z.infer<typeof progressSchema>>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      current_amount: 0,
    },
  });

  // Fetch goals
  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error(t("common.error", "Hedefler yüklenirken bir hata oluştu"));
        throw error;
      }
      
      return data as Goal[];
    },
    enabled: !!user,
  });

  // Add goal mutation
  const addGoalMutation = useMutation({
    mutationFn: async (values: z.infer<typeof goalSchema>) => {
      const { data, error } = await supabase.from("goals").insert([
        {
          name: values.name,
          target_amount: values.target_amount,
          current_amount: values.current_amount || 0,
          user_id: user!.id,
        },
      ]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success(t("goals.actions.goalAdded", "Hedef başarıyla eklendi"));
      setDialogOpen(false);
      form.reset({
        name: "",
        target_amount: 0,
        current_amount: 0,
      });
    },
    onError: (error) => {
      toast.error(`${t("common.error", "Hata")}: ${error.message}`);
    },
  });

  // Update goal progress mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, currentAmount }: { goalId: string; currentAmount: number }) => {
      const { data, error } = await supabase
        .from("goals")
        .update({ current_amount: currentAmount })
        .eq("id", goalId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success(t("goals.actions.goalUpdated", "Hedef ilerleme durumu güncellendi"));
      setUpdateDialogOpen(false);
      updateForm.reset();
    },
    onError: (error) => {
      toast.error(`${t("common.error", "Hata")}: ${error.message}`);
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success(t("goals.actions.goalDeleted", "Hedef başarıyla silindi"));
    },
    onError: (error) => {
      toast.error(`${t("common.error", "Hata")}: ${error.message}`);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getProgressValue = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const handleSubmit = form.handleSubmit((data) => {
    addGoalMutation.mutate(data);
  });

  const handleUpdateSubmit = updateForm.handleSubmit((data) => {
    if (!selectedGoal) return;
    updateGoalMutation.mutate({ 
      goalId: selectedGoal.id, 
      currentAmount: data.current_amount 
    });
  });

  const openUpdateDialog = (goal: Goal) => {
    setSelectedGoal(goal);
    updateForm.setValue("current_amount", goal.current_amount || 0);
    setUpdateDialogOpen(true);
  };

  // Group goals by completion status
  const completedGoals = goals?.filter(goal => goal.completed_at) || [];
  const inProgressGoals = goals?.filter(goal => !goal.completed_at) || [];

  return (
    <DashboardLayout>
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t("goals.pageTitle", "Finansal Hedefler")}</h1>
          <p className="text-sm md:text-base text-gray-600">{t("goals.createFirstGoal", "Finansal hedeflerinizi oluşturun ve takip edin")}</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" /> {t("goals.actions.addGoal", "Yeni Hedef Ekle")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("goals.actions.addGoal", "Yeni Hedef Ekle")}</DialogTitle>
              <DialogDescription>
                {t("goals.actions.addGoalDescription", "Finansal hedefinizin detaylarını girin")}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("goals.fields.name", "Hedef Adı")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("goals.placeholders.name", "örn. Yeni Araba") || ""} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="target_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("goals.fields.targetAmount", "Hedef Tutar")}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="current_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("goals.fields.currentAmount", "Mevcut Tutar")}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={addGoalMutation.isPending}>
                    {addGoalMutation.isPending ? t("common.loading", "Yükleniyor...") : t("common.save", "Kaydet")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("goals.actions.updateProgress", "İlerleme Durumunu Güncelle")}</DialogTitle>
              <DialogDescription>
                {selectedGoal?.name}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...updateForm}>
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <FormField
                  control={updateForm.control}
                  name="current_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("goals.fields.currentAmount", "Mevcut Tutar")}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={updateGoalMutation.isPending}>
                    {updateGoalMutation.isPending ? t("common.loading", "Yükleniyor...") : t("common.save", "Kaydet")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Goal categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#e0f2fe] border-none shadow-sm">
          <CardContent className="pt-4 flex items-center">
            <div className="bg-[#0ea5e9] p-3 rounded-full text-white mr-3">
              <PiggyBank size={18} />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600">{t("goals.categories.saving", "Birikim")}</p>
              <p className="font-medium">
                {t("goals.categories.longTermSaving", "Uzun vadeli birikim")}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#dcfce7] border-none shadow-sm">
          <CardContent className="pt-4 flex items-center">
            <div className="bg-[#22c55e] p-3 rounded-full text-white mr-3">
              <Presentation size={18} />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600">{t("goals.categories.investment", "Yatırım")}</p>
              <p className="font-medium">
                {t("goals.categories.financialGrowth", "Finansal büyüme")}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#fff7ed] border-none shadow-sm">
          <CardContent className="pt-4 flex items-center">
            <div className="bg-[#f97316] p-3 rounded-full text-white mr-3">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600">{t("goals.categories.shortTerm", "Kısa Vade")}</p>
              <p className="font-medium">
                {t("goals.categories.nearTermGoals", "Yakın vadeli hedefler")}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#faf5ff] border-none shadow-sm">
          <CardContent className="pt-4 flex items-center">
            <div className="bg-[#a855f7] p-3 rounded-full text-white mr-3">
              <Award size={18} />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600">{t("goals.categories.reward", "Ödül")}</p>
              <p className="font-medium">
                {t("goals.categories.rewardsForYourself", "Kendinize ödüller")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Active Goals */}
      <h2 className="text-lg md:text-xl font-semibold mb-4">{t("goals.activeGoals", "Aktif Hedefleriniz")}</h2>
      
      {isLoading ? (
        <div className="text-center py-8">
          <p>{t("common.loading", "Yükleniyor...")}</p>
        </div>
      ) : inProgressGoals.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center justify-center text-center p-6">
            <Target className="h-12 w-12 text-gray-400 mb-2" />
            <h3 className="text-lg font-medium mb-1">{t("goals.noGoalsYet", "Henüz hedef eklemediniz")}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {t("goals.noGoalsDescription", "Finansal hedeflerinizi oluşturmak için 'Yeni Hedef Ekle' butonuna tıklayın")}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t("goals.actions.addGoal", "Yeni Hedef Ekle")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {inProgressGoals.map((goal) => (
            <Card key={goal.id} className="overflow-hidden h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base md:text-lg">{goal.name}</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openUpdateDialog(goal)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">{t("goals.actions.update", "Güncelle")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => {
                        if (window.confirm(t("goals.confirmDelete", "Bu hedefi silmek istediğinizden emin misiniz?"))) {
                          deleteGoalMutation.mutate(goal.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{t("goals.actions.delete", "Sil")}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>{t("goals.fields.currentAmount", "Mevcut Tutar")}: {formatCurrency(goal.current_amount || 0)}</span>
                      <span>{formatCurrency(goal.target_amount)}</span>
                    </div>
                    <Progress 
                      value={getProgressValue(goal.current_amount || 0, goal.target_amount)} 
                      className="h-2" 
                    />
                    <p className="text-right text-xs text-gray-500 mt-1">
                      {getProgressValue(goal.current_amount || 0, goal.target_amount)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <>
          <h2 className="text-lg md:text-xl font-semibold mb-4">{t("goals.completedGoals", "Tamamlanan Hedefler")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="overflow-hidden h-full bg-gray-50">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base md:text-lg">{goal.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => {
                        if (window.confirm(t("goals.confirmDelete", "Bu hedefi silmek istediğinizden emin misiniz?"))) {
                          deleteGoalMutation.mutate(goal.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{t("goals.actions.delete", "Sil")}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>{formatCurrency(goal.current_amount || 0)}</span>
                        <span>{formatCurrency(goal.target_amount)}</span>
                      </div>
                      <Progress 
                        value={100} 
                        className="h-2" 
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {t("goals.completedOn", "Tamamlanma Tarihi")}: {new Date(goal.completed_at!).toLocaleDateString()}
                        </span>
                        <div className="flex items-center">
                          <Award className="h-4 w-4 text-amber-500 mr-1" />
                          <span className="text-xs font-medium text-amber-600">
                            {t("goals.completed", "Tamamlandı")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Goals;
