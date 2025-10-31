import React, { useRef, useState, useEffect, Suspense } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Canvas } from '@react-three/fiber';
// Use platform-appropriate drei hook
const useGLTFHook: any = Platform.OS === 'web' 
  ? (require('@react-three/drei') as any).useGLTF 
  : (require('@react-three/drei/native') as any).useGLTF;
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import theme from '../config/theme';
// (removed unused expo-asset import)
// (duplicate Platform import removed)

// Statically require the model so Metro bundles it correctly
const PRODUCT_MODEL = require('../../assets/models/product.glb');

// Product Model Component
function ProductModel() {
  // Resolve model source per-platform
  const src = Platform.OS === 'web'
    ? (typeof PRODUCT_MODEL === 'string' ? PRODUCT_MODEL : (PRODUCT_MODEL?.default ?? PRODUCT_MODEL))
    : PRODUCT_MODEL; // Pass module directly to native useGLTF

  // Load using Suspense; do not wrap hooks in try/catch which would catch the thrown promise
  const gltf = useGLTFHook(src);
  const scene = gltf?.scene;

  if (!scene) {
    // Fallback shape if scene isn't available for any reason
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  const clonedScene = scene.clone();

  return (
    <primitive 
      object={clonedScene} 
      scale={[2, 2, 2]} 
      position={[0, -1, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Loading 3D Model...</Text>
    </View>
  );
}

// Error fallback component
function ErrorFallback() {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="warning" size={48} color={theme.colors.error} />
      <Text style={styles.errorText}>3D Model Loading Failed</Text>
      <Text style={styles.errorSubtext}>
        Showing fallback 3D shape instead
      </Text>
    </View>
  );
}

export default function ARProductScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isARMode, setIsARMode] = useState(false);
  const [modelError, setModelError] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const toggleARMode = () => {
    if (!permission?.granted) {
      requestPermission();
      return;
    }
    setIsARMode(!isARMode);
  };

  const handleModelError = () => {
    setModelError(true);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Product 3D View</Text>
        </View>

        <View style={styles.canvasContainer}>
          {modelError ? (
            <ErrorFallback />
          ) : (
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <directionalLight position={[0, 5, 5]} intensity={0.5} />
              
              <Suspense fallback={null}>
                <ProductModel />
              </Suspense>
            </Canvas>
          )}
        </View>

        <View style={styles.controls}>
          <Text style={styles.instructionText}>
            Tap to interact with the 3D model
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isARMode && permission?.granted && (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.title}>Product AR View</Text>
        <TouchableOpacity onPress={toggleARMode} style={styles.arToggle}>
          <Ionicons 
            name={isARMode ? "camera" : "cube"} 
            size={24} 
            color={theme.colors.textLight} 
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.canvasContainer, isARMode && styles.arOverlay]}>
        {modelError ? (
          <ErrorFallback />
        ) : (
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <directionalLight position={[0, 5, 5]} intensity={0.7} />
            
            <Suspense fallback={<LoadingFallback />}>
              <ProductModel />
            </Suspense>
          </Canvas>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, isARMode && styles.activeButton]} 
          onPress={toggleARMode}
        >
          <Ionicons 
            name={isARMode ? "camera" : "cube"} 
            size={20} 
            color={isARMode ? theme.colors.textLight : theme.colors.primary} 
          />
          <Text style={[styles.controlText, isARMode && styles.activeText]}>
            {isARMode ? "AR Mode" : "3D Mode"}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.instructionText}>
          {isARMode ? "Point camera at surface" : "Drag to rotate • Pinch to zoom"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  arToggle: {
    padding: 8,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  arOverlay: {
    backgroundColor: 'transparent',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
  },
  activeButton: {
    backgroundColor: theme.colors.primary,
  },
  controlText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  activeText: {
    color: theme.colors.textLight,
  },
  instructionText: {
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: 10,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  errorSubtext: {
    marginTop: 4,
    color: theme.colors.textMuted,
  },
});