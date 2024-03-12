const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
// send cookies from client side via cors
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    // set cookie with credentials true
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

console.log(process.env.DB_PASS);

// create middlewares
const logger = async (req, res, next) => {
    console.log('called:', req.host, req.originalUrl);
    next();
}

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('value of token in middlewarre', token);
    if (!token) {
        return res.status(401).send({ message: 'Not Authorized' })
    }
    // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     // error
    //     if (err) {
    //         console.log(err);
    //         return res.status(401).send({ message: 'Unauthorized' })
    //     }
    //     // if token is valid then it would be decoded
    //     console.log('value of the token', decoded);
    //     req.user=decoded;
    // })
    next();
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ci4nuyk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('doctorCar').collection('services');
        // another collection from bookings data
        const bookingCollection = client.db('doctorCar').collection('bookings');

        // Auth related api 
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res
                // send cookies
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false
                })
                .send({ success: true });
        })

        // find all data from database
        // Services related api
        app.get('/services', logger, async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // find single/specific data from database
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const options = {
                // If i want a value then i will do  title: 1, and i don't need a value then i will do  title: 0
                projection: { title: 1, price: 1, service_id: 1, img: 1 }
            }

            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })

        // find some data from booking collection
        app.get('/bookings', logger, verifyToken, async (req, res) => {
            console.log(req.query);
            // console.log('token', req.cookies.token);
            // console.log('user in the valid token',req.user);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        // bookings data / post data  = C = create
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        // Update method
        app.patch('bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateBooking = req.body;
            console.log(updateBooking);
            const updateDoc = {
                $set: {
                    status: updateBooking.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // Delete method
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Doctor is running');
})

app.listen(port, () => {
    console.log(`Doctor Car is running ono port ${port}`);
})