import boto3
import psycopg2
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

# Upload to MinIO
s3 = boto3.client(
    's3',
    endpoint_url=os.getenv('S3_ENDPOINT'),
    aws_access_key_id=os.getenv('S3_ACCESS_KEY'),
    aws_secret_access_key=os.getenv('S3_SECRET_KEY')
)

BUCKET = os.getenv('S3_BUCKET')
local_path = 'models/base/best.pt'
s3_key = 'models/base/best.pt'

print("Uploading custom base model to MinIO...")
s3.upload_file(local_path, BUCKET, s3_key)
print("Upload completed.")

# Register in DB - simple version without ON CONFLICT
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

try:
    # First, demote any existing base models to prevent duplicates
    cur.execute('UPDATE model_versions SET is_base = false WHERE is_base = true')
    demoted_count = cur.rowcount
    if demoted_count > 0:
        print(f"ℹ️  Demoted {demoted_count} existing base model(s)")

    cur.execute('''
        INSERT INTO model_versions 
        (id, name, is_base, is_production, s3_key_pt, created_at)
        VALUES (%s, %s, true, false, %s, NOW())
    ''', (str(uuid.uuid4()), 'Yolo26n Baseline Model', s3_key))
    conn.commit()
    print("✅ Custom base model seeded successfully!")
except Exception as e:
    print("❌ Error seeding database:", e)
    conn.rollback()
finally:
    cur.close()
    conn.close()