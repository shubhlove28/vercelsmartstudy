// --- USER DATABASE ---
function getUsers() {
    return JSON.parse(localStorage.getItem('users')) || [];
}

window.handleRegister = function() {
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    let users = getUsers();
    if (users.find(u => u.username === username)) return alert("User already exists!");

    users.push({ username, password, role });
    localStorage.setItem('users', JSON.stringify(users));
    alert("Registered! Now click Login.");
};

window.handleLogin = function() {
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    
    let users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        localStorage.setItem('userRole', user.role); // Save role for the session
        localStorage.setItem('currentUser', username);
        document.getElementById('login-modal').classList.add('hidden');
        applyRoleView(user.role);
    } else {
        alert("Invalid credentials!");
    }
};
// --- CONFIGURATION ---
const dateDisplay = document.getElementById('date-display');
dateDisplay.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// --- STATE ---
let tasks = [];
let notes = [];
let resources = [];
let flashcards = [];
let studyHours = 0;
let timerInterval = null;
let time = 1500; // 25 mins
let isTimerRunning = false;
let currentTaskFilter = 'all';


// --- TABS LOGIC ---
const buttons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');

window.switchTab = function(tabId) {
    buttons.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.add('hidden'));
    
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    document.getElementById(tabId).classList.remove('hidden');

    // Force charts to resize/refresh if the Teacher Dash is opened
    if(tabId === 'teacher-dash') {
        renderStudentResults();
        renderBank();
        
        // This trick forces Chart.js to re-calculate the size
        Object.values(Chart.instances).forEach(chart => chart.resize());
    }
}

buttons.forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
});

// --- DATA FETCHING ---
// --- DATA MANAGEMENT (Local Only) ---
// --- DATA FETCHING (Now Local-Only) ---
function loadData() {
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    notes = JSON.parse(localStorage.getItem('notes')) || [];
    resources = JSON.parse(localStorage.getItem('resources')) || [];
    flashcards = JSON.parse(localStorage.getItem('flashcards')) || [];
    
    // Also load the timer state and study hours from storage!
    studyHours = parseFloat(localStorage.getItem('studyHours')) || 0;
    
    renderAll();
}

function renderAll() {
    renderTasks();
    renderNotes();
    renderResources();
    renderFlashcards();
    updateDashboard();
}
// --- STREAK LOGIC ---
function updateStreak() {
    const today = new Date().toDateString(); // e.g., "Tue Jun 23 2026"
    let lastActive = localStorage.getItem('lastActiveDate');
    let streak = parseInt(localStorage.getItem('studyStreak')) || 0;

    if (lastActive === today) {
        // User already logged in today, streak stays the same
    } else if (lastActive) {
        // Check if the last active date was exactly yesterday
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActive === yesterday.toDateString()) {
            streak++; // Consecutive day! Add 1
        } else {
            streak = 1; // Streak broken, reset to 1
        }
    } else {
        // First time ever using the app
        streak = 1;
    }

    // Save the new data back to localStorage
    localStorage.setItem('lastActiveDate', today);
    localStorage.setItem('studyStreak', streak);

    // Update the HTML
    const streakElement = document.getElementById('streak-count');
    if (streakElement) {
        streakElement.textContent = streak;
    }
}
function markTodayAsStudied() {
    const today = new Date().toDateString();
    let studiedDates = JSON.parse(localStorage.getItem('studiedDates')) || [];
    
    if (!studiedDates.includes(today)) {
        studiedDates.push(today);
        localStorage.setItem('studiedDates', JSON.stringify(studiedDates));
    }
}
// 1. Trigger Modal on click
document.querySelector('.streak-badge').onclick = () => {
    document.getElementById('streak-modal').classList.remove('hidden');
    renderCalendar();
};

// 2. Generate Calendar
window.renderCalendar = function() {
    const grid = document.getElementById('calendar-grid');
    const headerDisplay = document.getElementById('calendar-header'); // Add this to HTML
    grid.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Set Header
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    headerDisplay.textContent = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    // Get array of studied dates
    const studiedDates = JSON.parse(localStorage.getItem('studiedDates')) || [];

    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

    // Generate days
    for (let day = 1; day <= daysInMonth; day++) {
        const div = document.createElement('div');
        div.className = 'cal-day';
        div.textContent = day;
        
        // Create a date string for this day to compare
        const dateToCheck = new Date(year, month, day).toDateString();
        
        // If this date is in our "studiedDates" array, mark it active
        if (studiedDates.includes(dateToCheck)) {
            div.classList.add('active');
        }
        
        // Highlight today
        if (day === now.getDate()) div.style.border = "2px solid var(--primary)";
        
        grid.appendChild(div);
    }
};

