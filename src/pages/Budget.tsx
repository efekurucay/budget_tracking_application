
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  PieChart,
  ArrowDownRight,
  AlertCircle,
  BarChart3,
  FilePieChart
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";

// Types for budget categories
interface BudgetCategory {
  id: string;
  name: string;
  budget_amount: number;
  color?: string | null;
  created_at: string;
}

// Types for transactions (simplified for budget usage)
interface BudgetTransaction {
  category: string;
  amount: number;
  type: string;
}

// Form validation schema
const budgetSchema = z.object({
  name: z.string().min(1, "Kategori adı gereklidir"),
  budget_amount: z.coerce.number().positive("Bütçe tutarı pozitif olmalıdır"),
  color: z.string().optional(),
});

const Budget = () => {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
  const queryClient = useQueryClient();

  // Pre-defined colors for budget categories
  const categoryColors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#8AC926", "#1982C4", "#6A4C93", "#FF595E"
  ];

  // Form for creating/editing a budget category
  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: "",
      budget_amount: 0,
      color: categoryColors[0],
    },
  });

  // Fetch budget categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["budget-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .order("name");
      
      if (error) {
        toast.error("Bütçe kategorileri yüklenirken bir hata oluştu");
        throw error;
      }
      
      return data as BudgetCategory[];
    },
    enabled: !!user,
  });

  // Fetch transactions for budget calculations
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["budget-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("category, amount, type")
        .eq("type", "expense");
      
      if (error) {
        toast.error("İşlemler yüklenirken bir hata oluştu");
        throw error;
      }
      
      return data as BudgetTransaction[];
    },
    enabled: !!user,
  });

  // Add budget category mutation
  const addBudgetCategoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof budgetSchema>) => {
      const { data, error } = await supabase.from("budget_categories").insert([
        {
          name: values.name,
          budget_amount: values.budget_amount,
          color: values.color,
          user_id: user!.id,
        },
      ]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-categories"] });
      toast.success("Bütçe kategorisi başarıyla eklendi");
      setDialogOpen(false);
      form.reset({
        name: "",
        budget_amount: 0,
        color: categoryColors[Math.floor(Math.random() * categoryColors.length)],
      });
    },
    onError: (error) => {
      toast.error(`Bütçe kategorisi eklenirken bir hata oluştu: ${error.message}`);
    },
  });

  // Update budget category mutation
  const updateBudgetCategoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof budgetSchema> & { id: string }) => {
      const { id, ...updateData } = values;
      const { data, error } = await supabase
        .from("budget_categories")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-categories"] });
      toast.success("Bütçe kategorisi başarıyla güncellendi");
      setEditDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: (error) => {
      toast.error(`Bütçe kategorisi güncellenirken bir hata oluştu: ${error.message}`);
    },
  });

  // Delete budget category mutation
  const deleteBudgetCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-categories"] });
      toast.success("Bütçe kategorisi başarıyla silindi");
    },
    onError: (error) => {
      toast.error(`Bütçe kategorisi silinirken bir hata oluştu: ${error.message}`);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  // Calculate spent amounts per category
  const calculateSpentAmounts = () => {
    if (!transactions || !categories) return {};
    
    const spentAmounts: Record<string, number> = {};
    
    categories.forEach(category => {
      spentAmounts[category.name] = 0;
    });
    
    transactions.forEach(transaction => {
      if (transaction.category && spentAmounts[transaction.category] !== undefined) {
        spentAmounts[transaction.category] += transaction.amount;
      }
    });
    
    return spentAmounts;
  };

  const spentAmounts = calculateSpentAmounts();

  // Calculate percentage spent of budget
  const calculatePercentage = (spent: number, budget: number) => {
    if (budget <= 0) return 0;
    return Math.min(Math.round((spent / budget) * 100), 100);
  };

  // Prepare data for pie chart
  const preparePieChartData = () => {
    if (!categories) return [];
    
    return categories.map(category => ({
      name: category.name,
      value: category.budget_amount,
      color: category.color || categoryColors[0],
    }));
  };

  // Prepare data for budget vs spent bar chart
  const prepareBarChartData = () => {
    if (!categories) return [];
    
    return categories.map(category => ({
      name: category.name,
      budget: category.budget_amount,
      spent: spentAmounts[category.name] || 0,
    }));
  };

  const handleSubmit = form.handleSubmit((data) => {
    if (selectedCategory) {
      updateBudgetCategoryMutation.mutate({ ...data, id: selectedCategory.id });
    } else {
      addBudgetCategoryMutation.mutate(data);
    }
  });

  const openEditDialog = (category: BudgetCategory) => {
    setSelectedCategory(category);
    form.reset({
      name: category.name,
      budget_amount: category.budget_amount,
      color: category.color || categoryColors[0],
    });
    setEditDialogOpen(true);
  };

  // Calculate total budget and spent
  const totalBudget = categories?.reduce((sum, category) => sum + category.budget_amount, 0) || 0;
  const totalSpent = Object.values(spentAmounts).reduce((sum, amount) => sum + amount, 0);
  const totalPercentage = calculatePercentage(totalSpent, totalBudget);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bütçe Yönetimi</h1>
          <p className="text-gray-600">Harcamalarınızı kategorilere ayırın ve takip edin</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Bütçe Kategorisi Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Bütçe Kategorisi</DialogTitle>
              <DialogDescription>
                Yeni bir bütçe kategorisi ve aylık limit ekleyin.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Örnek: Yiyecek, Kira, Eğlence" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="budget_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aylık Bütçe (₺)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renk</FormLabel>
                      <div className="grid grid-cols-5 gap-2">
                        {categoryColors.map((color) => (
                          <div
                            key={color}
                            onClick={() => form.setValue("color", color)}
                            className={`h-8 w-8 rounded-full cursor-pointer border-2 ${
                              field.value === color ? "border-black" : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={addBudgetCategoryMutation.isPending || updateBudgetCategoryMutation.isPending}
                  >
                    {selectedCategory 
                      ? (updateBudgetCategoryMutation.isPending ? "Güncelleniyor..." : "Güncelle")
                      : (addBudgetCategoryMutation.isPending ? "Ekleniyor..." : "Kategori Ekle")
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bütçe Kategorisini Düzenle</DialogTitle>
              <DialogDescription>
                {selectedCategory?.name} kategorisinin detaylarını güncelleyin.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori Adı</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="budget_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aylık Bütçe (₺)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renk</FormLabel>
                      <div className="grid grid-cols-5 gap-2">
                        {categoryColors.map((color) => (
                          <div
                            key={color}
                            onClick={() => form.setValue("color", color)}
                            className={`h-8 w-8 rounded-full cursor-pointer border-2 ${
                              field.value === color ? "border-black" : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={updateBudgetCategoryMutation.isPending}
                  >
                    {updateBudgetCategoryMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Toplam Bütçe Görünümü</CardTitle>
            <CardDescription>
              Bu ay için toplam bütçe durumunuz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Harcanan: {formatCurrency(totalSpent)}</span>
                <span className="text-sm text-gray-600">Toplam Bütçe: {formatCurrency(totalBudget)}</span>
              </div>
              <Progress
                value={totalPercentage}
                className="h-3"
                style={{
                  backgroundColor: "#e5e7eb",
                  backgroundImage: `linear-gradient(to right, ${
                    totalPercentage < 70 ? "#22c55e" : 
                    totalPercentage < 90 ? "#eab308" : 
                    "#ef4444"
                  }, ${
                    totalPercentage < 70 ? "#22c55e" : 
                    totalPercentage < 90 ? "#eab308" : 
                    "#ef4444"
                  } ${totalPercentage}%, #e5e7eb ${totalPercentage}%)`
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-sm font-medium">{totalPercentage}% Kullanıldı</span>
                <span className="text-sm font-medium">
                  Kalan: {formatCurrency(totalBudget - totalSpent)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-gray-600">
                {totalPercentage >= 90 
                  ? "Dikkat: Toplam bütçenizin %90'ını kullandınız!"
                  : totalPercentage >= 70
                    ? "Uyarı: Toplam bütçenizin %70'ini kullandınız."
                    : "Bütçe durumunuz iyi görünüyor. Bu tempoda devam edin."
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              <span>Bütçe Dağılımı</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoadingCategories ? (
                <div className="h-full flex items-center justify-center">
                  <p>Yükleniyor...</p>
                </div>
              ) : categories && categories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={preparePieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {preparePieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <FilePieChart className="h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">Henüz bütçe kategorisi eklenmemiş</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              <span>Bütçe ve Harcama Karşılaştırma</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoadingCategories || isLoadingTransactions ? (
                <div className="h-full flex items-center justify-center">
                  <p>Yükleniyor...</p>
                </div>
              ) : categories && categories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareBarChartData()}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="budget" name="Bütçe" fill="#8884d8" />
                    <Bar dataKey="spent" name="Harcama" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <BarChart3 className="h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">Karşılaştırma için veri yok</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Bütçe Kategorileri</CardTitle>
          <CardDescription>
            Aylık bütçe limitleriniz ve harcamalarınız
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCategories ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 animate-pulse rounded-md"
                ></div>
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="space-y-6">
              {categories.map((category) => {
                const spent = spentAmounts[category.name] || 0;
                const percentage = calculatePercentage(spent, category.budget_amount);
                
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: category.color || "#000" }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`"${category.name}" kategorisini silmek istediğinizden emin misiniz?`)) {
                              deleteBudgetCategoryMutation.mutate(category.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">
                          Harcanan: {formatCurrency(spent)}
                        </span>
                        <span className="text-sm text-gray-600">
                          Bütçe: {formatCurrency(category.budget_amount)}
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                        style={{
                          backgroundColor: "#e5e7eb",
                          backgroundImage: `linear-gradient(to right, ${
                            percentage < 70 ? "#22c55e" : 
                            percentage < 90 ? "#eab308" : 
                            "#ef4444"
                          }, ${
                            percentage < 70 ? "#22c55e" : 
                            percentage < 90 ? "#eab308" : 
                            "#ef4444"
                          } ${percentage}%, #e5e7eb ${percentage}%)`
                        }}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs">{percentage}% Kullanıldı</span>
                        <span className="text-xs">
                          Kalan: {formatCurrency(category.budget_amount - spent)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <PieChart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Kategori Bulunamadı</h3>
              <p className="mt-2 text-gray-500">
                İlk bütçe kategorinizi ekleyerek başlayın
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Kategori Ekle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Tips */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-medium mb-4">Bütçe Yönetimi İpuçları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-md">
            <h3 className="font-medium mb-2">50/30/20 Kuralını Uygulayın</h3>
            <p className="text-sm text-gray-600">
              Gelirinizin %50'sini ihtiyaçlara, %30'unu isteklere ve %20'sini tasarrufa ayırın.
            </p>
          </div>
          <div className="bg-white p-4 rounded-md">
            <h3 className="font-medium mb-2">Düzenli Bütçe İncelemeleri Yapın</h3>
            <p className="text-sm text-gray-600">
              Haftalık veya aylık olarak bütçenizi gözden geçirin ve gerekirse ayarlayın.
            </p>
          </div>
          <div className="bg-white p-4 rounded-md">
            <h3 className="font-medium mb-2">Acil Durum Fonu Oluşturun</h3>
            <p className="text-sm text-gray-600">
              Beklenmeyen durumlar için 3-6 aylık giderinizi karşılayacak bir fon biriktirin.
            </p>
          </div>
          <div className="bg-white p-4 rounded-md">
            <h3 className="font-medium mb-2">Kredi Kartı Borcunu Azaltın</h3>
            <p className="text-sm text-gray-600">
              Yüksek faizli borçları önceliklendirin ve düzenli ödeme planı oluşturun.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Budget;
