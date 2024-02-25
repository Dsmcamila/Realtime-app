
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '192.168.100.96',
  database: 'postgres',
  password: 'c4123',
  port:  5432,
});


// CONEXION USUARIOS        

/*
//Pedir datos
const obtenerUsuarios = async() => {
  const res = await pool.query('SELECT * FROM public.usuario');
  console.log(res.rows);
  pool.end(); //no para apps webs
}

//obtenerUsuarios();

// TEST        
//Pedir datos
const obtenerCanales = async() => {
  const res = await pool.query('SELECT * FROM public.canales');
  console.log(res.rows);
  pool.end(); //no para apps webs
}
//insertar datos
const insertarCanal = async() => {
  const text = 'INSERT INTO canales (nombre) VALUES ($1)';
  const values = ['C'];

  const res = await pool.query(text, values);
  console.log(res);
  pool.end();
}

//eliminar dato
const borrarCanal = async () => {
  const text = 'DELETE FROM canales WHERE nombre = $1';
  const values = ['C'];
  const res = await pool.query(text, values);
  console.log(res);
  pool.end();
}

//obtenerCanales();
//insertarCanal();
//borrarCanal();

*/

module.exports = { pool };