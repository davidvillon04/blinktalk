// user_home.js

// 1. Switch to "Add Friend" UI in the center column
function openAddFriend() {
   // Grab the mainContent area (the center column) and replace it with Add Friend UI
   const mainContent = document.getElementById("mainContent");

   mainContent.innerHTML = `
      <div class="add-friend-container">
        <div class="add-friend-box">
          <h2>Add Friend</h2>
          <p>You can add friends by their username.</p>
  
          <div class="add-friend-input">
            <input
              type="text"
              id="addFriendInput"
              placeholder="Enter a username..."
              oninput="onFriendSearchInput()"
            />
            <div id="autocompleteDropdown" class="autocomplete-dropdown" style="display: none;"></div>
          </div>
  
          <button class="add-friend-button" onclick="sendFriendRequest()">Send Friend Request</button>
        </div>
      </div>
    `;
}

// 2. Listen for input changes to show up to 50 matching users
function onFriendSearchInput() {
   const inputVal = document.getElementById("addFriendInput").value.trim();
   const dropdown = document.getElementById("autocompleteDropdown");

   if (!inputVal) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
   }

   // Simulate an AJAX call to fetch matching users. For now, we'll just do a placeholder.
   // In production, you'd do something like fetch("/search_users?query=" + inputVal).
   const matchingUsers = simulateUserSearch(inputVal);

   if (matchingUsers.length === 0) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
   }

   // Build the dropdown items
   let html = "";
   matchingUsers.forEach((user) => {
      html += `<div class="autocomplete-item" onclick="selectUsername('${user}')">${user}</div>`;
   });
   dropdown.innerHTML = html;
   dropdown.style.display = "block";
}

// 3. Simulate user search. Return up to 50 usernames starting with the query.
function simulateUserSearch(query) {
   // In real code, you'd fetch from your server, e.g.:
   // return fetch(`/search_users?query=${encodeURIComponent(query)}`)
   //   .then(resp => resp.json())
   //   .then(data => data.slice(0, 50));
   // For now, let's just have a placeholder array:
   const allUsers = [
      "FlamerEatsFeet",
      "FlameLord",
      "FlamingoGirl",
      "FrodoBaggins",
      "FunkyDude",
      "FlowerPower",
      "Franklin",
      "Fiona",
      "David",
      "Narwhals",
      "Frozone",
      // ... etc. (imagine a large list)
   ];

   // Filter by starting letters, limit to 50
   return allUsers.filter((u) => u.toLowerCase().startsWith(query.toLowerCase())).slice(0, 50);
}

// 4. When user clicks a dropdown item, fill the input
function selectUsername(username) {
   document.getElementById("addFriendInput").value = username;
   document.getElementById("autocompleteDropdown").style.display = "none";
}

// 5. Send Friend Request (placeholder)
function sendFriendRequest() {
   const friendName = document.getElementById("addFriendInput").value.trim();
   if (!friendName) {
      alert("Please enter a username to send a friend request.");
      return;
   }
   // In production, you'd do an AJAX POST to /send_friend_request, etc.
   alert(`Friend request sent to: ${friendName}`);
}

// 6. The original openChat function
function openChat(friendName) {
   const chatContent = document.getElementById("chatContent");
   if (!chatContent) return;

   chatContent.innerHTML = `
      <p><strong>Chat with ${friendName}</strong></p>
      <p>(Here you can load or display chat messages with ${friendName}...)</p>
    `;
}
