import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FoodLog {
  id: string;
  user_id: string;
  food_name: string;
  portion_size: number | null;
  portion_unit: string | null;
  estimated_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_type: string | null;
  logged_at: string;
  notes: string | null;
  image_url: string | null;
  created_at: string;
}

export function useFoodLogs() {
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFoodLogs();
  }, []);

  const fetchFoodLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .order("logged_at", { ascending: false });

      if (error) throw error;
      setFoodLogs(data || []);
    } catch (error) {
      console.error("Error fetching food logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const addFoodLog = async (log: Omit<FoodLog, "id" | "user_id" | "created_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("food_logs")
      .insert({ ...log, user_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setFoodLogs((prev) => [data, ...prev]);
    }

    return { data, error };
  };

  const deleteFoodLog = async (id: string) => {
    const { error } = await supabase
      .from("food_logs")
      .delete()
      .eq("id", id);

    if (!error) {
      setFoodLogs((prev) => prev.filter((log) => log.id !== id));
    }

    return { error };
  };

  return { foodLogs, loading, addFoodLog, deleteFoodLog, refetch: fetchFoodLogs };
}
