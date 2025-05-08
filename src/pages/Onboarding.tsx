
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/sonner";

// For demonstration purposes
type OnboardingStep = {
  title: string;
  description: string;
  component: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }>;
};

const Welcome: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, setData, data }) => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-gray-900">
        Welcome to G15, {user?.firstName}!
      </h2>
      <p className="text-gray-600">
        Let's set up your financial dashboard together. We'll ask you a few questions to get started.
      </p>
      <div className="flex justify-center">
        <Button onClick={onNext} className="bg-g15-primary hover:bg-g15-primary/90">
          Get Started <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const FinancialGoals: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, setData, data }) => {
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
      toast.error("Please add at least one goal with a name and amount");
      return;
    }
    
    setData({ ...data, goals: validGoals });
    onNext();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        What are your financial goals?
      </h2>
      <p className="text-gray-600">
        Setting clear goals helps you stay motivated and track your progress.
      </p>
      
      <div className="space-y-4">
        {goals.map((goal, index) => (
          <div key={index} className="p-4 border rounded-md bg-white">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`goal-name-${index}`}>Goal Name</Label>
                  <Input
                    id={`goal-name-${index}`}
                    value={goal.name}
                    onChange={(e) => handleGoalChange(index, "name", e.target.value)}
                    placeholder="e.g., Emergency Fund"
                    className="g15-input"
                  />
                </div>
                <div>
                  <Label htmlFor={`goal-amount-${index}`}>Target Amount</Label>
                  <Input
                    id={`goal-amount-${index}`}
                    value={goal.amount}
                    onChange={(e) => handleGoalChange(index, "amount", e.target.value)}
                    placeholder="e.g., 5000"
                    type="number"
                    className="g15-input"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`goal-desc-${index}`}>Description (Optional)</Label>
                <Input
                  id={`goal-desc-${index}`}
                  value={goal.description}
                  onChange={(e) => handleGoalChange(index, "description", e.target.value)}
                  placeholder="Why is this goal important to you?"
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
          Add Another Goal
        </Button>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleNext} className="bg-g15-primary hover:bg-g15-primary/90">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const BudgetCategories: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, setData, data }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    data.categories || []
  );
  
  const categories = [
    { id: "housing", name: "Housing" },
    { id: "transportation", name: "Transportation" },
    { id: "food", name: "Food & Groceries" },
    { id: "utilities", name: "Utilities" },
    { id: "insurance", name: "Insurance" },
    { id: "healthcare", name: "Healthcare" },
    { id: "debt", name: "Debt Payments" },
    { id: "savings", name: "Savings" },
    { id: "entertainment", name: "Entertainment" },
    { id: "personal", name: "Personal Spending" },
    { id: "education", name: "Education" },
    { id: "travel", name: "Travel" },
    { id: "other", name: "Other" }
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
      toast.error("Please select at least one category");
      return;
    }
    
    setData({ ...data, categories: selectedCategories });
    onNext();
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Select Your Budget Categories
      </h2>
      <p className="text-gray-600">
        Choose the categories that are relevant to your monthly expenses.
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
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const IncomeSetup: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext, setData, data }) => {
  const [income, setIncome] = useState({
    amount: data.income?.amount || "",
    frequency: data.income?.frequency || "monthly"
  });
  
  const frequencies = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annually", label: "Annually" }
  ];
  
  const handleChange = (field: string, value: string) => {
    setIncome({ ...income, [field]: value });
  };
  
  const handleNext = () => {
    if (!income.amount) {
      toast.error("Please enter your income amount");
      return;
    }
    
    setData({ ...data, income });
    onNext();
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        What's your income?
      </h2>
      <p className="text-gray-600">
        This helps us create a realistic budget based on your earnings.
      </p>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="income-amount">Income Amount</Label>
          <Input
            id="income-amount"
            value={income.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            placeholder="e.g., 5000"
            type="number"
            className="g15-input"
          />
        </div>
        
        <div>
          <Label htmlFor="income-frequency">Income Frequency</Label>
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
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const AllDone: React.FC<{ onNext: () => void; setData: (data: any) => void; data: any }> = ({ onNext }) => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 rounded-full bg-g15-secondary/20 flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-g15-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900">
        You're all set!
      </h2>
      <p className="text-gray-600">
        Your financial dashboard is ready. Let's start your journey to financial freedom!
      </p>
      
      <Button 
        onClick={() => navigate("/dashboard")}
        className="bg-g15-primary hover:bg-g15-primary/90 px-6"
      >
        Go to Dashboard
      </Button>
    </div>
  );
};

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<any>({});
  
  const steps: OnboardingStep[] = [
    {
      title: "Welcome",
      description: "Let's get started with G15",
      component: Welcome
    },
    {
      title: "Financial Goals",
      description: "Set your financial goals",
      component: FinancialGoals
    },
    {
      title: "Budget Categories",
      description: "Choose your budget categories",
      component: BudgetCategories
    },
    {
      title: "Income Setup",
      description: "Set up your income",
      component: IncomeSetup
    },
    {
      title: "All Done",
      description: "You're all set up",
      component: AllDone
    }
  ];
  
  const handleNext = () => {
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };
  
  const updateData = (data: any) => {
    setOnboardingData({ ...onboardingData, ...data });
    console.log("Onboarding data updated:", { ...onboardingData, ...data });
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
                  Step {currentStep + 1} of {steps.length}
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
