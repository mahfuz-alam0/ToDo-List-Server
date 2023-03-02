const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();
// app.use(express.static("public"));
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.DB_PASS}@cluster0.3njemyu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function varifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(403).send({ message: "unauthorized Access" });
    } else {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
            if (err) {
                return res.status(403).send({ message: "Forbiden Access" });
            } else {
                req.decoded = decoded;
                next();
            }
        })
    }

}

async function run() {
    const users_collection = client.db("Todo_task").collection("Users");
    const todo_collection = client.db("Todo_task").collection("ToDo");

    const verifyAdmin = async (req, res, next) => {
        const decodedEmail = req.decoded.email;
        const query = { email: decodedEmail };
        const user = await users_collection.findOne(query);
        if (user.role !== '0') {
            return res.status(403).send({ message: 'you are not Admin' })
        } else {
            next();
        }
    }

    app.get('/jwt', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const user = await users_collection.findOne(query);
        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10h' });
            res.send({ accessToken: token });
        } else {
            res.status(401).send({ message: "unauthorized Access" });
        }
    });

    app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email }
        const user = await users_collection.findOne(query);
        res.send({ isAdmin: user?.role === '0' })
    })
    app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email }
        const user = await users_collection.findOne(query);
        res.send(user)
    })

    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await users_collection.insertOne(user);
        res.send(result);
    });

    app.patch('/users/:id',varifyJWT, async (req, res) => {
        const query = { _id: new ObjectId(req.params.id) };
        const updateDoc = { $set: req.body };
        const result = await users_collection.updateOne(query, updateDoc);
        res.send(result);
    });

    app.post('/todo', varifyJWT, async (req, res) => {
        const user = req.body;
        const result = await todo_collection.insertOne(user);
        res.send(result);
    });

    app.delete('/todo/:id', varifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await todo_collection.deleteOne(query);
        res.send(result);
    });

    app.get('/todo/:email', async (req, res) => {
        const email = req.params.email;
        const query = { user:email };
        const result = await todo_collection.find(query).toArray();
        res.send(result);
    });

    app.get('/allList',varifyJWT, verifyAdmin, async (req, res) => {
        const query = {};
        const result = await todo_collection.find(query).toArray();
        res.send(result);
    });

    app.get('/todo/:email',varifyJWT, async (req, res) => {
        const email = req.params.email;
        const query = { user:email };
        const result = await todo_collection.find(query).toArray();
        res.send(result);
    });

    

}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
