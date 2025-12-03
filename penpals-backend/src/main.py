from flask import Flask, request
from flask_cors import CORS
from services.chromadb_service import ChromaDBService
from services.minio_service import MinIOService
from api.posts import bp_posts
from api.search import bp_search

application = Flask(__name__)
CORS(application)

# Initialize services
chroma_service = ChromaDBService(persist_directory="./chroma_db", collection_name="penpals_documents")
minio_service = MinIOService()
POSTS_BUCKET = "posts"

# Inject services into request context for blueprints
@application.before_request
def inject_services():
    request.environ['chroma_service'] = chroma_service
    request.environ['minio_service'] = minio_service
    request.environ['posts_bucket'] = POSTS_BUCKET

# Register blueprints
application.register_blueprint(bp_posts)
application.register_blueprint(bp_search)

if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5001)
