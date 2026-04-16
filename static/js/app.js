// Initial data structures and logic
const DEFAULT_CATEGORIES = [
    { id: 'cat_work', name: 'Work', color: 'blue', icon: 'briefcase' },
    { id: 'cat_personal', name: 'Personal', color: 'purple', icon: 'user' },
    { id: 'cat_study', name: 'Study', color: 'yellow', icon: 'book-open' },
    { id: 'cat_health', name: 'Health', color: 'pink', icon: 'heart' }
];

const COLOR_MAP = {
    'blue': { border: 'border-neon-blue/40', bg: 'bg-neon-blue/10', text: 'text-neon-blue', icon: 'text-neon-blue', shadow: 'shadow-neon-blue/20' },
    'purple': { border: 'border-neon-purple/40', bg: 'bg-neon-purple/10', text: 'text-neon-purple', icon: 'text-neon-purple', shadow: 'shadow-neon-purple/20' },
    'pink': { border: 'border-neon-pink/40', bg: 'bg-neon-pink/10', text: 'text-neon-pink', icon: 'text-neon-pink', shadow: 'shadow-neon-pink/20' },
    'yellow': { border: 'border-neon-yellow/40', bg: 'bg-neon-yellow/10', text: 'text-neon-yellow', icon: 'text-neon-yellow', shadow: 'shadow-neon-yellow/20' },
    'green': { border: 'border-green-500/40', bg: 'bg-green-500/10', text: 'text-green-500', icon: 'text-green-500', shadow: 'shadow-green-500/20' }
};

const PRIORITY_ICONS = {
    'high': '🔴',
    'medium': '🟡',
    'low': '🟢'
};

let tasks = [];
let categories = JSON.parse(localStorage.getItem('taskflow_cats')) || DEFAULT_CATEGORIES;
let currentFilter = 'all';
let currentUser = null;
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setDate();
    setupEventListeners();
    await fetchUser();
    await fetchTasks();
    await fetchNotifications();
    renderCategories();
    renderFilters();
    renderTasks();
    updateProgress();
    
    // Setup background fetch for Notifications
    setInterval(fetchNotifications, 60000); // Check every 1m
}

