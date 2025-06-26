import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Surface,
  ActivityIndicator,
  Title,
  Caption,
  Card,
} from 'react-native-paper';

const API_BASE_URL = 'http://localhost:5001';

export default function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите логин и пароль');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: login.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
      } else {
        Alert.alert('Ошибка входа', data.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      Alert.alert('Ошибка сети', 'Не удалось подключиться к серверу');
      console.error('Ошибка входа:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Система управления задачами</Title>
      
      <Surface style={styles.form} elevation={4}>
        <TextInput
          label="Логин"
          value={login}
          onChangeText={setLogin}
          mode="outlined"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        
        <TextInput
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        
        <Button
          mode="contained"
          onPress={handleLogin}
          disabled={isLoading}
          style={styles.button}
          loading={isLoading}
        >
          Войти
        </Button>
      </Surface>

      <Card style={styles.testAccounts}>
        <Card.Content>
          <Title style={styles.testTitle}>Тестовые аккаунты:</Title>
          <Caption style={styles.testAccount}>Админ: admin / admin123</Caption>
          <Caption style={styles.testAccount}>Стажёр: intern1 / intern123</Caption>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    padding: 20,
    borderRadius: 10,
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
  testAccounts: {
    marginTop: 30,
  },
  testTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  testAccount: {
    marginBottom: 5,
  },
});