// src/config/db.js
require("dotenv").config();
const sql = require("mssql/msnodesqlv8");

const DRIVER = process.env.DB_DRIVER || "ODBC Driver 18 for SQL Server";

const connectionString =
  `Driver={${DRIVER}};` +
  `Server=${process.env.DB_SERVER};` +
  `Database=${process.env.DB_DATABASE};` +
  `Trusted_Connection=Yes;` +
  `Encrypt=No;`;

const pool = new sql.ConnectionPool({
  connectionString,
  options: {
    trustedConnection: true,
  },
});


module.exports = { sql, pool };