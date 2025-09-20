import { supabase } from "@/lib/supabase";
import * as BackgroundFetch from "expo-background-fetch";
import * as Pedometer from "expo-sensors/build/Pedometer";
import * as TaskManager from "expo-task-manager";

const STEP_COUNT_TASK = "background-step-counter";
let lastStepCount = 0;

TaskManager.defineTask(STEP_COUNT_TASK, async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get step count for today
    const { steps } = await Pedometer.getStepCountAsync(today, new Date());

    // Only update if steps have changed
    if (steps !== lastStepCount) {
      lastStepCount = steps;

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update steps in the database
      await supabase.from("health_metrics").upsert(
        {
          user_id: user.id,
          steps_today: steps,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Error in step counter task:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background task
const registerBackgroundStepCounter = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(STEP_COUNT_TASK, {
      minimumInterval: 300, // 5 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Background step counter registered");
  } catch (error) {
    console.error("Error registering background task:", error);
  }
};

// Initialize the step counter
export const initStepCounter = async () => {
  const isAvailable = await Pedometer.isAvailableAsync();
  if (!isAvailable) {
    console.warn("Pedometer is not available on this device");
    return false;
  }

  // Check if task is already registered
  const isRegistered = await TaskManager.isTaskRegisteredAsync(STEP_COUNT_TASK);
  if (!isRegistered) {
    await registerBackgroundStepCounter();
  }

  return true;
};

// Get current step count
export const getCurrentStepCount = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { steps } = await Pedometer.getStepCountAsync(today, new Date());
    return steps;
  } catch (error) {
    console.log("Error getting step count:", error);
    return 0;
  }
};
