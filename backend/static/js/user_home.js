// user_home.js

/**************************************
 * 1. Open Add Friend UI
 **************************************/
function openAddFriend() {
   // 1) Set the chat header
   const chatHeader = document.getElementById("chatHeader");
   chatHeader.innerHTML = "<h2>Add Friend</h2>";

   // 2) Clear #chatMessages
   const chatMessagesDiv = document.getElementById("chatMessages");
   chatMessagesDiv.innerHTML = "";

   // 3) Optionally remove or hide the footer
   const chatFooter = document.getElementById("chatFooter");
   chatFooter.innerHTML = "";

   // 4) Now build the add friend UI
   let html = `
     <div class="add-friend-container">
       <div class="add-friend-box">
         <h2>Add Friend</h2>
         <p>You can add friends by their username.</p>
         <div id="addFriendError" class="add-friend-error"></div>
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
       </div>
     </div>
   `;
   // Put it into #chatMessages
   chatMessagesDiv.innerHTML = html;
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
   // 1) Clear or change the header
   const chatHeader = document.getElementById("chatHeader");
   chatHeader.innerHTML = "<h2>Pending Friend Requests</h2>";

   // 2) Clear the messages area or show "Loading..."
   const chatMessagesDiv = document.getElementById("chatMessages");
   chatMessagesDiv.innerHTML = "Loading friend requests...";

   // 3) Optionally hide/clear the chat footer if you want
   const chatFooter = document.getElementById("chatFooter");
   chatFooter.innerHTML = ""; // or hide it

   // 4) Now fetch the requests
   fetch("/get_friend_requests")
      .then((response) => response.json())
      .then((data) => {
         if (data.error) {
            console.error("Error fetching friend requests:", data.error);
            chatMessagesDiv.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
            return;
         }
         buildRequestsUI(data);
      })
      .catch((error) => {
         console.error("Error fetching friend requests:", error);
         chatMessagesDiv.innerHTML = `<p style="color:red;">Error loading requests</p>`;
      });
}

function buildRequestsUI(requests) {
   const chatMessagesDiv = document.getElementById("chatMessages");
   if (!chatMessagesDiv) return;

   let html = "<div class='requests-container'>";
   // We might not want an <h2> here if we already set #chatHeader
   // but if you do, that's fine:
   // html += "<h2>Friend Requests</h2>";

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
   chatMessagesDiv.innerHTML = html;
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
               <li id="friendLi${friend.id}" onclick="openChat(${friend.id}, '${friend.username}')">
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
function openChat(friendId, friendName) {
   // 1. Remove the "active" class from all friend <li> elements
   document.querySelectorAll(".friend-list li").forEach((li) => {
      li.classList.remove("active");
   });

   // 2. Add "active" to the friend the user just clicked
   const thisLi = document.getElementById("friendLi" + friendId);
   if (thisLi) {
      thisLi.classList.add("active");
   }

   // 1) Set the header
   const chatHeader = document.getElementById("chatHeader");
   chatHeader.innerHTML = `<h2>Chat with ${friendName}</h2>`;

   // 2) Show "Loading..." in the messages area
   const chatMessagesDiv = document.getElementById("chatMessages");
   chatMessagesDiv.innerHTML = "Loading messages...";

   const chatFooter = document.getElementById("chatFooter");
   chatFooter.innerHTML = `
      <input
         type="text"
         id="chatInputField"
         placeholder="Type your message..."
         onkeydown="handleChatKeyDown(event)"
      />
      <button onclick="sendChatMessage()">Send</button>
   `;

   // 3) Store these globally so sendChatMessage() knows whom to message
   window.currentChatFriendId = friendId;
   window.currentChatFriendName = friendName;

   // 4) Fetch existing messages
   fetch(`/get_messages?friend_id=${friendId}`)
      .then((res) => res.json())
      .then((data) => {
         if (data.error) {
            chatMessagesDiv.innerHTML = `<p style="color: red;">Error: ${data.error}</p>`;
            return;
         }
         // Build message HTML
         let html = "";
         data.messages.forEach((msg) => {
            const who = msg.sender_id === CURRENT_USER_ID ? "You" : msg.sender_username;
            const pic = msg.sender_profile_pic || "/static/profile_pics/default.png";

            // Set the date
            const timestampLabel = formatMessageTimestamp(msg.created_at);

            html += `
           <div class="chat-message" style="display:flex; margin-bottom:0.5rem;">
             <img src="${pic}" style="width:32px; height:32px; border-radius:50%; margin-right:8px;"/>
             <div>
               <strong>${who}</strong>
               <span style="opacity:0.8; font-size:0.8rem; margin-left:8px;">${timestampLabel}</span>
               <div>${msg.content}</div>
             </div>
           </div>
         `;
         });
         chatMessagesDiv.innerHTML = html;
         // Scroll to bottom
         chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
      })
      .catch((err) => {
         console.error("Error loading messages:", err);
      });
}

// 2. Function to send a message using /send_message
function sendChatMessage() {
   const inputField = document.getElementById("chatInputField");
   if (!inputField) return;

   const messageText = inputField.value.trim();
   if (!messageText) return;

   // We stored friend info when we last opened a chat
   const friendId = window.currentChatFriendId;
   const friendName = window.currentChatFriendName;

   fetch("/send_message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         friend_id: friendId,
         message: messageText,
      }),
   })
      .then((res) => res.json())
      .then((data) => {
         if (data.error) {
            console.error("Error sending message:", data.error);
            return;
         }
         // success => clear input, reload messages
         inputField.value = "";
         // fetch the updated conversation
         openChat(friendId, friendName);
         // optionally reorder friend list
         updateFriendList();
      })
      .catch((err) => {
         console.error("Error in sendChatMessage:", err);
      });
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

