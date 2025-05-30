import express, { application } from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import "dotenv/config";
// for jwt
import jwt from "jsonwebtoken";
// jwt middleware
import cookieParser from "cookie-parser";

const app = express();
const port = process.env.PORT || 3000;

// middleware

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) => {
  console.log(`inside the logger user`);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("cookie in the middleware", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// uri
const uri = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@cluster0.qtoljre.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const dataBase = client.db("careerCode");
    const jobCollection = dataBase.collection("jobs");
    const applicationCollection = dataBase.collection("applications");

    // jwt token related apis

    app.post("/jwt", async (req, res) => {
      const userData = req.body;
      const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET, {
        expiresIn: "1d",
      });

      // set token in the cookies
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
      });

      res.send({ success: true });
    });

    // get jobs by get method

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.hr_email = email;
      }

      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //post jobs by post method
    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    app.get("/jobs/applications", async (req, res) => {
      const email = req.query.email;
      const query = { hr_email: email };
      const jobs = await jobCollection.find(query).toArray();

      // should use aggregate to have optimum data fetching
      for (const job of jobs) {
        const applicationQuery = {
          jobId: job._id.toString(),
        };
        const application_count = await applicationCollection.countDocuments(
          applicationQuery
        );
        job.application_count = application_count;
      }
      res.send(jobs);
    });

    // specific job by their id

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };

      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    // posting applicant details in the job details

    app.post("/applications", async (req, res) => {
      const applicationDetails = req.body;
      const result = await applicationCollection.insertOne(applicationDetails);
      res.send(result);
    });

    app.patch("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const update = req.body;
      const filter = {
        _id: new ObjectId(id),
      };
      const updatedDoc = {
        $set: {
          status: update.status,
        },
      };
      const result = await applicationCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/applications", async (req, res) => {
      const result = await applicationCollection.find().toArray();
      res.send(result);
    });

    // application api by email and uid query

    app.get("/application", verifyToken, async (req, res) => {
      const applicantUID = req.query.applicantUID;
      const applicantEmail = req.query.applicantEmail;

      if (applicantEmail !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      // console.log(req.cookies);
      const query = {
        applicantUID,
        applicantEmail,
      };
      const result = await applicationCollection.find(query).toArray();
      //   bad way to aggregate data
      for (const application of result) {
        const jobId = application.jobId;
        const jobQuery = {
          _id: new ObjectId(jobId),
        };
        const job = await jobCollection.findOne(jobQuery);
        application.company = job.company;
        application.title = job.title;
        application.company_logo = job.company_logo;
      }
      res.send(result);
    });

    //

    app.get("/applications/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        jobId: id,
      };

      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("career code server");
});
app.listen(port, () => {
  console.log(`career code server is running on the port${port}`);
});
