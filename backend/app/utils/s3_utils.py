# backend/app/utils/s3_utils.py
import boto3
import os
from botocore.exceptions import ClientError
from typing import Optional

S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://localhost:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "minioadmin")
S3_BUCKET = os.getenv("S3_BUCKET", "beanscan")

s3_client = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    region_name="us-east-1",  # Dummy region for MinIO
)

def ensure_bucket_exists():
    """Ensure the target bucket exists in MinIO/S3."""
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "404":
            s3_client.create_bucket(Bucket=S3_BUCKET)
            print(f"Bucket '{S3_BUCKET}' created.")
        else:
            print(f"Error checking bucket: {e}")
            raise e

def upload_file_to_s3(file_content: bytes, s3_key: str, content_type: str = "image/jpeg") -> bool:
    """Upload raw bytes to S3."""
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type
        )
        return True
    except ClientError as e:
        print(f"Error uploading file to S3: {e}")
        return False

def get_presigned_url(s3_key: str, expiration: int = 3600) -> Optional[str]:
    """Generate a presigned URL to share an S3 object."""
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        return None

def delete_from_s3(s3_key: str) -> bool:
    """Delete an object from S3."""
    try:
        s3_client.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        return True
    except ClientError as e:
        print(f"Error deleting from S3: {e}")
        return False

def get_file_from_s3(s3_key: str) -> Optional[bytes]:
    """Download an object from S3 into memory."""
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        return response['Body'].read()
    except ClientError as e:
        print(f"Error downloading from S3: {e}")
        return None
