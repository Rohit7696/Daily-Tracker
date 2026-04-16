let currentUser = null;
let fitnessLog = null;
let pinnedHabits = [];
let completedExercises = [];

// Predefined Exercises
const EXERCISES = [
    { name: 'Running', type: 'boost', icon: 'person-standing' },
    { name: 'Yoga', type: 'boost', icon: 'flower-2' },
    { name: 'Meditation', type: 'boost', icon: 'brain' },
    { name: 'Cycling', type: 'normal', icon: 'bike' },
    { name: 'Pushups', type: 'normal', icon: 'dumbbell' },
    { name: 'Stretching', type: 'normal', icon: 'activity' }
];

document.addEventListener('DOMContentLoaded', () => {
    initFitness();
});

async function initFitness() {
    await fetchUser();
    await fetchFitnessToday();
    renderUI();
}

async function fetchUser() {
    try {
        const res = await fetch('/api/user');
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById('greeting-text').innerHTML = `Good Morning, <span class="bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple">${currentUser.name.split(' ')[0]}</span> 👋`;
            document.getElementById('nav-profile-img').src = `/static/uploads/profile_images/${currentUser.profile_image}`;
            
            try {
                pinnedHabits = JSON.parse(currentUser.pinned_habits || '[]');
            } catch(e) { pinnedHabits = []; }
        } else {
            window.location.href = '/login';
        }
    } catch (e) { console.error('Error fetching user', e); }
}

async function fetchFitnessToday() {
    try {
        const res = await fetch('/api/fitness/today');
        if (res.ok) {
            fitnessLog = await res.json();
            try {
                completedExercises = JSON.parse(fitnessLog.exercises_data || '[]');
            } catch(e) { completedExercises = []; }
        }
    } catch (e) { console.error('Error fetching fitness', e); }
}