function setDate() {
    const opts = { weekday: 'long', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', opts);
}

function showToast(message, type='success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-enter glass-card px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg ${type==='success'?'border-green-500/40':'border-neon-blue/40'}`;
    toast.innerHTML = `
        <i data-lucide="${type==='success'?'check-circle':'info'}" class="w-5 h-5 ${type==='success'?'text-green-400':'text-neon-blue'}"></i>
        <span class="text-sm font-medium text-white">${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons({root: toast});
    
    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// === API Calls ===

async function fetchUser() {
    try {
        const res = await fetch('/api/user');
        if (res.ok) {
            currentUser = await res.json();
            updateProfileUI();
        } else {
            window.location.href = '/login';
        }
    } catch (e) {
        console.error('Error fetching user', e);
    }
}

async function fetchTasks() {
    try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
            tasks = await res.json();
        }
    } catch (e) {
        console.error('Error fetching tasks', e);
    }
}

async function fetchNotifications() {
    try {
        const res = await fetch('/api/notifications');
        if(res.ok) {
            const notifs = await res.json();
            renderNotifications(notifs);
        }
    } catch (e) {
        console.error('Error fetching notifications', e);
    }
}

async function markNotifRead(id) {
    try {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
        fetchNotifications();
    } catch (e) {}
}

async function apiAddTask(taskData) {
    try {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if(res.ok) return await res.json();
    } catch (e) { console.error('Error adding task', e); }
    return null;
}

async function apiUpdateTask(taskId, data) {
    try {
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if(res.ok) return await res.json();
    } catch (e) { console.error('Error updating task', e); }
    return null;
}

async function apiDeleteTask(taskId) {
    try {
        await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) { console.error('Error deleting task', e); }
}

async function updateProfileUI() {
    if(!currentUser) return;
    
    document.getElementById('greeting-text').innerHTML = `Good Morning, <span class="bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple">${currentUser.name.split(' ')[0]}</span> 👋`;
    
    // Navbar
    document.getElementById('nav-profile-name').textContent = currentUser.name;
    document.getElementById('nav-profile-email').textContent = currentUser.email;
    document.getElementById('nav-profile-img').src = `/static/uploads/profile_images/${currentUser.profile_image}`;
    
    // Streak
    document.getElementById('streak-count').textContent = currentUser.current_streak;
    
    // Modal
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-phone').value = currentUser.phone || '';
    document.getElementById('profile-preview').src = `/static/uploads/profile_images/${currentUser.profile_image}`;
}

// === Events ===

function setupEventListeners() {
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        document.documentElement.classList.toggle('light');
    });

    const modalOverlay = document.getElementById('modal-overlay');
    const taskModal = document.getElementById('add-task-modal');
    
    document.getElementById('btn-new-task').addEventListener('click', () => {
        document.getElementById('task-modal-title').textContent = 'Create New Task';
        document.getElementById('add-task-form').reset();
        document.getElementById('edit-task-id').value = '';
        document.getElementById('task-date').value = new Date().toISOString().split('T')[0];
        openModal(modalOverlay, taskModal);
    });
    document.getElementById('btn-close-task-modal').addEventListener('click', () => closeModal(modalOverlay, taskModal));
    
    const profileModal = document.getElementById('profile-modal');
    document.getElementById('btn-edit-profile').addEventListener('click', () => {
        document.getElementById('profile-dropdown').classList.add('hidden');
        openModal(modalOverlay, profileModal);
    });
    document.getElementById('btn-close-profile-modal').addEventListener('click', () => closeModal(modalOverlay, profileModal));

    modalOverlay.addEventListener('click', () => {
        closeModal(modalOverlay, taskModal);
        closeModal(modalOverlay, profileModal);
    });

    // Dropdowns
    setupDropdown('btn-profile', 'profile-dropdown', 'profile-menu-container');
    setupDropdown('btn-notifications', 'notif-dropdown', 'notif-menu-container');

    // Forms
    document.getElementById('add-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTask();
        closeModal(modalOverlay, taskModal);
    });

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const btn = document.getElementById('btn-save-profile');
        const oldText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving...`;
        
        try {
            const res = await fetch('/api/profile', { method: 'POST', body: formData });
            if(res.ok) {
                const data = await res.json();
                currentUser = data.user;
                updateProfileUI();
                showToast('Profile updated gracefully');
            }
        } catch(e) {}
        btn.innerHTML = oldText;
        closeModal(modalOverlay, profileModal);
    });

    document.getElementById('profile-image-upload').addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = e => document.getElementById('profile-preview').src = e.target.result;
            reader.readAsDataURL(this.files[0]);
        }
    });

    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTasks();
    });
}

function setupDropdown(btnId, dropId, containerId) {
    document.getElementById(btnId).addEventListener('click', (e) => {
        e.stopPropagation();
        const drop = document.getElementById(dropId);
        if(drop.classList.contains('hidden')) {
            drop.classList.remove('hidden');
            setTimeout(() => drop.classList.remove('opacity-0'), 10);
        } else {
            drop.classList.add('opacity-0');
            setTimeout(() => drop.classList.add('hidden'), 200);
        }
    });

    document.addEventListener('click', (e) => {
        const drop = document.getElementById(dropId);
        if(!drop.classList.contains('hidden') && !e.target.closest(`#${containerId}`)) {
            drop.classList.add('opacity-0');
            setTimeout(() => drop.classList.add('hidden'), 200);
        }
    });
}

function openModal(overlay, modal) {
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
        modal.classList.remove('opacity-0', 'scale-95');
        modal.classList.add('opacity-100', 'scale-100');
    });
    if(modal.id === 'add-task-modal' && document.getElementById('task-category').options.length === 0) {
        document.getElementById('task-category').innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

function closeModal(overlay, modal) {
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    modal.classList.remove('opacity-100', 'scale-100');
    modal.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
    }, 300);
}

// === Logic ===