// --- DASHBOARD ---
function updateDashboard() {
    // Stats
    document.getElementById('pending-count').textContent = tasks.filter(t => !t.done).length;
    document.getElementById('note-count').textContent = notes.length;
    document.getElementById('resource-count').textContent = resources.length;
    document.getElementById('flashcard-count').textContent = flashcards.length;
    document.getElementById('study-hours').textContent = studyHours.toFixed(1);

    // Upcoming Tasks Widget
    const miniList = document.getElementById('dashboard-tasks');
    miniList.innerHTML = '';
    const pendingTasks = tasks.filter(t => !t.done).slice(0, 3);
    
    if (pendingTasks.length === 0) {
        miniList.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No pending tasks 🎉</p>';
    } else {
        pendingTasks.forEach(t => {
            const div = document.createElement('div');
            div.className = `mini-task ${t.priority}`;
            div.innerHTML = `
                <div style="flex:1;">
                    <p>${t.title}</p>
                    <span>${t.due ? 'Due: ' + t.due : 'No date'}</span>
                </div>
                ${t.priority === 'high' ? '<i class="fa-solid fa-circle-exclamation" style="color:var(--red)"></i>' : ''}
            `;
            miniList.appendChild(div);
        });
    }

    // Recent Resources Widget
    const resGrid = document.getElementById('dashboard-resources');
    resGrid.innerHTML = '';
    const recentRes = resources.slice(-3).reverse();
    
    recentRes.forEach(r => {
        const div = document.createElement('div');
        div.className = 'resource-card';
        div.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                <i class="fa-solid fa-link" style="color:var(--primary);"></i>
                <strong>${r.title}</strong>
            </div>
            <a href="${r.url}" target="_blank" class="text-btn">Open <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        `;
        resGrid.appendChild(div);
    });
}

// --- FLASHCARDS ---
document.getElementById('flashcard-form').onsubmit = async (e) => {
    e.preventDefault();
    const q = document.getElementById('fc-question').value;
    const a = document.getElementById('fc-answer').value;
    
    await apiCall('flashcards', 'POST', { question: q, answer: a });
    document.getElementById('flashcard-form').reset();
    loadData();
};

function renderFlashcards() {
    const grid = document.getElementById('flashcards-list');
    grid.innerHTML = '';
    
    flashcards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'flashcard';
        div.onclick = (e) => {
            if(!e.target.closest('.delete-card')) div.classList.toggle('flipped');
        };
        
        div.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <h3>${card.question}</h3>
                    <small style="color:var(--text-muted); margin-top:10px;">Click to flip</small>
                    <button class="delete-card" onclick="deleteFlashcard(${card.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="flashcard-back">
                    <p>${card.answer}</p>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
}

window.deleteFlashcard = async (id) => {
    await fetch(`${API}/flashcards/${id}`, { method: 'DELETE' });
    loadData();
};

// --- TASKS (With Filters) ---
const taskForm = document.getElementById('task-form');
taskForm.onsubmit = async (e) => {
    e.preventDefault();
    const newTask = {
        title: document.getElementById('task-title').value,
        due: document.getElementById('task-due').value,
        priority: document.getElementById('task-priority').value,
        done: false
    };
    await apiCall('tasks', 'POST', newTask);
    taskForm.reset();
    loadData();
};

window.filterTasks = (filter) => {
    currentTaskFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.textContent.toLowerCase() === filter) btn.classList.add('active');
    });
    
    renderTasks();
};

function renderTasks() {
    const list = document.getElementById('tasks-list');
    list.innerHTML = '';
    
    let filteredTasks = tasks;
    if (currentTaskFilter === 'pending') filteredTasks = tasks.filter(t => !t.done);
    if (currentTaskFilter === 'completed') filteredTasks = tasks.filter(t => t.done);

    filteredTasks.forEach(t => {
        const div = document.createElement('div');
        div.className = `task-card ${t.done ? 'done' : ''}`;
        div.style.borderLeftColor = t.priority === 'high' ? 'var(--red)' : (t.priority === 'medium' ? 'var(--amber)' : 'var(--emerald)');
        
        div.innerHTML = `
            <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${t.id}, ${!t.done})">
            <div style="margin-left:15px; flex:1;">
                <span style="font-weight:600; display:block;">${t.title}</span>
                <span style="font-size:0.8rem; color:var(--text-muted);">${t.due || 'No Due Date'}</span>
            </div>
            <span style="font-size:0.8rem; padding:4px 8px; background:var(--bg); border-radius:4px;">${t.priority}</span>
            <button onclick="deleteTask(${t.id})" style="background:none; border:none; color:var(--text-muted); cursor:pointer; margin-left:10px;"><i class="fa-solid fa-trash"></i></button>
        `;
        list.appendChild(div);
    });
}

window.toggleTask = async (id, status) => {
    await fetch(`${API}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: status })
    });
    loadData();
};

