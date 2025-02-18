// user_home.js

// 1. Open Add Friend UI (already implemented)
function openAddFriend() {
   const mainContent = document.getElementById("mainContent");
   mainContent.innerHTML = `
      <div class="add-friend-container">
        <div class="add-friend-box">
          <h2>Add Friend</h2>
          <p>You can add friends by their username.</p>
          <div class="add-friend-input">
            <input type="text" id="addFriendInput" placeholder="Enter a username..." oninput="onFriendSearchInput()">
            <button class="add-friend-button" onclick="sendFriendRequest()">Send Request</button>
            <div id="autocompleteDropdown" class="autocomplete-dropdown" style="display: none;"></div>
          </div>
        </div>
      </div>
    `;
}

// 2. Open Requests UI
function openRequests() {
   // Simulated friend requests (in a real app, fetch from your server)
   const friendRequests = ["Alice", "Flamer", "Zoe"];
   friendRequests.sort(); // Sort alphabetically

   let html = '<div class="requests-container">';
   html += "<h2>Friend Requests</h2>";

   if (friendRequests.length === 0) {
      html += "<p>No pending friend requests.</p>";
   } else {
      friendRequests.forEach((request) => {
         html += `
          <div class="request-item">
            <span>${request}</span>
            <button class="accept-btn" onclick="acceptRequest('${request}')"><i class="fa fa-check" style="color: green;"></i></button>
            <button class="decline-btn" onclick="declineRequest('${request}')"><i class="fa fa-times" style="color: red;"></i></button>
          </div>
        `;
      });
   }
   html += "</div>";
   document.getElementById("mainContent").innerHTML = html;
}

// 3. Accept and Decline Functions (simulated)
function acceptRequest(requestName) {
   alert("Accepted friend request from " + requestName);
   // In production, send an AJAX call to update the server, then refresh the Requests view.
   openRequests();
}

function declineRequest(requestName) {
   alert("Declined friend request from " + requestName);
   // In production, send an AJAX call to update the server, then refresh the Requests view.
   openRequests();
}

// 4. Friend search functions (existing)
function onFriendSearchInput() {
   const inputVal = document.getElementById("addFriendInput").value.trim();
   const dropdown = document.getElementById("autocompleteDropdown");

   if (!inputVal) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
   }

   // Simulate an AJAX call to fetch matching users.
   const matchingUsers = simulateUserSearch(inputVal);

   if (matchingUsers.length === 0) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
   }

   let html = "";
   matchingUsers.forEach((user) => {
      html += `<div class="autocomplete-item" onclick="selectUsername('${user}')">${user}</div>`;
   });
   dropdown.innerHTML = html;
   dropdown.style.display = "block";
}

function simulateUserSearch(query) {
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
      // ... imagine a larger list here
   ];
   return allUsers.filter((u) => u.toLowerCase().startsWith(query.toLowerCase())).slice(0, 50);
}

function selectUsername(username) {
   document.getElementById("addFriendInput").value = username;
   document.getElementById("autocompleteDropdown").style.display = "none";
}

function sendFriendRequest() {
   const friendName = document.getElementById("addFriendInput").value.trim();
   if (!friendName) {
      alert("Please enter a username to send a friend request.");
      return;
   }
   alert(`Friend request sent to: ${friendName}`);
}

// 5. Open Chat (existing)
function openChat(friendName) {
   const chatContent = document.getElementById("chatContent");
   if (!chatContent) return;
   chatContent.innerHTML = `
        <p><strong>Chat with ${friendName}</strong></p>
        <p>(Here you can load or display chat messages with ${friendName}...)</p>
      `;
}
