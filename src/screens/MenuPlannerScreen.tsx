import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// --- TYPES for Menu Recommendation ---
interface MenuItem {
    dish_name: string;
    food_id: string;
    veg_nonveg: 'Veg' | 'Non-Veg';
    cuisine: string;
    waste_score_pct: number;
    estimated_prep_time_hours: number;
}

// =========================================================================
// OPTIMIZED MENU DATA (The 10 Lowest Waste Items Meeting Constraints)
// =========================================================================
const OPTIMIZED_MENU_RESULT: MenuItem[] = [
    // Veg Dishes (5 total, Lowest Waste Priority)
    { "dish_name": "Milk (200ml)", "food_id": "F064", "veg_nonveg": "Veg", "cuisine": "Beverage", "waste_score_pct": 0.9, "estimated_prep_time_hours": 0.05 },
    { "dish_name": "Tandoori Roti (2 pcs)", "food_id": "F031", "veg_nonveg": "Veg", "cuisine": "North Indian", "waste_score_pct": 1.5, "estimated_prep_time_hours": 0.29 },
    { "dish_name": "Chapati (4 pcs)", "food_id": "F042", "veg_nonveg": "Veg", "cuisine": "North Indian", "waste_score_pct": 2.1, "estimated_prep_time_hours": 0.35 },
    { "dish_name": "Upma", "food_id": "F004", "veg_nonveg": "Veg", "cuisine": "South Indian", "waste_score_pct": 4.6, "estimated_prep_time_hours": 0.65 },
    { "dish_name": "Vada (2 pcs)", "food_id": "F050", "veg_nonveg": "Veg", "cuisine": "South Indian", "waste_score_pct": 4.7, "estimated_prep_time_hours": 0.50 },
    
    // Non-Veg Dishes (5 total, Lowest Waste Priority)
    { "dish_name": "Chicken Roll", "food_id": "F078", "veg_nonveg": "Non-Veg", "cuisine": "Snack", "waste_score_pct": 2.3, "estimated_prep_time_hours": 0.55 },
    { "dish_name": "Chicken Fry", "food_id": "F013", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "waste_score_pct": 3.1, "estimated_prep_time_hours": 0.70 },
    { "dish_name": "Tandoori Chicken (Half)", "food_id": "F036", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "waste_score_pct": 4.2, "estimated_prep_time_hours": 0.90 },
    { "dish_name": "Chicken Do Pyaza", "food_id": "F070", "veg_nonveg": "Non-Veg", "cuisine": "North Indian", "waste_score_pct": 4.7, "estimated_prep_time_hours": 1.80 },
    { "dish_name": "Chicken Curry (South Style)", "food_id": "F020", "veg_nonveg": "Non-Veg", "cuisine": "South Indian", "waste_score_pct": 4.9, "estimated_prep_time_hours": 1.40 },
];
const ALL_VEG_DISHES = OPTIMIZED_MENU_RESULT.filter(item => item.veg_nonveg === 'Veg');
const ALL_NON_VEG_DISHES = OPTIMIZED_MENU_RESULT.filter(item => item.veg_nonveg === 'Non-Veg');


// --- Core function to generate the varied menu for a single meal (10 items) ---
const generateVariedMenu = (dayIndex: number): MenuItem[] => {
    const menu: MenuItem[] = [];
    
    // 5 Veg Items (using simple rotational offset)
    for (let i = 0; i < 5; i++) {
        const vegIndex = (i + dayIndex) % ALL_VEG_DISHES.length;
        menu.push(ALL_VEG_DISHES[vegIndex]);
    }
    
    // 5 Non-Veg Items (using a different offset for variety)
    for (let i = 0; i < 5; i++) {
        const nonVegIndex = (i + dayIndex + 2) % ALL_NON_VEG_DISHES.length; 
        menu.push(ALL_NON_VEG_DISHES[nonVegIndex]);
    }
    
    // Shuffle the final 10 items to prevent predictable listing order
    return menu.sort(() => Math.random() - 0.5); 
};

