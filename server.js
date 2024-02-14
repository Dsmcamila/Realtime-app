const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const formatMessage = require('./utils/messages');
const { 
    userJoin, 
    getCurrentUser, 
    userLeave, 
    etRoomUsers, 
    getRoomUsers
} = require('./utils/users');



const app = express();
const server = http.createServer(app);
const io = socketIO(server);


// TODO : Create a connexion to the DB postgreSQL and validate user credentials

//Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botname = 'LiveChat 4rxBot';



//Connect to Socket.io
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.js');
});


// Run when client connects
io.on('connection', socket => {

    socket.on('joinRoom', ({ username, room }) => {

        const user = userJoin(socket.id, username, room);
        //It comes from the URL

        socket.join(user.room);

        //wellcome current user
        socket.emit('message', formatMessage(botname, 'Welcome to ChatCord!')); // IT PRINTS AN OBJECT

        // Broadcast when a user connects
        socket.broadcast.to(user.room).emit(
            'message',
            formatMessage(botname, `${user.username} has join to the chat`)
        ); //emit to everybody except the user
        
        //Sends users and room info
        
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    })

    //Listen for chatMessage
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg)); //emit to everyone the message
    });

    //Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);


        if(user){
            io.to(user.room).emit('message', formatMessage(botname, `${user.username} has left the chat`));
        };

        //Sends users and room info
        
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));