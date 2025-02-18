// user_home.js

// A placeholder function to handle switching chat content
function openChat(friendName) {
   const chatContent = document.getElementById("chatContent");
   chatContent.innerHTML = `
      <p><strong>Chat with ${friendName}</strong></p>
      <p>(Here you can load or display chat messages with ${friendName}...)</p>
    `;
}
