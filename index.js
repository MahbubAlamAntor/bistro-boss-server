const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PROT || 5000;
// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jypts.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const usersCollections = client.db('bistroBoss').collection('users')
        const menuCollections = client.db('bistroBoss').collection('menu')
        const reviewsCollections = client.db('bistroBoss').collection('reviews')
        const cartCollections = client.db('bistroBoss').collection('carts')
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection

        // jwt related api
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_TOKEN, {
                expiresIn: '4h'
            })
            res.send({ token })
        });

        // middleware 

        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorize access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorize access' })
                }
                req.decoded = decoded;
                next();
            })
        };

        // use verify admin after verify token

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollections.findOne(query);
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            };
            next();
        }

        app.get('/user/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await usersCollections.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })

        // user related api

        app.get('/users', verifyToken, async (req, res) => {
            console.log(req.headers);
            const result = await usersCollections.find().toArray();
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const userData = req.body;
            const query = { email: userData.email }
            const isExist = await usersCollections.findOne(query)
            if (isExist) {
                return res.send({ message: 'user already add', insertedId: null })
            }
            const result = await usersCollections.insertOne(userData);
            res.send(result)
        });

        app.patch('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollections.updateOne(query, updateDoc);
            res.send(result);
        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await usersCollections.deleteOne(filter);
            res.send(result)
        })

        // menu related api
        app.get('/menu', async (req, res) => {
            const result = await menuCollections.find().toArray();
            res.send(result)
        });

        app.get('/menu/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await menuCollections.findOne(query);
            res.send(result)
        })

        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const menuData = req.body;
            const result = await menuCollections.insertOne(menuData);
            res.send(result)
        });

        app.patch('/menu/:id', async(req, res) => {
            const items = req.body;
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const updateDoc = {
                $set: {
                    name: items.name,
                    category: items.category,
                    price: items.price,
                    recipe: items.recipe,
                    image: items.image
                }
            };
            const result = await menuCollections.updateOne(query, updateDoc);
            res.send(result)
        })

        app.delete('/menu/:id',verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollections.deleteOne(query);
            res.send(result);
        })

        // reviews related api

        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollections.find().toArray();
            res.send(result)
        })

        // cards data loaded

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartCollections.find(query).toArray();
            res.send(result)
        })

        app.post('/carts', async (req, res) => {
            const data = req.body;
            const result = await cartCollections.insertOne(data);
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollections.deleteOne(query);
            res.send(result)
        })
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Bistro Boss Is running')
})

app.listen(port, () => {
    console.log(`This Port Is running ${port}`)
})