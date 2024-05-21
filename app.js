const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// MongoDB Atlas connection string
const MONGO_URI =
  "mongodb+srv://carecherryglitz:pDI2oEILpJuWLv92@cluster0.ist27oh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// Connect to MongoDB Atlas
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Define a Mongoose schema
const dataSchema = new mongoose.Schema({}, { strict: false });
const DataModel = mongoose.model("Shop", dataSchema);

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Route to handle file upload
app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (path.extname(file.originalname) !== ".xlsx") {
    fs.unlinkSync(file.path);
    return res
      .status(400)
      .json({ error: "Invalid file format. Only .xlsx files are allowed." });
  }

  try {
    const workbook = XLSX.readFile(file.path);
    const sheet_name_list = workbook.SheetNames;
    const jsonData = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );

    // Insert data into MongoDB
    DataModel.insertMany(jsonData)
      .then(() => {
        fs.unlinkSync(file.path); // Delete the file after processing
        res
          .status(200)
          .json({ message: "File uploaded and data inserted successfully" });
      })
      .catch((err) => {
        fs.unlinkSync(file.path); // Delete the file in case of error
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    fs.unlinkSync(file.path); // Delete the file in case of error
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
