##PORT 8082
import pandas as pd
import joblib
import json
from flask import Flask, request, jsonify
# Note: The sklearn imports below are necessary even if not explicitly used, 
# as joblib needs them to reconstruct the Pipeline, ColumnTransformer, etc.
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score

# --- FILE AND MODEL CONFIGURATION ---
MODEL_FILENAME = 'surplus_gbr_pipeline.joblib' # Name of the saved model pipeline
# List of features the model expects, in the exact order used during training.
FEATURE_COLUMNS = [
    'day_of_wk', 'month', 'meal_type', 'price_type_special_weather', 'is_holiday',
    'food_id', 'veg_nonveg', 'cuisine', 'estimated_prep_time_hours',
    'staff_on_duty', 'peak_hour_demand_ratio', 'is_seasonal_dish', 'actual_kg_planned'
]

# --- FLASK SETUP ---
app = Flask(__name__)

# --- MODEL LOADING (Done once at startup) ---
try:
    # Load the entire trained pipeline (preprocessor + model)
    full_pipeline = joblib.load(MODEL_FILENAME)
    print(f"[*] Successfully loaded ML pipeline: {MODEL_FILENAME}")
except FileNotFoundError:
    print(f"[!!! ERROR !!!] Model file '{MODEL_FILENAME}' not found. Please train the model first.")
    full_pipeline = None

@app.route('/predict_surplus', methods=['POST'])
def predict_surplus():
    """
    Receives input features from the React Native app via JSON and returns the predicted surplus.
    Example JSON Input:
    {
        "day_of_wk": "Wednesday",
        "month": 9,
        "meal_type": "Lunch",
        "price_type_special_weather": "Weather: Sunny",
        "is_holiday": false,
        "food_id": "F007",
        "veg_nonveg": "Veg",
        "cuisine": "North Indian",
        "estimated_prep_time_hours": 1.5,
        "staff_on_duty": 4,
        "peak_hour_demand_ratio": 0.65,
        "is_seasonal_dish": true,
        "actual_kg_planned": 10.5
    }
    """
    if full_pipeline is None:
        return jsonify({'error': 'Model not loaded.'}), 500

    try:
        # Get data posted as JSON from the mobile app
        data = request.get_json(force=True)
        
        # 1. Convert the dictionary input into a Pandas DataFrame
        # This is CRITICAL because the pipeline expects a DataFrame structure 
        # (even for a single row) with features in the correct order.
        input_df = pd.DataFrame([data], columns=FEATURE_COLUMNS)

        # 2. Make Prediction
        prediction_array = full_pipeline.predict(input_df)
        predicted_surplus = round(float(prediction_array[0]), 3)

        # 3. Return the result
        return jsonify({
            'status': 'success',
            'predicted_kg_surplus': predicted_surplus,
            'message': f'Predicted waste for {data.get("food_id")} is {predicted_surplus} kg.'
        })

    except Exception as e:
        # Log the error and return a helpful message
        print(f"Prediction Error: {e}")
        return jsonify({'error': 'Invalid input or processing failed.', 'details': str(e)}), 400

# To run the API server (use '0.0.0.0' for external access, e.g., from your phone)
if __name__ == '__main__':
    print("\n==========================================================")
    print("      FLASK SURPLUS PREDICTION API STARTING")
    print("==========================================================")
    print(f"API available at: http://127.0.0.1:5000/predict_surplus")
    print("Press CTRL+C to stop the server.")
    # You might need to change the host/port for production or testing on device
    app.run(host='0.0.0.0', port=8082, debug=False)
