const express = require('express')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const path = require('path')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())

let db = null
const dbPath = path.join(__dirname, 'twitterClone.db')

//Initalising the DB and Server

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server is running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

//API-->1
app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const selectQuery = `SELECT * FROM user WHERE username = "${username}";`
  const dbUser = await db.get(selectQuery)
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const createdQuery = `
        INSERT INTO
          user (username, password, name, gender)
        VALUES(
          "${username}",
          "${hashedPassword}",
          "${name}",
          "${gender}",
        );
      `
      await db.run(createdQuery)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

module.exports = app