window.deleteTask = async (id) => {
    if(confirm('Delete this task?')) {
        await fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
        loadData();
    }
}

// --- RESOURCES & NOTES ---
document.getElementById('resource-form').onsubmit = async (e) => {
    e.preventDefault();
    await apiCall('resources', 'POST', {
        title: document.getElementById('res-title').value,
        url: document.getElementById('res-url').value,
        category: document.getElementById('res-category').value
    });
    document.getElementById('resource-form').reset();
    loadData();
};

function renderResources() {
    const list = document.getElementById('resource-list');
    list.innerHTML = '';
    resources.forEach(r => {
        const div = document.createElement('div');
        div.className = 'resource-card';
        div.innerHTML = `
            <h3><i class="fa-solid fa-bookmark" style="color:var(--primary); margin-right:8px;"></i>${r.title}</h3>
            <p style="color:var(--text-muted); font-size:0.9rem; margin:5px 0;">${r.category}</p>
            <a href="${r.url}" target="_blank" class="text-btn">Access Resource</a>
        `;
        list.appendChild(div);
    });
}

document.getElementById('note-form').onsubmit = async (e) => {
    e.preventDefault();
    await apiCall('notes', 'POST', {
        title: document.getElementById('note-title').value,
        content: document.getElementById('note-content').value
    });
    document.getElementById('note-form').reset();
    loadData();
};

function renderNotes() {
    const list = document.getElementById('notes-list');
    list.innerHTML = '';
    notes.forEach(n => {
        const div = document.createElement('div');
        div.className = 'note-card';
        div.innerHTML = `
            <strong style="color:var(--primary); display:block; margin-bottom:8px;">${n.title}</strong>
            <p style="color:var(--text-muted); white-space:pre-wrap;">${n.content}</p>
        `;
        list.appendChild(div);
    });
}

// --- QUICK NOTE ---
document.getElementById('save-quick-note').onclick = async () => {
    const content = document.getElementById('quick-note-input').value;
    if (!content) return;
    await apiCall('notes', 'POST', {
        title: "Quick Note " + new Date().toLocaleTimeString(),
        content: content
    });
    document.getElementById('quick-note-input').value = '';
    loadData();
    alert("Note saved!");
};

// --- TIMER LOGIC (Unified) ---
const dashTimer = document.getElementById('dash-timer');
const dashProgress = document.getElementById('dash-progress');
const mainTimer = document.getElementById('timer');

// Dashboard buttons
const dashStart = document.getElementById('dash-start-btn');
const dashPause = document.getElementById('dash-pause-btn');
const dashReset = document.getElementById('dash-reset-btn');

// Main Pomodoro Tab buttons
const mainStart = document.getElementById('start');
const mainPause = document.getElementById('pause');
const mainReset = document.getElementById('reset');

function updateTimers() {
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = (time % 60).toString().padStart(2, '0');
    const timeStr = `${m}:${s}`;
    
    // Update both displays
    dashTimer.textContent = timeStr;
    mainTimer.textContent = timeStr;
    document.title = isTimerRunning ? `${timeStr} - Focus` : 'Study Assistant';

    // Circular Progress
    const total = 1500;
    const offset = 251 - (251 * time) / total;
    dashProgress.style.strokeDashoffset = offset;
}

