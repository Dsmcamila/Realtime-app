const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');


//Get username and room from URL
const { username , room } = Qs.parse(location.search, {
    ignoreQueryPrefix: true // We dont want to get the symbols, aspersand or other
});

//This is to check the username and room entered, configure with the db
//console.log(username, room);

const socket = io();
socket.emit('joinRoom', {username, room});

//GET room and users
socket.on('roomUsers', ({ room, users }) =>{
    outputRoomName(room);
    outputUsers(users);
});

//Message from the server
socket.on('message', message =>{
    console.log(message);
    outputMessage(message);

    // Scroll Down
    chatMessages.scrollTop = chatMessages.scrollHeight;
});
//Message Submit - clear screen
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const msg = e.target.elements.msg.value;

    // Emit message to server
    socket.emit('chatMessage',msg);

    // Clear input
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus;
});

//Output message to DOM
function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">${message.username}<span> ${message.time} </span></p>
    <p class="text">
        ${message.text}
    </p>`;
    document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
    roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
    userList.innerHTML = `
     ${users.map(user => `<li>${user.username}</li>`).join('')}
    `;
}

//create a Event Message Listener
document.getElementById('leave-btn').addEventListener('click', () => {
    const leaveRoom = confirm('Seguro quieres dejar la sala?');
    
    if(leaveRoom){
        window.location.href = '../chat/interface.html';
    }else{
        
    }
});

