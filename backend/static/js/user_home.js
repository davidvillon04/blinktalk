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
 * 2. Open Requests UI (fetch pending friend requests)
 **************************************/
function openRequests() {
   fetch("/get_friend_requests")
      .then((response) => response.json())
      .then((data) => {
         if (data.error) {
            console.error("Error fetching friend requests:", data.error);
            return;
         }
         buildRequestsUI(data);
      })
      .catch((error) => {
         console.error("Error fetching friend requests:", error);
      });
}

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
         <div class="request-item" data-request-id="${req.id}">
           <span>${req.username}</span>
           <button type="button" class="accept-btn" onclick="acceptRequestAjax(${req.id}, this)">
             <i class="fa fa-check" style="color: green;"></i>
           </button>
           <button type="button" class="decline-btn" onclick="declineRequestAjax(${req.id}, this)">
             <i class="fa fa-times" style="color: red;"></i>
           </button>
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
   fetch("/send_friend_request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friend_username: friendName }),
   })
      .then((response) => response.json())
      .then((data) => {
         if (data.success) {
            alert("Friend request sent to: " + friendName);
            // Optionally clear input or close the Add Friend UI:
            document.getElementById("addFriendInput").value = "";
            document.getElementById("autocompleteDropdown").style.display = "none";
         } else {
            alert("Error: " + data.error);
         }
      })
      .catch((error) => {
         console.error("Error sending friend request:", error);
         alert("Error sending friend request.");
      });
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

/**************************************
 * 5. Accept or Decline friend request (AJAX) + Update Friend List
 **************************************/
function acceptRequestAjax(requestId, btn) {
   const formData = new FormData();
   formData.append("request_id", requestId);

   fetch("/accept_request", {
      method: "POST",
      body: formData,
   })
      .then((response) => {
         if (!response.ok) {
            throw new Error("Accept request failed.");
         }
         return response.json();
      })
      .then((data) => {
         if (data.success) {
            // Fade out the request item
            const requestItem = btn.closest(".request-item");
            requestItem.style.transition = "opacity 0.5s";
            requestItem.style.opacity = 0;
            setTimeout(() => {
               requestItem.remove();
               // Then refresh the friend list
               updateFriendList();
            }, 500);
         } else {
            console.error("Accept request error:", data.error);
         }
      })
      .catch((error) => {
         console.error("Error accepting request:", error);
      });
}

function declineRequestAjax(requestId, btn) {
   const formData = new FormData();
   formData.append("request_id", requestId);

   fetch("/decline_request", {
      method: "POST",
      body: formData,
   })
      .then((response) => {
         if (!response.ok) {
            throw new Error("Decline request failed.");
         }
         return response.json();
      })
      .then((data) => {
         if (data.success) {
            // Fade out the request item
            const requestItem = btn.closest(".request-item");
            requestItem.style.transition = "opacity 0.5s";
            requestItem.style.opacity = 0;
            setTimeout(() => requestItem.remove(), 500);
            // (No new friend added, so no need to updateFriendList,
            //  but you could if you want to be sure.)
         } else {
            console.error("Decline request error:", data.error);
         }
      })
      .catch((error) => {
         console.error("Error declining request:", error);
      });
}

/**************************************
 * 6. Update friend list via new /get_friends endpoint
 **************************************/
function updateFriendList() {
   fetch("/get_friends")
      .then((response) => response.json())
      .then((data) => {
         if (data.error) {
            console.error("Error fetching updated friends list:", data.error);
            return;
         }
         const friendListContainer = document.querySelector(".friend-list");
         if (!friendListContainer) return;

         let newHTML = "";
         data.friends.forEach((friend) => {
            const pic = friend.profile_pic || "/static/profile_pics/default.png";
            newHTML += `
           <li onclick="openChat('${friend.username}')">
             <img
               class="friend-avatar"
               src="${pic}"
               alt="${friend.username} Avatar"
             />
             ${friend.username}
           </li>
         `;
         });

         friendListContainer.innerHTML = newHTML;
      })
      .catch((error) => {
         console.error("Error fetching updated friends list:", error);
      });
}
