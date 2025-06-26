import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Provider as PaperProvider, Text, DefaultTheme } from 'react-native-paper';
import LoginScreen from './screens/LoginScreen';
import TaskListScreen from './screens/TaskListScreen';
import CreateTaskScreen from './screens/CreateTaskScreen';
import CreateUserScreen from './screens/CreateUserScreen';

const Stack = createStackNavigator();

// Настройка уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    requestNotificationPermissions();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Разрешение на уведомления не получено');
    }
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
  };

  if (isLoading) {
    return null; // Можно добавить экран загрузки
  }

  // Define a custom theme
  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#007AFF',
      accent: '#34C759',
    },
    roundness: 8,
  };

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
        {user ? (
          <>
            <Stack.Screen 
              name="TaskList" 
              options={{ 
                title: user.role === 'admin' ? 'Все задачи' : 'Мои задачи',
                headerRight: () => (
                  <TouchableOpacity 
                    onPress={handleLogout}
                    style={{ marginRight: 15 }}
                  >
                    <Text style={{ color: '#fff', marginRight: 10 }}>Выйти</Text>
                  </TouchableOpacity>
                )
              }}
            >
              {(props) => <TaskListScreen {...props} user={user} />}
            </Stack.Screen>
            {user.role === 'admin' && (
              <>
                <Stack.Screen 
                  name="CreateTask" 
                  component={CreateTaskScreen}
                  options={{ title: 'Создать задачу' }}
                />
                <Stack.Screen 
                  name="CreateUser" 
                  component={CreateUserScreen}
                  options={{ title: 'Создать стажёра' }}
                />
              </>
            )}
          </>
        ) : (
          <Stack.Screen 
            name="Login" 
            options={{ title: 'Вход в систему' }}
          >
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
