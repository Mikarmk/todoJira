import React, { useState, useEffect } from 'react';
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
  Surface,
  HelperText,
  Divider,
  Menu,
  List,
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';

const API_BASE_URL = 'http://localhost:5001';

export default function CreateTaskScreen({ navigation, route }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [interns, setInterns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInterns, setIsLoadingInterns] = useState(true);

  useEffect(() => {
    loadInterns();
  }, []);

  const loadInterns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/interns?role=admin`);
      const data = await response.json();
      
      if (response.ok) {
        setInterns(data);
        if (data.length > 0) {
          setAssignedTo(data[0].id.toString());
        }
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось загрузить список стажёров');
      }
    } catch (error) {
      Alert.alert('Ошибка сети', 'Не удалось подключиться к серверу');
      console.error('Ошибка загрузки стажёров:', error);
    } finally {
      setIsLoadingInterns(false);
    }
  };

  const createTask = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите заголовок задачи');
      return;
    }

    if (!assignedTo) {
      Alert.alert('Ошибка', 'Выберите стажёра для назначения задачи');
      return;
    }

    // Проверка формата даты (YYYY-MM-DD)
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Ошибка', 'Введите дату в формате ГГГГ-ММ-ДД');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate || null,
          assigned_to: parseInt(assignedTo),
          role: 'admin',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Успех', 'Задача создана успешно', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось создать задачу');
      }
    } catch (error) {
      Alert.alert('Ошибка сети', 'Не удалось подключиться к серверу');
      console.error('Ошибка создания задачи:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingInterns) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.form} elevation={1}>
        <Title style={styles.title}>Создание новой задачи</Title>
        
        <TextInput
          label="Заголовок задачи *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          placeholder="Введите заголовок задачи"
          multiline
          style={styles.input}
        />
        <HelperText type="info">Обязательное поле</HelperText>

        <TextInput
          label="Описание"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          placeholder="Введите описание задачи"
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textArea]}
        />

        <TextInput
          label="Дедлайн (ГГГГ-ММ-ДД)"
          value={dueDate}
          onChangeText={setDueDate}
          mode="outlined"
          placeholder="2024-12-31"
          style={styles.input}
        />
        <HelperText type="info">Формат: ГГГГ-ММ-ДД (например, 2024-12-31)</HelperText>

        <Text style={styles.pickerLabel}>Назначить стажёру *</Text>
        {interns.length > 0 ? (
          <Surface style={styles.pickerContainer} elevation={1}>
            <Picker
              selectedValue={assignedTo}
              onValueChange={setAssignedTo}
              style={styles.picker}
            >
              {interns.map((intern) => (
                <Picker.Item
                  key={intern.id}
                  label={intern.login}
                  value={intern.id.toString()}
                />
              ))}
            </Picker>
          </Surface>
        ) : (
          <List.Item
            title="Нет доступных стажёров. Создайте стажёра сначала."
            titleStyle={styles.noInternsText}
            left={props => <List.Icon {...props} icon="alert" color="#FF3B30" />}
          />
        )}

        <Button
          mode="contained"
          onPress={createTask}
          disabled={isLoading || interns.length === 0}
          loading={isLoading}
          style={styles.button}
        >
          Создать задачу
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
    margin: 10,
    borderRadius: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
  },
  pickerLabel: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  noInternsText: {
    color: '#FF3B30',
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
});