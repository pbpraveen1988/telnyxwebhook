const mongoose = require("mongoose");
const { MongoClient } = require('mongodb');
const { RinglessDB } = require('../global/constants');

let db;
let _db;
exports.DBConnectMongoose = function () {
  return new Promise(function (resolve, reject) {
    mongoose.Promise = global.Promise;

    if (db && _db) {
      RinglessDB = _db;
      return resolve({ calls: db, ringless: _db });
    }
    // dev branch -> should add the mongo url 

    const mongo_uri = "mongodb://localhost:27017/Calls";
    const mongo_rm = "mongodb://127.0.0.1:27017/RinglessVM";
    const mongoDB = "RinglessVM";
    mongoose
      .connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
      .then(async () => {
        db = mongoose.connection;
        console.log("mongo connection created");
        const _conn = await MongoClient.connect(mongo_rm, { useNewUrlParser: true, poolSize: 60 });
        _db = _conn.db(mongoDB);
        console.log("IVR ringless connection created");
        RinglessDB(_db);
        resolve({ calls: db, ringless: _db });
      }).catch((error) => {
        console.log("ray : [tools db-connect] error => ", error);
        reject(error);
      });
  });
};
