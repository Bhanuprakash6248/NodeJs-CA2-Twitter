const express = require('express')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

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

const getFollowingPeopleIdsOfUser = async username => {
  const followingPeopleQuery = `
    SELECT following_user_id
    FROM follower INNER JOIN user
    ON user.user_id = follower.follower_user_id
    WHERE user.username= "${username}";
  `
  const followingPeople = await db.all(followingPeopleQuery)
  const arrayIds = followingPeople.map(each => each.following_user_id)
  return arrayIds
}

//Authentication with JWT Token

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

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
          "${gender}"
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

//API --> 2 Login
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
  SELECT *
  FROM 
    user
  WHERE
    username ="${username}";
  `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)

    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.send(400)
      response.send('Invalid password')
    }
  }
})

app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {username} = request
  const followingPeopleIds = await getFollowingPeopleIdsOfUser(username)

  const latestTweetQuery = `
    SELECT username,tweet,date_time as dateTime
    FROM user INNER JOIN tweet
    ON user.user_id = tweet.user_id
    WHERE user.user_id IN (${followingPeopleIds})
    ORDER BY date_time DESC
    LIMIT 4 ;
  `
  const latestTweets = await db.all(latestTweetQuery)

  response.send(latestTweets)
})

//API-4 --->list of all names

app.get('/user/following/', authenticateToken, async (request, response) => {
  const {userId, username} = request
  const nameQuery = `
    SELECT name 
    FROM follower INNER JOIN user
    ON user.user_id = follower.following_user_id
    WHERE follower_user_id = "${userId}";
  `
  const followingPeople = await db.all(nameQuery)
  response.send(followingPeople)
})

module.exports = app
