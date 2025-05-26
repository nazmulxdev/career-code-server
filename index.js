import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

// middleware

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("career code server");
});
app.listen(port, () => {
  console.log(`career code server is running on the port${port}`);
});
