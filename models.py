from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    profile_image = db.Column(db.String(255), default='default_avatar.png')
    
    # Productivity Stats
    current_streak = db.Column(db.Integer, default=0)
    last_completed_date = db.Column(db.String(20), nullable=True) # YYYY-MM-DD
    pinned_habits = db.Column(db.Text, default="[]") # JSON array of exercise names
    
    tasks = db.relationship('Task', backref='user', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'profile_image': self.profile_image,
            'current_streak': self.current_streak,
            'pinned_habits': self.pinned_habits
        }

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.String(20), nullable=True)  # YYYY-MM-DD
    time = db.Column(db.String(20), nullable=True)  # HH:MM
    priority = db.Column(db.String(20), default='medium') # high, medium, low
    reminder = db.Column(db.String(20), default='none')   # 10m, 30m, 1h, none
    notified = db.Column(db.Boolean, default=False)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'categoryId': self.category,
            'date': self.date,
            'time': self.time,
            'priority': self.priority,
            'reminder': self.reminder,
            'completed': self.completed,
            'createdAt': self.created_at.isoformat()
        }

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(50), default='in-app') # in-app, sms
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'type': self.type,
            'read': self.read,
            'createdAt': self.created_at.isoformat()
        }

class FitnessLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.String(20), nullable=False) # YYYY-MM-DD
    water_ml = db.Column(db.Integer, default=0)
    water_goal_ml = db.Column(db.Integer, default=3000)
    workout_done = db.Column(db.Boolean, default=False)
    workout_name = db.Column(db.String(100), nullable=True)
    workout_duration = db.Column(db.Integer, nullable=True)
    fitness_streak = db.Column(db.Integer, default=0)
    exercises_data = db.Column(db.Text, default="[]") # JSON string
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'water_ml': self.water_ml,
            'water_goal_ml': self.water_goal_ml,
            'workout_done': self.workout_done,
            'workout_name': self.workout_name,
            'workout_duration': self.workout_duration,
            'fitness_streak': self.fitness_streak,
            'exercises_data': self.exercises_data
        }

class DailyNote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.String(20), nullable=False) # YYYY-MM-DD
    content = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'content': self.content,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }
