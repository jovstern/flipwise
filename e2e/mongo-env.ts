/** The database the e2e web server and global setup use. Never the dev db. */
export const e2eMongo = {
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
  db: 'flipwise_test',
}
