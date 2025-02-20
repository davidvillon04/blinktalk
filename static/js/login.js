// login.js

function togglePassword(inputId, btn) {
   const inputField = document.getElementById(inputId);
   if (inputField.type === "password") {
      inputField.type = "text";
      btn.textContent = "Hide";
   } else {
      inputField.type = "password";
      btn.textContent = "Show";
   }
}
