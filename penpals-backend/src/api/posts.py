from flask import Blueprint, jsonify, request
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
import uuid
import json

# Services will be injected from app context
bp_posts = Blueprint('posts', __name__)

@bp_posts.route('/posts', methods=['POST'])
def create_post():
    minio_service = request.environ['minio_service']
    chroma_service = request.environ['chroma_service']
    POSTS_BUCKET = request.environ.get('posts_bucket', 'posts')

    try:
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            form = request.form
            files = request.files
            data = {
                "id": form.get("id"),
                "authorId": form.get("authorId"),
                "authorName": form.get("authorName"),
                "content": form.get("content"),
                "imageUrl": form.get("imageUrl"),
                "timestamp": form.get("timestamp"),
                "likes": int(form.get("likes", 0)) if form.get("likes") else 0,
                "comments": int(form.get("comments", 0)) if form.get("comments") else 0,
                "quotedPost": None,
            }
            quoted_post_raw = form.get("quotedPost")
            if quoted_post_raw:
                try:
                    data["quotedPost"] = json.loads(quoted_post_raw)
                except Exception:
                    data["quotedPost"] = None
            upload_file = files.get('file')
        else:
            data = request.json or {}
            upload_file = None

        missing = [k for k in ["authorId", "authorName", "content"] if not data.get(k)]
        if missing:
            return jsonify({"status": "error", "message": f"Missing required field(s): {', '.join(missing)}"}), 400

        post_id = data.get("id") or str(uuid.uuid4())
        ts = data.get("timestamp") or datetime.now(timezone.utc).isoformat()

        minio_service.make_bucket(POSTS_BUCKET)

        attachment_url = None
        media_object_name = None
        if upload_file and upload_file.filename:
            filename = secure_filename(upload_file.filename)
            media_object_name = f"media/{post_id}/{filename}"
            file_bytes = upload_file.read()
            if not minio_service.upload_bytes(POSTS_BUCKET, media_object_name, file_bytes, content_type=upload_file.mimetype or "application/octet-stream"):
                return jsonify({"status": "error", "message": "Failed to upload attachment to object storage"}), 500
            attachment_url = minio_service.get_presigned_url(POSTS_BUCKET, media_object_name)
            media_mimetype = upload_file.mimetype or "application/octet-stream"
        else:
            media_mimetype = None

        post = {
            "id": post_id,
            "authorId": data.get("authorId"),
            "authorName": data.get("authorName"),
            "content": data.get("content"),
            "imageUrl": data.get("imageUrl") or (attachment_url if upload_file and (upload_file.mimetype or '').startswith('image/') else None),
            "attachmentUrl": attachment_url if attachment_url else None,
            "timestamp": ts,
            "likes": data.get("likes", 0),
            "comments": data.get("comments", 0),
            "quotedPost": data.get("quotedPost"),
            "media_object_name": media_object_name,
            "media_mimetype": media_mimetype
        }

        ts_key = ts.replace(":", "-")
        object_name = f"posts/{ts_key}-{post_id}.json"
        ok = minio_service.upload_json(POSTS_BUCKET, object_name, post)
        if not ok:
            return jsonify({"status": "error", "message": "Failed to upload post to object storage"}), 500

        embed_meta = {
            "bucket": POSTS_BUCKET,
            "object_name": object_name,
            "authorId": post["authorId"],
            "authorName": post["authorName"],
            "timestamp": ts,
        }
        if media_object_name:
            embed_meta["media_object_name"] = media_object_name
        if media_mimetype:
            embed_meta["media_mimetype"] = media_mimetype

        embed_result = chroma_service.add_documents(documents=[post["content"]], metadatas=[embed_meta], ids=[post_id])
        if embed_result.get("status") != "success":
            return jsonify({"status": "error", "message": f"Embedding failed: {embed_result.get('message', 'unknown error')}"}), 500

        presigned_url = minio_service.get_presigned_url(POSTS_BUCKET, object_name) or None

        return jsonify({
            "status": "success",
            "message": "Post uploaded and embedded successfully",
            "id": post_id,
            "bucket": POSTS_BUCKET,
            "object_name": object_name,
            "url": presigned_url,
            "media_object_name": media_object_name,
            "media_url": attachment_url,
            "media_mimetype": media_mimetype
        }), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@bp_posts.route('/posts', methods=['GET'])
def get_feed():
    minio_service = request.environ['minio_service']
    POSTS_BUCKET = request.environ.get('posts_bucket', 'posts')

    try:
        limit = int(request.args.get('limit', 50))
        author_id = request.args.get('authorId')

        names = minio_service.list_objects(POSTS_BUCKET, prefix='posts/', recursive=True)
        names = [n for n in names if n.endswith('.json')]
        names.sort(reverse=True)

        feed = []
        for name in names:
            post = minio_service.get_object_json(POSTS_BUCKET, name)
            if not post:
                continue
            if author_id and post.get('authorId') != author_id:
                continue

            url = minio_service.get_presigned_url(POSTS_BUCKET, name)
            media_url = None
            if post.get('media_object_name'):
                media_url = minio_service.get_presigned_url(POSTS_BUCKET, post['media_object_name'])

            feed.append({
                "id": post.get("id"),
                "authorId": post.get("authorId"),
                "authorName": post.get("authorName"),
                "content": post.get("content"),
                "timestamp": post.get("timestamp"),
                "likes": post.get("likes", 0),
                "comments": post.get("comments", 0),
                "url": url,
                "media_url": media_url,
                "media_mimetype": post.get("media_mimetype")
            })

            if len(feed) >= limit:
                break

        return jsonify({"status": "success", "count": len(feed), "posts": feed}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
