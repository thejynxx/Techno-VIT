import { View, Text, StyleSheet } from 'react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PlateLink Map</Text>
      <Text style={styles.subtitle}>
        The interactive map is not available on web preview. Please open this project in Expo Go on a physical device or simulator to use the map.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8f9fa' },
  title: { fontSize: 20, fontWeight: '700', color: '#2c3e50', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#7f8c8d', textAlign: 'center' },
});