import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
// Using a placeholder for icons since the original code didn't import an icon library
const Icon = ({ name, style }: { name: string, style?: any }) => <Text style={[{ marginRight: 8, fontSize: 18, color: '#333' }, style]}>{name}</Text>;

// NOTE: Assuming your firebase imports are correctly configured:
import AuthService from '../services/AuthService';
import FoodSurplusService, { CreateFoodSurplusData } from '../services/FoodSurplusService';

// 💡 REMOVED IMPORTS: getMLPredictions, SurplusInput, SpoilageInput (These are no longer needed)
// We keep PredictionResult for the local state typing
import { PredictionResult } from '../services/MLPredictionService'; 
import { User } from '../models/User';


// =========================================================================
// ML LOOKUP DATA (CRITICAL FOR AUTO-FILLING STATIC FEATURES) - UNCHANGED
// =========================================================================
interface DishFeature { dish_name: string; food_id: string; veg_nonveg: string; cuisine: string; is_seasonal_dish: boolean; estimated_prep_time_hours: number; }

const DISH_LOOKUP_BY_ID: { [key: string]: DishFeature } = {
  // --- 78 UNIQUE DISH ENTRIES FROM Canteen Daily Log --- (Contracted for brevity)
  "F009": { "dish_name": "Curd Rice", "food_id": "F009", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.95 },
  "F017": { "dish_name": "Prawn Fry", "food_id": "F017", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.62 },
  "F019": { "dish_name": "Chicken Biryani (South Style)", "food_id": "F019", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.50 },
  "F039": { "dish_name": "Keema Matar", "food_id": "F039", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.72 },
  "F026": { "dish_name": "Aloo Gobi", "food_id": "F026", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.31 },
  "F000": { "dish_name": "Plain Rice", "food_id": "F000", "veg_nonveg": "Veg", "cuisine": "Neutral", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.31 },
  "F038": { "dish_name": "Mutton Biryani (North Style)", "food_id": "F038", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.5 },
  "F027": { "dish_name": "Rajma Chawal", "food_id": "F027", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.2 },
  "F031": { "dish_name": "Tandoori Roti (2 pcs)", "food_id": "F031", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.29 },
  "F040": { "dish_name": "Mixed Veg Curry", "food_id": "F040", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.20 },
  "F041": { "dish_name": "Chicken 65", "food_id": "F041", "veg_nonveg": "Non-Veg", "cuisine": "Indo-Chinese", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.40 },
  "F042": { "dish_name": "Chapati (4 pcs)", "food_id": "F042", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.35 },
  "F043": { "dish_name": "Veg Fried Rice", "food_id": "F043", "veg_nonveg": "Veg", "cuisine": "Indo-Chinese", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.80 },
  "F044": { "dish_name": "Pongal", "food_id": "F044", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.00 },
  "F045": { "dish_name": "Fish Curry (Seer)", "food_id": "F045", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.30 },
  "F046": { "dish_name": "Dal Tadka", "food_id": "F046", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.70 },
  "F047": { "dish_name": "Gulab Jamun (2 pcs)", "food_id": "F047", "veg_nonveg": "Veg", "cuisine": "Dessert", "is_seasonal_dish": true, "estimated_prep_time_hours": 0.10 },
  "F048": { "dish_name": "Lemon Rice", "food_id": "F048", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.90 },
  "F049": { "dish_name": "Idli (2 pcs)", "food_id": "F049", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.75 },
  "F050": { "dish_name": "Vada (2 pcs)", "food_id": "F050", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.50 },
  "F051": { "dish_name": "Sambar", "food_id": "F051", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.10 },
  "F052": { "dish_name": "Rasam", "food_id": "F052", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.65 },
  "F053": { "dish_name": "Parotta (2 pcs)", "food_id": "F053", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.45 },
  "F054": { "dish_name": "Chicken Chettinad", "food_id": "F054", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.80 },
  "F055": { "dish_name": "Egg Curry", "food_id": "F055", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.05 },
  "F056": { "dish_name": "Filter Coffee", "food_id": "F056", "veg_nonveg": "Veg", "cuisine": "Beverage", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.15 },
  "F057": { "dish_name": "Vegetable Biryani (South Style)", "food_id": "F057", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.15 },
  "F058": { "dish_name": "Avial", "food_id": "F058", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.40 },
  "F001": { "dish_name": "Masala Dosa", "food_id": "F001", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.15 },
  "F002": { "dish_name": "Poori (3 pcs)", "food_id": "F002", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.85 },
  "F003": { "dish_name": "Chicken Curry", "food_id": "F003", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.65 },
  "F004": { "dish_name": "Upma", "food_id": "F004", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.65 },
  "F005": { "dish_name": "Tomato Rice", "food_id": "F005", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.75 },
  "F006": { "dish_name": "Chole Bhature", "food_id": "F006", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.45 },
  "F007": { "dish_name": "Vangi Bath", "food_id": "F007", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.90 },
  "F008": { "dish_name": "Egg Dosa", "food_id": "F008", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.05 },
  "F010": { "dish_name": "Sambar Rice", "food_id": "F010", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.00 },
  "F011": { "dish_name": "Veg Korma", "food_id": "F011", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.15 },
  "F012": { "dish_name": "Rajma", "food_id": "F012", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.35 },
  "F013": { "dish_name": "Chicken Fry", "food_id": "F013", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.70 },
  "F014": { "dish_name": "Paneer Butter Masala", "food_id": "F014", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.60 },
  "F015": { "dish_name": "Meen Varuval (Fish Fry)", "food_id": "F015", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.85 },
  "F016": { "dish_name": "Meen Kuzhambu (Fish Curry)", "food_id": "F016", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.50 },
  "F018": { "dish_name": "Mutton Sukka", "food_id": "F018", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.25 },
  "F020": { "dish_name": "Chicken Curry (South Style)", "food_id": "F020", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.40 },
  "F021": { "dish_name": "Mushroom Biryani", "food_id": "F021", "veg_nonveg": "Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.05 },
  "F022": { "dish_name": "Palak Paneer", "food_id": "F022", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.55 },
  "F023": { "dish_name": "Gobi Manchurian", "food_id": "F023", "veg_nonveg": "Veg", "cuisine": "Indo-Chinese", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.60 },
  "F024": { "dish_name": "Chicken Manchurian", "food_id": "F024", "veg_nonveg": "Non-Veg", "cuisine": "Indo-Chinese", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.75 },
  "F025": { "dish_name": "Tawa Roti (2 pcs)", "food_id": "F025", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.20 },
  "F028": { "dish_name": "Dal Makhani", "food_id": "F028", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.85 },
  "F029": { "dish_name": "Shahi Paneer", "food_id": "F029", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.70 },
  "F030": { "dish_name": "Mix Vegetable", "food_id": "F030", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.25 },
  "F032": { "dish_name": "Mutton Rogan Josh", "food_id": "F032", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.95 },
  "F033": { "dish_name": "Chana Masala", "food_id": "F033", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.30 },
  "F034": { "dish_name": "Rice Kheer", "food_id": "F034", "veg_nonveg": "Veg", "cuisine": "Dessert", "is_seasonal_dish": true, "estimated_prep_time_hours": 0.40 },
  "F035": { "dish_name": "Chicken Tikka Masala", "food_id": "F035", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.75 },
  "F036": { "dish_name": "Tandoori Chicken (Half)", "food_id": "F036", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.90 },
  "F037": { "dish_name": "Veg Pulav", "food_id": "F037", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 1.05 },
  "F059": { "dish_name": "Chicken Biryani (North Style)", "food_id": "F059", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.45 },
  "F060": { "dish_name": "Fish Fry", "food_id": "F060", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": true, "estimated_prep_time_hours": 0.80 },
  "F061": { "dish_name": "Mutton Biryani (South Style)", "food_id": "F061", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.60 },
  "F062": { "dish_name": "Veg Noodles", "food_id": "F062", "veg_nonveg": "Veg", "cuisine": "Indo-Chinese", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.70 },
  "F063": { "dish_name": "Egg Noodles", "food_id": "F063", "veg_nonveg": "Non-Veg", "cuisine": "Indo-Chinese", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.80 },
  "F064": { "dish_name": "Milk (200ml)", "food_id": "F064", "veg_nonveg": "Veg", "cuisine": "Beverage", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.05 },
  "F065": { "dish_name": "Aam Ras", "food_id": "F065", "veg_nonveg": "Veg", "cuisine": "Dessert", "is_seasonal_dish": true, "estimated_prep_time_hours": 0.15 },
  "F066": { "dish_name": "Tea", "food_id": "F066", "veg_nonveg": "Veg", "cuisine": "Beverage", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.10 },
  "F067": { "dish_name": "Jeera Rice", "food_id": "F067", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.95 },
  "F068": { "dish_name": "Mushroom Curry", "food_id": "F068", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.45 },
  "F069": { "dish_name": "Kofta Curry", "food_id": "F069", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.60 },
  "F070": { "dish_name": "Chicken Do Pyaza", "food_id": "F070", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.80 },
  "F071": { "dish_name": "Mutton Pepper Fry", "food_id": "F071", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.35 },
  "F072": { "dish_name": "Puri Bhaji", "food_id": "F072", "veg_nonveg": "Veg", "cuisine": "North Indian", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.05 },
  "F073": { "dish_name": "Vegetable Cutlet", "food_id": "F073", "veg_nonveg": "Veg", "cuisine": "Snack", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.35 },
  "F074": { "dish_name": "Samosa (2 pcs)", "food_id": "F074", "veg_nonveg": "Veg", "cuisine": "Snack", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.25 },
  "F075": { "dish_name": "Ice Cream", "food_id": "F075", "veg_nonveg": "Veg", "cuisine": "Dessert", "is_seasonal_dish": true, "estimated_prep_time_hours": 0.05 },
  "F076": { "dish_name": "Mango Lassi", "food_id": "F076", "veg_nonveg": "Veg", "cuisine": "Beverage", "is_seasonal_dish": true, "estimated_prep_time_hours": 0.10 },
  "F077": { "dish_name": "Masala Tea", "food_id": "F077", "veg_nonveg": "Veg", "cuisine": "Beverage", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.12 },
  "F078": { "dish_name": "Chicken Roll", "food_id": "F078", "veg_nonveg": "Non-Veg", "cuisine": "Snack", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.55 },
  "F079": { "dish_name": "Veg Roll", "food_id": "F079", "veg_nonveg": "Veg", "cuisine": "Snack", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.45 },
  "F080": { "dish_name": "Biryani Rice", "food_id": "F080", "veg_nonveg": "Veg", "cuisine": "Neutral", "is_seasonal_dish": false, "estimated_prep_time_hours": 0.60 },

  // Fallback
  "F999": { "dish_name": "Unknown Dish", "food_id": "F999", "veg_nonveg": "Veg", "cuisine": "Neutral", "is_seasonal_dish": false, "estimated_prep_time_hours": 1.0 }
};
const DISH_LIST = Object.values(DISH_LOOKUP_BY_ID).filter(d => d.food_id !== 'F999');

const getDishFeaturesById = (id: string): DishFeature => {
  return DISH_LOOKUP_BY_ID[id.toUpperCase()] || DISH_LOOKUP_BY_ID["F999"];
};


// =========================================================================
// SURPLUS SCREEN COMPONENT (Simplified ML)
// =========================================================================

const SurplusScreen: React.FC = () => {
  const [suggestions, setSuggestions] = useState<DishFeature[]>([]);
  const [foodName, setFoodName] = useState(''); 
  const [foodId, setFoodId] = useState(''); 
  const [vegNonveg, setVegNonveg] = useState('N/A'); 
  const [cuisine, setCuisine] = useState('N/A'); 
  const [prepTime, setPrepTime] = useState('0.0'); 
  const [isSeasonal, setIsSeasonal] = useState(false);

  const [quantity, setQuantity] = useState(''); // Planned Quantity
  const [unit] = useState('kg');
  const [category] = useState<'vegetarian' | 'non-vegetarian' | 'vegan' | 'beverages' | 'snacks' | 'desserts'>('non-vegetarian');
  const [pickupLocation, setPickupLocation] = useState('Canteen Main Gate');
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Spoilage Model states
  const [timeSincePrep, setTimeSincePrep] = useState('1.0');
  const [storageInfo, setStorageInfo] = useState('Room Temp');
  const [predictedData, setPredictedData] = useState<PredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [submitting, setSubmitting] = useState(false);


  // --- Search/Filter Logic (Unchanged) ---
  useEffect(() => {
    if (foodName.length > 2 && foodId === '') {
      const filtered = DISH_LIST.filter(dish =>
        dish.dish_name.toLowerCase().includes(foodName.toLowerCase())
      ).slice(0, 5); 
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
    setPredictedData(null); 
  }, [foodName, foodId]);


  // --- Selection Handler (Unchanged) ---
  const handleSelectDish = (dish: DishFeature) => {
    setFoodName(dish.dish_name);
    setFoodId(dish.food_id);
    setVegNonveg(dish.veg_nonveg);
    setCuisine(dish.cuisine);
    setPrepTime(String(dish.estimated_prep_time_hours));
    setIsSeasonal(dish.is_seasonal_dish);
    setSuggestions([]);
  };
  
  // --- Function to Call ML APIs (NOW HARDCODED) ---
  const handleRunPrediction = async () => {
    // 1. INPUT VALIDATION 
    if (!foodName || foodId === 'F999' || foodId === '' || !quantity || !timeSincePrep || !storageInfo || !pickupLocation) {
        Alert.alert('Missing Data', 'Please select a valid Food Name (using the search) and fill in Quantity, Time Since Prep, and Storage Condition.');
        return;
    }

    setPredicting(true);
    setPredictedData(null); 
    
    const plannedKg = parseFloat(quantity);
    const t_since_prep = parseFloat(timeSincePrep);

    if (isNaN(plannedKg) || plannedKg <= 0 || isNaN(t_since_prep) || t_since_prep < 0) {
        Alert.alert('Invalid Input', 'Quantity must be > 0. Time Since Prep must be a valid number >= 0.');
        setPredicting(false);
        return;
    }

    // 2. HARDCODED PREDICTION LOGIC 💡
    
    // a. Surplus Prediction (Hardcoded to 20% of planned quantity)
    const surplusRate = 0.20; // Example: Assume 20% surplus
    const predictedSurplusKg = plannedKg * surplusRate;

    // b. Spoilage Prediction (Hardcoded safety rules)
    let maxSafeHours = 0;
    if (storageInfo === 'Room Temp') {
        maxSafeHours = 4.0; // Standard food safety rule (Danger Zone)
    } else if (storageInfo === 'Refrigerated') {
        // NOTE: This is a vastly simplified rule for POC/demo only. 
        // Real refrigeration time depends heavily on the dish/ingredients.
        maxSafeHours = 48.0; 
    }

    let predictedSafeHours = Math.max(0, maxSafeHours - t_since_prep);
    
    // Create the dummy result object
    const result: PredictionResult = {
        predictedSurplusKg: predictedSurplusKg,
        predictedSafeHours: parseFloat(predictedSafeHours.toFixed(2)),
    };
    
    // 3. SET RESULTS & NOTIFY USER
    setPredicting(false);

    if (result) {
        setPredictedData(result);
        if (result.predictedSafeHours === 0) {
            Alert.alert('⚠️ SAFETY ALERT', 'The food is past the safety limit and CANNOT be listed for donation. Please dispose of the food appropriately.');
        } else {
             // Gentle confirmation for successful prediction
        }
    } else {
         // This case shouldn't be reached with hardcoded logic, but kept for robust typing
         Alert.alert('Internal Error', 'Failed to generate prediction.');
    }
  };


  // --- Function to List Surplus (Logic uses the hardcoded predictedData) ---
  const handleListSurplus = async () => {
    if (!predictedData) {
        Alert.alert('Prediction Required', 'Please tap "Run ML Forecast" first to determine safe quantity and expiry time.');
        return;
    }
    if (predictedData.predictedSafeHours <= 0) { // Changed to <= 0 for safety
        Alert.alert('Cannot List', 'Safety lock triggered: Food is past the safe limit.');
        return;
    }

    setSubmitting(true);
    let downloadUrl: string | undefined = undefined; 

    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.userType !== 'canteen' || !currentUser.canteenName) {
        throw new Error("User must be a Canteen and logged in.");
      }
      
      if (!foodName || foodId === 'F999' || !quantity || !pickupLocation) {
        throw new Error("Missing required form fields or invalid food selected.");
      }
      
      const predictedExpiryTime = new Date(Date.now() + predictedData.predictedSafeHours * 3600000); 
      
      const finalSurplusData: CreateFoodSurplusData = {
          canteenId: currentUser.id,
          canteenName: currentUser.canteenName,
          foodName: foodName,
          category: category, 
          unit: unit,
          quantity: predictedData.predictedSurplusKg, // **HARDCODED-PREDICTED QUANTITY**
          expiryTime: predictedExpiryTime,             // **HARDCODED-PREDICTED EXPIRY TIME**
          pickupLocation: pickupLocation,
          additionalInfo: additionalInfo,
          imageUrl: downloadUrl, 
      };

      await FoodSurplusService.getInstance().createFoodSurplus(finalSurplusData);

      Alert.alert('Success 🎉', `Food surplus listed! You saved: ${predictedData.predictedSurplusKg.toFixed(2)} ${unit} from becoming waste.`);
      // Clear form
      setFoodName(''); setFoodId(''); setQuantity(''); setPredictedData(null); 
      setVegNonveg('N/A'); setCuisine('N/A'); setPrepTime('0.0'); 
      setPickupLocation('Canteen Main Gate'); setAdditionalInfo(''); setTimeSincePrep('1.0'); 
      setStorageInfo('Room Temp');

    } catch (error: any) {
      console.error("Listing Surplus failed:", error);
      Alert.alert('Error', error.message || 'Failed to list surplus. Check network and login status.');
    } finally {
      setSubmitting(false);
    }
  };


  // =========================================================================
  // RENDER SECTION (UI is unchanged from the previous excellent revision)
  // =========================================================================

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>List Food Surplus</Text>
      <Text style={styles.subheader}>Powered by ** Safety Rules** for reliable quantity and expiry time.</Text>

      {/* --- STEP 1: Food Selection & Initial Inputs --- */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>1. Food Identification</Text>
        
        {/* Dish Name Input (Search) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}><Icon name="🔍" /> Dish Name</Text>
          <TextInput 
            value={foodName} 
            onChangeText={(text) => { setFoodName(text); setFoodId(''); }} 
            style={styles.input} 
            placeholder="Search for dish name (e.g., 'Chicken Biryani')"
          />
          {foodId !== '' && <Text style={styles.successMessage}>**{foodName}** selected. ID: {foodId}</Text>}
        </View>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map(dish => (
              <TouchableOpacity 
                key={dish.food_id}
                style={styles.suggestionItem}
                onPress={() => handleSelectDish(dish)}
              >
                <Text style={styles.suggestionText} numberOfLines={1}>{dish.dish_name}</Text>
                <Text style={styles.suggestionDetail}>{dish.veg_nonveg} - {dish.cuisine}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Planned Quantity Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}><Icon name="⚖️" /> Planned Quantity (Total Prepared)</Text>
          <View style={styles.inputRow}>
            <TextInput 
              value={quantity} 
              onChangeText={setQuantity} 
              keyboardType="numeric" 
              style={[styles.input, { flex: 1, paddingRight: 50 }]} 
              placeholder="e.g., 30"
            />
            <Text style={styles.unitTextLabel}>{unit}</Text>
          </View>
        </View>
      </View>

      {/* --- STEP 2: ML-Critical Spoilage Inputs & Auto-Filled Info --- */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>2. Safety & Time Input</Text>

        {/* Spoilage Inputs */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}><Icon name="⏳" /> Time Since Preparation (Hours)</Text>
          <TextInput 
            value={timeSincePrep} 
            onChangeText={setTimeSincePrep} 
            keyboardType="numeric" 
            style={styles.input} 
            placeholder="e.g., 1.5"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}><Icon name="❄️" /> Current Storage Condition</Text>
          <View style={styles.storageRow}>
            {['Room Temp', 'Refrigerated'].map(info => (
              <TouchableOpacity 
                key={info}
                onPress={() => setStorageInfo(info)}
                style={[
                  styles.storageButton, 
                  storageInfo === info && styles.storageButtonActive
                ]}
              >
                <Text style={storageInfo === info ? styles.storageButtonTextActive : styles.storageButtonText}>{info}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Auto-Filled Static Features */}
        <View style={styles.detailsBox}>
          <Text style={styles.detailTitle}><Icon name="📜" style={{color: '#1a75ff'}}/> Dish Feature Reference</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailItem}><Text style={{fontWeight: 'bold'}}>Type:</Text> {vegNonveg}</Text>
            <Text style={styles.detailItem}><Text style={{fontWeight: 'bold'}}>Cuisine:</Text> {cuisine}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailItem}><Text style={{fontWeight: 'bold'}}>Prep Time:</Text> {prepTime} hrs</Text>
            <Text style={styles.detailItem}><Text style={{fontWeight: 'bold'}}>Seasonal:</Text> {isSeasonal ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </View>
      
      {/* --- STEP 3: Hardcoded Forecast and Results --- */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>3. Safety Forecast</Text>
        
        {/* Prediction Button */}
        <TouchableOpacity 
          style={[styles.button, styles.predictButton]} 
          onPress={handleRunPrediction} 
          disabled={predicting || foodId === ''}
        >
          {predicting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}><Icon name="🧮" style={styles.buttonText}/> Run Safety Rules</Text>
          )}
        </TouchableOpacity>

        {/* ML Prediction Output Box */}
        {predictedData && (
          <View style={[styles.predictionBox, predictedData.predictedSafeHours <= 0 && styles.spoiledBox]}>
            <Text style={[styles.predictionTitle, predictedData.predictedSafeHours <= 0 && styles.spoiledTitle]}>
              {predictedData.predictedSafeHours <= 0 ? '🚫 SAFETY LOCK: DO NOT DONATE' : '✅ Forecast Complete & Safe'}
            </Text>
            <View style={styles.predictionDetailRow}>
              <Text style={styles.predictionLabel}>Optimized Quantity for Donation (20%):</Text>
              <Text style={styles.predictionValue}>**{predictedData.predictedSurplusKg.toFixed(2)} {unit}**</Text>
            </View>
            <View style={styles.predictionDetailRow}>
              <Text style={styles.predictionLabel}>Remaining Safe Time:</Text>
              <Text style={styles.predictionValue}>**{predictedData.predictedSafeHours.toFixed(2)} hours**</Text>
            </View>
          </View>
        )}
      </View>
      
      {/* --- STEP 4: Final Donation Details --- */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>4. Final Donation Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}><Icon name="📍" /> Pickup Location</Text>
          <TextInput value={pickupLocation} onChangeText={setPickupLocation} style={styles.input} placeholder="e.g., Canteen Main Entrance" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}><Icon name="📝" /> Additional Info</Text>
          <TextInput 
            value={additionalInfo} 
            onChangeText={setAdditionalInfo} 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            multiline 
            placeholder="Special instructions, ingredients to note, etc." 
          />
        </View>
      </View>
      
      {/* List Button */}
      <TouchableOpacity 
        style={[styles.button, styles.listButton, (submitting || !predictedData || predictedData.predictedSafeHours <= 0) && styles.disabledButton]} 
        onPress={handleListSurplus} 
        disabled={submitting || !predictedData || predictedData.predictedSafeHours <= 0} 
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}><Icon name="🌟" style={styles.buttonText}/> Confirm & List Surplus</Text>
        )}
      </TouchableOpacity>
      <View style={{height: 50}} />
      
    </ScrollView>
  );
};

