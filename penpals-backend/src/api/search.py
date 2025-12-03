from flask import Blueprint, jsonify, request

bp_search = Blueprint('search', __name__)

@bp_search.route('/search', methods=['GET'])
def search_posts():
    chroma_service = request.environ['chroma_service']
    minio_service = request.environ['minio_service']

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
            meta = item.get('metadata', {}) or {}
            bucket = meta.get('bucket')
            obj = meta.get('object_name')
            media_obj = meta.get('media_object_name')
            url = minio_service.get_presigned_url(bucket, obj) if bucket and obj else None
            media_url = minio_service.get_presigned_url(bucket, media_obj) if bucket and media_obj else None
            enriched.append({
                "id": item.get('id'),
                "document": item.get('document'),
                "similarity": item.get('similarity'),
                "metadata": meta,
                "url": url,
                "media_url": media_url
            })

        return jsonify({"status": "success", "query": q, "count": len(enriched), "results": enriched}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
