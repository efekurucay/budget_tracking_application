import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "react-i18next"; // Removed TFunction import
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
import { Tables } from "@/integrations/supabase/types"; // Import Tables type helper
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'; // Import date-fns functions

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
  category: string | null; // Category can be null in transactions table
  amount: number;
  type: string;
}

// Type for planned expenses (using generated types)
type PlannedExpense = Tables<'planned_expenses'>;

// Type for AI Budget Suggestion item
interface AISuggestion {
  categoryId: string;
  categoryName?: string; // Name might be added by frontend after fetching from AI
  suggestedBudget: number;
  // Potentially other fields from AI like 'reasoning', 'confidenceScore' etc.
}

// Form validation schema
const createBudgetSchema = (t: ReturnType<typeof useTranslation>['t']) => z.object({ // Use inferred type for t
  name: z.string().min(1, t("budget.errors.nameRequired", "Category name is required")),
  budget_amount: z.coerce.number().positive(t("budget.errors.amountPositive", "Budget amount must be positive")),
  color: z.string().optional(),
});

const Budget = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false); // For adding new category
  const [editDialogOpen, setEditDialogOpen] = useState(false); // For editing existing category
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
  const [aiBudgetPlanDialogOpen, setAiBudgetPlanDialogOpen] = useState(false);
  const [suggestedBudgetPlan, setSuggestedBudgetPlan] = useState<Array<{ categoryId: string; categoryName: string; currentBudget: number; lastMonthSpent: number; suggestedBudget: number }> | null>(null);
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

  // Fetch planned expenses for the next month
  const { data: plannedExpenses, isLoading: isLoadingPlannedExpenses } = useQuery({
    queryKey: ["planned-expenses-next-month", user?.id], // Add user.id to queryKey to refetch if user changes
    queryFn: async () => {
      if (!user) return []; // Kullanıcı yoksa boş dizi döndür

      const today = new Date();
      const nextMonthDate = addMonths(today, 1);
      const startDate = format(startOfMonth(nextMonthDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(nextMonthDate), 'yyyy-MM-dd');

      console.log("[BudgetPage] Fetching planned expenses for period:", startDate, "to", endDate);
      console.log("[BudgetPage] User ID for query:", user.id);

      const { data, error } = await supabase
        .from("planned_expenses")
        .select("*")
        .eq('user_id', user.id) // Explicitly filter by user_id, RLS should also handle this
        .eq('status', 'planned')
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order("due_date");

      if (error) {
        toast.error(t("budget.errors.loadPlannedExpenses", "Error loading planned expenses"));
        console.error("[BudgetPage] Error loading planned expenses:", error.message, error.details);
        throw error;
      }
      console.log("[BudgetPage] Fetched planned expenses:", data);
      return data as PlannedExpense[];
    },
    enabled: !!user, // Only run query if user is logged in
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

  // Mutation to call the AI budget planning function
  const planBudgetWithAIMutation = useMutation({
    mutationFn: async () => {
      // 1. Fetch last month's expenses
      const today = new Date();
      const lastMonthStartDate = format(startOfMonth(addMonths(today, -1)), 'yyyy-MM-dd');
      const lastMonthEndDate = format(endOfMonth(addMonths(today, -1)), 'yyyy-MM-dd');

      const { data: lastMonthTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('type', 'expense')
        .gte('date', lastMonthStartDate)
        .lte('date', lastMonthEndDate);

      if (transactionsError) {
        throw new Error(t("budget.errors.loadLastMonthExpenses", "Failed to load last month's expenses for AI planning."));
      }

      // Aggregate expenses by category name
      const expensesByCategoryName: Record<string, number> = {};
      lastMonthTransactions?.forEach(tx => {
        if (tx.category) {
          expensesByCategoryName[tx.category] = (expensesByCategoryName[tx.category] || 0) + tx.amount;
        }
      });
      
      // Prepare data for AI function: map category names to IDs and include current budget
      const categoriesForAI = categories?.map(cat => ({
        id: cat.id,
        name: cat.name,
        currentBudget: cat.budget_amount,
        lastMonthSpent: expensesByCategoryName[cat.name] || 0,
      })) || [];


      // 2. Call the Supabase Edge Function
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-finance-assistant', {
        body: {
          action: 'suggest_next_month_budget',
          payload: {
            currentCategories: categoriesForAI,
            // We could add more context here, like user goals, income, etc. in the future
          },
        },
      });

      if (aiError) {
        console.error("AI Function Error:", aiError);
        throw new Error(t("budget.errors.aiPlanningFailed", "AI budget planning failed: ") + aiError.message);
      }
      
      // Assuming the AI returns an array of suggestions like:
      // { categoryId: string, suggestedBudget: number } -> AI might only return these
      // We will enrich it with categoryName, currentBudget, lastMonthSpent on the frontend
      const suggestions = aiResponse?.suggestions?.map((suggestion: AISuggestion) => {
        const categoryInfo = categoriesForAI.find(c => c.id === suggestion.categoryId);
        return {
          categoryId: suggestion.categoryId, // Ensure categoryId is correctly passed
          suggestedBudget: suggestion.suggestedBudget, // Ensure suggestedBudget is correctly passed
          categoryName: categoryInfo?.name || 'Unknown Category',
          currentBudget: categoryInfo?.currentBudget || 0,
          lastMonthSpent: categoryInfo?.lastMonthSpent || 0,
        };
      }) || [];

      return suggestions;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        setSuggestedBudgetPlan(data);
        setAiBudgetPlanDialogOpen(true);
        toast.success(t("budget.aiSuggestionsReady", "AI budget suggestions are ready!"));
      } else {
        toast.info(t("budget.noAiSuggestions", "AI couldn't generate suggestions, or no categories to plan for."));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handlePlanWithAI = () => {
    if (!categories || categories.length === 0) {
      toast.info(t("budget.noCategoriesToPlan", "Please add budget categories before planning with AI."));
      return;
    }
    planBudgetWithAIMutation.mutate();
  };

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
  const totalPlannedNextMonth = plannedExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

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
          
          <div className="flex space-x-2">
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
            <Button 
              variant="outline" 
              onClick={handlePlanWithAI}
              disabled={planBudgetWithAIMutation.isPending || isLoadingCategories}
            >
              {planBudgetWithAIMutation.isPending ? (
                <>{t("common.loading", "Planning...")}</>
              ) : (
                <>
                  <PieChart className="mr-2 h-4 w-4" />
                  {t("budget.planWithAI", "Plan Next Month with AI")}
                </>
              )}
            </Button>
          </div>
          
          {/* Dialog for AI Budget Plan Suggestions */}
          <Dialog open={aiBudgetPlanDialogOpen} onOpenChange={setAiBudgetPlanDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("budget.aiSuggestionsTitle", "AI Budget Suggestions for Next Month")}</DialogTitle>
                <DialogDescription>
                  {t("budget.aiSuggestionsDesc", "Review the suggestions and apply them to your budget categories. You can adjust the amounts before applying.")}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
                {suggestedBudgetPlan?.map((item, index) => (
                  <div key={item.categoryId} className="grid grid-cols-4 items-center gap-2 border-b pb-2">
                    <span className="col-span-1 font-medium">{item.categoryName}</span>
                    <div className="col-span-1 text-sm">
                      <p>{t("budget.current", "Current")}: {formatCurrency(item.currentBudget)}</p>
                      <p>{t("budget.lastMonthSpent", "Last Month")}: {formatCurrency(item.lastMonthSpent)}</p>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      className="col-span-1"
                      value={item.suggestedBudget}
                      onChange={(e) => {
                        const newAmount = parseFloat(e.target.value);
                        setSuggestedBudgetPlan(prev => 
                          prev!.map(p => p.categoryId === item.categoryId ? {...p, suggestedBudget: isNaN(newAmount) ? 0 : newAmount} : p)
                        );
                      }}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="col-span-1"
                      onClick={() => { // Apply individual suggestion
                        updateBudgetCategoryMutation.mutate({
                          id: item.categoryId,
                          name: item.categoryName, // Name shouldn't change here, but schema expects it
                          budget_amount: item.suggestedBudget,
                          // color: categories?.find(c=>c.id === item.categoryId)?.color // Keep existing color
                        }, {
                          onSuccess: () => {
                            toast.success(`${item.categoryName} budget updated.`);
                            // Optionally remove from suggested list or mark as applied
                            setSuggestedBudgetPlan(prev => prev!.filter(p => p.categoryId !== item.categoryId));
                          }
                        });
                      }}
                      disabled={updateBudgetCategoryMutation.isPending}
                    >
                      {t("budget.applySuggestion", "Apply")}
                    </Button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => setAiBudgetPlanDialogOpen(false)}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button 
                  onClick={() => { // Apply all remaining suggestions
                    const updates = suggestedBudgetPlan?.map(item => 
                      updateBudgetCategoryMutation.mutateAsync({
                        id: item.categoryId,
                        name: item.categoryName,
                        budget_amount: item.suggestedBudget,
                      })
                    );
                    if (updates) {
                      Promise.all(updates).then(() => {
                        toast.success(t("budget.allSuggestionsApplied", "All suggestions applied successfully!"));
                        setAiBudgetPlanDialogOpen(false);
                        setSuggestedBudgetPlan(null);
                      }).catch(error => {
                        toast.error(t("budget.errorApplyingAll", "Error applying some suggestions: ") + error.message);
                      });
                    }
                  }}
                  disabled={!suggestedBudgetPlan || suggestedBudgetPlan.length === 0 || updateBudgetCategoryMutation.isPending}
                >
                  {t("budget.applyAllSuggestions", "Apply All Remaining")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}> {/* Keep edit dialog separate */}
            <DialogContent>
            {/* ... existing edit category dialog content ... */}
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
                          percentage >= 90 ? "bg-red-200 [&>*]:bg-red-500" : 
                          percentage >= 75 ? "bg-amber-200 [&>*]:bg-amber-500" : 
                          "bg-gray-200 [&>*]:bg-primary" // Default color using primary
                        }`}
                        // Removed indicatorClassName prop
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
        
        {/* Planned Expenses for Next Month Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("budget.plannedExpensesNextMonth", "Planned Expenses for Next Month")}</CardTitle>
            <CardDescription>
              {t("budget.plannedExpensesNextMonthDesc", "These are your scheduled expenses for the upcoming month.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPlannedExpenses ? (
              <div className="text-center py-4">{t("common.loading", "Loading planned expenses...")}</div>
            ) : !plannedExpenses?.length ? (
              <div className="text-center py-4 text-gray-500">
                <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                <p>{t("budget.noPlannedExpenses", "No planned expenses found for next month.")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plannedExpenses.map((expense) => (
                  <div key={expense.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{expense.description}</h4>
                        <p className="text-sm text-gray-500">
                          {t("budget.dueDate", "Due")}: {format(new Date(expense.due_date), 'dd/MM/yyyy')}
                          {expense.category_id && categories?.find(c => c.id === expense.category_id) && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{backgroundColor: categories.find(c => c.id === expense.category_id)?.color || '#ccc', color: '#fff'}}>
                              {categories.find(c => c.id === expense.category_id)?.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                        {expense.is_recurring && (
                          <p className="text-xs text-blue-500">{t("budget.recurring", "Recurring")} ({expense.recurring_interval})</p>
                        )}
                      </div>
                    </div>
                    {expense.notes && <p className="text-xs text-gray-400 mt-1">{expense.notes}</p>}
                  </div>
                ))}
                <div className="text-right font-bold mt-4">
                  {t("budget.totalPlanned", "Total Planned")}: {formatCurrency(totalPlannedNextMonth)}
                </div>
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
