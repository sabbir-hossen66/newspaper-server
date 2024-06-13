const express = require('express');
const app = express();
const cors = require('cors')
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
    app.put('/news/:id/view', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $inc: { views: 1 } };
      const result = await newsCollection.updateOne(query, update);
      res.send(result);
    });

    // for adding data from add article post method
    app.post('/addArticle', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await newsCollection.insertOne(item);
      res.send(result)

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
  res.send('news is ready')
})

app.listen(port, () => {
  console.log(`news is running ${port}`);
})