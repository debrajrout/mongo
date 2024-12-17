const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 8000;

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

// Define Shop schema
const dataSchema = new mongoose.Schema({}, { strict: false });
const DataModel = mongoose.model("Shop", dataSchema);

// Define City schema
const CitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  latitude: { type: Number, required: true, default: 0 },
  longitude: { type: Number, required: true, default: 0 },
});
const CityModel = mongoose.model("City", CitySchema);

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

app.post("/generate-cities", async (req, res) => {
  try {
    // Count total number of shops
    const totalShops = await DataModel.countDocuments();
    console.log(`Total number of shops: ${totalShops}`);

    // Get all unique city names from the Shop collection
    const cities = await DataModel.distinct("City");

    // Count how many new cities are added
    let newCityCount = 0;

    // Loop through each city and upsert (update or insert if not present)
    const upsertPromises = cities.map(async (cityName) => {
      if (cityName && typeof cityName === "string" && cityName.trim() !== "") {
        const result = await CityModel.updateOne(
          { name: cityName },
          { name: cityName, latitude: 0, longitude: 0 },
          { upsert: true }
        );

        // If a new city was inserted, increase the newCityCount
        if (result.upsertedCount > 0) {
          newCityCount++;
        }
      }
    });

    // Wait for all upsert operations to complete
    await Promise.all(upsertPromises);

    console.log(`Total unique cities found: ${cities.length}`);
    console.log(`New cities added to the collection: ${newCityCount}`);

    res.status(200).json({
      message: "City collection updated successfully",
      totalShops,
      uniqueCitiesFound: cities.length,
      newCitiesAdded: newCityCount,
    });
  } catch (err) {
    console.error("Error generating cities:", err);
    res.status(500).json({ error: "An error occurred while generating cities" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
