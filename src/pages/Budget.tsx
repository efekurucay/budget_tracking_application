import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "react-i18next";
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
const createBudgetSchema = (t: any) => z.object({
  name: z.string().min(1, t("budget.errors.nameRequired", "Category name is required")),
  budget_amount: z.coerce.number().positive(t("budget.errors.amountPositive", "Budget amount must be positive")),
  color: z.string().optional(),
});

const Budget = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
  const queryClient = useQueryClient();

  // Create the schema with translations
  const budgetSchema = createBudgetSchema(t);

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
        toast.error(t("common.error", "Error loading budget categories"));
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
        toast.error(t("common.error", "Error loading transactions"));
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
      toast.success(t("budget.actions.categoryAdded", "Budget category added successfully"));
      setDialogOpen(false);
      form.reset({
        name: "",
        budget_amount: 0,
        color: categoryColors[Math.floor(Math.random() * categoryColors.length)],
      });
    },
    onError: (error) => {
      toast.error(t("common.error", "Error adding budget category: ") + error.message);
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
      toast.success(t("budget.actions.categoryUpdated", "Budget category updated successfully"));
      setEditDialogOpen(false);
      setSelectedCategory(null);
    },
    onError: (error) => {
      toast.error(t("common.error", "Error updating budget category: ") + error.message);
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
      toast.success(t("budget.actions.categoryDeleted", "Budget category deleted successfully"));
    },
    onError: (error) => {
      toast.error(t("common.error", "Error deleting budget category: ") + error.message);
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
    if (!categories || !transactions) return {};
    
    const spentAmounts: Record<string, number> = {};
    
    categories.forEach(category => {
      spentAmounts[category.id] = 0;
    });
    
    transactions.forEach(transaction => {
      const category = categories.find(cat => cat.name === transaction.category);
      if (category && transaction.type === "expense") {
        spentAmounts[category.id] = (spentAmounts[category.id] || 0) + transaction.amount;
      }
    });
    
    return spentAmounts;
  };

  const calculatePercentage = (spent: number, budget: number) => {
    if (budget <= 0) return 0;
    const percentage = (spent / budget) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  const preparePieChartData = () => {
    if (!categories) return [];

    return categories.map(category => ({
      name: category.name,
      value: category.budget_amount,
      color: category.color || "#CCCCCC",
    }));
  };

  const prepareBarChartData = () => {
    if (!categories) return [];
    
    const spentAmounts = calculateSpentAmounts();
    
    return categories.map(category => ({
      name: category.name,
      [t("budget.spent", "Spent")]: spentAmounts[category.id] || 0,
      [t("budget.remaining", "Budget")]: category.budget_amount,
    }));
  };

  const totalBudget = categories?.reduce((sum, category) => sum + category.budget_amount, 0) || 0;
  const spentAmounts = calculateSpentAmounts();
  const totalSpent = Object.values(spentAmounts).reduce((sum, amount) => sum + amount, 0);

  const openEditDialog = (category: BudgetCategory) => {
    setSelectedCategory(category);
    form.reset({
      name: category.name,
      budget_amount: category.budget_amount,
      color: category.color || categoryColors[0],
    });
    setEditDialogOpen(true);
  };

  const handleAddSubmit = (values: z.infer<typeof budgetSchema>) => {
    addBudgetCategoryMutation.mutate(values);
  };

  const handleEditSubmit = (values: z.infer<typeof budgetSchema>) => {
    if (!selectedCategory) return;
    
    updateBudgetCategoryMutation.mutate({
      ...values,
      id: selectedCategory.id,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm(t("common.warning", "Are you sure you want to delete this category?"))) {
      deleteBudgetCategoryMutation.mutate(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t("budget.pageTitle", "Budget Management")}</h1>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("budget.addCategory", "Add Budget Category")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("budget.addCategory", "Add Budget Category")}</DialogTitle>
                <DialogDescription>
                  {t("budget.addCategoryDescription", "Create a new budget category to track your expenses.")}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("budget.categoryName", "Category Name")}</FormLabel>
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
                        <FormLabel>{t("budget.monthlyBudget", "Monthly Budget (₺)")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
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
                        <FormLabel>{t("budget.categoryColor", "Category Color")}</FormLabel>
                        <FormControl>
                          <div className="flex space-x-2">
                            {categoryColors.map((color) => (
                              <div
                                key={color}
                                className={`h-8 w-8 rounded-full cursor-pointer ${
                                  field.value === color ? "ring-2 ring-offset-2 ring-g15-primary" : ""
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => form.setValue("color", color)}
                              />
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={addBudgetCategoryMutation.isPending}>
                      {addBudgetCategoryMutation.isPending ? t("common.loading", "Saving...") : t("common.save", "Save")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("common.edit", "Edit")} {selectedCategory?.name}</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("budget.categoryName", "Category Name")}</FormLabel>
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
                        <FormLabel>{t("budget.monthlyBudget", "Monthly Budget (₺)")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
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
                        <FormLabel>{t("budget.categoryColor", "Category Color")}</FormLabel>
                        <FormControl>
                          <div className="flex space-x-2">
                            {categoryColors.map((color) => (
                              <div
                                key={color}
                                className={`h-8 w-8 rounded-full cursor-pointer ${
                                  field.value === color ? "ring-2 ring-offset-2 ring-g15-primary" : ""
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => form.setValue("color", color)}
                              />
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={updateBudgetCategoryMutation.isPending}>
                      {updateBudgetCategoryMutation.isPending ? t("common.loading", "Saving...") : t("common.save", "Save")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Budget Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("budget.budgetOverview", "Total Budget Overview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:space-x-8">
              <div className="w-full md:w-1/2 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-sm text-gray-500">{t("budget.spent", "Spent")}</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{t("budget.remaining", "Remaining")}</p>
                    <p className="text-2xl font-bold">{formatCurrency(Math.max(0, totalBudget - totalSpent))}</p>
                  </div>
                </div>
                <Progress value={calculatePercentage(totalSpent, totalBudget)} className="h-4" />
                <p className="text-sm text-center">
                  {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)} 
                  ({Math.round(calculatePercentage(totalSpent, totalBudget))}%)
                </p>
              </div>
              
              <div className="w-full md:w-1/2 mt-6 md:mt-0">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={preparePieChartData()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {preparePieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Budget Categories List */}
        <Card>
          <CardHeader>
            <CardTitle>{t("budget.categories", "Budget Categories")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <div className="text-center py-4">{t("common.loading", "Loading...")}</div>
            ) : !categories?.length ? (
              <div className="text-center py-4 text-gray-500">
                <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                <p>{t("budget.noCategories", "No budget categories found. Create your first category.")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => {
                  const spent = spentAmounts[category.id] || 0;
                  const remaining = Math.max(0, category.budget_amount - spent);
                  const percentage = calculatePercentage(spent, category.budget_amount);
                  
                  return (
                    <div key={category.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: category.color || "#CCCCCC" }}
                          />
                          <h3 className="font-medium">{category.name}</h3>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span>{t("budget.spent", "Spent")}: {formatCurrency(spent)}</span>
                        <span>{t("budget.remaining", "Remaining")}: {formatCurrency(remaining)}</span>
                      </div>
                      
                      <Progress
                        value={percentage}
                        className={`h-2 ${
                          percentage >= 90 ? "bg-red-200" : percentage >= 75 ? "bg-amber-200" : "bg-gray-200"
                        }`}
                        indicatorClassName={
                          percentage >= 90 ? "bg-red-500" : percentage >= 75 ? "bg-amber-500" : ""
                        }
                      />
                      
                      <div className="text-xs text-right mt-1">
                        {formatCurrency(spent)} / {formatCurrency(category.budget_amount)} ({Math.round(percentage)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Budget vs Spent Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("budget.comparisonChart", "Budget vs Spending by Category")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareBarChartData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey={t("budget.spent", "Spent")} fill="#FF6384" />
                  <Bar dataKey={t("budget.remaining", "Budget")} fill="#36A2EB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Budget;
