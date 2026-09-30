import mongoose from "mongoose";


let connectionPromise;

const connectDB = async()=>{
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    if (!process.env.DB_ATLAS) {
        throw new Error('DB_ATLAS is not configured', { cause: 500 });
    }

    // Share an in-progress connection between concurrent requests.
    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.DB_ATLAS, {
            serverSelectionTimeoutMS: 5000
        });
    }

    try {
        return await connectionPromise;
    } finally {
        // Allow a later request to retry if this connection failed.
        connectionPromise = undefined;
    }
}

export default connectDB
