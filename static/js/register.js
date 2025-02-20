// register.js

// 1. Show/Hide Toggles
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

// 2. Custom Email Validation
const emailInput = document.getElementById("email");
const emailError = document.getElementById("emailError");

if (emailInput) {
   emailInput.addEventListener("input", function () {
      const emailVal = emailInput.value.trim();
      if (emailVal !== "" && (!emailVal.includes("@") || !emailVal.includes("."))) {
         emailError.style.display = "block";
         emailError.textContent = "Please enter a valid email (e.g., user@example.com).";
      } else {
         emailError.style.display = "none";
      }
   });
}

// 3. Username Live Validation & Debounced Availability Check
let usernameTimer;
const usernameInput = document.getElementById("username");
const usernameHint = document.getElementById("usernameHint");
const usernameExists = document.getElementById("usernameExists");

if (usernameInput) {
   usernameInput.addEventListener("focus", function () {
      const username = usernameInput.value;
      const regex = /^[A-Za-z0-9_.]{2,32}$/;
      // Only show the hint if there is text and it's invalid.
      if (username !== "" && !regex.test(username)) {
         usernameHint.style.display = "block";
      } else {
         usernameHint.style.display = "none";
      }
   });

   usernameInput.addEventListener("input", function () {
      const username = usernameInput.value;
      const regex = /^[A-Za-z0-9_.]{2,32}$/;

      // Show the hint if invalid, hide it if valid
      if (!regex.test(username)) {
         usernameHint.style.display = "block";
         usernameHint.style.color = "#ffaaaa";
      } else {
         usernameHint.style.display = "none";
      }

      clearTimeout(usernameTimer);
      if (username.length > 1) {
         usernameTimer = setTimeout(() => {
            fetch("/check_username", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ username: username.toLowerCase() }),
            })
               .then((response) => response.json())
               .then((data) => {
                  if (data.exists) {
                     usernameExists.style.display = "block";
                     usernameExists.textContent = "This username is already taken.";
                  } else {
                     usernameExists.style.display = "none";
                  }
               })
               .catch((error) => {
                  console.error("Error checking username:", error);
               });
         }, 500); // 2-second debounce; change here if needed.
      } else {
         usernameExists.style.display = "none";
      }
   });
}

// 4. Password Strength Meter
const passwordInput = document.getElementById("password");
const passwordMeter = document.getElementById("passwordMeter");
const passwordStrengthText = document.getElementById("passwordStrengthText");
const passwordStrengthContainer = document.getElementById("passwordStrengthContainer");

if (passwordInput) {
   passwordInput.addEventListener("focus", function () {
      passwordStrengthContainer.style.display = "block";
   });

   passwordInput.addEventListener("input", function () {
      const pwd = passwordInput.value;
      let strength = 0;
      if (pwd.length >= 6) strength += 20;
      if (pwd.length >= 10) strength += 20;
      if (/[A-Z]/.test(pwd)) strength += 20;
      if (/[0-9]/.test(pwd)) strength += 20;
      if (/[\W_]/.test(pwd)) strength += 20;
      passwordMeter.value = strength;
      let color;
      if (strength < 40) {
         passwordStrengthText.textContent = "Weak";
         passwordStrengthText.style.color = "#ff4444";
         color = "#ff4444";
      } else if (strength < 80) {
         passwordStrengthText.textContent = "Moderate";
         passwordStrengthText.style.color = "#ffbb33";
         color = "#ffbb33";
      } else {
         passwordStrengthText.textContent = "Strong";
         passwordStrengthText.style.color = "#00C851";
         color = "#00C851";
      }
      passwordMeter.style.setProperty("--strength-color", color);
   });
}

// 5. Real-time Confirm Password Mismatch
const confirmInput = document.getElementById("confirm");
const confirmError = document.getElementById("confirmError");

function checkPasswordsMatch() {
   if (confirmInput.value && passwordInput.value !== confirmInput.value) {
      confirmError.style.display = "block";
      confirmError.textContent = "Passwords do not match.";
   } else {
      confirmError.style.display = "none";
   }
}

if (confirmInput && passwordInput) {
   confirmInput.addEventListener("input", checkPasswordsMatch);
   passwordInput.addEventListener("input", checkPasswordsMatch);
}

// 6. Dynamic Days in the Month
const monthSelect = document.getElementById("month");
const daySelect = document.getElementById("day");
const yearSelect = document.getElementById("year");

if (monthSelect && daySelect && yearSelect) {
   const currentYear = new Date().getFullYear();
   for (let y = currentYear; y >= currentYear - 150; y--) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
   }

   function isLeapYear(y) {
      return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
   }

   function getDaysInMonth(m, y) {
      if (!m || !y) return 31;
      if (m === 2) {
         return isLeapYear(y) ? 29 : 28;
      } else if ([4, 6, 9, 11].includes(m)) {
         return 30;
      } else {
         return 31;
      }
   }

   function updateDays() {
      const m = parseInt(monthSelect.value);
      const y = parseInt(yearSelect.value);
      daySelect.innerHTML = '<option value="" disabled selected>Day</option>';
      const totalDays = getDaysInMonth(m, y);
      for (let d = 1; d <= totalDays; d++) {
         const opt = document.createElement("option");
         opt.value = d;
         opt.textContent = d;
         daySelect.appendChild(opt);
      }
   }

   monthSelect.addEventListener("change", updateDays);
   yearSelect.addEventListener("change", updateDays);
}
