import mongoose, { Schema, Document, ClientSession, Model, PipelineStage, UpdateWriteOpResult } from 'mongoose';
import * as mongodb from 'mongodb';
import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

class MongoDBClient {
  private static instance: MongoDBClient;
  private static mongoTestServer: MongoMemoryReplSet;
  private static environment: string = process.env.NODE_ENV || 'development';
  private mongoClient!: mongodb.MongoClient;
  private connection: mongoose.Connection | null = null;
  private uri: string | null = null;

  private constructor(uri: string) {
    this.uri = uri;
  }

  public static async getInMemoryUri() {
    this.mongoTestServer = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
      },
    });
    const uri = this.mongoTestServer.getUri();
    console.log(`using getInMemoryUri ${uri}`);
    await this.mongoTestServer.waitUntilRunning();
    return uri;
  }

  public static async getInstance(): Promise<MongoDBClient | null> {
    if (!MongoDBClient.instance) {
      console.log({ environment: this.environment });
      const uri = this.environment === 'test' ? `${await this.getInMemoryUri()}` : process.env.MONGO_URI;
      if (!uri) {
        console.error('Invalid Mongo URI');
        return null;
      }
      MongoDBClient.instance = new MongoDBClient(uri);
    }
    return MongoDBClient.instance;
  }

  public async startNativeMongo(): Promise<mongodb.Db | void> {
    try {
      if (!this.uri) {
        console.error('Invalid Mongo URI');
        throw new Error('Invalid Mongo URI');
      }

      this.mongoClient = new mongodb.MongoClient(this.uri!);
      await this.mongoClient.connect();

      console.log('Monitoring change streams...');
      return this.mongoClient.db();
    } catch (error) {
      console.error('Failed to start monitor:', error);
    }
  }

  public async connect(): Promise<mongoose.Connection | null> {
    if (this.connection && this.connection.readyState === 1) {
      console.log(`MongoDB ${MongoDBClient.environment} is already connected.`);
      return this.connection;
    }

    if (!this.uri) {
      console.log({ environment: MongoDBClient.environment });
      const uri = MongoDBClient.environment === 'test' ? await MongoDBClient.getInMemoryUri() : process.env.MONGO_URI;
      if (!this.uri) {
        console.error('Invalid Mongo URI');
        return null;
      }
    }

    try {
      const mongooseInstance = await mongoose.connect(this.uri, {
        writeConcern: { w: 'majority', wtimeoutMS: 50000 },
        retryWrites: true,
      });
      this.connection = mongooseInstance.connection;

      if (this.connection) {
        this.connection.on('connected', () => {
          console.log(`MongoDB ${MongoDBClient.environment} connection established successfully.`);
        });

        this.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
        });

        this.connection.on('disconnected', () => {
          console.warn('MongoDB connection lost.');
        });

        console.log(`Connected to ${MongoDBClient.environment}  MongoDB`);
        return this.connection;
      } else {
        console.error('Failed to initialize MongoDB connection.');
        return null;
      }
    } catch (err) {
      console.error('Error connecting to MongoDB:', err);
      return null;
    }
  }

  public async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      console.log('Disconnected from MongoDB');
      await MongoDBClient.mongoTestServer.stop();
      console.log('Disconnected from Test MongoDB');
    }
  }
}

export {
  connectDB,
  mongoose,
  Schema,
  Document,
  ClientSession,
  Model,
  PipelineStage,
  UpdateWriteOpResult,
  MongoMemoryServer,
  mongodb,
  MongoDBClient,
  MongoMemoryReplSet,
};
