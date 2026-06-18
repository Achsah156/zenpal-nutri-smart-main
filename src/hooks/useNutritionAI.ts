import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FoodLog {
  food_name: string;
  estimated_calories: number;
  logged_at: string;
  meal_type: string;
}

interface CalorieEstimation {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
}

interface TrendForecast {
  trend: "increasing" | "decreasing" | "stable";
  average_daily_calories: number;
  forecast_next_week: number;
  insights: string[];
  confidence: number;
}

interface AnomalyDetection {
  anomalies_detected: boolean;
  anomalies: Array<{ date: string; type: string; description: string }>;
  severity: "low" | "medium" | "high";
  recommendations: string[];
}

interface Recommendation {
  recommendations: Array<{ meal_type: string; suggestion: string; portion_adjustment: string }>;
  daily_calorie_target: number;
  protein_target_g: number;
}

export function useNutritionAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimateCalories = async (foodName: string, portionSize: number, portionUnit: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-nutrition", {
        body: { type: "calorie_estimation", foodName, portionSize, portionUnit },
      });

      if (fnError) throw fnError;
      return data.result as CalorieEstimation;
    } catch (err: any) {
      setError(err.message || "Failed to estimate calories");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const forecastTrends = async (foodLogs: FoodLog[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-nutrition", {
        body: { type: "trend_forecast", foodLogs },
      });

      if (fnError) throw fnError;
      return data.result as TrendForecast;
    } catch (err: any) {
      setError(err.message || "Failed to forecast trends");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const detectAnomalies = async (foodLogs: FoodLog[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-nutrition", {
        body: { type: "anomaly_detection", foodLogs },
      });

      if (fnError) throw fnError;
      return data.result as AnomalyDetection;
    } catch (err: any) {
      setError(err.message || "Failed to detect anomalies");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = async (foodLogs: FoodLog[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-nutrition", {
        body: { type: "recommendation", foodLogs },
      });

      if (fnError) throw fnError;
      return data.result as Recommendation;
    } catch (err: any) {
      setError(err.message || "Failed to get recommendations");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    estimateCalories,
    forecastTrends,
    detectAnomalies,
    getRecommendations,
  };
}
