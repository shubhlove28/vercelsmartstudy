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

  // Login Redirect Logic
  const loginForm = document.querySelector(".sign-in-container form");
  const loginBtn = loginForm ? loginForm.querySelector("button") : null;

  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "index.html";
    });
  }
});