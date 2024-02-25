const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const formatMessage = require('./utils/messages');
const router = new express.Router();
const { Pool } = require('pg');
const app = express();
const { pool } = require('./db/index'); 
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const PORT = 3000 || process.env.PORT;
const bodyParser = require('body-parser');
const moment = require('moment');

const initializePassport = require('./passportConfig');

const { 
    userJoin, 
    getCurrentUser, 
    userLeave, 
    etRoomUsers, 
    getRoomUsers
} = require('./utils/users');
const { error } = require('console');


const server = http.createServer(app);
const io = socketIO(server);

initializePassport(passport);

//MIDDLEWARE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({extended: false}));

//app configuration
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


//renderizaciones
app.get('/', (req, res) => {
    const messages = {
      success_msg: req.flash('success_msg')
    };
    res.render('index', { messages: messages });
});


app.get('/signup', (req, res) => {
    res.render('signup', { errors: [] });
});

app.get('/chat/interface', checkNotAuthenticated, (req, res) => {
    // Verifica si el usuario está autenticado
    if (req.user) {
        // Renderiza la plantilla con el objeto user
        res.render('chat/interface', { user: req.user });
    } else {
        // Redirige al usuario a la página de inicio de sesión si no está autenticado
        res.redirect('/login');
    }
});

app.get("/users/logout", (req, res) => {
    req.logout(function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Error al cerrar la sesión');
      }
      res.redirect("/");
    });
});

app.get('/chat/chat', (req, res) => {
        res.render('chat/chat', { user: req.user });
});




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


// DATA BASE CONFIGURATIONS 
// CONFIGURACION SIGNUP
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    
    let errors = [];
    
    
    if (password.length < 6) {
        errors.push({ message: "Contraseña debe tener minimo 6 characteres" });
    }
    
    if (errors.length > 0) {
        res.render("signup", { errors });
    } 
    else {
        //encryptar constraseña
        const hashedPassword = await bcrypt.hash(password,  10);
        //Validacion correo ya registrado
        pool.query(
            `SELECT * FROM usuario
              WHERE email = $1`,
            [email],
            (err, results) => {
                if (err) {
                    console.log(err);
                }
                console.log(results.rows);
                if (results.rows.length >  0) {
                    errors.push({ message: "Email ya se encuentra registrado!" });
                    res.render("signup", { errors });
                } else {
                    // Validacion nombre de usuario ya registrado
                    pool.query(
                        `SELECT * FROM usuario
                          WHERE nombre = $1`,
                        [username],
                        (err, results) => {
                            if (err) {
                                console.log(err);
                            }
                            console.log(results.rows);
                            if (results.rows.length >  0) {
                                errors.push({ message: "Nombre de usuario ya se encuentra registrado!" });
                                res.render("signup", { errors });
                            } else {
                                // Si el nombre de usuario no está registrado, procede a insertar el nuevo usuario
                                pool.query(
                                    `INSERT INTO usuario (nombre, email, contrasena)
                                        VALUES ($1, $2, $3)
                                        RETURNING id, contrasena`,
                                    [username, email, hashedPassword],
                                    (err, results) => {
                                        if (err) {
                                            throw err;
                                        }
                                        console.log(results.rows);
                                        req.flash("success_msg", "Ya estás registrado!. Ingresa tus credenciales");
                                        res.redirect("/");
                                    }
                                ); // Cierre de la segunda consulta pool.query
                            }
                        }
                    ); // Cierre de la consulta para verificar nombre de usuario
                }
            }
        ); // Cierre de la primera consulta pool.query
    }
    
});


//TODO: Mensajes de error identifica pero no imprime

//CONFIGURACION LOGIN
app.post("/", passport.authenticate("local", {
    successRedirect: "/chat/interface",
    failureRedirect: "/",
    failureFlash: true,
    failure: function(err, req, res, next) {
      // Pasar los errores a la vista
      let errors = [];
      if (err) {
        errors.push({ message: err.message });
      }
      console.log("los errores son:", errors);
      // Renderizar la página de inicio con los mensajes de error
      req.flash('error', errors);
      res.redirect("/");
    }
}));
  
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/chat/interface");
    }
    next();
}
  
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/");
}

//CONFIGURACION CHAT
app.post('/join-chat', async (req, res) => {
    const { username, courseId } = req.body; // Asumiendo que estos datos vienen en el cuerpo de la solicitud

    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');

    console.log("La fecha actual es: ", currentDateTime);
    console.log({
        username,
        courseId
    });
    
    // Consulta para obtener el id del usuario basado en el username
    const userQuery = `
      SELECT id FROM public.usuario WHERE nombre = $1
    `;
    const userValues = [username]; // Asegúrate de que 'username' contiene el valor correcto
    
    try {
      const userResult = await pool.query(userQuery, userValues);
      if (userResult.rows.length >  0) {
        const userId = userResult.rows[0].id;
        console.log('ID del usuario:', userId);
    
        // Consulta para insertar el registro en la tabla 'chat'
        const chatQuery = `
          INSERT INTO public.chat (fecha_hora, id_usuario, id_canal)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
        const chatValues = [currentDateTime, userId, courseId];
    
        const chatResult = await pool.query(chatQuery, chatValues);
        console.log('Chat insertado con éxito:', chatResult.rows[0].id);
      } else {
        console.log('Usuario no encontrado');
        // Manejar el caso en que el usuario no se encuentra
      }
    } catch (err) {
      console.error('Error al consultar el usuario o insertar en la tabla de chat:', err);
    }




    //res.redirect('/chat/chat');

    
});

//LISTEN PORT
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


module.exports = router;