// Helper function to create a date object safely
const createDateFromInputs = (day: string, month: string, year: string): Date | null => {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);

    if (isNaN(d) || isNaN(m) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31) {
        return null;
    }
    // Month is 0-indexed in JavaScript Date, so subtract 1
    const date = new Date(y, m - 1, d);
    
    // Check if the date components match the input (prevents parsing errors like Feb 30)
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
        return null;
    }

    return date;
}


const MenuPlannerScreen: React.FC = () => {
    const navigation = useNavigation();
    
    // --- State for Date Input ---
    const [inputDay, setInputDay] = useState('');
    const [inputMonth, setInputMonth] = useState('');
    const [inputYear, setInputYear] = useState('');
    
    // --- State for Menu Logic and Display ---
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [currentDisplayDate, setCurrentDisplayDate] = useState<Date | null>(null);
    const [weeklyMenuData, setWeeklyMenuData] = useState<{ [dayKey: string]: { date: Date, Lunch: MenuItem[], Dinner: MenuItem[] } } | null>(null);
    const [loading, setLoading] = useState(false);

    // --- Toggle States ---
    const [selectedMeal, setSelectedMeal] = useState<'Lunch' | 'Dinner'>('Lunch');
    const [selectedFoodType, setSelectedFoodType] = useState<'Veg' | 'Non-Veg'>('Veg');


    // --- Core function to generate the menu for the entire week ---
    const handleGenerateMenu = () => {
        const date = createDateFromInputs(inputDay, inputMonth, inputYear);
        
        if (!date) {
            Alert.alert("Invalid Date", "Please enter a valid day, month, and year.");
            return;
        }

        setLoading(true);

        const menu: { [dayKey: string]: { date: Date, Lunch: MenuItem[], Dinner: MenuItem[] } } = {};
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // The week starts from the inputted date (0 = Sun, 1 = Mon, etc.)
        const startOfWeek = new Date(date);

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            const dayKey = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
            
            const dayIndex = dayDate.getDay();
            
            // Generate distinct 10-item menus for lunch and dinner
            const lunchMenu = generateVariedMenu(dayIndex);
            const dinnerMenu = generateVariedMenu(dayIndex + 1); 
            
            menu[dayKey] = {
                date: dayDate,
                Lunch: lunchMenu,
                Dinner: dinnerMenu,
            };
        }
        
        setWeeklyMenuData(menu);
        setStartDate(date);
        setCurrentDisplayDate(date); // Display the user's input day first
        setLoading(false);
    };


    // Helper to format Date for display
    const formatDateDisplay = (date: Date | null): string => {
        if (!date) return 'N/A';
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    
    // Helper to render Menu Items by Meal Type
    const renderMenu = (menuItems: MenuItem[], mealType: 'Lunch' | 'Dinner', foodType: 'Veg' | 'Non-Veg') => {
        
        // 1. Filter the 10-item menu down to the 5 selected items (e.g., Lunch + Veg)
        const filteredItems = menuItems.filter(item => item.veg_nonveg === foodType);
        
        if (!filteredItems || filteredItems.length === 0) {
            return <Text style={styles.noDataText}>No {foodType} items scheduled.</Text>;
        }
        
        // 2. Group the 5 items for display based on their cuisine
        const itemsByCuisine = filteredItems.reduce((acc, item) => {
            const cuisineKey = item.cuisine;
            if (!acc[cuisineKey]) acc[cuisineKey] = [];
            acc[cuisineKey].push(item);
            return acc;
        }, {} as { [key: string]: MenuItem[] });

        return (
            <View style={styles.menuDetail}>
                
                {/* Roti/Rice are NOT part of the 5 item count, they are staples */}
                <View style={styles.riceRotiSection}>
                    <Text style={styles.riceRotiText}>🍚 Plain Rice</Text>
                    <Text style={styles.riceRotiText}>🥖 Chapati (Roti)</Text>
                </View>

                {Object.keys(itemsByCuisine).map(cuisineKey => (
                    <View key={cuisineKey} style={styles.cuisineSection}>
                        <Text style={styles.cuisineTitle}>{cuisineKey} ({itemsByCuisine[cuisineKey].length} items)</Text>
                        {itemsByCuisine[cuisineKey].map(item => (
                            <View key={item.food_id} style={styles.menuItem}>
                                <Text style={styles.dishName}>{item.dish_name}</Text>
                                <View style={styles.dishInfo}>
                                    <Text style={styles.wasteScore}>Waste: {item.waste_score_pct.toFixed(1)}%</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        );
    };
    
    // Component to render the currently selected day's menu
    const renderCurrentDayMenu = () => {
        if (!weeklyMenuData || !currentDisplayDate) return null;

        const dayKey = currentDisplayDate.toLocaleDateString('en-US', { weekday: 'long' });
        const menu = weeklyMenuData[dayKey];
        
        if (!menu) return <Text style={styles.noDataText}>Menu data not found for this day.</Text>;

        // Select the 10-item menu based on the user's toggle selection (Lunch or Dinner)
        const items = selectedMeal === 'Lunch' ? menu.Lunch : menu.Dinner;

        return (
            <View style={styles.currentMenuCard}>
                <Text style={styles.currentMenuCardDate}>
                    {selectedMeal} Menu - {selectedFoodType} Items ({formatDateDisplay(currentDisplayDate)})
                </Text>
                
                {renderMenu(items, selectedMeal, selectedFoodType)}
            </View>
        );
    };


    // --- Day Selector Tabs ---
    const DaySelector = () => {
        if (!weeklyMenuData || !startDate) return null;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Calculate the 7 days starting from the generated date (startDate)
        const week = [];
        
        for(let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dayKey = date.toLocaleDateString('en-US', { weekday: 'long' });
            
            // Check if this date has generated data
            if(weeklyMenuData[dayKey]) {
                week.push({
                    key: dayKey,
                    short: days[date.getDay()],
                    date: date
                });
            }
        }
        
        const currentDayKey = currentDisplayDate ? currentDisplayDate.toLocaleDateString('en-US', { weekday: 'long' }) : '';
        const currentDayDate = currentDisplayDate?.getDate();

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelectorContainer}>
                {week.map(day => {
                    // Match by DayKey AND Date Number to ensure correct day is highlighted when week wraps
                    const isSelected = day.key === currentDayKey && day.date.getDate() === currentDayDate;
                    return (
                        <TouchableOpacity 
                            key={day.key + day.date.getDate()} 
                            style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                            onPress={() => setCurrentDisplayDate(day.date)}
                        >
                            <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>
                                {day.short}
                            </Text>
                            <Text style={[styles.dayButtonDate, isSelected && styles.dayButtonTextSelected]}>
                                {day.date.getDate()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        );
    };

    // --- Meal and Food Type Toggles ---
    const MealToggles = () => (
        <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Meal:</Text>
            {['Lunch', 'Dinner'].map(meal => (
                <TouchableOpacity
                    key={meal}
                    style={[styles.toggleButton, selectedMeal === meal && styles.toggleButtonActive]}
                    onPress={() => setSelectedMeal(meal as 'Lunch' | 'Dinner')}
                >
                    <Text style={[styles.toggleButtonText, selectedMeal === meal && styles.toggleButtonTextActive]}>
                        {meal}
                    </Text>
                </TouchableOpacity>
            ))}
            
            <View style={styles.toggleDivider} />

            <Text style={styles.toggleLabel}>Type:</Text>
            {['Veg', 'Non-Veg'].map(type => (
                <TouchableOpacity
                    key={type}
                    style={[styles.toggleButton, selectedFoodType === type && styles.toggleButtonActive]}
                    onPress={() => setSelectedFoodType(type as 'Veg' | 'Non-Veg')}
                >
                    <Text style={[styles.toggleButtonText, selectedFoodType === type && styles.toggleButtonTextActive]}>
                        {type}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );


    return (
        <ScrollView style={styles.container}>
            {/* --- Custom Back Button --- */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="close" size={28} color="#34495e" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>ML Optimized Weekly Menu Planner</Text>
            
            {/* 1. Date Input Section */}
            <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Enter Menu Start Date (DD/MM/YYYY):</Text>
                <View style={styles.dateInputRow}>
                    <TextInput 
                        style={styles.dateInput} 
                        placeholder="Day (DD)" 
                        keyboardType="numeric"
                        onChangeText={setInputDay}
                        value={inputDay}
                        maxLength={2}
                    />
                    <TextInput 
                        style={styles.dateInput} 
                        placeholder="Month (MM)" 
                        keyboardType="numeric"
                        onChangeText={setInputMonth}
                        value={inputMonth}
                        maxLength={2}
                    />
                    <TextInput 
                        style={styles.dateInput} 
                        placeholder="Year (YYYY)" 
                        keyboardType="numeric"
                        onChangeText={setInputYear}
                        value={inputYear}
                        maxLength={4}
                    />
                </View>
                <TouchableOpacity 
                    style={styles.generateButton}
                    onPress={handleGenerateMenu}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.generateButtonText}>Generate Weekly Menu</Text>
                    )}
                </TouchableOpacity>
            </View>
            
            {/* 2. Menu Display Section */}
            {weeklyMenuData && (
                <View style={styles.menuDisplaySection}>
                    <Text style={styles.sectionTitle}>Menu Details</Text>
                    
                    <DaySelector />
                    
                    <MealToggles />
                    
                    {renderCurrentDayMenu()}
                </View>
            )}
            
            <View style={{ height: 50 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
        paddingTop: 50,
    },
    backButton: { 
        position: 'absolute',
        top: 15,
        right: 10,
        zIndex: 10,
        padding: 5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#34495e',
        marginBottom: 20,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        marginTop: 10,
    },
    inputSection: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 3,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    dateInputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    dateInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginHorizontal: 5,
        textAlign: 'center',
        fontSize: 16,
    },
    generateButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    generateButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    menuDisplaySection: {
        marginBottom: 20,
    },
    // --- Day Selector Tabs ---
    daySelectorContainer: {
        marginBottom: 15,
    },
    dayButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 8,
        backgroundColor: '#e9e9e9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayButtonSelected: {
        backgroundColor: '#2196F3',
        borderWidth: 2,
        borderColor: '#1976D2',
    },
    dayButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
    },
    dayButtonDate: {
        fontSize: 12,
        color: '#555',
    },
    dayButtonTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    // --- Toggles ---
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        elevation: 2,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginRight: 8,
    },
    toggleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 4,
        borderWidth: 1,
        borderColor: '#eee',
    },
    toggleButtonActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#388E3C',
    },
    toggleButtonText: {
        fontSize: 14,
        color: '#555',
        fontWeight: '500',
    },
    toggleButtonTextActive: {
        color: '#fff',
    },
    toggleDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#ccc',
        marginHorizontal: 15,
    },
    // --- Menu Card Styles ---
    currentMenuCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 5,
        borderLeftColor: '#4CAF50',
    },
    currentMenuCardDate: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34495e',
        marginBottom: 10,
    },
    menuDetail: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    menuTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 6,
    },
    cuisineSection: {
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#f0f0f0',
        paddingLeft: 8,
    },
    cuisineTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2196F3',
        marginBottom: 4,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    dishName: {
        fontSize: 14,
        color: '#333',
        flex: 2,
    },
    dishInfo: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    wasteScore: {
        fontSize: 12,
        color: '#ff8c00', 
        fontWeight: '600',
    },
    noDataText: {
        textAlign: 'center',
        color: '#999',
        paddingVertical: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 10,
    },
    // --- Rice/Roti Styles ---
    riceRotiSection: {
        backgroundColor: '#e9f5e9', // Light green background
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#d0e0d0',
    },
    riceRotiText: {
        fontSize: 14,
        color: '#1e8449', // Dark green text
        fontWeight: '600',
        lineHeight: 20,
    },
});

export default MenuPlannerScreen;