function toggleTimerState(running) {
    isTimerRunning = running;
    if (running) {
        // Show Pause, Hide Start
        dashStart.classList.add('hidden');
        dashPause.classList.remove('hidden');
        mainStart.classList.add('hidden');
        mainPause.classList.remove('hidden');
    } else {
        // Show Start, Hide Pause
        dashStart.classList.remove('hidden');
        dashPause.classList.add('hidden');
        mainStart.classList.remove('hidden');
        mainPause.classList.add('hidden');
    }
}

function startTimer() {
    if (isTimerRunning) return;
    toggleTimerState(true);
    
    timerInterval = setInterval(() => {
        time--;
        updateTimers();
        if (time <= 0) {
            clearInterval(timerInterval);
            studyHours += 0.4;
            alert("Session Complete!");
            resetTimer();
            updateDashboard();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    toggleTimerState(false);
}

function resetTimer() {
    clearInterval(timerInterval);
    toggleTimerState(false);
    time = 1500;
    updateTimers();
}

// Event Listeners for Timer
dashStart.onclick = startTimer;
dashPause.onclick = pauseTimer;
dashReset.onclick = resetTimer;

mainStart.onclick = startTimer;
mainPause.onclick = pauseTimer;
mainReset.onclick = resetTimer;

// --- API HELPER ---
async function apiCall(endpoint, method, body) {
    if (method === 'POST') {
        const item = { ...body, id: Date.now() };
        if (endpoint === 'tasks') tasks.push(item);
        if (endpoint === 'notes') notes.push(item);
        if (endpoint === 'resources') resources.push(item);
        if (endpoint === 'flashcards') flashcards.push(item);
        saveData();
        renderAll();
    }
}

// --- INIT ---
const themeBtn = document.getElementById('theme-toggle');
themeBtn.onclick = () => {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
};

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
    themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Check if user is logged in
    const savedRole = localStorage.getItem('userRole');
    if (!savedRole) {
        window.location.href = "login.html";
        return;
    }

    // 2. Apply UI restrictions
    applyRoleView(savedRole);

    // 3. Load data and start timers
    loadData();
    updateTimers();

    updateStreak();
});

// --- RBAC & LOGIN LOGIC ---
window.login = function(role) {
    localStorage.setItem('userRole', role);
    document.getElementById('login-modal').classList.add('hidden');
    applyRoleView(role);
};

function applyRoleView(role) {
    const isTeacher = role === 'teacher';
    
    // Explicitly show/hide student and teacher elements
    const studentElements = document.querySelectorAll('.student-only');
    const teacherElements = document.querySelectorAll('.teacher-only');
    
    studentElements.forEach(el => el.style.display = isTeacher ? 'none' : 'flex');
    teacherElements.forEach(el => el.style.display = isTeacher ? 'flex' : 'none');
    
    // Ensure the Teacher Panel button itself is visible to teachers
    const teacherPanelBtn = document.querySelector('[data-tab="teacher-dash"]');
    if (teacherPanelBtn) {
        teacherPanelBtn.style.display = isTeacher ? 'flex' : 'none';
    }
    
    // --- CHANGE THIS LINE ---
    // Instead of switching to teacher-dash, always default to dashboard
    switchTab('dashboard'); 
}


// --- ANTI-CHEATING: PAGE VISIBILITY API  ---
document.addEventListener("visibilitychange", () => {
    const isTakingTest = !document.getElementById('assessments').classList.contains('hidden');
    
    if (document.visibilityState === 'hidden' && isTakingTest && localStorage.getItem('userRole') === 'student') {
        alert("Warning: Tab switch detected! [cite: 279] In a real exam, this would trigger an auto-submit. [cite: 187]");
        // Future logic: Trigger fetch('/submit-exam', { method: 'POST' })
    }
});

// --- EXAM LOGIC ---
// Load the question bank from storage, or use a default if empty
let examQuestions = JSON.parse(localStorage.getItem('examBank')) || [
    { id: 1, text: "Sample Question 1", options: ["A", "B", "C", "D"], answer: 0 }
    // ... add your default base questions here
];

let examConfig = JSON.parse(localStorage.getItem('examConfig')) || { duration: 300, questionCount: 3 };

let currentQ = 0;
let studentAnswers = {};
let examTime = 300; // 5 minutes in seconds
let examInterval;

// --- EXAM EXECUTION LOGIC (UPDATED) ---
// --- EXAM EXECUTION LOGIC (ADVANCED MCQ UI) ---
let activeQuestions = [];
let questionStates = []; // Tracks: 'not-visited', 'not-answered', 'answered', 'marked'

window.startExam = function() {
    const config = JSON.parse(localStorage.getItem('examConfig')) || { duration: 300, questionCount: 3 };
    const requestedCount = Math.min(config.questionCount, examQuestions.length);

    document.getElementById('exam-start-card').classList.add('hidden');
    document.getElementById('exam-container').classList.remove('hidden');
    
    examTime = config.duration;
    
    // Prep questions and initial state
    activeQuestions = examQuestions.sort(() => 0.5 - Math.random()).slice(0, requestedCount); 
    studentAnswers = {};
    questionStates = new Array(activeQuestions.length).fill('not-visited');
    
    // The first question becomes 'not-answered' as soon as the test starts
    if(activeQuestions.length > 0) questionStates[0] = 'not-answered';
    currentQ = 0;

    examInterval = setInterval(() => {
        examTime--;
        const m = Math.floor(examTime / 60).toString().padStart(2, '0');
        const s = (examTime % 60).toString().padStart(2, '0');
        document.getElementById('exam-timer').textContent = `${m}:${s}`;
        if(examTime <= 0) submitExam(); 
    }, 1000);

    renderQuestion();
    renderNavGrid();
}

window.renderQuestion = function() {
    const q = activeQuestions[currentQ];
    document.getElementById('q-number').textContent = `Question No. ${currentQ + 1}`;
    document.getElementById('question-area').textContent = q.text;
    
    const optionsArea = document.getElementById('options-area');
    optionsArea.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const isSelected = studentAnswers[currentQ] === index;
        optionsArea.innerHTML += `
            <label class="mcq-option ${isSelected ? 'selected' : ''}" onclick="selectOption(${index})">
                <input type="radio" name="q${currentQ}" value="${index}" ${isSelected ? 'checked' : ''}>
                <span>${opt}</span>
            </label>
        `;
    });

    // Check if it's the last question
    const isLast = currentQ === activeQuestions.length - 1;
    document.getElementById('save-next-btn').classList.toggle('hidden', isLast);
    document.getElementById('submit-exam-btn').classList.toggle('hidden', !isLast);
}

