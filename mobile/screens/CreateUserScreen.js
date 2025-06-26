import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  ActivityIndicator,
  Title,
  Subheading,
  Card,
  List,
  Divider,
  Surface,
} from 'react-native-paper';

const API_BASE_URL = 'http://localhost:5001';

export default function CreateUserScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createUser = async () => {
    if (!login.trim()) {
      Alert.alert('Ошибка', 'Введите логин');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Ошибка', 'Введите пароль');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: login.trim(),
          password: password.trim(),
          role: user?.role || 'admin',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Успех', 'Стажёр создан успешно', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось создать пользователя');
      }
    } catch (error) {
      Alert.alert('Ошибка сети', 'Не удалось подключиться к серверу');
      console.error('Ошибка создания пользователя:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.form} elevation={1}>
        <Title style={styles.title}>Создание нового стажёра</Title>
        
        <TextInput
          label="Логин *"
          value={login}
          onChangeText={setLogin}
          mode="outlined"
          placeholder="Введите логин"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <TextInput
          label="Пароль *"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          placeholder="Введите пароль (минимум 6 символов)"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <TextInput
          label="Подтверждение пароля *"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          placeholder="Повторите пароль"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={createUser}
          disabled={isLoading}
          loading={isLoading}
          style={styles.button}
        >
          Создать стажёра
        </Button>

        <Card style={styles.infoBox}>
          <Card.Content>
            <Subheading style={styles.infoTitle}>Информация:</Subheading>
            <List.Item
              title="Новый пользователь будет создан с ролью 'стажёр'"
              left={props => <List.Icon {...props} icon="account" />}
              titleNumberOfLines={2}
            />
            <Divider />
            <List.Item
              title="Стажёр сможет видеть только свои задачи"
              left={props => <List.Icon {...props} icon="eye" />}
              titleNumberOfLines={2}
            />
            <Divider />
            <List.Item
              title="Стажёр может менять статус задач: 'В очереди' → 'В работе' → 'На проверке'"
              left={props => <List.Icon {...props} icon="arrow-right" />}
              titleNumberOfLines={3}
            />
          </Card.Content>
        </Card>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
    margin: 10,
    borderRadius: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
  infoBox: {
    marginTop: 30,
  },
  infoTitle: {
    marginBottom: 10,
  },
});