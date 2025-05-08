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

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("goals.pageTitle", "Finansal Hedefler")}</h1>
          <p className="text-gray-600">{t("goals.createFirstGoal", "Finansal hedeflerinizi oluşturun ve takip edin")}</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {t("goals.addGoal", "Hedef Ekle")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("goals.addGoal", "Yeni Finansal Hedef")}</DialogTitle>
              <DialogDescription>
                {t("goals.createFirstGoal", "Yeni bir finansal hedef oluşturun ve ilerlemenizi takip edin.")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("goals.goalName", "Hedef Adı")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("goals.goalName", "Örnek: Tatil Fonu, Araba Alımı")} {...field} />
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
                      <FormLabel>{t("goals.targetAmount", "Hedef Tutar (₺)")}</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" step="0.01" {...field} />
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
                      <FormLabel>{t("goals.startingAmount", "Başlangıç Tutar (₺)")}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={addGoalMutation.isPending}>
                    {addGoalMutation.isPending ? t("common.loading", "Ekleniyor...") : t("goals.addGoal", "Hedef Ekle")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Update Goal Dialog */}
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("goals.currentAmount", "Hedef İlerleme Durumunu Güncelle")}</DialogTitle>
              <DialogDescription>
                {selectedGoal?.name} {t("goals.currentAmount", "hedefi için mevcut tutar bilgisini güncelleyin.")}
              </DialogDescription>
            </DialogHeader>
            <Form {...updateForm}>
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>{t("goals.targetAmount", "Hedef Tutar")}:</span>
                  <span className="font-bold">{selectedGoal && formatCurrency(selectedGoal.target_amount)}</span>
                </div>
                
                <FormField
                  control={updateForm.control}
                  name="current_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("goals.currentAmount", "Mevcut Tutar (₺)")}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={updateGoalMutation.isPending}>
                    {updateGoalMutation.isPending ? t("common.loading", "Güncelleniyor...") : t("common.save", "Güncelle")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goal Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <PiggyBank className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium">{t("goals.categories.savings", "Birikim")}</h3>
              <p className="text-sm text-gray-600">{t("goals.categories.savingsDesc", "Uzun vadeli biriktirme")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <Presentation className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium">{t("goals.categories.investment", "Yatırım")}</h3>
              <p className="text-sm text-gray-600">{t("goals.categories.investmentDesc", "Finansal büyüme")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-medium">{t("goals.categories.shortTerm", "Kısa Vadeli")}</h3>
              <p className="text-sm text-gray-600">{t("goals.categories.shortTermDesc", "Yakın dönem hedefler")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-medium">{t("goals.categories.reward", "Ödül")}</h3>
              <p className="text-sm text-gray-600">{t("goals.categories.rewardDesc", "Kendiniz için hedefler")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("goals.pageTitle", "Hedef Listesi")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 bg-gray-100 animate-pulse rounded-md"
                ></div>
              ))}
            </div>
          ) : goals && goals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => (
                <Card key={goal.id} className="overflow-hidden">
                  <div className={`h-2 ${getProgressValue(goal.current_amount || 0, goal.target_amount) >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full ${getProgressValue(goal.current_amount || 0, goal.target_amount) >= 100 ? 'bg-green-100' : 'bg-blue-100'} flex items-center justify-center mr-3`}>
                          <Target className={`h-5 w-5 ${getProgressValue(goal.current_amount || 0, goal.target_amount) >= 100 ? 'text-green-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium">{goal.name}</h3>
                          <p className="text-sm text-gray-600">
                            {t("goals.createdOn", "Oluşturulma")}: {new Date(goal.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openUpdateDialog(goal)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(t("goals.confirmDelete", "Bu hedefi silmek istediğinizden emin misiniz?"))) {
                              deleteGoalMutation.mutate(goal.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>{formatCurrency(goal.current_amount || 0)}</span>
                        <span>{formatCurrency(goal.target_amount)}</span>
                      </div>
                      <Progress 
                        value={getProgressValue(goal.current_amount || 0, goal.target_amount)} 
                        className="h-2" 
                      />
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-gray-600">
                          {getProgressValue(goal.current_amount || 0, goal.target_amount)}% {t("goals.completed", "Tamamlandı")}
                        </span>
                        {getProgressValue(goal.current_amount || 0, goal.target_amount) >= 100 && (
                          <span className="text-sm text-green-600 font-medium">{t("goals.achieved", "Hedef Başarıldı!")}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">{t("goals.noGoals", "Hedef Bulunamadı")}</h3>
              <p className="mt-2 text-gray-500">
                {t("goals.createFirstGoal", "İlk finansal hedefinizi ekleyerek başlayın")}
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("goals.addGoal", "Hedef Ekle")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Section */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-medium mb-4">{t("goals.tipsSectionTitle", "Finansal Hedeflere Ulaşma İpuçları")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-md">
            <h3 className="font-medium mb-2">{t("goals.tips.smart.title", "SMART Hedefler Belirleyin")}</h3>
            <p className="text-sm text-gray-600">
              {t("goals.tips.smart.description", "Hedeflerinizi Spesifik, Ölçülebilir, Ulaşılabilir, İlgili ve Zamana Bağlı olarak belirleyin.")}
            </p>
          </div>
          <div className="bg-white p-4 rounded-md">
            <h3 className="font-medium mb-2">{t("goals.tips.regularPayments.title", "Düzenli Ödemeler Planlayın")}</h3>
            <p className="text-sm text-gray-600">
              {t("goals.tips.regularPayments.description", "Hedef hesabınıza otomatik düzenli ödemeler ayarlayarak tutarlı ilerleme sağlayın.")}
            </p>
          </div>
          <div className="bg-white p-4 rounded-md">
            <h3 className="font-medium mb-2">{t("goals.tips.extraIncome.title", "Beklenmeyen Gelirlerinizi Değerlendirin")}</h3>
            <p className="text-sm text-gray-600">
              {t("goals.tips.extraIncome.description", "Prim, ikramiye veya hediye paralarını hedeflerinize katkı olarak ekleyin.")}
            </p>
          </div>
          <div className="bg-white p-4 rounded-md">
            <h3 className="font-medium mb-2">{t("goals.tips.visualize.title", "İlerlemenizi Görselleştirin")}</h3>
            <p className="text-sm text-gray-600">
              {t("goals.tips.visualize.description", "İlerleme çizelgeleri veya görsel hatırlatıcılar kullanarak motivasyonunuzu yüksek tutun.")}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Goals;
