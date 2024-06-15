const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.neggqyg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const newsCollection = client.db('newsPaperDB').collection('news');
    const userCollection = client.db('newsPaperDB').collection('users');
    const paymentCollection = client.db('newsPaperDB').collection('payment');


    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }



    // for showind all data in home
    app.get('/news', async (req, res) => {
      const result = await newsCollection.find().toArray();
      res.send(result)
    })

    // for detail articles api
    app.get('/news/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await newsCollection.findOne(query);
      res.send(result);
    });

    // ভিউ সংখ্যা আপডেটের জন্য API
    app.put('/news/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $inc: { views: 1 } };
      const result = await newsCollection.updateOne(query, update);
      res.send(result);
    });

    // dashboard related apies
    /* for making admin */
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;

      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      console.log('this is new', user);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin });
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })


    // for adding data from add article post method
    app.post('/addArticle', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await newsCollection.insertOne(item);
      res.send(result)

    })

    // users related api
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const exsitingerUser = await userCollection.findOne(query);
      if (exsitingerUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)

    })

    /* payment related apis for subscription */
    app.post('/payment', async (req, res) => {
      try {
        const paymentInfo = req.body;
        // Check if user has a pending plan
        const isPendingPlan = await paymentCollection.findOne({ user: paymentInfo.user, status: 'pending' });

        if (isPendingPlan) {
          // Update pending payment if found any
          const updated = await paymentCollection.updateOne(
            { user: paymentInfo.user, status: 'pending' },
            { $set: { ...paymentInfo } },
            { upsert: true }
          );
          return res.send({ success: true, updated });
        } else {
          // Insert new payment info if no pending plan found
          const inserted = await paymentCollection.insertOne(paymentInfo);
          return res.send({ success: true, inserted });
        }
      } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).send({ success: false, message: "Internal Server Error" });
      }
    });



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
  res.send('news is ready')
})

app.listen(port, () => {
  console.log(`news is running ${port}`);
})