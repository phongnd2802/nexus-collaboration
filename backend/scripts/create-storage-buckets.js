#!/usr/bin/env node

/**
 * Create required storage buckets on the configured S3-compatible backend.
 *
 * Supports: AWS S3, Cloudflare R2, MinIO, Backblaze B2, LocalStack, Ceph, ...
 *
 * Run with:
 *    cd backend && node scripts/create-storage-buckets.js
 *
 * Requires the same env vars the app uses:
 *   - STORAGE_ACCESS_KEY_ID
 *   - STORAGE_SECRET_ACCESS_KEY
 *   - STORAGE_REGION            (default: us-east-1)
 *   - STORAGE_ENDPOINT          (required for MinIO / local S3, optional for AWS)
 *   - STORAGE_FORCE_PATH_STYLE  (default: false, set 'true' for MinIO/LocalStack)
 */

const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const BUCKETS = ['workspace-logos', 'avatars', 'files'];

function getConfig() {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const region = process.env.STORAGE_REGION || 'us-east-1';
  const forcePathStyle = String(process.env.STORAGE_FORCE_PATH_STYLE).toLowerCase() === 'true';
  const endpoint = process.env.STORAGE_ENDPOINT || undefined;

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ Missing credentials.');
    console.error('   Set STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY in your .env');
    process.exit(1);
  }

  return { accessKeyId, secretAccessKey, region, endpoint, forcePathStyle };
}

async function bucketExists(client, name) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: name }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

async function createBucket(client, name) {
  const exists = await bucketExists(client, name);
  if (exists) {
    console.log(`   ✅ Bucket "${name}" already exists.`);
    return 'exists';
  }

  try {
    await client.send(new CreateBucketCommand({ Bucket: name }));
    console.log(`   ✅ Bucket "${name}" created successfully.`);
    return 'created';
  } catch (err) {
    console.error(`   ❌ Failed to create bucket "${name}":`);
    console.error(`      ${err.name}: ${err.message}`);
    return 'failed';
  }
}

async function main() {
  const cfg = getConfig();

  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle || undefined,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  console.log(`🔧 Provider : ${cfg.endpoint ? 'S3-compatible (' + cfg.endpoint + ')' : 'AWS S3'}`);
  console.log(`🔧 Region   : ${cfg.region}`);
  console.log(`🔧 Buckets  : ${BUCKETS.join(', ')}`);
  console.log();

  let created = 0;
  let failed = 0;

  for (const bucket of BUCKETS) {
    const result = await createBucket(client, bucket);
    if (result === 'created') created++;
    if (result === 'failed') failed++;
  }

  console.log();
  console.log(`📊 Result: ${created} created, ${BUCKETS.length - created - failed} already exist, ${failed} failed.`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