window.selectOption = function(index) {
    studentAnswers[currentQ] = index;
    renderQuestion(); // visually update radio button
}

window.clearResponse = function() {
    delete studentAnswers[currentQ];
    questionStates[currentQ] = 'not-answered';
    renderQuestion();
    renderNavGrid();
}

window.saveAndNext = function() {
    // If they picked an answer, mark answered. Else, marked not-answered.
    if (studentAnswers[currentQ] !== undefined) {
        questionStates[currentQ] = 'answered';
    } else {
        questionStates[currentQ] = 'not-answered';
    }
    
    if (currentQ < activeQuestions.length - 1) {
        jumpToQuestion(currentQ + 1);
    } else {
        renderNavGrid(); // Just update grid if on last question
    }
}

window.markForReview = function() {
    questionStates[currentQ] = 'marked';
    if (currentQ < activeQuestions.length - 1) {
        jumpToQuestion(currentQ + 1);
    } else {
        renderNavGrid();
    }
}

window.jumpToQuestion = function(index) {
    // Update old question state if we leave it without answering
    if (questionStates[currentQ] === 'not-visited') {
        questionStates[currentQ] = 'not-answered';
    }
    
    currentQ = index;
    
    // Update new question state if it was unvisited
    if (questionStates[currentQ] === 'not-visited') {
        questionStates[currentQ] = 'not-answered';
    }

    renderQuestion();
    renderNavGrid();
}

