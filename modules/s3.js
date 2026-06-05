import { S3Client, PutObjectCommand, GetBucketLocationCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid"
import dotenv from "dotenv"

dotenv.config()

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
}

let s3Client = null
let resolvedRegion = null // cached after first successful detection

export const getS3Config = () => {
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID || process.env.AWS_Access_Key
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_Secret_Access_Key
  const region = process.env.AWS_REGION || "us-east-1"
  const bucket = process.env.AWS_BUCKET_NAME

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Missing S3 config: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_BUCKET_NAME in .env",
    )
  }

  return { accessKeyId, secretAccessKey, region, bucket }
}

/**
 * Detect the actual region of the bucket by querying S3.
 * us-east-1 buckets return null from GetBucketLocation — we default to "us-east-1".
 */
const detectBucketRegion = async (cfg) => {
  try {
    // Use us-east-1 as a global endpoint to check bucket location
    const probe = new S3Client({
      region: "us-east-1",
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    })
    const { LocationConstraint } = await probe.send(
      new GetBucketLocationCommand({ Bucket: cfg.bucket }),
    )
    const detected = LocationConstraint || "us-east-1"
    console.log(`🪣  S3 bucket "${cfg.bucket}" is in region: ${detected}`)
    return detected
  } catch (err) {
    console.warn(`⚠️  Could not auto-detect bucket region, using .env value. Error: ${err.message}`)
    return cfg.region
  }
}

const getClient = async () => {
  if (s3Client && resolvedRegion) return s3Client

  const cfg = getS3Config()

  // Auto-detect the real bucket region to avoid PermanentRedirect errors
  resolvedRegion = await detectBucketRegion(cfg)

  s3Client = new S3Client({
    region: resolvedRegion,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  })

  return s3Client
}

const buildPublicUrl = (key) => {
  const { bucket } = getS3Config()
  const region = resolvedRegion || getS3Config().region
  const customBase = process.env.AWS_S3_PUBLIC_URL?.replace(/\/$/, "")
  if (customBase) return `${customBase}/${key}`
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

/**
 * Upload a Multer memory file to S3.
 * @param {{ buffer: Buffer, mimetype: string, originalname?: string }} file
 * @param {string} folder - S3 key prefix (e.g. "posts", "posts/media")
 */
export const uploadToS3 = async (file, folder = "posts") => {
  const { bucket } = getS3Config()
  const ext =
    EXT_BY_MIME[file.mimetype] ||
    file.originalname?.split(".").pop()?.toLowerCase() ||
    "bin"
  const key = `${folder.replace(/\/$/, "")}/${uuidv4()}.${ext}`

  const client = await getClient()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  )

  return {
    url: buildPublicUrl(key),
    key,
  }
}
