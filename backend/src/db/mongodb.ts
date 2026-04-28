import { MongoClient, type Db } from "mongodb";
import { env } from "../config/env.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) {
    return db;
  }

  client = new MongoClient(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  db = client.db(env.mongodbDbName);

  return db;
}

export function getMongoDb(): Db {
  if (!db) {
    throw new Error("MongoDB is not connected");
  }

  return db;
}

export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}
