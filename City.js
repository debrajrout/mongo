import mongoose from 'mongoose';

const CitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
});

export const City = mongoose.models.City || mongoose.model('City', CitySchema);


const MONGO_URI =
    "mongodb+srv://carecherryglitz:pDI2oEILpJuWLv92@cluster0.ist27oh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";