function renderNavGrid() {
    const grid = document.getElementById('question-nav-grid');
    grid.innerHTML = '';
    
    let counts = { 'answered': 0, 'marked': 0, 'not-visited': 0, 'not-answered': 0 };

    questionStates.forEach((state, index) => {
        counts[state]++;
        
        const btn = document.createElement('button');
        btn.className = `nav-circle nav-${state}`;
        btn.innerText = index + 1;
        
        // Add a slight border/glow to the CURRENT question being viewed
        if (index === currentQ) {
            btn.style.boxShadow = "0 0 0 3px var(--text)";
        }

        btn.onclick = () => jumpToQuestion(index);
        grid.appendChild(btn);
    });

    // Update the UI Counters
    document.getElementById('count-answered').innerText = counts['answered'];
    document.getElementById('count-marked').innerText = counts['marked'];
    document.getElementById('count-not-visited').innerText = counts['not-visited'];
    document.getElementById('count-not-answered').innerText = counts['not-answered'];
}
window.submitExam = function() {
    // 1. Stop the clock
    clearInterval(examInterval);

    // 2. Logic Variables
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    // 3. Loop through activeQuestions based on index
    activeQuestions.forEach((q, i) => {
        const answer = studentAnswers[i];
        
        if (answer === undefined) {
            unattempted++;
        } else if (answer === q.answer) {
            correct++;
        } else {
            wrong++;
        }
    });

    // 4. Calculate Score (4 for correct, -1 for wrong)
    const finalScore = (correct * 4) - (wrong * 1);
    const maxScore = activeQuestions.length * 4;

    // 5. Save Results
    const resultEntry = {
        student: localStorage.getItem('currentUser') || 'Anonymous',
        score: finalScore,
        date: new Date().toLocaleDateString(),
        attempted: (correct + wrong)
    };
    
    let results = JSON.parse(localStorage.getItem('studentResults')) || [];
    results.push(resultEntry);
    localStorage.setItem('studentResults', JSON.stringify(results));

    // 6. UI Update: Show the Results directly in the container
    const container = document.getElementById('exam-container');
    container.innerHTML = `
        <div class="widget-card" style="text-align: center; padding: 3rem;">
            <i class="fa-solid fa-trophy" style="font-size: 4rem; color: var(--amber); margin-bottom: 1rem;"></i>
            <h2>Assessment Submitted!</h2>
            <h1 style="font-size: 3.5rem; color: var(--primary); margin: 1rem 0;">${finalScore} <span style="font-size: 1.5rem; color: var(--text-muted);">/ ${maxScore}</span></h1>
            <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 2rem;">
                <p style="color: var(--emerald); font-weight: bold;">Correct: ${correct}</p>
                <p style="color: var(--red); font-weight: bold;">Wrong: ${wrong}</p>
                <p style="color: var(--text-muted);">Unattempted: ${unattempted}</p>
            </div>
            <button class="primary-btn" onclick="location.reload()">Return to Dashboard</button>
        </div>
    `;
};

// --- TEACHER DASHBOARD LOGIC ---
let configuredDuration = 300; // default 5 mins
let configuredLimit = 3;      // default 3 questions

window.saveTestConfig = function() {
    const mins = parseInt(document.getElementById('config-duration').value) || 5;
    const count = parseInt(document.getElementById('config-count').value) || 3;
    
    examConfig = {
        duration: mins * 60,
        questionCount: count
    };
    
    // Save this config so students can access it
    localStorage.setItem('examConfig', JSON.stringify(examConfig));
    alert(`Test Settings Saved: ${count} questions, ${mins} minutes.`);
};

function renderBank() {
    const bankList = document.getElementById('bank-list');
    bankList.innerHTML = examQuestions.map((q, index) => `
        <div class="mini-task">
            <div>
                <strong>${index + 1}. ${q.text}</strong>
                <p style="font-size:0.75rem; color:var(--text-muted);">Options: ${q.options.join(', ')}</p>
            </div>
            <button onclick="removeQuestion(${q.id})" class="text-btn" style="color:var(--red);">Delete</button>
        </div>
    `).join('');
}

// 2. Remove Question Function
window.removeQuestion = function(id) {
    examQuestions = examQuestions.filter(q => q.id !== id);
    localStorage.setItem('examBank', JSON.stringify(examQuestions));
    renderBank();
};

window.addCustomQuestion = function() {
    const text = document.getElementById('custom-q-text').value;
    const optionsRaw = document.getElementById('custom-q-options').value;
    const answerIdx = parseInt(document.getElementById('custom-q-ans').value);

    // 1. Prevent more than 50 questions
    if (examQuestions.length >= 50) {
        return alert("Error: Maximum question limit (50) reached.");
    }

    if (!text || !optionsRaw) return alert("Please fill out the question and options.");
    
    const options = optionsRaw.split(',').map(opt => opt.trim());
    
    examQuestions.push({
        id: Date.now(),
        text: text,
        options: options,
        answer: answerIdx
    });

    // 2. SAVE to localStorage so it stays after refresh
    localStorage.setItem('examBank', JSON.stringify(examQuestions));
    
    alert(`Question added to the bank successfully! Current bank size: ${examQuestions.length}/50`);
    document.getElementById('custom-q-text').value = '';
    document.getElementById('custom-q-options').value = '';
};