// =========================================================================
// STYLES (Unchanged from the excellent previous revision)
// =========================================================================
const PRIMARY_COLOR = '#00796B'; // Deep Teal
const ACCENT_COLOR = '#FFB300'; // Amber/Gold for forecast button
const ERROR_COLOR = '#D32F2F'; // Deep Red

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EFF3F6' },
    contentContainer: { padding: 20 },
    header: { fontSize: 30, fontWeight: '700', marginBottom: 5, color: PRIMARY_COLOR },
    subheader: { fontSize: 16, color: '#546E7A', marginBottom: 20 },
    
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: PRIMARY_COLOR,
    },
    cardHeader: {
        fontSize: 20,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginBottom: 15,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ECEFF1',
    },

    inputGroup: { marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '600', color: '#37474F', marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
    input: { 
        borderWidth: 1, 
        borderColor: '#CFD8DC', 
        borderRadius: 8, 
        paddingHorizontal: 12, 
        paddingVertical: 10, 
        fontSize: 16, 
        backgroundColor: '#Fff',
        color: '#263238',
    },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    unitTextLabel: { 
        position: 'absolute', 
        right: 12, 
        fontSize: 16, 
        color: '#78909C', 
        fontWeight: '600' 
    },
    successMessage: {
        marginTop: 5,
        fontSize: 14,
        color: PRIMARY_COLOR,
        fontWeight: '500',
    },

    suggestionsContainer: { 
        zIndex: 100, 
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CFD8DC',
        marginBottom: 10,
        maxHeight: 200, 
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ECEFF1',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    suggestionText: {
        fontSize: 16,
        color: '#263238',
        fontWeight: '500',
    },
    suggestionDetail: {
        fontSize: 14,
        color: '#78909C',
    },
    
    detailsBox: {
        backgroundColor: '#E0F2F1', 
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
        borderLeftWidth: 3,
        borderLeftColor: PRIMARY_COLOR,
    },
    detailTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#004D40', 
        marginBottom: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    detailItem: {
        fontSize: 14,
        color: '#37474F',
        width: '50%',
    },

    storageRow: { flexDirection: 'row', gap: 10, },
    storageButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CFD8DC', alignItems: 'center', backgroundColor: '#fff' },
    storageButtonActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
    storageButtonText: { color: '#37474F', fontWeight: '600' },
    storageButtonTextActive: { color: '#fff', fontWeight: '600' },

    predictButton: { backgroundColor: ACCENT_COLOR, marginTop: 10 },
    listButton: { backgroundColor: PRIMARY_COLOR, marginTop: 20, marginBottom: 10 },
    button: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', flexDirection: 'row', alignItems: 'center' },
    disabledButton: { backgroundColor: '#B0BEC5' }, 
    
    predictionBox: { 
        marginTop: 15, 
        padding: 15, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#B2EBF2', 
        backgroundColor: '#E0F7FA', 
    },
    spoiledBox: { 
        backgroundColor: '#FFEBEE', 
        borderColor: ERROR_COLOR,
        borderLeftWidth: 5,
    }, 
    predictionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PRIMARY_COLOR,
        marginBottom: 10,
    },
    spoiledTitle: {
        color: ERROR_COLOR,
    },
    predictionDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    predictionLabel: {
        fontSize: 14,
        color: '#37474F',
    },
    predictionValue: {
        fontSize: 16,
        color: '#263238',
        fontWeight: '800', 
    }
});

export default SurplusScreen;