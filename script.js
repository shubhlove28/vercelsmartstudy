// --- CONFIGURATION ---
const API = 'https://rendersmartstudy.onrender.com'; 
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
}

buttons.forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
});

// --- DATA FETCHING ---
async function loadData() {
    try {
        const tRes = await fetch(`${API}/tasks`);
        const tData = await tRes.json();
        // Safety check: Only assign if it's actually an array
        tasks = Array.isArray(tData) ? tData : []; 
        
        const nRes = await fetch(`${API}/notes`);
        const nData = await nRes.json();
        notes = Array.isArray(nData) ? nData : [];
        
        const rRes = await fetch(`${API}/resources`);
        const rData = await rRes.json();
        resources = Array.isArray(rData) ? rData : [];
        
        const fRes = await fetch(`${API}/flashcards`);
        const fData = await fRes.json();
        flashcards = Array.isArray(fData) ? fData : [];
        
    } catch (e) {
        console.warn('Backend offline or init error', e);
        // Fallback to empty arrays if the network fails completely
        tasks = []; notes = []; resources = []; flashcards = [];
    }
    renderAll();
}

function renderAll() {
    renderTasks();
    renderNotes();
    renderResources();
    renderFlashcards();
    updateDashboard();
}

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
    try {
        await fetch(`${API}/${endpoint}`, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
    } catch(e) { console.error(e); }
}

// --- INIT ---
const themeBtn = document.getElementById('theme-toggle');
themeBtn.onclick = () => {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
};

// --- INIT & THEME ---
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
    const themeBtn = document.getElementById('theme-toggle');
    if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
}

updateTimers();

// --- RBAC & LOGIN LOGIC ---
window.login = function(role) {
    localStorage.setItem('userRole', role);
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.classList.add('hidden');
    
    // Now that they are logged in, load the data and set the view
    applyRoleView(role);
    loadData(); 
};

function applyRoleView(role) {
    const isTeacher = role === 'teacher';
    
    // Toggle UI elements based on class
    document.querySelectorAll('.student-only').forEach(el => el.style.display = isTeacher ? 'none' : '');
    document.querySelectorAll('.teacher-only').forEach(el => el.style.display = isTeacher ? 'flex' : 'none');
    
    // Default route on login
    switchTab(isTeacher ? 'teacher-dash' : 'dashboard');
}

// --- BOOTSTRAP THE APP ---
// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedRole = localStorage.getItem('userRole');
    const loginModal = document.getElementById('login-modal');

    if (savedRole) {
        // User is known. Hide modal, set UI, and fetch data.
        if (loginModal) loginModal.classList.add('hidden');
        applyRoleView(savedRole);
        loadData();
    } else {
        // User is unknown. Ensure modal is visible and do NOT load data yet.
        if (loginModal) loginModal.classList.remove('hidden');
    }
});

// --- ANTI-CHEATING: PAGE VISIBILITY API  ---
document.addEventListener("visibilitychange", () => {
    const isTakingTest = !document.getElementById('assessments').classList.contains('hidden');
    
    if (document.visibilityState === 'hidden' && isTakingTest && localStorage.getItem('userRole') === 'student') {
        alert("Warning: Tab switch detected! [cite: 279] In a real exam, this would trigger an auto-submit. [cite: 187]");
        // Future logic: Trigger fetch('/submit-exam', { method: 'POST' })
    }
});

// --- EXAM LOGIC ---
const examQuestions = [
    { id: 1, text: "Which data structure is used in Breadth-First Search?", options: ["Stack", "Queue", "Tree", "Graph"], answer: 1, topic: "Data Structures", difficulty: "Medium" },
    { id: 2, text: "What is the time complexity of binary search?", options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], answer: 2, topic: "Algorithms", difficulty: "Easy" },
    { id: 3, text: "Which model does Scikit-learn primarily support?", options: ["Deep Learning", "Machine Learning", "Quantum Computing", "Blockchain"], answer: 1, topic: "Machine Learning", difficulty: "Easy" }
];

let currentQ = 0;
let studentAnswers = {};
let examTime = 300; // 5 minutes in seconds
let examInterval;

