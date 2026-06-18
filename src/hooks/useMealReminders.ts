import { useEffect, useRef, useCallback } from "react";
import { useNotifications } from "./useNotifications";
import { supabase } from "@/integrations/supabase/client";

interface MealTime {
  meal: string;
  hour: number;
  minute: number;
}

const DEFAULT_MEAL_TIMES: MealTime[] = [
  { meal: "Breakfast", hour: 8, minute: 0 },
  { meal: "Lunch", hour: 12, minute: 30 },
  { meal: "Dinner", hour: 19, minute: 0 },
];

export function useMealReminders(enabled: boolean = true) {
  const { createNotification } = useNotifications();
  const lastReminderRef = useRef<string>("");
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkMealTime = useCallback(async () => {
    if (!enabled) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (const mealTime of DEFAULT_MEAL_TIMES) {
      // Check if we're within 5 minutes of meal time
      const mealMinutes = mealTime.hour * 60 + mealTime.minute;
      const currentMinutes = currentHour * 60 + currentMinute;
      const diff = mealMinutes - currentMinutes;

      // Remind 15 minutes before meal time
      if (diff >= 0 && diff <= 15) {
        const reminderKey = `${mealTime.meal}-${now.toDateString()}`;
        
        if (lastReminderRef.current !== reminderKey) {
          lastReminderRef.current = reminderKey;
          
          await createNotification(
            "meal_reminder",
            `Time for ${mealTime.meal}!`,
            `It's almost ${mealTime.meal.toLowerCase()} time. Don't forget to log your meal and use the smart bowl for accurate portions.`,
            { meal: mealTime.meal, scheduledTime: `${mealTime.hour}:${mealTime.minute.toString().padStart(2, "0")}` }
          );
        }
      }
    }
  }, [enabled, createNotification]);

  useEffect(() => {
    if (!enabled) return;

    // Check immediately
    checkMealTime();

    // Check every minute
    checkIntervalRef.current = setInterval(checkMealTime, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, checkMealTime]);

  return { checkMealTime };
}
