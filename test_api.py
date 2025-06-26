#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json

API_BASE_URL = 'http://localhost:5001'

def test_login():
    print("Тестирование входа...")
    
    # Тест входа администратора
    response = requests.post(API_BASE_URL + '/login', 
                           json={'login': 'admin', 'password': 'admin123'})
    
    if response.status_code == 200:
        admin_data = response.json()
        print("✅ Вход администратора успешен: " + str(admin_data))
        return admin_data
    else:
        print("❌ Ошибка входа администратора: " + response.text)
        return None

def test_get_tasks(user_data):
    print("Тестирование получения задач...")
    
    response = requests.get(API_BASE_URL + '/tasks', 
                          params={'user_id': user_data['id'], 'role': user_data['role']})
    
    if response.status_code == 200:
        tasks = response.json()
        print("✅ Получено задач: " + str(len(tasks)))
        return tasks
    else:
        print("❌ Ошибка получения задач: " + response.text)
        return []

def main():
    print("🚀 Тестирование API системы управления задачами")
    print("=" * 50)
    
    # Тест входа
    admin_data = test_login()
    if not admin_data:
        return
    
    # Тест получения задач
    tasks = test_get_tasks(admin_data)
    
    print("\n🎉 Тестирование завершено!")
    print("Задач найдено: " + str(len(tasks)))

if __name__ == '__main__':
    main()