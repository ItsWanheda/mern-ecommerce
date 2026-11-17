import mongoose from "mongoose";

let connectionPromise = null;
let monitoredClient = null;

const boundedInteger = (name, fallback, min, max) => {
  const configured = Number(process.env[name]);
  return Number.isInteger(configured) && configured >= min && configured <= max ? configured : fallback;
};

const poolMetrics = {
  pendingCheckouts: 0,
  checkedOutConnections: 0,
  connectionsCreated: 0,
  connectionsClosed: 0,
  checkoutFailures: 0,
  lastCheckoutFailureAt: null,
};

const attachPoolMonitoring = (connection) => {
  const client = connection.getClient?.();
  if (!client || client === monitoredClient) return;
  monitoredClient = client;

  client.on("connectionPoolCreated", () => {
    if (process.env.MONGO_POOL_DIAGNOSTICS === "true") {
      console.info("MongoDB connection pool created", {
        maxPoolSize: boundedInteger("MONGO_MAX_POOL_SIZE", 5, 1, 20),
        minPoolSize: boundedInteger("MONGO_MIN_POOL_SIZE", 0, 0, 20),
      });
    }
  });
  client.on("connectionCheckOutStarted", () => { poolMetrics.pendingCheckouts += 1; });
  client.on("connectionCheckedOut", () => {
    poolMetrics.pendingCheckouts = Math.max(0, poolMetrics.pendingCheckouts - 1);
    poolMetrics.checkedOutConnections += 1;
  });
  client.on("connectionCheckedIn", () => {
    poolMetrics.checkedOutConnections = Math.max(0, poolMetrics.checkedOutConnections - 1);
  });
  client.on("connectionCreated", () => { poolMetrics.connectionsCreated += 1; });
  client.on("connectionClosed", () => { poolMetrics.connectionsClosed += 1; });
  client.on("connectionCheckOutFailed", (event) => {
    poolMetrics.pendingCheckouts = Math.max(0, poolMetrics.pendingCheckouts - 1);
    poolMetrics.checkoutFailures += 1;
    poolMetrics.lastCheckoutFailureAt = new Date().toISOString();
    if (process.env.MONGO_POOL_DIAGNOSTICS === "true") {
      console.warn("MongoDB connection checkout failed", {
        reason: event?.reason || "unknown",
        ...getMongoPoolMetrics(),
      });
    }
  });
};

export const getMongoPoolMetrics = () => ({ ...poolMetrics });

const getMongoConnectionOptions = () => {
  const maxPoolSize = boundedInteger("MONGO_MAX_POOL_SIZE", 5, 1, 20);
  return {
    maxPoolSize,
    autoIndex: true,
    minPoolSize: boundedInteger("MONGO_MIN_POOL_SIZE", 0, 0, maxPoolSize),
    maxConnecting: boundedInteger("MONGO_MAX_CONNECTING", 2, 1, maxPoolSize),
    waitQueueTimeoutMS: boundedInteger("MONGO_WAIT_QUEUE_TIMEOUT_MS", 5000, 100, 30000),
    serverSelectionTimeoutMS: boundedInteger("MONGO_SERVER_SELECTION_TIMEOUT_MS", 5000, 1000, 30000),
    connectTimeoutMS: boundedInteger("MONGO_CONNECT_TIMEOUT_MS", 10000, 1000, 30000),
    maxIdleTimeMS: boundedInteger("MONGO_MAX_IDLE_TIME_MS", 30000, 1000, 300000),
  };
};

mongoose.connection.on("disconnected", () => {
  connectionPromise = null;
});

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    attachPoolMonitoring(mongoose.connection);
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, getMongoConnectionOptions()).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  const connection = await connectionPromise;
  attachPoolMonitoring(connection.connection);
  console.log(`MongoDB connected: ${connection.connection.host}`);
  return connection.connection;
};