function showToast(message, type='success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-enter glass-card px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg border-${type==='success'?'green-500':'neon-blue'}/40`;
    toast.innerHTML = `
        <i data-lucide="${type==='success'?'check-circle':'info'}" class="w-5 h-5 text-${type==='success'?'green-400':'neon-blue'}"></i>
        <span class="text-sm font-medium text-white shadow-sm">${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons({root: toast});
    
    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderUI() {
    if (!fitnessLog) return;
    
    // --- Water Logic ---
    const waterPct = Math.min((fitnessLog.water_ml / fitnessLog.water_goal_ml), 1);
    document.getElementById('water-current').textContent = fitnessLog.water_ml;
    document.getElementById('water-goal').textContent = fitnessLog.water_goal_ml;
    document.getElementById('water-percent').textContent = `${Math.round(waterPct * 100)}%`;
    
    const offset = 339.292 - (waterPct * 339.292);
    document.getElementById('water-ring').style.strokeDashoffset = offset;
    
    let waterCompleted = waterPct >= 1;
    if (waterCompleted) {
        document.getElementById('goal-water-wrap').classList.add('border-green-500/40', 'bg-green-500/10');
        const chk = document.getElementById('goal-water-check');
        chk.classList.replace('border-gray-500', 'border-green-500');
        chk.classList.add('bg-green-500');
        chk.querySelector('i').classList.remove('opacity-0');
        document.getElementById('goal-water-text').classList.add('line-through', 'text-gray-400');
    }

    // --- Exercise Grid Logic ---
    const grid = document.getElementById('exercise-grid');
    grid.innerHTML = '';
    
    // Inject Custom completed or pinned habits into EXERCISES pool
    const allExNames = new Set(EXERCISES.map(e => e.name));
    completedExercises.forEach(ce => {
        if (!allExNames.has(ce.name)) {
            EXERCISES.push({ name: ce.name, type: 'normal', icon: 'zap' });
            allExNames.add(ce.name);
        }
    });
    pinnedHabits.forEach(ph => {
        if (!allExNames.has(ph)) {
            EXERCISES.push({ name: ph, type: 'normal', icon: 'zap' });
            allExNames.add(ph);
        }
    });
    
    EXERCISES.forEach(ex => {
        const isCompleted = completedExercises.some(ce => ce.name === ex.name && ce.completed);
        const isPinned = pinnedHabits.includes(ex.name);
        const isBoost = ex.type === 'boost';
        
        const btn = document.createElement('div');
        btn.className = `relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer group hover:-translate-y-1 ${
            isCompleted ? 'exercise-selected' : 
            isBoost ? 'bg-dark-800/80 border-amber-500/30 boost-glow' : 
            'bg-dark-800 border-white/5 hover:bg-white/5 hover:border-white/20 shadow-inner'
        }`;
        
        btn.onclick = () => logExercise(ex.name, ex.type);

        let badgeHtml = '';
        if (isBoost && !isCompleted) {
            badgeHtml = `<span class="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)] z-10">⭐ BOOST</span>`;
        }

        const pinColor = isPinned ? 'text-neon-pink drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]' : 'text-gray-600 hover:text-white';
        
        btn.innerHTML = `
            ${badgeHtml}
            <button onclick="event.stopPropagation(); toggleHabit('${ex.name}')" class="absolute top-2 right-2 p-1 z-20 transition-colors">
                <i data-lucide="pin" class="w-3.5 h-3.5 ${pinColor}"></i>
            </button>
            <div class="p-2 rounded-xl mb-2 ${isCompleted ? 'bg-green-500/20 text-green-400' : isBoost ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-white/5 text-gray-400'}">
                <i data-lucide="${isCompleted ? 'check' : ex.icon}" class="w-5 h-5"></i>
            </div>
            <span class="text-xs font-semibold ${isCompleted ? 'text-green-400' : 'text-gray-300'}">${ex.name}</span>
        `;
        grid.appendChild(btn);
    });

    // --- Daily Goals Checklist Logic ---
    let workoutCompleted = fitnessLog.workout_done;
    if (workoutCompleted) {
        document.getElementById('goal-workout-wrap').classList.add('border-green-500/40', 'bg-green-500/10');
        const chk = document.getElementById('goal-workout-check');
        chk.classList.replace('border-gray-500', 'border-green-500');
        chk.classList.add('bg-green-500');
        chk.querySelector('i').classList.remove('opacity-0');
        document.getElementById('goal-workout-text').classList.add('line-through', 'text-gray-400');
    }

    const pinnedList = document.getElementById('pinned-habits-list');
    const divider = document.getElementById('habits-divider');
    pinnedList.innerHTML = '';
    
    if (pinnedHabits.length > 0) {
        divider.classList.remove('hidden');
        pinnedHabits.forEach(habitName => {
            const ex = EXERCISES.find(e => e.name === habitName) || { type: 'normal' };
            const isCompleted = completedExercises.some(ce => ce.name === habitName && ce.completed);
            
            const wrap = document.createElement('div');
            wrap.className = `flex items-center justify-between p-3 rounded-xl border transition-all ${isCompleted ? 'bg-green-500/10 border-green-500/40' : 'bg-dark-800/30 border-white/5'}`;
            
            wrap.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-5 h-5 rounded border ${isCompleted ? 'border-green-500 bg-green-500' : 'border-gray-500'} flex items-center justify-center transition-colors">
                        <i data-lucide="check" class="w-3 h-3 text-white ${isCompleted ? '' : 'opacity-0'}"></i>
                    </div>
                    <span class="text-sm font-medium ${isCompleted ? 'line-through text-gray-400' : 'text-white'}">${habitName}</span>
                    <i data-lucide="pin" class="w-3 h-3 text-neon-pink ml-1"></i>
                </div>
                <span class="text-[10px] ${ex.type === 'boost' ? 'text-amber-400' : 'text-gray-400'} font-bold">${ex.type === 'boost' ? '+25 pts' : '+10 pts'}</span>
            `;
            pinnedList.appendChild(wrap);
        });
    } else {
        divider.classList.add('hidden');
    }

    // --- Dynamic Score Calculation ---
    // Water: +30, Workout: +30, Normal: +10, Boost: +25, All Pinned: +20
    let score = 0;
    if (waterCompleted) score += 30;
    if (workoutCompleted) score += 30;
    
    completedExercises.forEach(ce => {
        if (ce.type === 'boost') score += 25;
        else score += 10;
    });

    let allPinnedDone = false;
    if (pinnedHabits.length > 0) {
        allPinnedDone = pinnedHabits.every(ph => completedExercises.some(ce => ce.name === ph && ce.completed));
        if (allPinnedDone) score += 20;
    }

    const maxVisual = Math.min(score, 100);
    document.getElementById('wellness-score').textContent = `${score}%`;
    document.getElementById('wellness-progress-bar').style.width = `${maxVisual}%`;
    
    // Streak counts
    document.getElementById('sidebar-streak-count').textContent = fitnessLog.fitness_streak;
    document.getElementById('main-streak-count').textContent = fitnessLog.fitness_streak;

    lucide.createIcons();
}

