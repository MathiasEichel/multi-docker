const keys = require('./keys');

// Express setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const {Pool} = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
})

pgClient.on("connect", (client) => {
    client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
});

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, rsp) => {
    rsp.send('Hi Mathias');
})

app.get('/values/all', async (req, rsp) => {
    const values = await pgClient.query('SELECT * from values');
    rsp.send(values.rows);
});

app.get('/values/current', async (req, rsp) => {
    redisClient.hgetall('values', (err, values) => {
        rsp.send(values);
    })
})

app.post('/values', async (req, rsp) => {
    const index = req.body.index;
    if(parseInt(index) > 40) {
        return rsp.status(422).send('Index too high');
    }

    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
    rsp.send({working: true});
})
app.listen(5000, (err) => {
    console.log('Listening');
})