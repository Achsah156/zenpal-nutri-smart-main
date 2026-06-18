import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPreferences } from "./useUserPreferences";

export interface MealItem {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
  instructions?: string;
}

export interface DayMeals {
  breakfast?: MealItem;
  lunch?: MealItem;
  dinner?: MealItem;
  snacks?: MealItem[];
}

export interface WeeklyMealPlan {
  id?: string;
  week_start: string;
  meals: Record<string, DayMeals>;
  calorie_target?: number;
}

export function useMealPlans() {
  const [mealPlans, setMealPlans] = useState<WeeklyMealPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<WeeklyMealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMealPlans();
  }, []);

  const fetchMealPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false });

      if (error) throw error;
      
      const plans = (data || []).map(plan => ({
        id: plan.id,
        week_start: plan.week_start,
        meals: plan.meals as Record<string, DayMeals>,
        calorie_target: plan.calorie_target,
      }));
      
      setMealPlans(plans);
      if (plans.length > 0) {
        setCurrentPlan(plans[0]);
      }
    } catch (err: any) {
      console.error("Error fetching meal plans:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateMealPlan = async (preferences: UserPreferences) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-nutrition", {
        body: { 
          type: "meal_plan", 
          preferences: {
            dietary_restrictions: preferences.dietary_restrictions,
            cuisine_preferences: preferences.cuisine_preferences,
            calorie_goal: preferences.calorie_goal,
            protein_goal: preferences.protein_goal,
            allergies: preferences.allergies,
            meal_count: preferences.meal_count,
          }
        },
      });

      if (error) throw error;
      
      const result = data.result;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get next Monday as week start
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      const weekStart = nextMonday.toISOString().split("T")[0];

      const preferencesJson = JSON.parse(JSON.stringify(preferences));
      const { data: savedPlan, error: saveError } = await supabase
        .from("meal_plans")
        .insert([{
          user_id: user.id,
          week_start: weekStart,
          meals: result.meals,
          calorie_target: preferences.calorie_goal,
          preferences: preferencesJson,
        }])
        .select()
        .single();

      if (saveError) throw saveError;

      const newPlan: WeeklyMealPlan = {
        id: savedPlan.id,
        week_start: savedPlan.week_start,
        meals: savedPlan.meals as Record<string, DayMeals>,
        calorie_target: savedPlan.calorie_target,
      };

      setMealPlans(prev => [newPlan, ...prev]);
      setCurrentPlan(newPlan);
      toast({ title: "Meal plan generated!" });
      
      return newPlan;
    } catch (err: any) {
      toast({ title: "Error generating meal plan", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const deleteMealPlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from("meal_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      setMealPlans(prev => prev.filter(p => p.id !== planId));
      if (currentPlan?.id === planId) {
        setCurrentPlan(mealPlans.find(p => p.id !== planId) || null);
      }
      toast({ title: "Meal plan deleted" });
    } catch (err: any) {
      toast({ title: "Error deleting meal plan", description: err.message, variant: "destructive" });
    }
  };

  return { 
    mealPlans, 
    currentPlan, 
    setCurrentPlan, 
    loading, 
    generating, 
    generateMealPlan, 
    deleteMealPlan,
    refetch: fetchMealPlans 
  };
}
