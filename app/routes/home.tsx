import type { Route } from "./+types/home";
import { useState, useEffect, useRef, useMemo } from "react";
import Fuse from "fuse.js";

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  timestamp: string;
}

interface FoodDatabaseItem {
  foodCode: string;
  foodName: string;
  description: string;
  proteinPer100g: number;
  caloriesPer100g: number;
}

function isCustomFood(food: FoodDatabaseItem): boolean {
  return food.foodCode.startsWith('custom-');
}


const STORAGE_KEY = "calorie-tracker-entries";
const DATE_KEY = "calorie-tracker-date";
const CUSTOM_FOODS_KEY = "calorie-tracker-custom-foods";

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function loadEntries(): FoodEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  
  const todayKey = getTodayKey();
  const storedDate = localStorage.getItem(DATE_KEY);
  
  // If it's a new day, clear old entries
  if (storedDate !== todayKey) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(DATE_KEY, todayKey);
    return [];
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveEntries(entries: FoodEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  localStorage.setItem(DATE_KEY, getTodayKey());
}

function loadCustomFoods(): FoodDatabaseItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  const stored = localStorage.getItem(CUSTOM_FOODS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveCustomFoods(foods: FoodDatabaseItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(CUSTOM_FOODS_KEY, JSON.stringify(foods));
}


export function meta({}: Route.MetaArgs) {
  return [
    { title: "Calorie Tracker" },
    { name: "description", content: "Track your daily calories and protein intake" },
    { name: "theme-color", content: "#3b82f6" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "default" },
  ];
}

// Parse CSV line, handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Parse CSV text into food items
function parseFoodDatabase(csvText: string): FoodDatabaseItem[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const foods: FoodDatabaseItem[] = [];
  
  // Skip header row (line 0)
  for (let i = 1; i < lines.length; i++) {
    const columns = parseCSVLine(lines[i]);
    
    if (columns.length < 13) continue;
    
    const foodName = columns[1]?.trim() || '';
    const description = columns[2]?.trim() || '';
    const proteinStr = columns[9]?.trim() || '0';  // Column 9: Protein (g)
    const caloriesStr = columns[12]?.trim() || '0'; // Column 12: Energy (kcal) (kcal)
    
    // Skip if no name or if values are invalid
    if (!foodName || proteinStr === 'N' || caloriesStr === 'N' || proteinStr === 'Tr' || caloriesStr === 'Tr') {
      continue;
    }
    
    const protein = parseFloat(proteinStr);
    const calories = parseFloat(caloriesStr);
    
    // Only include foods with valid nutritional data
    if (!isNaN(protein) && !isNaN(calories) && calories > 0) {
      foods.push({
        foodCode: columns[0]?.trim() || '',
        foodName,
        description,
        proteinPer100g: protein,
        caloriesPer100g: calories,
      });
    }
  }
  
  return foods;
}

export default function Home() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [manualGrams, setManualGrams] = useState("");

  // Food database search state
  const [csvFoodDatabase, setCsvFoodDatabase] = useState<FoodDatabaseItem[]>([]);
  const [customFoods, setCustomFoods] = useState<FoodDatabaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodDatabaseItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodDatabaseItem | null>(null);
  const [grams, setGrams] = useState("");
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Combine CSV database with custom foods
  const foodDatabase = useMemo(() => {
    return [...csvFoodDatabase, ...customFoods];
  }, [csvFoodDatabase, customFoods]);

  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    if (foodDatabase.length === 0) return null;
    
    // Normalize text by removing commas and extra spaces for better matching
    const normalizeText = (text: string) => {
      return text.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    };
    
    return new Fuse(foodDatabase, {
      keys: [
        { 
          name: 'foodName', 
          weight: 0.7,
          getFn: (item) => normalizeText(item.foodName)
        },
        { 
          name: 'description', 
          weight: 0.3,
          getFn: (item) => normalizeText(item.description)
        },
      ],
      threshold: 0.3, // Lower threshold for more lenient matching (0.0 = exact match, 1.0 = match anything)
      ignoreLocation: true, // Search anywhere in the string
      includeScore: true,
      minMatchCharLength: 2, // Minimum character length to match
      shouldSort: true, // Sort by relevance
      findAllMatches: true, // Find all matches, not just the first
    });
  }, [foodDatabase]);

  // Load custom foods from localStorage
  useEffect(() => {
    setCustomFoods(loadCustomFoods());
  }, []);

  // Load food database from CSV
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadDatabase = async () => {
      try {
        const response = await fetch('/food-database.csv');
        if (!response.ok) {
          throw new Error('Failed to load food database');
        }
        const csvText = await response.text();
        const foods = parseFoodDatabase(csvText);
        setCsvFoodDatabase(foods);
      } catch (error) {
        console.error('Error loading food database:', error);
      } finally {
        setIsLoadingDatabase(false);
      }
    };
    
    loadDatabase();
  }, []);

  // Load entries from localStorage on client side only
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      saveEntries(entries);
    }
  }, [entries]);

  // Search food database with fuzzy matching using Fuse.js
  useEffect(() => {
    if (!searchQuery.trim() || !fuse) {
      setSearchResults([]);
      return;
    }

    // Normalize query by removing commas and extra spaces
    const query = searchQuery.trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
    const results = fuse.search(query, { limit: 10 });
    
    // Extract the items from Fuse results
    setSearchResults(results.map((result) => result.item));
  }, [searchQuery, fuse]);


  const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);
  const totalProtein = entries.reduce((sum, entry) => sum + entry.protein, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const caloriesNum = parseFloat(calories);
    const proteinNum = parseFloat(protein);
    const gramsNum = parseFloat(manualGrams);
    
    if (!name.trim() || isNaN(caloriesNum) || isNaN(proteinNum) || isNaN(gramsNum) || gramsNum <= 0) {
      return;
    }
    
    if (!name.trim() || isNaN(caloriesNum) || isNaN(proteinNum)) {
      return;
    }

    // Calculate per 100g values
    const caloriesPer100g = (caloriesNum / gramsNum) * 100;
    const proteinPer100g = (proteinNum / gramsNum) * 100;

    // Add to custom foods database if it doesn't already exist
    const foodName = name.trim();
    const existingFood = customFoods.find(
      f => f.foodName.toLowerCase() === foodName.toLowerCase()
    );
    
    if (!existingFood) {
      const newCustomFood: FoodDatabaseItem = {
        foodCode: `custom-${Date.now()}`,
        foodName: foodName,
        description: "",
        proteinPer100g: proteinPer100g,
        caloriesPer100g: caloriesPer100g,
      };
      const updatedCustomFoods = [...customFoods, newCustomFood];
      setCustomFoods(updatedCustomFoods);
      saveCustomFoods(updatedCustomFoods);
    }

    // Add entry to daily log
    const newEntry: FoodEntry = {
      id: Date.now().toString(),
      name: `${foodName} (${gramsNum}g)`,
      calories: caloriesNum,
      protein: proteinNum,
      timestamp: new Date().toISOString(),
    };

    setEntries([...entries, newEntry]);
    setName("");
    setCalories("");
    setProtein("");
    setManualGrams("");
  };

  const handleDelete = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const handleClearDay = () => {
    if (confirm("Clear all entries for today?")) {
      setEntries([]);
    }
  };

  const handleFoodSelect = (food: FoodDatabaseItem) => {
    setSelectedFood(food);
    setSearchQuery(food.foodName);
    setSearchResults([]);
    setGrams("");
  };

  const handleDatabaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFood || !grams.trim()) {
      return;
    }

    const gramsNum = parseFloat(grams);
    if (isNaN(gramsNum) || gramsNum <= 0) {
      return;
    }

    // Calculate for the specified grams
    const totalCalories = (selectedFood.caloriesPer100g * gramsNum) / 100;
    const totalProtein = (selectedFood.proteinPer100g * gramsNum) / 100;

    const newEntry: FoodEntry = {
      id: Date.now().toString(),
      name: `${selectedFood.foodName} (${gramsNum}g)`,
      calories: Math.round(totalCalories * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      timestamp: new Date().toISOString(),
    };

    setEntries([...entries, newEntry]);
    setSelectedFood(null);
    setSearchQuery("");
    setGrams("");
  };

  const handleClearFoodSelection = () => {
    setSelectedFood(null);
    setSearchQuery("");
    setGrams("");
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleDeleteCustomFood = () => {
    if (!selectedFood || !isCustomFood(selectedFood)) {
      return;
    }

    if (confirm(`Delete "${selectedFood.foodName}" from your custom foods?`)) {
      const updatedCustomFoods = customFoods.filter(
        food => food.foodCode !== selectedFood.foodCode
      );
      setCustomFoods(updatedCustomFoods);
      saveCustomFoods(updatedCustomFoods);
      handleClearFoodSelection();
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Calorie Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        {/* Totals Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {totalCalories.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Calories
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {totalProtein.toFixed(1)}g
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Protein
              </div>
            </div>
          </div>
        </div>

        {/* Manual Entry Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Manual Entry
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Food Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Grilled Chicken"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="calories"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Calories
                </label>
                <input
                  id="calories"
                  type="number"
                  step="0.1"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="protein"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Protein (g)
                </label>
                <input
                  id="protein"
                  type="number"
                  step="0.1"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="manualGrams"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Amount (g)
                </label>
                <input
                  id="manualGrams"
                  type="number"
                  step="0.1"
                  value={manualGrams}
                  onChange={(e) => setManualGrams(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
            >
              Add Entry
            </button>
          </form>
        </div>

        {/* Food Database Search Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search Food Database
          </h2>
          
          {isLoadingDatabase ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading food database...
            </div>
          ) : !selectedFood ? (
            <div className="space-y-4">
              <div className="relative">
                <label
                  htmlFor="search"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Search Foods
                </label>
                <input
                  ref={searchInputRef}
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Apple, Chicken Breast, Pasta"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                  {searchResults.map((food) => {
                    const isCustom = isCustomFood(food);
                    return (
                      <div
                        key={food.foodCode}
                        className="flex gap-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleFoodSelect(food)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 dark:text-white truncate flex-1">
                              {food.foodName}
                            </div>
                            {isCustom ? (
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                                Custom
                              </span>
                            ) : (
                              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                                Database
                              </span>
                            )}
                          </div>
                          {food.description && food.description !== food.foodName && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {food.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {food.caloriesPer100g.toFixed(0)} kcal / 100g
                            {" • "}
                            {food.proteinPer100g.toFixed(1)}g protein / 100g
                          </div>
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${food.foodName}" from your custom foods?`)) {
                                const updatedCustomFoods = customFoods.filter(
                                  f => f.foodCode !== food.foodCode
                                );
                                setCustomFoods(updatedCustomFoods);
                                saveCustomFoods(updatedCustomFoods);
                                // Remove from search results if currently visible
                                setSearchResults(searchResults.filter(f => f.foodCode !== food.foodCode));
                              }
                            }}
                            className="flex-shrink-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 self-start pt-0.5"
                            aria-label="Delete custom food"
                            title="Delete custom food"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  No foods found. Try a different search term.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleDatabaseSubmit} className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedFood.foodName}
                    </div>
                    {isCustomFood(selectedFood) ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                        Custom
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                        Database
                      </span>
                    )}
                  </div>
                  {selectedFood.description && selectedFood.description !== selectedFood.foodName && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedFood.description}
                    </div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedFood.caloriesPer100g.toFixed(0)} kcal / 100g
                    {" • "}
                    {selectedFood.proteinPer100g.toFixed(1)}g protein / 100g
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearFoodSelection}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear selection"
                >
                  ✕
                </button>
              </div>

              <div>
                <label
                  htmlFor="grams"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Amount (grams)
                </label>
                <input
                  id="grams"
                  type="number"
                  step="0.1"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
              >
                Add Entry
              </button>
            </form>
          )}
        </div>

        {/* Entries List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Entries ({entries.length})
            </h2>
            {entries.length > 0 && (
              <button
                onClick={handleClearDay}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
              >
                Clear Day
              </button>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No entries yet. Add your first meal above!
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {entry.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {entry.calories} cal • {entry.protein}g protein
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="ml-4 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm"
                    aria-label="Delete entry"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
