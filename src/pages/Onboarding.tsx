import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

// For demonstration purposes
type OnboardingStep = {
  title: string;
  description: string;
  component: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }>;
};

const Welcome: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, setData, data }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("onboarding.welcome", "G15'e Hoş Geldiniz, {{name}}!", { name: user?.firstName || '' })}
      </h2>
      <p className="text-gray-600">
        {t("onboarding.welcome_description", "Birlikte finansal panelinizi kuralım. Başlamak için size birkaç soru soracağız.")}
      </p>
      <div className="flex justify-center">
        <Button onClick={onNext} className="bg-g15-primary hover:bg-g15-primary/90">
          {t("onboarding.get_started", "Başla")} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const FinancialGoals: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, setData, data }) => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState(data.goals || [
    { name: "", amount: "", description: "" }
  ]);

  const handleAddGoal = () => {
    setGoals([...goals, { name: "", amount: "", description: "" }]);
  };

  const handleGoalChange = (index: number, field: string, value: string) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value };
    setGoals(updatedGoals);
  };

  const handleNext = () => {
    // Validate that at least one goal has a name and amount
    const validGoals = goals.filter(goal => goal.name && goal.amount);
    
    if (validGoals.length === 0) {
      toast.error(t("onboarding.add_goal", "Lütfen en az bir hedefe isim ve miktar belirtin"));
      return;
    }
    
    setData({ ...data, goals: validGoals });
    onNext();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("onboarding.goals_title", "Finansal hedefleriniz neler?")}
      </h2>
      <p className="text-gray-600">
        {t("onboarding.goals_description", "Net hedefler belirlemek, motivasyonunuzu koruyup ilerlemenizi takip etmenize yardımcı olur.")}
      </p>
      
      <div className="space-y-4">
        {goals.map((goal, index) => (
          <div key={index} className="p-4 border rounded-md bg-white">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`goal-name-${index}`}>{t("onboarding.goal_name", "Hedef Adı")}</Label>
                  <Input
                    id={`goal-name-${index}`}
                    value={goal.name}
                    onChange={(e) => handleGoalChange(index, "name", e.target.value)}
                    placeholder={t("onboarding.goal_name_placeholder", "örn., Acil Durum Fonu")}
                    className="g15-input"
                  />
                </div>
                <div>
                  <Label htmlFor={`goal-amount-${index}`}>{t("onboarding.goal_amount", "Hedef Miktar")}</Label>
                  <Input
                    id={`goal-amount-${index}`}
                    value={goal.amount}
                    onChange={(e) => handleGoalChange(index, "amount", e.target.value)}
                    placeholder={t("onboarding.goal_amount_placeholder", "örn., 5000")}
                    type="number"
                    className="g15-input"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`goal-desc-${index}`}>{t("onboarding.goal_description", "Açıklama (İsteğe bağlı)")}</Label>
                <Input
                  id={`goal-desc-${index}`}
                  value={goal.description}
                  onChange={(e) => handleGoalChange(index, "description", e.target.value)}
                  placeholder={t("onboarding.goal_description_placeholder", "Bu hedef sizin için neden önemli?")}
                  className="g15-input"
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={handleAddGoal}
          className="w-full"
        >
          {t("onboarding.add_another_goal", "Başka Bir Hedef Ekle")}
        </Button>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleNext} className="bg-g15-primary hover:bg-g15-primary/90">
          {t("continue", "Devam Et")} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const BudgetCategories: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, setData, data }) => {
  const { t } = useTranslation();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    data.categories || []
  );
  
  const categories = [
    { id: "housing", name: t("category.housing", "Konut") },
    { id: "transportation", name: t("category.transportation", "Ulaşım") },
    { id: "food", name: t("category.food", "Yiyecek & Market") },
    { id: "utilities", name: t("category.utilities", "Faturalar") },
    { id: "insurance", name: t("category.insurance", "Sigorta") },
    { id: "healthcare", name: t("category.healthcare", "Sağlık") },
    { id: "debt", name: t("category.debt", "Borç Ödemeleri") },
    { id: "savings", name: t("category.savings", "Tasarruflar") },
    { id: "entertainment", name: t("category.entertainment", "Eğlence") },
    { id: "personal", name: t("category.personal", "Kişisel Harcamalar") },
    { id: "education", name: t("category.education", "Eğitim") },
    { id: "travel", name: t("category.travel", "Seyahat") },
    { id: "other", name: t("category.other", "Diğer") }
  ];
  
  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };
  
  const handleNext = () => {
    if (selectedCategories.length === 0) {
      toast.error(t("onboarding.select_category", "Lütfen en az bir kategori seçin"));
      return;
    }
    
    setData({ ...data, categories: selectedCategories });
    onNext();
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("onboarding.categories_title", "Bütçe Kategorilerinizi Seçin")}
      </h2>
      <p className="text-gray-600">
        {t("onboarding.categories_description", "Aylık harcamalarınızla ilgili kategorileri seçin.")}
      </p>
      
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((category) => (
          <div 
            key={category.id}
            className={`p-3 border rounded-md cursor-pointer transition-all ${
              selectedCategories.includes(category.id) 
                ? "border-g15-primary bg-g15-primary/10" 
                : "border-gray-200 hover:border-g15-primary/50"
            }`}
            onClick={() => toggleCategory(category.id)}
          >
            <div className="text-sm font-medium">
              {category.name}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleNext} className="bg-g15-primary hover:bg-g15-primary/90">
          {t("continue", "Devam Et")} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const IncomeSetup: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, setData, data }) => {
  const { t } = useTranslation();
  const [income, setIncome] = useState({
    amount: data.income?.amount || "",
    frequency: data.income?.frequency || "monthly"
  });
  
  const frequencies = [
    { value: "weekly", label: t("frequency.weekly", "Haftalık") },
    { value: "biweekly", label: t("frequency.biweekly", "İki haftada bir") },
    { value: "monthly", label: t("frequency.monthly", "Aylık") },
    { value: "quarterly", label: t("frequency.quarterly", "Üç aylık") },
    { value: "annually", label: t("frequency.annually", "Yıllık") }
  ];
  
  const handleChange = (field: string, value: string) => {
    setIncome({ ...income, [field]: value });
  };
  
  const handleNext = () => {
    if (!income.amount) {
      toast.error(t("onboarding.enter_income", "Lütfen gelir miktarınızı girin"));
      return;
    }
    
    setData({ ...data, income });
    onNext();
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t("onboarding.income_title", "Geliriniz nedir?")}
      </h2>
      <p className="text-gray-600">
        {t("onboarding.income_description", "Bu, kazancınıza dayalı gerçekçi bir bütçe oluşturmamıza yardımcı olur.")}
      </p>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="income-amount">{t("onboarding.income_amount", "Gelir Miktarı")}</Label>
          <Input
            id="income-amount"
            value={income.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            placeholder={t("onboarding.income_placeholder", "örn., 5000")}
            type="number"
            className="g15-input"
          />
        </div>
        
        <div>
          <Label htmlFor="income-frequency">{t("onboarding.income_frequency", "Gelir Sıklığı")}</Label>
          <select
            id="income-frequency"
            value={income.frequency}
            onChange={(e) => handleChange("frequency", e.target.value)}
            className="g15-input"
          >
            {frequencies.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleNext} className="bg-g15-primary hover:bg-g15-primary/90">
          {t("continue", "Devam Et")} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const AllDone: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, data }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Hedefleri veritabanına kaydetme mutation'ı
  const { mutate: saveGoals, isPending: isSavingGoals } = useMutation({
    mutationFn: async (goals: any[]) => {
      const goalsToSave = goals.map(goal => ({
        user_id: user?.id,
        name: goal.name,
        target_amount: parseFloat(goal.amount),
        current_amount: 0,
      }));
      
      const { error } = await supabase.from("goals").insert(goalsToSave);
      if (error) throw error;
      return true;
    },
    onError: (error) => {
      toast.error(t("error.saving_goals", "Hedefler kaydedilirken bir hata oluştu"));
      console.error("Hedefler kaydedilirken hata:", error);
    }
  });
  
  // Bütçe kategorilerini veritabanına kaydetme mutation'ı
  const { mutate: saveCategories, isPending: isSavingCategories } = useMutation({
    mutationFn: async (categories: string[]) => {
      // Kategorilere rastgele renkler atayalım (gerçek uygulamada daha sistematik bir yöntem kullanılmalı)
      const colors = [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", 
        "#FF9F40", "#8AC926", "#1982C4", "#6A4C93", "#FF595E"
      ];
      
      const categoriesToSave = categories.map((categoryId, index) => {
        // Kategori isimlerini doğru biçimde al - string olarak döndüğünden emin olalım
        const categoryName: string = getCategoryName(categoryId);
        return {
          user_id: user?.id,
          name: categoryName,
          budget_amount: 0, // Başlangıçta 0 olarak ayarlıyoruz, kullanıcı daha sonra değiştirebilir
          color: colors[index % colors.length]
        };
      });
      
      const { error } = await supabase.from("budget_categories").insert(categoriesToSave);
      if (error) throw error;
      return true;
    },
    onError: (error) => {
      toast.error(t("error.saving_categories", "Kategoriler kaydedilirken bir hata oluştu"));
      console.error("Kategoriler kaydedilirken hata:", error);
    }
  });
  
  // İlk gelir işlemini veritabanına kaydetme mutation'ı
  const { mutate: saveIncome, isPending: isSavingIncome } = useMutation({
    mutationFn: async (income: any) => {
      const { amount, frequency } = income;
      
      if (!amount || parseFloat(amount) <= 0) {
        return true; // Gelir girilmediyse kaydetmeye gerek yok
      }
      
      const transaction = {
        user_id: user?.id,
        amount: parseFloat(amount),
        type: "income",
        description: `${t("initial_income", "İlk gelir")} (${t(`frequency.${frequency}`, frequency)})`,
        date: new Date().toISOString().split('T')[0],
        category: "Income" // Gelirler için standart kategori
      };
      
      const { error } = await supabase.from("transactions").insert(transaction);
      if (error) throw error;
      return true;
    },
    onError: (error) => {
      toast.error(t("error.saving_income", "Gelir bilgisi kaydedilirken bir hata oluştu"));
      console.error("Gelir bilgisi kaydedilirken hata:", error);
    }
  });
  
  // Tüm verileri kaydeden fonksiyon
  const saveAllData = async () => {
    try {
      if (data.goals && data.goals.length > 0) {
        saveGoals(data.goals);
      }
      
      if (data.categories && data.categories.length > 0) {
        saveCategories(data.categories);
      }
      
      if (data.income) {
        saveIncome(data.income);
      }
      
      // Tüm veriler kaydedildikten sonra dashboard'a yönlendir
      toast.success(t("onboarding.completed", "Kurulum tamamlandı! Dashboard'a yönlendiriliyorsunuz."));
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      toast.error(t("error.general", "Bir hata oluştu. Lütfen tekrar deneyin."));
      console.error("Veri kaydederken hata:", error);
    }
  };
  
  // Kategori ID'sine göre kategori adını döndürür
  const getCategoryName = (categoryId: string) => {
    // Her kategorinin çevirisini ayrı ayrı yapalım
    switch (categoryId) {
      case "housing":
        return t("category.housing", "Konut");
      case "transportation":
        return t("category.transportation", "Ulaşım");
      case "food":
        return t("category.food", "Yiyecek & Market");
      case "utilities":
        return t("category.utilities", "Faturalar");
      case "insurance":
        return t("category.insurance", "Sigorta");
      case "healthcare":
        return t("category.healthcare", "Sağlık");
      case "debt":
        return t("category.debt", "Borç Ödemeleri");
      case "savings":
        return t("category.savings", "Tasarruflar");
      case "entertainment":
        return t("category.entertainment", "Eğlence");
      case "personal":
        return t("category.personal", "Kişisel Harcamalar");
      case "education":
        return t("category.education", "Eğitim");
      case "travel":
        return t("category.travel", "Seyahat");
      case "other":
        return t("category.other", "Diğer");
      default:
        return categoryId;
    }
  };
  
  const isLoading = isSavingGoals || isSavingCategories || isSavingIncome;
  
  return (
    <div className="space-y-6 text-center">
      <div className="rounded-full bg-green-100 p-3 w-12 h-12 mx-auto flex items-center justify-center">
        <Check className="h-6 w-6 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">
        {t("onboarding.all_done", "Harika! Hazırsınız.")}
      </h2>
      <p className="text-gray-600">
        {t("onboarding.all_done_description", "Finansal yolculuğunuza başlamak için gereken her şeyi ayarladık. Herhangi bir zamanda ayarlarınızı düzenleyebilirsiniz.")}
      </p>
      <div className="flex justify-center">
        <Button 
          onClick={saveAllData} 
          className="bg-g15-primary hover:bg-g15-primary/90 px-8"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("saving", "Kaydediliyor...")}
            </>
          ) : (
            <>
              {t("go_to_dashboard", "Dashboard'a Git")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>({});
  
  // Kullanıcı oturum açmadıysa login sayfasına yönlendir
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/signin');
    }
  }, [isLoading, isAuthenticated, navigate]);
  
  // Yükleniyor durumunda göster
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-g15-primary/5 to-g15-secondary/5">
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin h-6 w-6 text-g15-primary" />
          <span className="text-gray-600">{t("loading", "Yükleniyor...")}</span>
        </div>
      </div>
    );
  }
  
  // Adımları tanımla
  const steps: OnboardingStep[] = [
    {
      title: t("onboarding.step1_title", "Hoş Geldiniz"),
      description: t("onboarding.step1_description", "G15 ile yolculuğunuza başlayın"),
      component: Welcome
    },
    {
      title: t("onboarding.step2_title", "Finansal Hedefler"),
      description: t("onboarding.step2_description", "Hedeflerinizi belirleyin"),
      component: FinancialGoals
    },
    {
      title: t("onboarding.step3_title", "Bütçe Kategorileri"),
      description: t("onboarding.step3_description", "Kategorilerinizi seçin"),
      component: BudgetCategories
    },
    {
      title: t("onboarding.step4_title", "Gelir Kurulumu"),
      description: t("onboarding.step4_description", "Gelirinizi ayarlayın"),
      component: IncomeSetup
    },
    {
      title: t("onboarding.step5_title", "Tamamlandı"),
      description: t("onboarding.step5_description", "Kurulum bitti"),
      component: AllDone
    }
  ];
  
  const handleNext = () => {
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };
  
  const updateData = (data: any) => {
    setOnboardingData({ ...onboardingData, ...data });
  };
  
  const StepComponent = steps[currentStep].component;
  const progress = ((currentStep) / (steps.length - 1)) * 100;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-g15-primary/5 to-g15-secondary/5">
      <div className="g15-container py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-1">
            <Progress value={progress} className="h-1" />
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-sm font-medium text-gray-500">
                  {t("step_of", "Adım {{current}} / {{total}}", { current: currentStep + 1, total: steps.length })}
                </h1>
                <h2 className="text-lg font-semibold text-gray-800">
                  {steps[currentStep].title}
                </h2>
              </div>
              
              <div className="text-sm text-right text-gray-500">
                {steps[currentStep].description}
              </div>
            </div>
            
            <StepComponent
              onNext={handleNext}
              setData={updateData}
              data={onboardingData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
