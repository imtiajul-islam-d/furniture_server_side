const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());
// middleware end
// mongodb start
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ibovumw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const userCollection = client.db("furniture").collection("users");
    const productCollection = client.db("furniture").collection("products");
    // ========================================================================== USER start ================================================
      // get all users
      app.get("/users", async (req, res) => {
        const query = {};
        const result = await userCollection.find(query).toArray()
        res.send(result)
      });
    // get user specification
    app.get('/user/specification', async(req, res) => {
      const email = req.query.email;
      const query = {email}
      const result = await userCollection.find(query).project({acc:1}).toArray()
      res.send(result)
    })
    // post user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result)
    });
  // ================================================================================ USER end ===================================================
  // ===================================================================== PRODUCT start =========================================================
    app.post('/products', async(req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result)
    })
  // ===================================================================== PRODUCT end ===========================================================
  } finally {
  }
}
run().catch(console.log);

// mongodb end

app.get("/", async (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log("Port is running on", port);
});
