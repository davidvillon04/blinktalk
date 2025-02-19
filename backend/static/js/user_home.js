// user_home.js

/**************************************
 * 1. Open Add Friend UI
 **************************************/
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

/**************************************
 * 2. Open Requests UI
 **************************************/
// This function retrieves friend requests and displays them.
function openRequests() {
   // In production, use fetch() to call your backend:
   /*
    fetch("/get_friend_requests")
      .then(response => response.json())
      .then(data => {
        buildRequestsUI(data);
      })
      .catch(error => {
        console.error("Error fetching friend requests:", error);
      });
    */
   // For now, we simulate pending requests:
   const simulatedRequests = [
      { id: 1, username: "Alice" },
      { id: 2, username: "Flamer" },
      { id: 3, username: "Zoe" },
   ];
   buildRequestsUI(simulatedRequests);
}

// This function builds the HTML for the Requests view.
function buildRequestsUI(requests) {
   let html = '<div class="requests-container">';
   html += "<h2>Friend Requests</h2>";

   if (requests.length === 0) {
      html += "<p>No pending friend requests.</p>";
   } else {
      // Sort alphabetically by username
      requests.sort((a, b) => a.username.localeCompare(b.username));
      requests.forEach((req) => {
         html += `
          <div class="request-item">
            <span>${req.username}</span>
            <form method="POST" action="/accept_request" style="display:inline">
              <input type="hidden" name="request_id" value="${req.id}">
              <button type="submit" class="accept-btn">
                <i class="fa fa-check" style="color: green;"></i>
              </button>
            </form>
            <form method="POST" action="/decline_request" style="display:inline">
              <input type="hidden" name="request_id" value="${req.id}">
              <button type="submit" class="decline-btn">
                <i class="fa fa-times" style="color: red;"></i>
              </button>
            </form>
          </div>
        `;
      });
   }
   html += "</div>";
   document.getElementById("mainContent").innerHTML = html;
}

/**************************************
 * 3. Friend Search for Add Friend UI
 **************************************/
function onFriendSearchInput() {
   const inputVal = document.getElementById("addFriendInput").value.trim();
   const dropdown = document.getElementById("autocompleteDropdown");

   if (!inputVal) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
   }

   // Simulate fetching matching users
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
   // Placeholder list of usernames
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
   // In production, perform an AJAX POST to send the friend request to your backend.
   alert(`Friend request sent to: ${friendName}`);
}

/**************************************
 * 4. Open Chat
 **************************************/
function openChat(friendName) {
   const chatContent = document.getElementById("chatContent");
   if (!chatContent) return;
   chatContent.innerHTML = `
        <p><strong>Chat with ${friendName}</strong></p>
        <p>(Here you can load or display chat messages with ${friendName}...)</p>
      `;
}
