#!/usr/bin/env node
/*
 Create MongoDB Atlas Vector Search index for the `reports` collection.
 Requires MONGODB_URI with privileges to create search indexes.
 Usage:
   node scripts/create-vector-index.js
*/

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Please export your connection string.');
  process.exit(1);
}

const DB_NAME = process.env.DB_NAME || (process.env.MONGODB_DB_NAME || undefined);
const COLLECTION = process.env.REPORTS_COLLECTION || 'reports';
const INDEX_NAME = process.env.REPORTS_VECTOR_INDEX || 'embedding_vector';

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const dbName = DB_NAME || (new URL(uri).pathname || '').replace('/', '') || 'test';
    const db = client.db(dbName);

    console.log(`Connected. Using database: ${db.databaseName}`);

    const command = {
      createSearchIndexes: COLLECTION,
      indexes: [
        {
          name: INDEX_NAME,
          definition: {
            fields: [
              {
                type: 'vector',
                path: 'embedding',
                numDimensions: 384,
                similarity: 'cosine',
              },
            ],
          },
        },
      ],
    };

    console.log('Creating search index:', JSON.stringify(command, null, 2));
    const res = await db.command(command);
    console.log('Index creation response:', res);
    console.log('✅ Vector index created (or already exists).');
  } catch (err) {
    console.error('❌ Failed to create vector index:', err?.message || err);
    if (String(err?.message || '').includes('not authorized')) {
      console.error('Check your MongoDB user permissions for createSearchIndexes.');
    }
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
