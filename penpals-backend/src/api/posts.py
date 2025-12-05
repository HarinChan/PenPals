from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
import uuid

# Services will be injected from app context
bp_posts = Blueprint('posts', __name__)

@bp_posts.route('/posts', methods=['POST'])
def create_post():
    minio_service = request.environ['minio_service']
    chroma_service = request.environ['chroma_service']
    post_service = request.environ['post_service']
    POSTS_BUCKET = request.environ.get('posts_bucket', 'posts')

    try:
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            form = request.form
            files = request.files
            data = {
                "id": form.get("id"),
                "authorId": form.get("authorId"),
                "content": form.get("content"),
                "imageUrl": form.get("imageUrl"),
                "timestamp": form.get("timestamp"),
            }
            upload_file = files.get('file')
        else:
            data = request.json or {}
            upload_file = None

        missing = [k for k in ["authorId", "content"] if not data.get(k)]
        if missing:
            return jsonify({"status": "error", "message": f"Missing required field(s): {', '.join(missing)}"}), 400

        post_id = data.get("id") or str(uuid.uuid4())
        ts = data.get("timestamp") or datetime.now(timezone.utc).isoformat()

        minio_service.make_bucket(POSTS_BUCKET)

        attachment_url = None
        media_object_name = None
        media_mimetype = None
        
        # Upload media file to MinIO if present
        if upload_file and upload_file.filename:
            filename = secure_filename(upload_file.filename)
            media_object_name = f"media/{post_id}/{filename}"
            file_bytes = upload_file.read()
            media_mimetype = upload_file.mimetype or "application/octet-stream"
            
            if not minio_service.upload_bytes(POSTS_BUCKET, media_object_name, file_bytes, content_type=media_mimetype):
                return jsonify({"status": "error", "message": "Failed to upload attachment to object storage"}), 500
            
            attachment_url = minio_service.get_presigned_url(POSTS_BUCKET, media_object_name)

        # Prepare post data for database
        post_data = {
            "id": post_id,
            "authorId": data.get("authorId"),
            "content": data.get("content"),
            "imageUrl": data.get("imageUrl") or (attachment_url if upload_file and (upload_file.mimetype or '').startswith('image/') else None),
            "timestamp": ts,
            "media_object_name": media_object_name,
            "media_mimetype": media_mimetype
        }

        # Save post metadata to database
        post = post_service.create_post(post_data)

        # Add to ChromaDB for search
        embed_meta = {
            "postId": post_id,
            "authorId": post_data["authorId"],
        }
        if media_object_name:
            embed_meta["media_object_name"] = media_object_name
        if media_mimetype:
            embed_meta["media_mimetype"] = media_mimetype

        embed_result = chroma_service.add_documents(
            documents=[post_data["content"]], 
            metadatas=[embed_meta], 
            ids=[post_id]
        )
        if embed_result.get("status") != "success":
            return jsonify({"status": "error", "message": f"Embedding failed: {embed_result.get('message', 'unknown error')}"}), 500

        return jsonify({
            "status": "success",
            "message": "Post created successfully",
            "id": post_id,
            "media_object_name": media_object_name,
            "media_url": attachment_url,
            "media_mimetype": media_mimetype
        }), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@bp_posts.route('/posts', methods=['GET'])
def get_feed():
    minio_service = request.environ['minio_service']
    post_service = request.environ['post_service']
    POSTS_BUCKET = request.environ.get('posts_bucket', 'posts')

    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        author_id = request.args.get('authorId')

        # Get posts from database
        posts = post_service.get_posts(limit=limit, author_id=author_id, offset=offset)

        feed = []
        for post in posts:
            post_dict = post.to_dict()
            
            # Generate presigned URL for media if it exists
            media_url = None
            if post.media_object_name:
                media_url = minio_service.get_presigned_url(POSTS_BUCKET, post.media_object_name)
                print(f"returned media url: {media_url}")

            feed.append({
                "id": post_dict["id"],
                "authorId": post_dict["authorId"],
                "content": post_dict["content"],
                "timestamp": post_dict["timestamp"],
                "imageUrl": post_dict["imageUrl"],
                "media_url": media_url,
                "media_mimetype": post_dict["media_mimetype"]
            })

        return jsonify({"status": "success", "count": len(feed), "posts": feed}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
