import os
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.utils import secure_filename
from models import db, User, Task, Notification, FitnessLog, DailyNote
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
app.config['SECRET_KEY'] = 'super-secret-key-v3'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///taskflow.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads', 'profile_images')

db.init_app(app)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

with app.app_context():
    db.create_all()

# --- APScheduler Background Job ---
def check_reminders():
    with app.app_context():
        try:
            now = datetime.now()
            tasks = Task.query.filter(
                Task.completed == False, 
                Task.notified == False, 
                Task.reminder != 'none',
                Task.date != None,
                Task.date != '',
                Task.time != None,
                Task.time != ''
            ).all()
            
            for task in tasks:
                try:
                    task_dt_str = f"{task.date} {task.time}"
                    task_time = datetime.strptime(task_dt_str, "%Y-%m-%d %H:%M")
                    
                    reminder_delta = timedelta(0)
                    if task.reminder == '10m': reminder_delta = timedelta(minutes=10)
                    elif task.reminder == '30m': reminder_delta = timedelta(minutes=30)
                    elif task.reminder == '1h': reminder_delta = timedelta(hours=1)
                    
                    trigger_time = task_time - reminder_delta
                    
                    if now >= trigger_time:
                        msg = f"Reminder: Your task '{task.title}' is due at {task.time}"
                        new_notif = Notification(user_id=task.user_id, message=msg, type='in-app')
                        db.session.add(new_notif)
                        task.notified = True
                        print(f"[SMS SIMULATION] Sent to User {task.user_id}: {msg}")
                        
                except Exception as e:
                    print(f"Error parsing task date/time for task {task.id}: {e}")
                    
            db.session.commit()
        except Exception as header_e:
            print(f"Scheduler Database error: {header_e}")

scheduler = BackgroundScheduler()
scheduler.add_job(func=check_reminders, trigger="interval", minutes=5)
scheduler.start()

# Stop scheduler gracefully
import atexit
atexit.register(lambda: scheduler.shutdown())


# --- Auth Middleware ---
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Views ---
@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            return redirect(url_for('index'))
        return render_template('login.html', error='Invalid email or password')
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        phone = request.form.get('phone') # Optional, added in V3
        
        if User.query.filter_by(email=email).first():
            return render_template('signup.html', error='Email already registered')
            
        new_user = User(name=name, email=email, phone=phone)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        session['user_id'] = new_user.id
        return redirect(url_for('index'))
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))

# --- APIs ---
@app.route('/api/user', methods=['GET'])
@login_required
def get_user():
    user = User.query.get(session['user_id'])
    
    # Calculate Streak updates
    today_str = datetime.now().strftime("%Y-%m-%d")
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # If the user hasn't completed anything since before yesterday, break the streak
    if user.last_completed_date and user.last_completed_date < yesterday_str:
        user.current_streak = 0
        db.session.commit()
        
    return jsonify(user.to_dict())

@app.route('/api/profile', methods=['POST'])
@login_required
def update_profile():
    user = User.query.get(session['user_id'])
    if 'name' in request.form: user.name = request.form['name']
    if 'email' in request.form: user.email = request.form['email']
    if 'phone' in request.form: user.phone = request.form['phone']
        
    if 'profile_image' in request.files:
        file = request.files['profile_image']
        if file.filename != '':
            filename = secure_filename(f"user_{user.id}_{file.filename}")
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            user.profile_image = filename
            
    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict()})

@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    tasks = Task.query.filter_by(user_id=session['user_id']).all()
    return jsonify([t.to_dict() for t in tasks])

@app.route('/api/tasks', methods=['POST'])
@login_required
def create_task():
    data = request.json
    new_task = Task(
        user_id=session['user_id'],
        title=data.get('title'),
        category=data.get('categoryId'),
        date=data.get('date'),
        time=data.get('time'),
        priority=data.get('priority', 'medium'),
        reminder=data.get('reminder', 'none')
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/api/tasks/<int:task_id>', methods=['PATCH'])
@login_required
def update_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=session['user_id']).first()
    if not task: return jsonify({'error': 'Not found'}), 404
        
    data = request.json
    if 'completed' in data:
        # Handle Streak Logic if newly completed today
        if data['completed'] == True and task.completed == False:
            user = User.query.get(session['user_id'])
            today_str = datetime.now().strftime("%Y-%m-%d")
            if user.last_completed_date != today_str:
                user.current_streak += 1
                user.last_completed_date = today_str
        task.completed = data['completed']
        
    if 'title' in data: task.title = data['title']
    if 'category' in data: task.category = data['category']
    if 'date' in data: task.date = data['date']
    if 'time' in data: task.time = data['time']
    if 'priority' in data: task.priority = data['priority']
    if 'reminder' in data: 
        task.reminder = data['reminder']
        task.notified = False # reset notification flag if reminder changed
        
    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=session['user_id']).first()
    if not task: return jsonify({'error': 'Not found'}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    notifs = Notification.query.filter_by(user_id=session['user_id']).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifs])