function renderNotifications(notifs) {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    const unread = notifs.filter(n => !n.read);
    
    if(unread.length > 0) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    
    if(notifs.length === 0) {
        list.innerHTML = `<p class="text-xs text-center text-gray-500 py-4">No notifications yet.</p>`;
        return;
    }
    
    list.innerHTML = notifs.map(n => `
        <div class="px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}" onclick="markNotifRead(${n.id})">
            <p class="text-sm ${!n.read ? 'font-medium text-white' : 'text-gray-400'}">${n.message}</p>
            <p class="text-[10px] text-neon-blue mt-1">${new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
    `).join('');
}

function renderCategories() {
    const sidebarList = document.getElementById('category-list');
    sidebarList.innerHTML = categories.map(cat => {
        const cMap = COLOR_MAP[cat.color] || COLOR_MAP['blue'];
        return `
            <li>
                <button class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group" onclick="setFilter('${cat.id}')">
                    <div class="flex items-center gap-3">
                        <div class="w-6 h-6 rounded-md ${cMap.bg} flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-transform">
                            <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 ${cMap.icon}"></i>
                        </div>
                        <span class="text-sm font-medium transition-transform group-hover:translate-x-1">${cat.name}</span>
                    </div>
                </button>
            </li>
        `;
    }).join('');
    lucide.createIcons();
}

function renderFilters() {
    const container = document.getElementById('filter-container');
    const allCount = tasks.length;
    
    let html = `
        <button onclick="setFilter('all')" class="cursor-ring whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentFilter === 'all' ? 'bg-white text-dark-900 shadow-md' : 'bg-dark-800 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}">
            All Tasks <span class="ml-2 px-1.5 py-0.5 rounded-md ${currentFilter === 'all' ? 'bg-dark-900/10' : 'bg-dark-700'} text-xs">${allCount}</span>
        </button>
    `;
    
    categories.forEach(cat => {
        const count = getTaskCount(cat.id);
        const isActive = currentFilter === cat.id;
        html += `
            <button onclick="setFilter('${cat.id}')" class="cursor-ring whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white text-dark-900 shadow-md' : 'bg-dark-800 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}">
                ${cat.name} <span class="ml-2 px-1.5 py-0.5 rounded-md ${isActive ? 'bg-dark-900/10' : 'bg-dark-700'} text-xs">${count}</span>
            </button>
        `;
    });
    
    container.innerHTML = html;
    if(window.updateCursorInteractions) window.updateCursorInteractions();
}

function setFilter(filterId) {
    currentFilter = filterId;
    renderFilters();
    renderTasks();
}

function getTaskCount(catId) {
    return tasks.filter(t => t.categoryId === catId).length;
}

function getFormattedDateTimeStr(task) {
    if(!task.date && !task.time) return '';
    let res = '';
    if(task.date) {
        const d = new Date(task.date);
        res += d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    }
    if(task.time) {
        if(res) res += ' • ';
        const [h,m] = task.time.split(':');
        let hr = parseInt(h);
        const ampm = hr >= 12 ? 'PM' : 'AM';
        hr = hr % 12 || 12;
        res += `${hr}:${m} ${ampm}`;
    }
    return res;
}

