document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. MODAL POP-UP LOGIC ---
    const authModal = document.getElementById('auth-modal');
    const container = document.getElementById('container');
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navRegisterBtn = document.getElementById('nav-register-btn');
    const heroRegisterBtn = document.getElementById('hero-register-btn');
    const closeModal = document.getElementById('close-modal');

    // Open Modal & Show Login Side
    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.classList.remove('hidden');
            container.classList.remove('right-panel-active');
        });
    }

    // Open Modal & Show Register Side
    if (navRegisterBtn) {
        navRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.classList.remove('hidden');
            container.classList.add('right-panel-active');
        });
    }

    if (heroRegisterBtn) {
        heroRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.classList.remove('hidden');
            container.classList.add('right-panel-active');
        });
    }

    // Close Modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            authModal.classList.add('hidden');
        });
    }

    // --- 2. SLIDING ANIMATION LOGIC ---
    const signUpBtn = document.getElementById('signUp');
    const signInBtn = document.getElementById('signIn');

    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            container.classList.add("right-panel-active");
        });
    }

    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            container.classList.remove("right-panel-active");
        });
    }

    // --- 3. AUTHENTICATION DATABASE LOGIC ---
    function getUsers() {
        return JSON.parse(localStorage.getItem('users')) || [];
    }

    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    // Handle Registration
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            const email = document.getElementById('reg-email').value; 
    
            const role = document.querySelector('input[name="reg-role"]:checked').value;

            let users = getUsers();
            if (users.find(u => u.username === username)) return alert("User already exists!");
            if (!email.includes('@')) return alert("Please enter a valid email address.");

            users.push({ username, password, role });
            localStorage.setItem('users', JSON.stringify(users));
            
            alert("Account created successfully! Sliding you to login...");
            registerForm.reset();
            container.classList.remove("right-panel-active"); // Slide back to login
        });
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('log-username').value;
            const password = document.getElementById('log-password').value;

            let users = getUsers();
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                // Save session state
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('currentUser', username);
                
                // Redirect to your main application dashboard
                window.location.href = "index.html"; 
            } else {
                alert("Invalid username or password. Please try again.");
            }
        });
    }
});

window.googleAuth = function() {
    // This triggers the official Google Sign-In popup
    google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID_HERE", // You get this from Google Cloud Console
        callback: handleGoogleResponse
    });
    google.accounts.id.prompt();
};

function handleGoogleResponse(response) {
    // This decodes the Google credential
    const data = JSON.parse(atob(response.credential.split('.')[1]));
    
    // Logic to sync with your app
    localStorage.setItem('currentUser', data.name);
    localStorage.setItem('userRole', 'student'); // Default role
    window.location.href = "index.html";
}

