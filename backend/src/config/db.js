const dns = require("dns");
const mongoose = require("mongoose");
const config = require("./env");

const applyDnsServers = () => {
  if (config.dnsServers.length === 0) {
    return;
  }

  try {
    dns.setServers(config.dnsServers);
  } catch (error) {
    throw new Error(`Invalid DNS_SERVERS value: ${error.message}`);
  }
};

const connectDb = async () => {
  mongoose.set("strictQuery", true);
  applyDnsServers();

  const connection = await mongoose.connect(config.mongoUri);

  return connection;
};

module.exports = connectDb;
