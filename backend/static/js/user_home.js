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
 
         <!-- The error div, centered above the input -->
         <div id="addFriendError" class="add-friend-error"></div>
 
         <!-- The input + button side by side -->
         <div class="add-friend-input">
           <input
             type="text"
             id="addFriendInput"
             placeholder="Enter a username..."
             oninput="onFriendSearchInput()"
           />
           <button class="add-friend-button" onclick="sendFriendRequest()">
             Send Request
           </button>

           <div
            id="autocompleteDropdown"
            class="autocomplete-dropdown"
            style="display: none;"
            ></div>
         </div>
 
         <div
           id="autocompleteDropdown"
           class="autocomplete-dropdown"
           style="display: none;"
         ></div>
       </div>
     </div>
   `;
}

/**************************************
 * 2. Searching users in the database (live dropdown)
 **************************************/
function onFriendSearchInput() {
   const inputVal = document.getElementById("addFriendInput").value.trim();
   const dropdown = document.getElementById("autocompleteDropdown");

   // If no input, hide dropdown
   if (!inputVal) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
   }

   // Fetch matching users from the server
   fetchMatchingUsers(inputVal).then((matchingUsers) => {
      if (matchingUsers.length === 0) {
         // If empty, show a "not found" message
         dropdown.innerHTML = `<div class="no-user">User was not found. Try again</div>`;
         dropdown.style.display = "block";
         return;
      }

      // Build dropdown items
      let html = "";
      matchingUsers.forEach((username) => {
         html += `<div class="autocomplete-item" onclick="selectUsername('${username}')">${username}</div>`;
      });
      dropdown.innerHTML = html;
      dropdown.style.display = "block";
   });
}

function fetchMatchingUsers(query) {
   // Return a Promise that resolves to an array of usernames
   return fetch("/search_users?query=" + encodeURIComponent(query))
      .then((res) => res.json())
      .then((data) => {
         if (data.error) {
            console.error("Error searching users:", data.error);
            return [];
         }
         return data.results || [];
      })
      .catch((err) => {
         console.error("Error fetching users:", err);
         return [];
      });
}

function selectUsername(username) {
   document.getElementById("addFriendInput").value = username;
   document.getElementById("autocompleteDropdown").style.display = "none";
}

/**************************************
 * 3. Send Friend Request
 **************************************/
function sendFriendRequest() {
   const friendName = document.getElementById("addFriendInput").value.trim();
   const errorDiv = document.getElementById("addFriendError");

   // Clear any old error text
   errorDiv.textContent = "";

   // Basic validation
   if (!friendName) {
      errorDiv.textContent = "Please enter a username to send a friend request.";
      return;
   }

   // Check if user is adding themselves (client-side check)
   if (
      typeof CURRENT_USERNAME !== "undefined" &&
      friendName.toLowerCase() === CURRENT_USERNAME.toLowerCase()
   ) {
      errorDiv.textContent = "You cannot add yourself!";
      return;
   }

   // Send AJAX request to the backend
   fetch("/send_friend_request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friend_username: friendName }),
   })
      .then((response) => response.json())
      .then((data) => {
         // If there's an error from the server, display it above the text box
         if (data.error) {
            errorDiv.textContent = data.error;
            return;
         }
         // Otherwise, success
         if (data.success) {
            // Optionally show a success message inline in green, or do an alert
            // For example:
            errorDiv.style.color = "green";
            errorDiv.textContent = "Friend request sent to: " + friendName;

            // Optionally reset the input
            document.getElementById("addFriendInput").value = "";
            document.getElementById("autocompleteDropdown").innerHTML = "";
            document.getElementById("autocompleteDropdown").style.display = "none";

            // Reset color to red for future errors
            setTimeout(() => {
               errorDiv.textContent = "";
               errorDiv.style.color = "red";
            }, 3000);
         }
      })
      .catch((error) => {
         console.error("Error sending friend request:", error);
         errorDiv.textContent = "An error occurred. Please try again.";
      });
}

/**************************************
 * 4. Open Requests UI (pending friend requests)
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
      // Sort alphabetically
      requests.sort((a, b) => a.username.localeCompare(b.username));
      requests.forEach((req) => {
         html += `
         <div class="request-item" data-request-id="${req.id}">
           <span>${req.username}</span>
           <button
             type="button"
             class="accept-btn"
             onclick="acceptRequestAjax(${req.id}, this)"
           >
             <i class="fa fa-check" style="color: green;"></i>
           </button>
           <button
             type="button"
             class="decline-btn"
             onclick="declineRequestAjax(${req.id}, this)"
           >
             <i class="fa fa-times" style="color: red;"></i>
           </button>
         </div>
       `;
      });
   }
   html += "</div>";
   document.getElementById("mainContent").innerHTML = html;
}

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
            // Fade out the request item visually
            const requestItem = btn.closest(".request-item");
            requestItem.style.transition = "opacity 0.5s";
            requestItem.style.opacity = 0;
            setTimeout(() => {
               requestItem.remove();
               // Update the friend list
               updateFriendList();
               // Update the requests badge
               updateRequestCount();
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
            setTimeout(() => {
               requestItem.remove();
               // Update the badge again
               updateRequestCount();
            }, 500);
         } else {
            console.error("Decline request error:", data.error);
         }
      })
      .catch((error) => {
         console.error("Error declining request:", error);
      });
}

/**************************************
 * 6. Update friend list after acceptance
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
         console.error("Error updating friend list:", error);
      });
}

/**************************************
 * 7. Open a chat with a friend
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
 * UPDATE REQUEST COUNT BADGE
 **************************************/
function updateRequestCount() {
   fetch("/get_friend_requests")
      .then((response) => response.json())
      .then((data) => {
         // If "data.error", user not logged in, etc. => handle gracefully
         if (data.error) {
            console.error("Error fetching request count:", data.error);
            return;
         }
         // 'data' should be an array of pending requests; just use length:
         const count = data.length;
         const requestCountSpan = document.getElementById("requestCount");
         if (requestCountSpan) {
            requestCountSpan.textContent = count; // update the badge
         }
      })
      .catch((err) => {
         console.error("Error updating request count:", err);
      });
}
