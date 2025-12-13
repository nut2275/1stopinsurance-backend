const { MongoClient } = require("mongodb");

const MONGO_URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "test";
const COLLECTION = "cars";

async function run() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const cars = db.collection(COLLECTION);

    const indexes = await cars.indexes();
    console.log("📌 Current indexes:", indexes);

    const hasOldIndex = indexes.find(i => i.name === "registration_1");

    if (hasOldIndex) {
      console.log("🗑 Removing old index: registration_1");
      await cars.dropIndex("registration_1");
    }

    console.log("➕ Creating new compound unique index...");
    await cars.createIndex(
      { customer_id: 1, registration: 1, province: 1 },
      { unique: true, name: "customer_registration_province_unique" }
    );

    console.log("✅ Index migration completed");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await client.close();
  }
}

run();
