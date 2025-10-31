import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

// Import screens
import DriverDashboard from '../screens/DriverDashboard';
import ChatListScreen from '../screens/ChatListScreen';
import MapScreen from '../screens/MapScreen';

const Tab = createBottomTabNavigator();

const DriverTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DriverDashboard}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen 
        name="Deliveries" 
        component={require('../screens/DriverDeliveriesScreen').default}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🚚</Text>,
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text>,
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💬</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export default DriverTabNavigator;