const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { initializeMultipleBuckets } = require("./gridfsConfig");
const { getAllBucketNames } = require("./bucketConfig");

dotenv.config();

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);

		console.log("MongoDB connected successfully!");
		console.log(`Database: ${mongoose.connection.name}`);
		console.log(`Host: ${mongoose.connection.host}`);

		const bucketNames = getAllBucketNames();
		await initializeMultipleBuckets(bucketNames);

		console.log(`Initialized ${bucketNames.length} GridFS bucket(s):`);
		bucketNames.forEach((bucket, index) => {
			console.log(`   ${index + 1}. ${bucket}`);
		});
	} catch (error) {
		console.error("Error connecting to MongoDB:", error.message);
		console.error("Stack:", error.stack);
		process.exit(1);
	}
};

mongoose.connection.on("connected", () => {
	console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
	console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
	console.log("Mongoose disconnected from MongoDB");
});

process.on("SIGINT", async () => {
	try {
		await mongoose.connection.close();
		console.log("MongoDB connection closed through app termination");
		process.exit(0);
	} catch (error) {
		console.error("Error during graceful shutdown:", error);
		process.exit(1);
	}
});

module.exports = connectDB;