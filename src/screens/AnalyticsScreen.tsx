import { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, GestureResponderEvent, PanResponder, Platform, StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'

// Simple 3D Model Placeholder Component for mobile compatibility
function ProductModel({ navigation }: { navigation?: any }) {
  return (
    <View style={styles.productModelPlaceholder}>
      <Text style={styles.productModelText}>360° Product View</Text>
      <Text style={styles.productModelSubtext}>
        Place your GLB file in assets/models/product.glb
      </Text>
      <TouchableOpacity 
        style={styles.arButton}
        onPress={() => {
          if (navigation) {
            navigation.navigate('ARProductScreen');
          }
        }}
      >
        <Text style={styles.arButtonText}>View in AR</Text>
      </TouchableOpacity>
      <View style={styles.placeholderShape} />
    </View>
  )
}

// Simple analytics cards display for mobile compatibility
function CarouselRing({ analyticsData }: { analyticsData: { label: string, value: string, color: string }[] }) {
  return (
    <View style={styles.analyticsContainer}>
      {analyticsData.map((item, index) => (
        <View key={index} style={[styles.analyticsCard, { borderLeftColor: item.color }]}>
          <Text style={styles.analyticsLabel}>{item.label}</Text>
          <Text style={styles.analyticsValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  )
}

export default function AnalyticsScreen({ route, navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView | null>(null)
  const [modelRotation, setModelRotation] = useState({ x: 0, y: 0 })
  const isARMode = route?.params?.mode === 'ar'
  const [showProduct, setShowProduct] = useState(true) // Toggle between analytics and product view

  // Resolve camera facing safely across SDK versions/platforms (native only)
  const cameraFacing = Platform.OS !== 'web' && isARMode ? ('back' as const) : undefined

  // Simplified pan responder for mobile compatibility
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt: GestureResponderEvent, gestureState) => {
          if (showProduct) {
            // For product model: simulate rotation feedback
            const deltaX = gestureState.dx
            const deltaY = gestureState.dy
            setModelRotation(prev => ({
              x: prev.x + deltaY * 0.01,
              y: prev.y + deltaX * 0.01
            }))
          }
        },
        onPanResponderRelease: () => {
          // Reset rotation for next interaction
        },
      }),
    [showProduct]
  )

  useEffect(() => {
    if (!permission) return
    if (!permission.granted) {
      requestPermission()
    }
  }, [permission])

  // Analytics data for visualization
  const analyticsData = useMemo(() => [
    { label: 'Food Saved', value: '2,500 kg', color: '#e74c3c' },
    { label: 'People Fed', value: '10,000+', color: '#f1c40f' },
    { label: 'Carbon Offset', value: '5,000 kg', color: '#2ecc71' },
    { label: 'Water Saved', value: '100,000 L', color: '#3498db' },
    { label: 'Impact Score', value: '95/100', color: '#9b59b6' },
  ], [])

  if (Platform.OS === 'web') {
    // Web fallback: show analytics cards
    return (
      <View style={styles.container} {...panResponder.panHandlers}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics Dashboard</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowProduct(!showProduct)}
          >
            <Text style={styles.toggleButtonText}>
              {showProduct ? 'Show Analytics' : 'Show Product'}
            </Text>
          </TouchableOpacity>
        </View>

        {showProduct ? (
          <ProductModel navigation={navigation} />
        ) : (
          <CarouselRing analyticsData={analyticsData} />
        )}
      </View>
    )
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {isARMode && (
        /* Live camera background only in AR mode */
        <CameraView ref={(r) => { cameraRef.current = r }} style={StyleSheet.absoluteFill} facing={cameraFacing} />
      )}

      {/* Header with toggle */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowProduct(!showProduct)}
        >
          <Text style={styles.toggleButtonText}>
            {showProduct ? 'Show Analytics' : 'Show Product'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content overlay */}
      {showProduct ? (
        <ProductModel navigation={navigation} />
      ) : (
        <CarouselRing analyticsData={analyticsData} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  webPlaceholder: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  productModelPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  productModelText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productModelSubtext: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  placeholderShape: {
    width: 100,
    height: 100,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  analyticsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  analyticsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  analyticsLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  analyticsValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  arButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 10,
  },
  arButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})