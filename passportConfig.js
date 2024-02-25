const LocalStrategy = require("passport-local").Strategy;
const { pool } = require("./db/index");
const bcrypt = require("bcrypt");

function initialize(passport) {
  console.log("Initialized");

  const authenticateUser = (email, password, done) => {
    console.log("SE LLAMAN A LOS DATOS");
    console.log(`Email: ${email}, Password: ${password}`);
    pool.query(
      `SELECT * FROM usuario WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          console.error("Error al consultar la base de datos:", err);
          return done(err);
        }
        console.log("LOS RESULTADOS DE LA CONSULTA SON:", results.rows);

        if (results.rows.length >  0) {
          const user = results.rows[0];
          console.log("Usuario encontrado:", user);

          bcrypt.compare(password, user.contrasena, (err, isMatch) => {
            if (err) {
              console.error("Error al comparar contraseñas:", err);
              return done(err);
            }
            if (isMatch) {
              console.log("Contraseña correcta, autenticación exitosa");
              return done(null, user);
            } else {
              console.log("CONTRASENA INCORRECTA: ");
              return done(null, false, { message: "Contraseña Incorrecta" });
            }
          });
        } else {
          console.log("NO EXISTE USUARIO EN ESE MAIL");
          return done(null, false, {
            message: "No existe usuario con ese email"
          });
        }
      }
    );
  };

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      authenticateUser
    )
  );
   
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser((id, done) => {
    pool.query(`SELECT * FROM usuario WHERE id = $1`, [id], (err, results) => {
      if (err) {
        console.error("Error al deserializar usuario:", err);
        return done(err);
      }
      console.log(`ID is ${results.rows[0].id}`);
      return done(null, results.rows[0]);
    });
  });
}

module.exports = initialize;