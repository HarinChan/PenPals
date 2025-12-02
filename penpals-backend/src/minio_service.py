from minio import Minio
from minio.error import S3Error
from dotenv import load_dotenv
import os
from pathlib import Path

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
            client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure,
                http_client=None
            )
            return client
        except Exception as e:
            return None
    
    def make_bucket(self, bucket_name: str) -> bool:
        if not self.client: return False

        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                print(f"Bucket {bucket_name} created successfully.")
                return True
            else:
                print(f"Bucket {bucket_name} already exists.")
                return True
        except S3Error as err:
            print(f"Error creating bucket {bucket_name}: {err}")
            return False
        except Exception as e:
            print(f"Unexpected error {e}")

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
    
    def download_file(self, bucket_name: str, object_name: str, destination_path: str):
        """Downloads an object from MinIO to a local file."""
        if not self.client: return

        try:
            self.client.fget_object(
                bucket_name,
                object_name,
                destination_path
            )
            print(f"Successfully downloaded '{object_name}' to '{destination_path}'.")

        except S3Error as err:
            print(f"Error downloading object '{object_name}': {err}")
        except Exception as e:
            print(f"An unexpected error occurred during file download: {e}")

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