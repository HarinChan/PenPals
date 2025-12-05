from flask import Blueprint, jsonify, request

bp_search = Blueprint('search', __name__)

@bp_search.route('/search', methods=['GET'])
def search_posts():
    chroma_service = request.environ['chroma_service']
    post_service = request.environ['post_service']
    minio_service = request.environ['minio_service']
    POSTS_BUCKET = request.environ.get('posts_bucket', 'posts')


    try:
        q = request.args.get('q', '').strip()
        n = int(request.args.get('n', 5))
        if not q:
            return jsonify({"status": "error", "message": "Missing query parameter 'q'"}), 400

        result = chroma_service.query_documents(q, n_results=n)
        if result.get('status') != 'success':
            return jsonify(result), 500
        
        enriched = []
        for item in result.get('results', []):
            print(item)
            meta = item.get('metadata', {}) or {}
            post_id = meta.get('postId')
            print(post_id)

            post = post_service.get_post_by_id(post_id=post_id)
            post_dict = post.to_dict()
            
            # Generate presigned URL for media if it exists
            media_url = None
            if post.media_object_name:
                media_url = minio_service.get_presigned_url(POSTS_BUCKET, post.media_object_name)

            enriched.append({
                "id": post_dict["id"],
                "authorId": post_dict["authorId"],
                "content": post_dict["content"],
                "timestamp": post_dict["timestamp"],
                "imageUrl": post_dict["imageUrl"],
                "media_url": media_url,
                "media_mimetype": post_dict["media_mimetype"]
            })


        return jsonify({"status": "success", "count": len(enriched), "posts": enriched}), 200
    except Exception as e:
        print(e)
        return jsonify({"status": "error", "message": str(e)}), 500