async function toggleHabit(name) {
    try {
        const res = await fetch('/api/fitness/habit', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ habit: name })
        });
        if (res.ok) {
            const data = await res.json();
            pinnedHabits = data.pinned_habits;
            renderUI();
        }
    } catch(e) { console.error('Toggle Habit Error', e); }
}

async function addWater(ml) {
    try {
        const wasBelow = fitnessLog.water_ml < fitnessLog.water_goal_ml;
        
        const res = await fetch('/api/fitness/today', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ add_water: ml })
        });
        
        if (res.ok) {
            await fetchFitnessToday(); // reload full state including streak
            renderUI();
            
            if (wasBelow && fitnessLog.water_ml >= fitnessLog.water_goal_ml) {
                showToast('Hydration Goal Reached! 💧', 'success');
            }
        }
    } catch (e) { console.error('Error adding water', e); }
}

async function logExercise(name, type) {
    // If already complete, do nothing (or we could allow toggle off, but for streaks simple additive is fine)
    if (completedExercises.some(ce => ce.name === name && ce.completed)) return;
    
    const wasPinnedDone = pinnedHabits.length > 0 && pinnedHabits.every(ph => completedExercises.some(ce => ce.name === ph && ce.completed));

    try {
        const res = await fetch('/api/fitness/today', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                exercise: { name: name, type: type, completed: true }
            })
        });
        
        if (res.ok) {
            await fetchFitnessToday(); // reload full state
            renderUI();
            
            if (type === 'boost') {
                showToast(`⭐ Boost Exercise Done! (+25 pts)`, 'success');
            } else {
                showToast(`💪 ${name} Logged!`, 'success');
            }
            
            // Re-evaluate if all pinned just got completed
            if (pinnedHabits.length > 0) {
                const isPinnedDoneNow = pinnedHabits.every(ph => completedExercises.some(ce => ce.name === ph && ce.completed));
                if (!wasPinnedDone && isPinnedDoneNow) {
                    setTimeout(() => showToast('🔥 All Daily Habits Completed! (+20 pts)', 'success'), 1000);
                }
            }
        }
    } catch (e) { console.error('Error logging exercise', e); }
}

function toggleCustomEx() {
    document.getElementById('btn-show-custom').classList.add('hidden');
    document.getElementById('custom-ex-container').classList.remove('hidden');
    document.getElementById('custom-ex-name').focus();
}

function submitCustomEx() {
    const input = document.getElementById('custom-ex-name');
    const name = input.value.trim();
    if (name) {
        logExercise(name, 'normal');
        input.value = '';
    }
    document.getElementById('btn-show-custom').classList.remove('hidden');
    document.getElementById('custom-ex-container').classList.add('hidden');
}
