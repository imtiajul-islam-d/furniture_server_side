const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());
// verify jwt
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}
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
    const bookingCollection = client.db('furniture').collection('booking')
    // =============================================================================== Verify admin ======================================
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const queryUser = { email: decodedEmail };
      const user = await userCollection.findOne(queryUser);
      if (user.acc !== "Admin") {
        return res.status(403).send({
          message: "Forbidden access!!",
        });
      }
      next();
    };
    // =============================================================================== Verify seller ======================================
    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const queryUser = { email: decodedEmail };
      const user = await userCollection.findOne(queryUser);
      if (user.acc !== "Seller") {
        return res.send({
          message: "Forbidden access !!",
        });
      }
      next();
    };
    // ================================================================================ api for JWT token=======================
    app.get("/jwt", async (req, res) => {
      // take the email address from user
      const email = req.query.email;
      // check the user, is it in our database or not
      // make a query to find the user in our database
      const quey = { email: email };
      const user = await userCollection.findOne(quey);
      // if user found then, cook a token for the user, demo is in the below
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "24h",
        });
        return res.send({ accessToken: token });
      }
      // if no user found, send him/ her the status '403' with a blank access token
      res.status(403).send({ accessToken: "" });
    });
    // ========================================================================== USER start ================================================
    // get all users
    app.get("/users", async (req, res) => {
      const query = {};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    // get user specification
    app.get("/user/specification", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const result = await userCollection
        .find(query)
        .project({ acc: 1 })
        .toArray();
      res.send(result);
    });
    // find user verification
    app.get("/user/verification", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const result = await userCollection
        .find(query)
        .project({ verified: 1 })
        .toArray();
      res.send(result);
    });
    // post user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // get sellers information only
    app.get("/users/sellers", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { acc: "Seller" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    // delete sellers information
    app.delete(
      "/users/info/:email",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const result = await userCollection.deleteOne(filter);
        // delete sellers products
        const query = { sellerEmail: email };
        const product = await productCollection.deleteMany(query);
        res.send(result);
      }
    );
    // get buyers information only
    app.get("/users/buyers", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { acc: "User" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    // delete buyers information
    app.delete(
      "/users/info/:email",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const result = await userCollection.deleteOne(filter);
        // delete buyers products
        // const query = { sellerEmail: email };
        // const product = await productCollection.deleteMany(query);
        res.send(result);
      }
    );
    // update user/buyer verification
    app.patch(
      "/user/verification",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const email = req.query.email;
        const filter = {email};
        const options = { upsert: true };
        const updatedDocument = {
          $set: {
            verified: true,
          },
        };
        const result = await userCollection.updateOne(
          filter,
          updatedDocument,
          options
        );
        // update product verification status
        const productFinder = {sellerEmail: email}
        const product = await productCollection.updateMany(productFinder, updatedDocument)
        res.send(result);
      }
    );
    // ================================================================================ USER end ===================================================
    // ===================================================================== PRODUCT start =========================================================
    // get category based product
    app.get('/category/:id', verifyJWT, async (req, res) => {
      const id = parseInt(req.params.id);
      const query = {categoryId: id, sold: false}
      const result = await productCollection.find(query).toArray()
      res.send(result)
    })
    // get user based product
    app.get("/products", verifyJWT, verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });
    // post a product
    app.post("/products", verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });
    // delete a product
    app.delete("/products/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(filter);
      res.send(result);
    });
    // update product advertise status
    app.patch(
      "/product/advertise",
      verifyJWT,
      verifySeller,
      async (req, res) => {
        const id = req.query.id;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updatedDocument = {
          $set: {
            ad: true,
          },
        };
        const result = await productCollection.updateOne(
          filter,
          updatedDocument,
          options
        );
        res.send(result);
      }
    );
    // ===================================================================== PRODUCT end ===========================================================
    // ===================================================================== Product booking start =======================================================
    app.post("/product/bookings", verifyJWT, async (req, res) => {
      const booking = req.body;
      const id = booking.productId;
      const query = {
        productId: booking.productId
      };
      const alreadyBooked = await bookingCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `This product already been booked`;
        return res.send({
          acknowledged: false,
          message: message,
        });
      }
      const result = await bookingCollection.insertOne(booking);
      // 
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDocument = {
        $set: {
          booked: true,
        }
      };
      const mainCollection = await productCollection.updateOne(filter, updatedDocument, options)
      res.send(result);
    });
     // ===================================================================== Product booking end =======================================================
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
