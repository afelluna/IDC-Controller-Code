import mysql from 'mysql'
import config from "../config/config";

class Database {

  conn: any;

  constructor () {

    this.conn = mysql.createConnection({
      host: config.DB.host,
      user: config.DB.username,
      password: config.DB.password,
      database: config.DB.name,
      multipleStatements: true
    })
  }

  query (sql: any, args: any = null) {
    return new Promise((resolve, reject) => {
      this.conn.query(sql, args, (err: any, rows: any) => {
        if (err) {
          return reject(err)
        }
        resolve(rows)
      })
    })
  }

  close () {
    return new Promise((resolve, reject) => {
      this.conn.end((err: any) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  escape (string: any = null) {
    return mysql.escape(string);
  }

  connection (string: any = null) {
    return this.conn;
  }
}

export default Database 