window.selectOption = function(index) {
    studentAnswers[currentQ] = index;
    // Refresh the UI to show the selection
    renderQuestion();
};

// --- LOGOUT LOGIC ---
window.logout = function() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
};
// --- AUTH GUARD ---
// If the user isn't logged in, force them to the login page immediately
if (!localStorage.getItem('userRole')) {
    window.location.href = "login.html";
}

// --- TEACHER DASHBOARD CHARTS (Chart.js) ---
// Add this at the top of your JS file with your other state variables
let dynamicResultChart = null; 

document.addEventListener("DOMContentLoaded", () => {
    // ... your existing init code ...

    if(document.getElementById('performanceChart')) {
        // 1. Performance Donut Chart (Leave as is for now, or update similarly)
        new Chart(document.getElementById('performanceChart'), {
            type: 'doughnut',
            data: {
                labels: ['Maths', 'Science', 'English', 'Computer'],
                datasets: [{ data: [40, 20, 25, 15], backgroundColor: ['#fbe018', '#28d734', '#8e11fc', '#ef511c'], borderWidth: 0 }]
            },
            options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });

        // 2. Results Donut Chart (Make it dynamic)
        const ctxResult = document.getElementById('resultChart').getContext('2d');
        dynamicResultChart = new Chart(ctxResult, {
            type: 'doughnut',
            data: {
                labels: ['Pass', 'Fail'],
                datasets: [{
                    data: [0, 0], // Starts at 0, updated dynamically
                    backgroundColor: ['#10b981', '#ef4444'], // Emerald for Pass, Red for Fail
                    borderWidth: 0
                }]
            },
            options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
        });

        // 3. Attendance Line Chart
        new Chart(document.getElementById('attendanceChart'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    { label: 'Class A', data: [30, 50, 140, 95, 150, 110, 85], borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.4 },
                    { label: 'Class B', data: [15, 40, 85, 60, 130, 150, 135], borderColor: '#a855f7', borderDash: [5, 5], backgroundColor: 'rgba(168, 85, 247, 0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end', labels: { color: '#94a3b8' } } }, scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } } }
        });
    }
});

function renderStudentResults() {
    const results = JSON.parse(localStorage.getItem('studentResults')) || [];
    const body = document.getElementById('results-body');
    
    // Clear existing table rows
    body.innerHTML = '';
    
    let passCount = 0;
    let failCount = 0;

    results.forEach(r => {
        // Generate Table Rows
        body.innerHTML += `
            <tr>
                <td>${r.student}</td>
                <td>${r.score}</td>
                <td>${r.date}</td>
            </tr>
        `;
        
        // Calculate dynamic chart data (Assuming a score > 0 is a pass for this example)
        if (r.score > 0) {
            passCount++;
        } else {
            failCount++;
        }
    });

    // Update the Chart.js instance with real data
    if (dynamicResultChart) {
        dynamicResultChart.data.datasets[0].data = [passCount, failCount];
        // Update labels to show actual numbers
        dynamicResultChart.data.labels = [`${passCount} Pass`, `${failCount} Fail`];
        dynamicResultChart.update(); // Trigger the chart to re-render
    }
}
function renderAssignments() {
    const studentOrg = localStorage.getItem('userOrg'); // Set this during login
    const assignmentsList = document.getElementById('student-assignments');
    
    // Retrieve all assignments
    const allAssignments = JSON.parse(localStorage.getItem('assignments')) || [];
    
    // Filter by Organization
    const myAssignments = allAssignments.filter(a => a.orgId === studentOrg);
    
    assignmentsList.innerHTML = myAssignments.map(a => `
        <div class="assignment-card">
            <h3>${a.title}</h3>
            <p>From Teacher: ${a.teacherName}</p>
            <button onclick="takeExam(${a.id})">Start Assessment</button>
        </div>
    `).join('');
}