function renderTasks() {
    let filtered = tasks;
    if (currentFilter !== 'all') {
        filtered = tasks.filter(t => t.categoryId === currentFilter);
    }
    if (searchQuery) {
        filtered = filtered.filter(t => t.title.toLowerCase().includes(searchQuery));
    }
    
    document.getElementById('task-count-text').textContent = filtered.filter(t => !t.completed).length;

    const sections = { overdue: [], today: [], upcoming: [], notime: [] };
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Priority Sort helper
    const pVal = { 'high': 3, 'medium': 2, 'low': 1 };

    filtered.forEach(task => {
        if(task.completed) {
            sections.upcoming.push(task);
            return;
        }
        if(!task.date) {
            sections.notime.push(task);
            return;
        }

        if(task.date < todayStr) sections.overdue.push(task);
        else if (task.date === todayStr) {
            if(task.time) {
                const parts = task.time.split(':');
                const taskTime = new Date();
                taskTime.setHours(parseInt(parts[0]), parseInt(parts[1]), 0);
                if(now > taskTime) sections.overdue.push(task);
                else sections.today.push(task);
            } else { sections.today.push(task); }
        } else {
            sections.upcoming.push(task);
        }
    });

    // Sort by priority then date/time
    ['overdue', 'today', 'upcoming', 'notime'].forEach(k => {
        sections[k].sort((a,b) => {
            if(a.completed !== b.completed) return a.completed ? 1 : -1;
            if(pVal[a.priority] !== pVal[b.priority]) return pVal[b.priority] - pVal[a.priority];
            if(a.date !== b.date) return (a.date||'').localeCompare(b.date||'');
            return (a.time||'').localeCompare(b.time||'');
        });
    });

    const nextTask = [...sections.today, ...sections.overdue].find(t => !t.completed);
    const nextWidget = document.getElementById('next-task-widget');
    if(nextTask) {
        document.getElementById('next-task-title').textContent = nextTask.title;
        document.getElementById('next-task-time').textContent = getFormattedDateTimeStr(nextTask);
        nextWidget.classList.remove('opacity-0');
    } else {
        nextWidget.classList.add('opacity-0');
    }

    renderTaskSection(sections.overdue, 'section-overdue', 'tasks-overdue', true);
    renderTaskSection([...sections.today, ...sections.notime], 'section-today', 'tasks-today');
    renderTaskSection(sections.upcoming, 'section-upcoming', 'tasks-upcoming');

    // Init SortableJS drag and drop
    initSortable();

    const emptyState = document.getElementById('empty-state');
    const tasksWrapper = document.getElementById('tasks-wrapper');
    if (filtered.length === 0) {
        tasksWrapper.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
    } else {
        tasksWrapper.classList.remove('hidden');
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
    }
    
    if(window.refreshScrollTriggers) setTimeout(window.refreshScrollTriggers, 50);
    if(window.updateCursorInteractions) window.updateCursorInteractions();
}

