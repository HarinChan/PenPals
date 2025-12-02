## How to get started with Minio Object storage
1. Create a `.env` file with the following fields:
```
MINIO_ENDPOINT = '127.0.0.1:9000'
MINIO_ACCESS_KEY = 'your_username'
MINIO_SECRET_KEY = 'your_password'
```

2. install docker (docker desktop is very easy)
3. make sure the docker engine is running
4. Run this command (match with .env credentials)
```
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=your_username" \
  -e "MINIO_ROOT_PASSWORD=your_password" \
  minio/minio server /data --console-address ":9001"
``` 