document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container");
  const signUpBtn = document.getElementById("signUp");
  const signInBtn = document.getElementById("signIn");

  // Animation Toggle Logic
  if (signUpBtn && signInBtn) {
    signUpBtn.addEventListener("click", () => {
      container.classList.add("right-panel-active");
    });

    signInBtn.addEventListener("click", () => {
      container.classList.remove("right-panel-active");
    });
  }

  // Login Redirect & Role Logic
  const loginForm = document.getElementById("login-form"); // Target the form ID

  if (loginForm) {
    // Listen for 'submit' instead of 'click' on the button. This handles Enter key presses too!
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      // 1. Grab the role the user selected from the dropdown
      const roleSelect = document.getElementById("login-role");
      const selectedRole = roleSelect ? roleSelect.value : "student"; // Fallback to student just in case
      
      // 2. Save it to localStorage (This is the handshake!)
      localStorage.setItem("userRole", selectedRole);
      
      // 3. Redirect to the main dashboard
      window.location.href = "index.html";
    });
  }
});
