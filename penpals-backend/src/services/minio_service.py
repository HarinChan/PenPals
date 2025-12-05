from minio import Minio
from minio.error import S3Error
from dotenv import load_dotenv
import os
from pathlib import Path
import io
import json
from datetime import timedelta
from typing import Iterable, Optional, List, Dict, Any

# Load .env from backend root directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)


class MinIOService:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT")
        self.access_key = os.getenv("MINIO_ACCESS_KEY")
        self.secret_key = os.getenv("MINIO_SECRET_KEY")

        self.secure = False

        print(self.access_key)

        self.client = self._create_client()

    def _create_client(self):
        try:
            # Ensure required environment variables are present (type-checkers will understand these asserts)
            assert self.endpoint is not None, "MINIO_ENDPOINT environment variable is not set"
            assert self.access_key is not None, "MINIO_ACCESS_KEY environment variable is not set"
            assert self.secret_key is not None, "MINIO_SECRET_KEY environment variable is not set"

            client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure,
                http_client=None
            )
            return client
        except AssertionError as ae:
            print(f"Configuration error creating MinIO client: {ae}")
            return None
        except Exception as e:
            print(f"Unexpected error creating MinIO client: {e}")
            return None
    
    def make_bucket(self, bucket_name: str) -> bool:
        if not self.client: 
            return False

        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                print(f"Bucket '{bucket_name}' created.")
            else:
                print(f"Bucket '{bucket_name}' already exists.")
            return True
        except S3Error as err:
            print(f"Error creating bucket {bucket_name}: {err}")
            return False
        except Exception as e:
            print(f"Unexpected error {e}")
            return False

    def upload_file(self, bucket_name: str, object_name: str, file_path: str, content_type: str = "application/octet-stream"):
        """Uploads a local file to MinIO."""
        if not self.client: return

        if not os.path.exists(file_path):
            print(f"Error: Local file not found at {file_path}")
            return

        try:
            self.client.fput_object(
                bucket_name,
                object_name,
                file_path,
                content_type=content_type
            )
            print(f"Successfully uploaded '{file_path}' as '{object_name}' to bucket '{bucket_name}'.")

        except S3Error as err:
            print(f"Error uploading object '{object_name}': {err}")
        except Exception as e:
            print(f"An unexpected error occurred during file upload: {e}")
    
    def upload_bytes(self, bucket_name: str, object_name: str, data: bytes, content_type: str = "application/octet-stream") -> bool:
        """Uploads in-memory bytes to MinIO as an object."""
        if not self.client: 
            return False

        try:
            bytes_stream = io.BytesIO(data)
            self.client.put_object(
                bucket_name,
                object_name,
                bytes_stream,
                length=len(data),
                content_type=content_type
            )
            print(f"Successfully uploaded bytes as '{object_name}' to bucket '{bucket_name}'.")
            return True
        except S3Error as err:
            print(f"Error uploading bytes to '{object_name}': {err}")
            return False
        except Exception as e:
            print(f"Unexpected error uploading bytes: {e}")
            return False

    def upload_json(self, bucket_name: str, object_name: str, payload: dict) -> bool:
        """Serializes a dict to JSON and uploads to MinIO."""
        try:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        except Exception as e:
            print(f"Failed to serialize JSON payload: {e}")
            return False

        return self.upload_bytes(bucket_name, object_name, data, content_type="application/json")

    def get_presigned_url(self, bucket_name: str, object_name: str, expiry_seconds: int = 3600) -> str | None:
        """Generate a presigned GET URL for an object if possible."""
        if not self.client:
            return None

        try:
            url = self.client.presigned_get_object(
                bucket_name,
                object_name,
                expires=timedelta(seconds=expiry_seconds)
            )
            return url
        except S3Error as err:
            print(f"Error generating presigned URL for {bucket_name}/{object_name}: {err}")
            return None
        except Exception as e:
            print(f"Unexpected error generating presigned URL: {e}")
            return None

    def read_object_bytes(self, bucket_name: str, object_name: str) -> Optional[bytes]:
        """Read an object from MinIO and return its bytes."""
        if not self.client:
            return None
        try:
            response = self.client.get_object(bucket_name, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as err:
            print(f"Error reading object '{object_name}': {err}")
            return None
        except Exception as e:
            print(f"Unexpected error reading object: {e}")
            return None

    def get_object_json(self, bucket_name: str, object_name: str) -> Optional[Dict[str, Any]]:
        """Fetch an object and parse it as JSON."""
        data = self.read_object_bytes(bucket_name, object_name)
        if data is None:
            return None
        try:
            return json.loads(data.decode("utf-8"))
        except Exception as e:
            print(f"Failed to parse JSON from {bucket_name}/{object_name}: {e}")
            return None

    def list_objects(self, bucket_name: str, prefix: Optional[str] = None, recursive: bool = True) -> List[str]:
        """List object names in a bucket with optional prefix."""
        if not self.client:
            return []
        try:
            objects: Iterable = self.client.list_objects(bucket_name, prefix=prefix or "", recursive=recursive)
            names: List[str] = []
            for obj in objects:
                # obj.object_name is available on Minio Object
                names.append(getattr(obj, "object_name", None) or obj.__dict__.get("object_name", ""))
            return [n for n in names if n]
        except S3Error as err:
            print(f"Error listing objects in '{bucket_name}': {err}")
            return []
        except Exception as e:
            print(f"Unexpected error listing objects: {e}")
            return []
        try:
            return self.client.presigned_get_object(
                bucket_name,
                object_name,
                expires=timedelta(seconds=expiry_seconds)
            )
        except Exception as e:
            print(f"Failed to generate presigned URL for {bucket_name}/{object_name}: {e}")
            return None
    
    def download_file(self, bucket_name: str, object_name: str, destination_path: str):
        """Downloads an object from MinIO to a local file."""
        if not self.client: 
            return

        try:
            self.client.fget_object(bucket_name, object_name, destination_path)
            print(f"Downloaded '{object_name}' to '{destination_path}'.")
        except S3Error as err:
            print(f"Error downloading object '{object_name}': {err}")
        except Exception as e:
            print(f"Unexpected error downloading file: {e}")



# Test if MINIO is working using this:   
         
if __name__ == '__main__':
    # Define constants for the demo
    DEMO_BUCKET = "service-demo-bucket"
    DEMO_OBJECT_NAME = "report/monthly_summary.txt"
    DEMO_LOCAL_PATH = "demo_upload_file.txt"
    DEMO_DOWNLOAD_PATH = "demo_download_file.txt"

    # Create a dummy file for upload
    with open(DEMO_LOCAL_PATH, "w") as f:
        f.write("This is a test file uploaded via the MinioService class.")

    # 1. Instantiate the service class
    minio_svc = MinIOService()
    
    # Check if the client was successfully created before proceeding
    if minio_svc.client:
        
        # 2. Use the encapsulated methods
        if minio_svc.make_bucket(DEMO_BUCKET):
            
            # Upload
            minio_svc.upload_file(DEMO_BUCKET, DEMO_OBJECT_NAME, DEMO_LOCAL_PATH, content_type="text/plain")
            
            # Download
            minio_svc.download_file(DEMO_BUCKET, DEMO_OBJECT_NAME, DEMO_DOWNLOAD_PATH)

    # 3. Clean up the temporary files
    if os.path.exists(DEMO_LOCAL_PATH):
        os.remove(DEMO_LOCAL_PATH)
    if os.path.exists(DEMO_DOWNLOAD_PATH):
        os.remove(DEMO_DOWNLOAD_PATH)
        
    print("\n--- Demo finished ---")