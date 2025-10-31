##PORT 8083

import pandas as pd
import joblib
import json
from flask import Flask, request, jsonify
from sklearn.svm import SVR # Required for joblib load
from sklearn.preprocessing import StandardScaler, OneHotEncoder # Required for joblib load
from sklearn.compose import ColumnTransformer # Required for joblib load
from sklearn.pipeline import Pipeline # Required for joblib load
import numpy as np # Needed for mathematical operations

# --- FILE AND MODEL CONFIGURATION ---
MODEL_FILENAME = 'spoilage_svr_pipeline.joblib' 
SPOILAGE_FEATURE_COLUMNS = ['Time_Since_Prep_Hours', 'Storage_Info', 'Food_Type', 'Meal_Time']
ROOM_TEMP_SAFETY_CAP_HOURS = 4.0 # Maximum total safe time (Rule: 4 hours)
MIN_SAFE_TIME_HOURS = 0.0 # Time to return if spoiled/near expiry

# --- FLASK SETUP ---
app = Flask(__name__)

# --- MODEL LOADING (Done once at startup) ---
try:
    spoilage_pipeline = joblib.load(MODEL_FILENAME)
    print(f"[*] Successfully loaded ML pipeline: {MODEL_FILENAME}")
except Exception as e:
    print(f"[!!! ERROR !!!] Failed to load model: {e}")
    spoilage_pipeline = None

@app.route('/predict_spoilage', methods=['POST'])
def predict_spoilage():
    """
    Predicts remaining safe time, prioritizing ML prediction but enforcing the 
    strict 4.0-hour safety lock for Room Temp food.
    """
    if spoilage_pipeline is None:
        return jsonify({'error': 'ML model not loaded.'}), 503
        
    try:
        data = request.get_json()
        
        time_since_prep = data.get('Time_Since_Prep_Hours', 0.0)
        storage_info = data.get('Storage_Info')

        # 1. Run Prediction (Necessary for all paths)
        input_df = pd.DataFrame([data], columns=SPOILAGE_FEATURE_COLUMNS)
        prediction_array = spoilage_pipeline.predict(input_df)
        predicted_time_raw = round(float(prediction_array[0]), 2)
        
        # Initialize the final result with the raw ML prediction
        predicted_time = predicted_time_raw

        # --- SAFETY LOCK IMPLEMENTATION (Varied ML Priority Logic) ---
        
        if storage_info == 'Room Temp':
            # --- Check 1: Immediate Spoiled Lock (Prep time >= 4h)
            if time_since_prep >= ROOM_TEMP_SAFETY_CAP_HOURS:
                return jsonify({
                    'status': 'safety_override',
                    'predicted_remaining_safe_hours': MIN_SAFE_TIME_HOURS, # Returns 0.0
                    'message': f'SAFETY LOCK: Food has been at Room Temp for {time_since_prep} hours, exceeding the 4.0-hour safety limit. FOOD IS CONSIDERED SPOILED.'
                }), 200
            
            # --- Check 2: Apply Varied ML Cap Logic (Introduces ML variation)
            
            # Calculate the total life predicted by the ML model (Prep Time + Raw Remaining Time)
            total_safe_time_ml = time_since_prep + predicted_time_raw
            
            # Apply the modulus operation: total_safe_time % 4.0
            # This ensures the total time is always within a 0-4 hour window, using the ML's tendency.
            # Example: 6.94 hours total -> 6.94 % 4.0 = 2.94 hours remaining safe time (at current prep time)
            # We use NumPy's fmod for float modulus precision.
            total_safe_time_capped = np.fmod(total_safe_time_ml, ROOM_TEMP_SAFETY_CAP_HOURS)

            # The final prediction is the remaining time from the total capped life, 
            # or the model's raw output if the model is being conservative.
            
            # The legal max remaining time: 4.0 - time_since_prep (e.g., 4.0 - 1.0 = 3.0)
            max_legally_safe_remaining = ROOM_TEMP_SAFETY_CAP_HOURS - time_since_prep
            
            # If the raw ML prediction is already less than the legal cap, we use it (e.g., ML=2.0, Cap=3.0 -> Use 2.0)
            # If the raw ML prediction is optimistic (e.g., 6.94), the modulus calculation gives a more realistic value (e.g., 2.94),
            # which is then capped by the max_legally_safe_remaining (3.0).
            
            # We use the modulus result, then ensure it doesn't exceed the legal cap, and finally ensure it's not negative.
            predicted_time_from_modulus = total_safe_time_capped - time_since_prep
            
            # Use the smaller of the ML's prediction OR the maximum legal time remaining
            predicted_time = min(predicted_time_raw, max_legally_safe_remaining)
            
            # If the ML was overly optimistic (e.g., 6.94), the min() function caps it at 3.0.
            # If the ML was realistic (e.g., 2.0), the min() function keeps it at 2.0.
            
            # We enforce the modulus operation's variation by calculating the variance in the raw time
            # and applying it to the legally safe range.
            
            # Let's simplify: Use the model's *raw* variation, but cap the final result.
            
            # Calculate what % of the 4 hour rule is left:
            percentage_remaining = predicted_time_raw / total_safe_time_ml
            
            # Apply that percentage to the remaining legal window:
            predicted_time = percentage_remaining * max_legally_safe_remaining
            
            # Final calculation for display (must be between 0 and max_remaining)
            predicted_time = max(0.0, min(max_legally_safe_remaining, predicted_time))


        # For Refrigerated/Other Storage (else block is implicitly handled):
        # 'predicted_time' remains the raw ML prediction.
        
        # --- Check 3: Enforce the absolute minimum floor (applies to all storage types)
        predicted_time = max(MIN_SAFE_TIME_HOURS, predicted_time)

        # --- END SAFETY LOCK IMPLEMENTATION ---

        # 3. Return the result
        return jsonify({
            'status': 'success',
            'predicted_remaining_safe_hours': predicted_time,
            'message': f'Remaining safe time: {predicted_time} hours.'
        })

    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': 'Processing failed.', 'details': str(e)}), 400

# To run the API server
if __name__ == '__main__':
    print("\n==========================================================")
    print("      FLASK SPOILAGE PREDICTION API STARTING (Safety Locked)")
    print("==========================================================")
    print(f"API available at: http://127.0.0.1:8083/predict_spoilage")
    print("Press CTRL+C to stop the server.")
    app.run(host='0.0.0.0', port=8083)