// --- EXAM EXECUTION LOGIC (UPDATED) ---
let activeQuestions = []; // The specific questions chosen for this run

window.startExam = function() {
    document.getElementById('exam-start-card').classList.add('hidden');
    document.getElementById('exam-container').classList.remove('hidden');
    
    // Apply Teacher Configurations
    examTime = configuredDuration;
    
    // Shuffle the question bank and pick the requested amount
    activeQuestions = examQuestions
        .sort(() => 0.5 - Math.random()) // Simple shuffle
        .slice(0, configuredLimit);      // Limit to teacher's setting

    studentAnswers = {}; // Reset answers
    currentQ = 0;        // Reset index

    examInterval = setInterval(() => {
        examTime--;
        const m = Math.floor(examTime / 60).toString().padStart(2, '0');
        const s = (examTime % 60).toString().padStart(2, '0');
        document.getElementById('exam-timer').textContent = `${m}:${s}`;
        if(examTime <= 0) submitExam(); 
    }, 1000);

    renderQuestion();
}

window.renderQuestion = function() {
    const q = activeQuestions[currentQ];
    // Use activeQuestions.length instead of examQuestions.length
    document.getElementById('q-number').textContent = `Question ${currentQ + 1} of ${activeQuestions.length}`;
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

    document.getElementById('prev-btn').style.visibility = currentQ === 0 ? 'hidden' : 'visible';
    const isLast = currentQ === activeQuestions.length - 1;
    document.getElementById('next-btn').classList.toggle('hidden', isLast);
    document.getElementById('submit-exam-btn').classList.toggle('hidden', !isLast);
}

window.submitExam = function() {
    clearInterval(examInterval);
    let correct = 0, wrong = 0, unattempted = 0;

    // Loop over activeQuestions, not the whole bank
    activeQuestions.forEach((q, i) => {
        if (studentAnswers[i] === undefined) unattempted++;
        else if (studentAnswers[i] === q.answer) correct++;
        else wrong++;
    });

    const finalScore = (correct * 4) - (wrong * 1); 
    const maxScore = activeQuestions.length * 4;

    document.getElementById('exam-container').innerHTML = `
        <div class="center-content text-center">
            <h2>Exam Submitted!</h2>
            <h1 class="mt-2" style="color: var(--primary); font-size: 3rem;">${finalScore} / ${maxScore}</h1>
            <p class="mt-2">Correct: ${correct} | Wrong: ${wrong} | Unattempted: ${unattempted}</p>
            <p class="mt-2" style="color: var(--text-muted);">AI Topic Analysis generated and sent to dashboard.</p>
            <button class="primary-btn mt-2" onclick="location.reload()">Return Home</button>
        </div>
    `;
}

// --- TEACHER DASHBOARD LOGIC ---
let configuredDuration = 300; // default 5 mins
let configuredLimit = 3;      // default 3 questions

window.saveTestConfig = function() {
    const mins = parseInt(document.getElementById('config-duration').value) || 5;
    configuredLimit = parseInt(document.getElementById('config-count').value) || 3;
    configuredDuration = mins * 60;
    alert(`Test Updated: ${configuredLimit} questions, ${mins} minutes.`);
};

window.addCustomQuestion = function() {
    const text = document.getElementById('custom-q-text').value;
    const optionsRaw = document.getElementById('custom-q-options').value;
    const answerIdx = parseInt(document.getElementById('custom-q-ans').value);

    if (!text || !optionsRaw) return alert("Please fill out the question and options.");
    
    const options = optionsRaw.split(',').map(opt => opt.trim());
    if (options.length < 2) return alert("Provide at least 2 options separated by commas.");

    examQuestions.push({
        id: Date.now(),
        text: text,
        options: options,
        answer: answerIdx,
        topic: "Custom Addition",
        difficulty: "Teacher Selection"
    });

    document.getElementById('custom-q-text').value = '';
    document.getElementById('custom-q-options').value = '';
    alert("Question added to the bank successfully!");
};
window.selectOption = function(index) {
    studentAnswers[currentQ] = index;
    // Refresh the UI to show the selection
    renderQuestion();
};
