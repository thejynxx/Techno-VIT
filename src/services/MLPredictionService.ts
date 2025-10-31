// src/services/MLPredictionService.ts

import { FoodSurplus } from '../models/FoodSurplus';

// --- CRITICAL: Use the IP Address provided by your terminal output ---
// NOTE: http://10.121.50.47 is the IP found in your terminal output.
const SURPLUS_API_BASE_URL = 'http://10.121.50.47:8082/predict_surplus';
const SPOILAGE_API_BASE_URL = 'http://10.121.50.47:8083/predict_spoilage';

// -------------------------------------------------------------------------
// INTERFACES (Must match Python Model Feature Lists EXACTLY)
// -------------------------------------------------------------------------

/**
 * Interface for the data required by the Surplus Prediction API (GBR)
 * Features: 13
 */
export interface SurplusInput {
    day_of_wk: string;
    month: number;
    meal_type: string;
    price_type_special_weather: string;
    is_holiday: boolean;
    food_id: string; // F001, F019, etc.
    veg_nonveg: string;
    cuisine: string;
    estimated_prep_time_hours: number;
    staff_on_duty: number;
    peak_hour_demand_ratio: number;
    is_seasonal_dish: boolean;
    actual_kg_planned: number; // The planned quantity in kg
}

/**
 * Interface for the data required by the Spoilage Prediction API (SVR)
 * Features: 4
 */
export interface SpoilageInput {
    Time_Since_Prep_Hours: number;
    Storage_Info: string; // 'Room Temp' or 'Refrigerated'
    Food_Type: string; // Dish Name
    Meal_Time: string;
}

/**
 * Combined result structure for the UI
 */
export interface PredictionResult {
    predictedSurplusKg: number;
    predictedSafeHours: number;
}

// -------------------------------------------------------------------------
// CORE API CALL FUNCTION
// -------------------------------------------------------------------------

/**
 * Fetches both Surplus (Waste) and Spoilage (Safe Time) predictions in parallel.
 * @param surplusData - The 13 features for the Surplus Model.
 * @param spoilageData - The 4 features for the Spoilage Model.
 * @returns PredictionResult or null on failure.
 */
export async function getMLPredictions(surplusData: SurplusInput, spoilageData: SpoilageInput): Promise<PredictionResult | null> {
    try {
        // 1. Prepare and send the requests concurrently
        const surplusRequest = fetch(SURPLUS_API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(surplusData),
        });

        const spoilageRequest = fetch(SPOILAGE_API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(spoilageData),
        });

        const [surplusResponse, spoilageResponse] = await Promise.all([surplusRequest, spoilageRequest]);

        // 2. Error Handling
        if (!surplusResponse.ok) {
            console.error('Surplus API Error:', surplusResponse.status, await surplusResponse.text());
            throw new Error(`Failed to get Surplus prediction. Status: ${surplusResponse.status}`);
        }
        if (!spoilageResponse.ok) {
            console.error('Spoilage API Error:', spoilageResponse.status, await spoilageResponse.text());
            throw new Error(`Failed to get Spoilage prediction. Status: ${spoilageResponse.status}`);
        }

        // 3. Parse and return the combined result
        const surplusResult = await surplusResponse.json();
        const spoilageResult = await spoilageResponse.json();
        
        return {
            predictedSurplusKg: parseFloat(surplusResult.predicted_kg_surplus),
            predictedSafeHours: parseFloat(spoilageResult.predicted_remaining_safe_hours),
        };

    } catch (error) {
        console.error('ML Prediction Integration Failed:', error);
        return null;
    }
}