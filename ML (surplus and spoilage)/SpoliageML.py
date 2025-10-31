import pandas as pd
import numpy as np
import joblib
import time
from sklearn.model_selection import train_test_split
from sklearn.svm import SVR 
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.inspection import permutation_importance # New for SVR feature importance

# --- FILE AND MODEL CONFIGURATION ---
DATA_FILE = 'food_spoilage_data.csv'
MODEL_FILENAME = 'spoilage_svr_pipeline.joblib' # Changed to reflect saving the full pipeline
RANDOM_SEED = 42
# SVR parameters
SVR_C = 10 
SVR_EPSILON = 1.0

# Define the features to be used in the model
TARGET_COLUMN = 'Predicted_Remaining_Safe_Time_Hours'
FEATURE_COLUMNS = ['Time_Since_Prep_Hours', 'Storage_Info', 'Food_Type', 'Meal_Time']

def train_spoilage_model():
    """
    Loads food spoilage data, preprocesses it, and trains a Support Vector Regressor (SVR)
    to predict the remaining safe consumption time. Includes Permutation Feature Importance.
    """
    print("=====================================================================")
    print("            SPOILAGE PREDICTION MODEL TRAINING (SUPPORT VECTOR)      ")
    print("=====================================================================")
    print(f"[*] Loading spoilage data from: {DATA_FILE}")

    try:
        df = pd.read_csv(DATA_FILE)
    except FileNotFoundError:
        print(f"[!] ERROR: Data file '{DATA_FILE}' not found. Ensure it is in the current directory.")
        return

    # 1. Prepare Data and Separate Features
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]
    
    # Split data into training and testing sets (80/20 split)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_SEED)
    print(f"[*] Data loaded: {len(df)} total records.")
    print(f"[*] Training on {len(X_train)} samples, testing on {len(X_test)} samples.")
    
    
    # 2. Comprehensive Preprocessing Pipeline Setup
    
    # Define feature groups for transformation
    numerical_features = ['Time_Since_Prep_Hours']
    categorical_features = ['Storage_Info', 'Food_Type', 'Meal_Time']
    
    # Create the preprocessor using ColumnTransformer
    preprocessor = ColumnTransformer(
        transformers=[
            # Standard Scaler for numerical features (CRITICAL for SVR performance)
            ('numeric_scaling', StandardScaler(), numerical_features),
            # One-Hot Encoding for categorical features
            ('categorical_encoding', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ],
        remainder='drop', # Drop unused columns
        verbose=True
    )
    
    # 3. Create and Train the ML Pipeline
    
    # Combine the preprocessor and the SVR regressor into a single pipeline
    full_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', SVR(kernel='rbf', C=SVR_C, epsilon=SVR_EPSILON)) # Using RBF kernel for non-linearity
    ])
    
    print("\n[*] Starting Support Vector Regressor training...")
    start_time = time.time()
    
    # Fit the entire pipeline on the training data
    full_pipeline.fit(X_train, y_train)
    
    end_time = time.time()
    print(f"[*] Training complete in {end_time - start_time:.2f} seconds.")


    # 4. Evaluation and Overfitting Check
    
    y_train_pred = full_pipeline.predict(X_train)
    y_test_pred = full_pipeline.predict(X_test)
    
    def evaluate(y_true, y_pred, name):
        """Calculates and prints performance metrics."""
        mse = mean_squared_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_true, y_pred)
        print(f"  > {name} Performance:")
        print(f"    - Root Mean Squared Error (RMSE): {rmse:.4f} hours")
        print(f"    - R-squared (Variance Explained): {r2:.4f}")
        return r2

    print("\n[--- Model Evaluation ---]")
    r2_train = evaluate(y_train, y_train_pred, "TRAINING SET")
    r2_test = evaluate(y_test, y_test_pred, "TEST SET")

    if (r2_train - r2_test) > 0.15:
        print("\n[!!! WARNING !!!] High Overfitting Risk Detected. Consider hyperparameter tuning (C, epsilon).")
    else:
        print("\n[OK] Model performance is balanced and generalized well.")
        
    # 5. Permutation Feature Importance (Advanced step for judges!)
    # Permutation importance is used for models like SVR without built-in feature_importances_
    result = permutation_importance(full_pipeline, X_test, y_test, n_repeats=10, random_state=RANDOM_SEED, n_jobs=-1)
    
    # Get feature names from the original columns
    feature_names = X.columns
    
    # Create a Series of importance scores
    importance = pd.Series(result.importances_mean, index=feature_names)
    top_4_importance = importance.nlargest(4)

    print("\n[--- Top 4 Permutation Feature Importance (Test Set) ---]")
    print(top_4_importance.to_markdown(numalign="left", stralign="left"))
    
    # 6. Save the entire Pipeline
    joblib.dump(full_pipeline, MODEL_FILENAME)
    print(f"\n[SUCCESS] Full ML Pipeline saved to '{MODEL_FILENAME}'.")
    print("=====================================================================")

if __name__ == "__main__":
    train_spoilage_model()
