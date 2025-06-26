import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  Button,
  Text,
  FAB,
  Portal,
  Dialog,
  ActivityIndicator,
  Divider,
  List,
  Surface,
  IconButton,
} from 'react-native-paper';
import { FlatList } from 'react-native';
import * as Notifications from 'expo-notifications';

const API_BASE_URL = 'http://localhost:5001';

const STATUS_COLORS = {
  backlog: '#FF9500',
  in_progress: '#007AFF',
  in_review: '#FF3B30',
  done: '#34C759',
};

const STATUS_LABELS = {
  backlog: 'В очереди',
  in_progress: 'В работе',
  in_review: 'На проверке',
  done: 'Выполнено',
};

export default function TaskListScreen({ navigation, user }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTasks();
    scheduleNotifications();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/tasks?user_id=${user.id}&role=${user.role}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data);
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось загрузить задачи');
      }
    } catch (error) {
      Alert.alert('Ошибка сети', 'Не удалось подключиться к серверу');
      console.error('Ошибка загрузки задач:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const scheduleNotifications = async () => {
    if (user.role === 'intern') {
      // Планируем уведомления о дедлайнах для стажёра
      const response = await fetch(
        `${API_BASE_URL}/tasks?user_id=${user.id}&role=${user.role}`
      );
      const tasks = await response.json();
      
      tasks.forEach(task => {
        if (task.due_date && task.status !== 'done') {
          const dueDate = new Date(task.due_date);
          const notificationDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
          
          if (notificationDate > new Date()) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Напоминание о дедлайне',
                body: `Задача "${task.title}" должна быть выполнена завтра`,
              },
              trigger: notificationDate,
            });
          }
        }
      });
    }
  };

  const [statusDialogVisible, setStatusDialogVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState(null);

  const updateTaskStatus = async (taskId, currentStatus) => {
    const statusOptions = getAvailableStatuses(currentStatus);
    
    if (statusOptions.length === 0) {
      Alert.alert('Информация', 'Нет доступных статусов для изменения');
      return;
    }

    setSelectedTaskId(taskId);
    setSelectedTaskStatus(currentStatus);
    setStatusDialogVisible(true);
  };

  const handleStatusChange = (newStatus) => {
    setStatusDialogVisible(false);
    changeTaskStatus(selectedTaskId, newStatus);
  };

  const getAvailableStatuses = (currentStatus) => {
    if (user.role === 'admin') {
      return ['backlog', 'in_progress', 'in_review', 'done'].filter(
        status => status !== currentStatus
      );
    } else {
      // Стажёр может менять только определённые статусы
      const transitions = {
        backlog: ['in_progress'],
        in_progress: ['in_review'],
      };
      return transitions[currentStatus] || [];
    }
  };

  const changeTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          status: newStatus,
          user_id: user.id,
          role: user.role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Успех', 'Статус задачи обновлён');
        loadTasks();
        
        // Уведомление админу о смене статуса стажёром
        if (user.role === 'intern') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Статус задачи изменён',
              body: `Стажёр изменил статус задачи на "${STATUS_LABELS[newStatus]}"`,
            },
            trigger: null,
          });
        }
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось обновить статус');
      }
    } catch (error) {
      Alert.alert('Ошибка сети', 'Не удалось подключиться к серверу');
      console.error('Ошибка обновления статуса:', error);
    }
  };

  const exportTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/export?role=${user.role}`);
      const data = await response.json();

      if (response.ok) {
        await Share.share({
          message: data.csv_data,
          title: 'Экспорт задач',
        });
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось экспортировать задачи');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось экспортировать задачи');
      console.error('Ошибка экспорта:', error);
    }
  };

  const renderTask = ({ item }) => (
    <Card style={styles.taskCard} elevation={2}>
      <Card.Content>
        <View style={styles.taskHeader}>
          <Title style={styles.taskTitle}>{item.title}</Title>
          <Chip
            mode="flat"
            style={{ backgroundColor: STATUS_COLORS[item.status] }}
            textStyle={{ color: '#fff' }}
          >
            {STATUS_LABELS[item.status]}
          </Chip>
        </View>
        
        {item.description ? (
          <Paragraph style={styles.taskDescription}>{item.description}</Paragraph>
        ) : null}
        
        <Divider style={{ marginVertical: 10 }} />
        
        <View style={styles.taskInfo}>
          {item.due_date && (
            <List.Item
              title={`Дедлайн: ${new Date(item.due_date).toLocaleDateString('ru-RU')}`}
              left={props => <List.Icon {...props} icon="calendar" color="#FF3B30" />}
              titleStyle={styles.dueDate}
            />
          )}
          {user.role === 'admin' && item.assigned_login && (
            <List.Item
              title={`Назначен: ${item.assigned_login}`}
              left={props => <List.Icon {...props} icon="account" />}
              titleStyle={styles.assignee}
            />
          )}
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() => updateTaskStatus(item.id, item.status)}
          style={{ backgroundColor: '#34C759' }}
        >
          Изменить статус
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      {user.role === 'admin' && (
        <Surface style={styles.adminButtons} elevation={4}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate('CreateTask')}
            style={styles.adminButton}
          >
            Создать задачу
          </Button>
          
          <Button
            mode="contained"
            icon="account-plus"
            onPress={() => navigation.navigate('CreateUser')}
            style={styles.adminButton}
          >
            Создать стажёра
          </Button>
          
          <Button
            mode="contained"
            icon="file-export"
            onPress={exportTasks}
            style={styles.adminButton}
          >
            Экспорт CSV
          </Button>
        </Surface>
      )}

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTasks} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={styles.emptyText} size="large" />
          ) : (
            <Text style={styles.emptyText}>Нет задач</Text>
          )
        }
      />

      {user.role === 'admin' && (
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => navigation.navigate('CreateTask')}
        />
      )}

      <Portal>
        <Dialog
          visible={statusDialogVisible}
          onDismiss={() => setStatusDialogVisible(false)}
        >
          <Dialog.Title>Изменить статус</Dialog.Title>
          <Dialog.Content>
            {getAvailableStatuses(selectedTaskStatus).map(status => (
              <List.Item
                key={status}
                title={STATUS_LABELS[status]}
                left={props => <List.Icon {...props} icon="arrow-right" />}
                onPress={() => handleStatusChange(status)}
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStatusDialogVisible(false)}>Отмена</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  adminButtons: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    justifyContent: 'space-around',
  },
  adminButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  taskCard: {
    margin: 10,
    borderRadius: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskTitle: {
    flex: 1,
    marginRight: 10,
  },
  taskDescription: {
    marginVertical: 10,
  },
  taskInfo: {
    marginTop: 5,
  },
  dueDate: {
    fontSize: 14,
    color: '#FF3B30',
  },
  assignee: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
  },
});