@app.route('/api/notifications/<int:notif_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notif_id):
    notif = Notification.query.filter_by(id=notif_id, user_id=session['user_id']).first()
    if notif:
        notif.read = True
        db.session.commit()
    return jsonify({'success': True})

# --- Fitness Module ---
@app.route('/fitness')
@login_required
def fitness():
    return render_template('fitness.html')

@app.route('/api/fitness/today', methods=['GET', 'PATCH'])
@login_required
def fitness_today():
    import json
    user_id = session['user_id']
    user = User.query.get(user_id)
    if not user:
        session.clear()
        return jsonify({'error': 'Unauthorized'}), 401
        
    today_str = datetime.now().strftime("%Y-%m-%d")
    log = FitnessLog.query.filter_by(user_id=user_id, date=today_str).first()
    
    def evaluate_streak(current_log, yest_log, user_pinned):
        # Did yesterday fullfill all criteria?
        # Criteria: water_ml >= water_goal_ml, workout_done, and all user_pinned completed in exercises_data
        if not yest_log: return False
        if yest_log.water_ml < yest_log.water_goal_ml: return False
        if not yest_log.workout_done: return False
        
        try:
            ex_data = json.loads(yest_log.exercises_data)
        except:
            ex_data = []
        
        completed_names = [e['name'] for e in ex_data if e.get('completed')]
        for p in user_pinned:
            if p not in completed_names:
                return False
        return True
    
    if request.method == 'GET':
        if not log:
            yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            yesterday_log = FitnessLog.query.filter_by(user_id=user_id, date=yesterday_str).first()
            new_streak = 0
            
            try:
                user_pinned = json.loads(user.pinned_habits) if user.pinned_habits else []
            except:
                user_pinned = []
                
            if evaluate_streak(None, yesterday_log, user_pinned):
                new_streak = yesterday_log.fitness_streak
                
            log = FitnessLog(
                user_id=user_id, 
                date=today_str, 
                fitness_streak=new_streak
            )
            db.session.add(log)
            db.session.commit()
            
        return jsonify(log.to_dict())
        
    elif request.method == 'PATCH':
        if not log:
            return jsonify({'error': 'Log not found'}), 404
            
        data = request.json
        if 'add_water' in data:
            log.water_ml += data['add_water']
                    
        if 'exercise' in data:
            ex_data = []
            try:
                ex_data = json.loads(log.exercises_data) if log.exercises_data else []
            except: pass
            
            # Exercise payload: {'name': 'Running', 'type': 'boost', 'completed': True, 'pinned': True/False}
            ex_payload = data['exercise']
            # Find if existing, remove or update
            ex_data = [e for e in ex_data if e['name'] != ex_payload['name']]
            ex_data.append(ex_payload)
            
            log.exercises_data = json.dumps(ex_data)
            log.workout_done = True
        
        # Streak evaluation for TODAY
        try:
            user_pinned = json.loads(user.pinned_habits) if user.pinned_habits else []
        except:
            user_pinned = []
            
        # Temporarily evaluating today as if it were yesterday relative to tomorrow
        # Real streak increment happens if they hit all rules
        hits_criteria = True
        if log.water_ml < log.water_goal_ml: hits_criteria = False
        if not log.workout_done: hits_criteria = False
        
        try:
            cur_ex = json.loads(log.exercises_data) if log.exercises_data else []
        except: cur_ex = []
        cur_comp = [c['name'] for c in cur_ex if c.get('completed')]
        
        for p in user_pinned:
            if p not in cur_comp:
                hits_criteria = False
        
        yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        yesterday_log = FitnessLog.query.filter_by(user_id=user_id, date=yesterday_str).first()
        base_streak = 0
        if evaluate_streak(None, yesterday_log, user_pinned):
            base_streak = yesterday_log.fitness_streak
            
        if hits_criteria:
            log.fitness_streak = base_streak + 1
        else:
            log.fitness_streak = base_streak
        
        db.session.commit()
        return jsonify(log.to_dict())

@app.route('/api/fitness/habit', methods=['PATCH'])
@login_required
def toggle_habit():
    import json
    user = User.query.get(session['user_id'])
    data = request.json
    habit_name = data.get('habit')
    
    try:
        pinned = json.loads(user.pinned_habits) if user.pinned_habits else []
    except:
        pinned = []
        
    if habit_name in pinned:
        pinned.remove(habit_name)
    else:
        pinned.append(habit_name)
        
    user.pinned_habits = json.dumps(pinned)
    db.session.commit()
    return jsonify({'success': True, 'pinned_habits': pinned})


# --- Journal Module ---
@app.route('/journal')
@login_required
def journal():
    return render_template('journal.html')

@app.route('/api/journal/<date_str>', methods=['GET'])
@login_required
def get_journal(date_str):
    note = DailyNote.query.filter_by(user_id=session['user_id'], date=date_str).first()
    if note:
        return jsonify(note.to_dict())
    return jsonify({'id': None, 'date': date_str, 'content': ''})

@app.route('/api/journal', methods=['POST'])
@login_required
def save_journal():
    data = request.json
    date_str = data.get('date')
    content = data.get('content', '')
    
    note = DailyNote.query.filter_by(user_id=session['user_id'], date=date_str).first()
    if note:
        note.content = content
    else:
        note = DailyNote(user_id=session['user_id'], date=date_str, content=content)
        db.session.add(note)
        
    db.session.commit()
    return jsonify(note.to_dict())

if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False) # Prevent double scheduler