/**************************************
 * Format a raw MySQL timestamp like "2025-01-12 21:13:00"
 * into either:
 *   - "Today at 9:13 PM"
 *   - "Yesterday at 6:27 AM"
 *   - "1/12/2025 9:13 PM"
 **************************************/
function formatMessageTimestamp(rawTimestamp) {
   // 1) Parse the "YYYY-MM-DD HH:MM:SS" string into a JS Date.
   //    We insert a "T" to form an ISO-like string: "YYYY-MM-DDTHH:MM:SS"
   //    Also handle if there's no seconds, etc. But typically MySQL includes them.
   const dateObj = new Date(rawTimestamp.replace(" ", "T"));

   // If this fails for some reason, you'll get "Invalid Date". You can gracefully return something:
   if (isNaN(dateObj)) {
      return "Invalid Date";
   }

   // 2) Figure out if it's "today", "yesterday", or older
   //    We compare year/month/day with the local "now".
   const now = new Date();

   // We'll zero-out the time portion so we can compare just dates
   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
   const msgDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

   // difference in days (millisecond difference / 86_400_000)
   const diffTime = today - msgDate;
   const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

   // 3) Build a 12-hour clock time for the message's time portion
   //    e.g. "3:32 PM"
   const timeOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
   };
   const timeString = dateObj.toLocaleTimeString([], timeOptions);

   // 4) Decide which prefix to use:
   //    If diffDays === 0 => "Today at HH:MM"
   //    If diffDays === 1 => "Yesterday at HH:MM"
   //    Else => "M/D/YYYY HH:MM"
   if (diffDays === 0) {
      // same local date as now
      return `Today at ${timeString}`;
   } else if (diffDays === 86400000 / (1000 * 60 * 60 * 24)) {
      // If you want to precisely check 1 day difference, you'd do diffDays == 1
      // But because we're doing date difference by day (not ms?), if diffDays===1 => "yesterday"
      return `Yesterday at ${timeString}`;
   } else if (diffDays === 1) {
      // More typical: if diffDays == 1 => yesterday
      return `Yesterday at ${timeString}`;
   } else {
      // It's older
      // Format M/D/YYYY
      const m = dateObj.getMonth() + 1; // getMonth() is 0-based
      const d = dateObj.getDate();
      const y = dateObj.getFullYear();

      return `${m}/${d}/${y} ${timeString}`;
   }
}

function parseMySQLDateTime(mysqlDateStr) {
   // Typical MySQL DATETIME is "YYYY-MM-DD HH:MM:SS"
   // 1. Split by space => ["YYYY-MM-DD", "HH:MM:SS"]
   const [datePart, timePart] = mysqlDateStr.split(" ");
   if (!datePart || !timePart) return null; // invalid format

   // 2. Split datePart => [YYYY, MM, DD], split timePart => [HH, mm, ss]
   const [year, month, day] = datePart.split("-");
   const [hour, minute, second] = timePart.split(":");

   // 3. Convert them to integers
   const yyyy = parseInt(year, 10);
   const MM = parseInt(month, 10) - 1; // JS months 0-11
   const dd = parseInt(day, 10);
   const hh = parseInt(hour, 10);
   const mm = parseInt(minute, 10);
   const ss = parseInt(second || "0", 10);

   // 4. Create the Date object in local time
   //    (Or if you know your DB is storing UTC, you can adjust or add "Z", etc.)
   const dateObj = new Date(yyyy, MM, dd, hh, mm, ss);
   if (isNaN(dateObj.getTime())) {
      return null; // invalid date
   }
   return dateObj;
}
