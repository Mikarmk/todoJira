# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import csv
try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)

# Инициализация базы данных
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Создание таблицы пользователей
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'intern'))
        )
    ''')
    
    # Создание таблицы задач
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'in_review', 'done')),
            due_date TEXT,
            assigned_to INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_to) REFERENCES users (id)
        )
    ''')
    
    # Создание администратора по умолчанию
    cursor.execute('SELECT COUNT(*) FROM users WHERE role = "admin"')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO users (login, password, role) 
            VALUES ('admin', 'admin123', 'admin')
        ''')
    
    # Создание тестового стажёра
    cursor.execute('SELECT COUNT(*) FROM users WHERE login = "intern1"')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO users (login, password, role) 
            VALUES ('intern1', 'intern123', 'intern')
        ''')
    
    conn.commit()
    conn.close()

# Авторизация
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    login = data.get('login')
    password = data.get('password')
    
    if not login or not password:
        return jsonify({'error': 'Логин и пароль обязательны'}), 400
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, role FROM users WHERE login = ? AND password = ?', (login, password))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return jsonify({'id': user[0], 'role': user[1]})
    else:
        return jsonify({'error': 'Неверный логин или пароль'}), 401

# Получение задач
@app.route('/tasks', methods=['GET'])
def get_tasks():
    user_id = request.args.get('user_id')
    role = request.args.get('role')
    
    if not user_id or not role:
        return jsonify({'error': 'user_id и role обязательны'}), 400
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    if role == 'admin':
        # Админ видит все задачи
        cursor.execute('''
            SELECT t.id, t.title, t.description, t.status, t.due_date, t.assigned_to, t.created_at, u.login
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            ORDER BY t.created_at DESC
        ''')
    else:
        # Стажёр видит только свои задачи
        cursor.execute('''
            SELECT t.id, t.title, t.description, t.status, t.due_date, t.assigned_to, t.created_at, u.login
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.assigned_to = ?
            ORDER BY t.created_at DESC
        ''', (user_id,))
    
    tasks = cursor.fetchall()
    conn.close()
    
    task_list = []
    for task in tasks:
        task_list.append({
            'id': task[0],
            'title': task[1],
            'description': task[2],
            'status': task[3],
            'due_date': task[4],
            'assigned_to': task[5],
            'created_at': task[6],
            'assigned_login': task[7]
        })
    
    return jsonify(task_list)

# Создание задачи (только админ)
@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    role = data.get('role')
    
    if role != 'admin':
        return jsonify({'error': 'Только администратор может создавать задачи'}), 403
    
    title = data.get('title')
    description = data.get('description', '')
    due_date = data.get('due_date')
    assigned_to = data.get('assigned_to')
    
    if not title or not assigned_to:
        return jsonify({'error': 'Заголовок и назначенный пользователь обязательны'}), 400
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (title, description, due_date, assigned_to)
        VALUES (?, ?, ?, ?)
    ''', (title, description, due_date, assigned_to))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Задача создана успешно'})

# Изменение статуса задачи
@app.route('/tasks/status', methods=['POST'])
def update_task_status():
    data = request.get_json()
    task_id = data.get('task_id')
    new_status = data.get('status')
    user_id = data.get('user_id')
    role = data.get('role')
    
    if not task_id or not new_status or not user_id or not role:
        return jsonify({'error': 'Все поля обязательны'}), 400
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Проверка прав доступа
    if role == 'intern':
        cursor.execute('SELECT status, assigned_to FROM tasks WHERE id = ?', (task_id,))
        task = cursor.fetchone()
        
        if not task:
            conn.close()
            return jsonify({'error': 'Задача не найдена'}), 404
        
        if task[1] != int(user_id):
            conn.close()
            return jsonify({'error': 'Вы можете изменять только свои задачи'}), 403
        
        current_status = task[0]
        
        # Проверка разрешённых переходов для стажёра
        allowed_transitions = {
            'backlog': ['in_progress'],
            'in_progress': ['in_review']
        }
        
        if new_status not in allowed_transitions.get(current_status, []):
            conn.close()
            return jsonify({'error': 'Недопустимый переход статуса'}), 400
    
    # Обновление статуса
    cursor.execute('UPDATE tasks SET status = ? WHERE id = ?', (new_status, task_id))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Статус задачи обновлён'})

# Создание пользователя (только админ)
@app.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    role = data.get('role')
    
    if role != 'admin':
        return jsonify({'error': 'Только администратор может создавать пользователей'}), 403
    
    login = data.get('login')
    password = data.get('password')
    
    if not login or not password:
        return jsonify({'error': 'Логин и пароль обязательны'}), 400
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO users (login, password, role)
            VALUES (?, ?, 'intern')
        ''', (login, password))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Пользователь создан успешно'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Пользователь с таким логином уже существует'}), 400

# Получение списка стажёров
@app.route('/interns', methods=['GET'])
def get_interns():
    role = request.args.get('role')
    
    if role != 'admin':
        return jsonify({'error': 'Только администратор может просматривать список стажёров'}), 403
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, login FROM users WHERE role = "intern"')
    interns = cursor.fetchall()
    conn.close()
    
    intern_list = [{'id': intern[0], 'login': intern[1]} for intern in interns]
    return jsonify(intern_list)

# Экспорт задач в CSV
@app.route('/export', methods=['GET'])
def export_tasks():
    role = request.args.get('role')
    
    if role != 'admin':
        return jsonify({'error': 'Только администратор может экспортировать задачи'}), 403
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        SELECT t.id, t.title, t.description, t.status, t.due_date, u.login, t.created_at
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        ORDER BY t.created_at DESC
    ''')
    tasks = cursor.fetchall()
    conn.close()
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Заголовок', 'Описание', 'Статус', 'Дедлайн', 'Назначен', 'Создано'])
    
    for task in tasks:
        writer.writerow(task)
    
    csv_data = output.getvalue()
    output.close()
    
    return jsonify({'csv_data': csv_data})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001)