function renderTaskSection(tasksBucket, sectionId, containerId, isOverdue = false) {
    const sec = document.getElementById(sectionId);
    const container = document.getElementById(containerId);
    
    if(tasksBucket.length === 0) {
        sec.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    
    sec.classList.remove('hidden');
    container.innerHTML = tasksBucket.map(task => {
        const cat = categories.find(c => c.id === task.categoryId) || categories[0];
        const cMap = COLOR_MAP[cat.color] || COLOR_MAP['blue'];
        const dtStr = getFormattedDateTimeStr(task);
        const urgentClass = (!task.completed && isOverdue) ? 'task-urgent' : `priority-${task.priority}`;
        const pIcon = PRIORITY_ICONS[task.priority] || '🟡';
        
        return `
            <div data-id="${task.id}" class="task-item-card fold-item glass-card p-5 rounded-2xl flex flex-col gap-4 ${urgentClass} ${task.completed ? 'task-completed' : ''}" id="task-${task.id}">
                <div class="flex justify-between items-start gap-3">
                    <div class="flex items-start gap-3 flex-1 cursor-grab">
                        <div class="task-checkbox-wrapper mt-0.5 cursor-pointer">
                            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
                        </div>
                        <div class="flex-1">
                            <h4 class="font-semibold text-white task-text text-lg leading-tight mb-2">${task.title}</h4>
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${cMap.bg} ${cMap.text} flex items-center gap-1 w-max shadow-md ${cMap.shadow}">
                                    <i data-lucide="${cat.icon}" class="w-3 h-3"></i> ${cat.name}
                                </span>
                                <span class="text-[10px] bg-dark-800 px-2 py-1 rounded-md border border-white/5" title="Priority ${task.priority}">${pIcon}</span>
                                ${dtStr ? `
                                    <span class="px-2 py-1 rounded-md text-[10px] font-bold tracking-wider bg-dark-700/80 text-gray-300 border border-white/5 flex items-center gap-1 task-time-badge">
                                        <i data-lucide="clock" class="w-3 h-3"></i> ${dtStr}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button onclick="editTaskModal('${task.id}')" class="text-gray-500 hover:text-neon-blue p-1.5 hover:bg-neon-blue/10 rounded-lg transition-colors cursor-ring">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteTask('${task.id}')" class="text-gray-500 hover:text-red-400 p-1.5 hover:bg-red-400/10 rounded-lg transition-colors cursor-ring">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// === Edit Task & Save ===

function editTaskModal(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if(!task) return;
    
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-category').value = task.categoryId;
    document.getElementById('task-priority').value = task.priority || 'medium';
    document.getElementById('task-date').value = task.date || '';
    document.getElementById('task-time').value = task.time || '';
    document.getElementById('task-reminder').value = task.reminder || 'none';
    
    const taskCategorySelect = document.getElementById('task-category');
    if(taskCategorySelect.options.length === 0) {
        taskCategorySelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        taskCategorySelect.value = task.categoryId;
    }
    
    openModal(document.getElementById('modal-overlay'), document.getElementById('add-task-modal'));
}

async function saveTask() {
    const editId = document.getElementById('edit-task-id').value;
    const title = document.getElementById('task-title').value;
    const catId = document.getElementById('task-category').value;
    const priority = document.getElementById('task-priority').value;
    const date = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;
    const reminder = document.getElementById('task-reminder').value;
    
    if(editId) {
        const updated = await apiUpdateTask(editId, { title, category: catId, priority, date, time, reminder });
        if(updated) {
            tasks = tasks.map(t => t.id == editId ? updated : t);
            showToast('Task updated successfully');
        }
    } else {
        const newTask = await apiAddTask({ title, categoryId: catId, priority, date, time, reminder });
        if(newTask) {
            tasks.unshift(newTask);
            showToast('Task created');
        }
    }
    
    renderFilters();
    renderTasks();
    updateProgress();
}

async function toggleTask(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if(task) {
        task.completed = !task.completed;
        await apiUpdateTask(task.id, { completed: task.completed });
        setTimeout(() => {
            renderTasks();
            updateProgress();
        }, 300); 
    }
}

async function deleteTask(taskId) {
    const taskEl = document.getElementById(`task-${taskId}`);
    const performDelete = async () => {
        await apiDeleteTask(taskId);
        tasks = tasks.filter(t => t.id != taskId);
        renderFilters();
        renderTasks();
        updateProgress();
        showToast('Task deleted');
    };

    if(taskEl && window.gsap) {
        gsap.to(taskEl, { opacity: 0, scale: 0.8, duration: 0.3, onComplete: performDelete });
    } else { await performDelete(); }
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    const pbMain = document.getElementById('main-progress-bar');
    const ptMain = document.getElementById('main-progress-text');
    const pbSidebar = document.getElementById('progress-bar-sidebar');
    const ptSidebar = document.getElementById('progress-text');
    
    if(pbMain) pbMain.style.width = `${percentage}%`;
    if(ptMain) ptMain.innerHTML = `${percentage}%`;
    
    if(pbSidebar) pbSidebar.style.width = `${percentage}%`;
    if(ptSidebar) ptSidebar.textContent = `${percentage}%`;
}

// === SortableJS Drag & Drop Implementation ===
let sortableInstances = [];

function initSortable() {
    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

    const lists = document.querySelectorAll('.sortable-list');
    lists.forEach(list => {
        if(!list) return;
        const sortable = new Sortable(list, {
            group: 'tasks',
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: async function (evt) {
                const itemEl = evt.item;
                const taskId = itemEl.getAttribute('data-id');
                const toListId = evt.to.id; // e.g. tasks-upcoming
                
                const task = tasks.find(t => t.id == taskId);
                if(!task) return;
                
                // Extremely simple smart logic: if dragging to 'Upcoming', it could mean marking completed or changing date,
                // But for pure aesthetic purposes in this project snippet, we just rearrange them. 
                // To make it functional, dragging around logic here would ideally patch dates.
                // We'll just patch completion if dragged to a completed state, or nothing, just visual ordering.
                // Since lists are strictly derived from date/time, drag and drop usually means changing the date.
                // For now, we just rely on SortableJS visual cue or re-trigger renderTasks() to snap it back if not matching server.
                showToast('Sorting feature aesthetic enabled.', 'info');
                
                // Usually we'd update index on server and re-render. Since we sort dynamically, they'd snap back upon refresh unless date changes.
            }
        });
        sortableInstances.push(sortable);
    });
}
