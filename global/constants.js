let dbConnection;
exports.RinglessDB = (dbvalues) => {
    if (dbConnection) {
        return dbConnection;
    } else {
        dbConnection = dbvalues;
        return dbConnection;
    }
}