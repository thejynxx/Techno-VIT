# GLB Model Instructions

## How to Add Your GLB File

1. **Place your GLB file** in this directory (`assets/models/`)
2. **Rename your file** to `product.glb` (exactly this name)
3. **File requirements:**
   - Format: GLB (binary glTF)
   - Recommended size: < 10MB for optimal performance
   - Should contain a 3D model suitable for AR viewing

## Current Status

- The AR view will show a fallback 3D shape (red cube with blue sphere) until you add your GLB file
- Once you add `product.glb`, the app will automatically load and display your 3D model
- The model will have 360-degree rotation and touch controls enabled

## Features

- **Auto-rotation**: The model automatically rotates for a 360-degree view
- **Touch controls**: Drag to manually rotate the model on both X and Y axes
- **AR mode**: View the model overlaid on the camera feed
- **Web compatibility**: Works on both mobile and web platforms

## Troubleshooting

If your model doesn't appear:
1. Check that the file is named exactly `product.glb`
2. Ensure the file is a valid GLB format
3. Check the Metro bundler logs for any import errors
4. Try restarting the development server with `npx expo start --clear`