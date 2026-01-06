"""
Classroom management and matching system.
Handles classroom CRUD operations, semantic interest matching via ChromaDB,
and automatic bidirectional connections between classrooms.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Account, Profile, Relation
from chromadb_service import ChromaDBService
import json

classroom_bp = Blueprint('classroom', __name__)

chroma_service = ChromaDBService(persist_directory="./chroma_db", collection_name="classroom_interests")


@classroom_bp.route('/api/classrooms', methods=['POST'])
@jwt_required()
def create_classroom():
    """Create a new classroom for the current account"""
    account_id = get_jwt_identity()
    account = Account.query.get(account_id)
    
    if not account:
        return jsonify({"msg": "Account not found"}), 404
    
    data = request.json
    
    if not data.get('name'):
        return jsonify({"msg": "Classroom name is required"}), 400
    
    classroom = Profile(
        account_id=account.id,
        name=data.get('name'),
        location=data.get('location'),
        lattitude=data.get('latitude'),  # keeping original typo for consistency
        longitude=data.get('longitude'),
        class_size=data.get('class_size'),
        availability=data.get('availability'),
        interests=data.get('interests', [])
    )
    
    db.session.add(classroom)
    db.session.flush()
    
    # Store interests in ChromaDB for semantic matching
    if classroom.interests:
        interests_text = " ".join(classroom.interests)
        chroma_service.add_documents(
            documents=[interests_text],
            metadatas=[{
                "classroom_id": classroom.id,
                "classroom_name": classroom.name,
                "location": classroom.location or ""
            }],
            ids=[f"classroom_{classroom.id}"]
        )
    
    db.session.commit()
    
    return jsonify({
        "msg": "Classroom created successfully",
        "classroom": {
            "id": classroom.id,
            "name": classroom.name,
            "location": classroom.location,
            "latitude": classroom.lattitude,
            "longitude": classroom.longitude,
            "class_size": classroom.class_size,
            "availability": classroom.availability,
            "interests": classroom.interests
        }
    }), 201


@classroom_bp.route('/api/classrooms/<int:classroom_id>', methods=['GET'])
@jwt_required()
def get_classroom(classroom_id):
    """Get classroom details"""
    classroom = Profile.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"msg": "Classroom not found"}), 404
    
    # Get friends (connected classrooms)
    friends = []
    for relation in classroom.sent_relations:
        friend = relation.to_profile
        friends.append({
            "id": friend.id,
            "name": friend.name,
            "location": friend.location,
            "interests": friend.interests
        })
    
    return jsonify({
        "classroom": {
            "id": classroom.id,
            "account_id": classroom.account_id,
            "name": classroom.name,
            "location": classroom.location,
            "latitude": classroom.lattitude,
            "longitude": classroom.longitude,
            "class_size": classroom.class_size,
            "availability": classroom.availability,
            "interests": classroom.interests,
            "friends": friends,
            "friends_count": len(friends)
        }
    }), 200


@classroom_bp.route('/api/classrooms/<int:classroom_id>', methods=['PUT'])
@jwt_required()
def update_classroom(classroom_id):
    """Update classroom information (only owner can update)"""
    account_id = get_jwt_identity()
    classroom = Profile.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"msg": "Classroom not found"}), 404
    
    if classroom.account_id != int(account_id):
        return jsonify({"msg": "Not authorized to update this classroom"}), 403
    
    data = request.json
    old_interests = classroom.interests or []
    
    if 'name' in data:
        classroom.name = data['name']
    if 'location' in data:
        classroom.location = data['location']
    if 'latitude' in data:
        classroom.lattitude = data['latitude']
    if 'longitude' in data:
        classroom.longitude = data['longitude']
    if 'class_size' in data:
        classroom.class_size = data['class_size']
    if 'availability' in data:
        classroom.availability = data['availability']
    if 'interests' in data:
        classroom.interests = data['interests']
    
    # Update ChromaDB if interests changed
    new_interests = classroom.interests or []
    if old_interests != new_interests:
        try:
            chroma_service.delete_documents([f"classroom_{classroom.id}"])
            
            if new_interests:
                interests_text = " ".join(new_interests)
                chroma_service.add_documents(
                    documents=[interests_text],
                    metadatas=[{
                        "classroom_id": classroom.id,
                        "classroom_name": classroom.name,
                        "location": classroom.location or ""
                    }],
                    ids=[f"classroom_{classroom.id}"]
                )
        except Exception as e:
            print(f"ChromaDB update error: {e}")
    
    db.session.commit()
    
    return jsonify({"msg": "Classroom updated successfully"}), 200


@classroom_bp.route('/api/classrooms/<int:classroom_id>', methods=['DELETE'])
@jwt_required()
def delete_classroom(classroom_id):
    """Delete classroom (only owner can delete)"""
    account_id = get_jwt_identity()
    classroom = Profile.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"msg": "Classroom not found"}), 404
    
    if classroom.account_id != int(account_id):
        return jsonify({"msg": "Not authorized to delete this classroom"}), 403
    
    try:
        chroma_service.delete_documents([f"classroom_{classroom.id}"])
    except Exception as e:
        print(f"ChromaDB delete error: {e}")
    
    db.session.delete(classroom)
    db.session.commit()
    
    return jsonify({"msg": "Classroom deleted successfully"}), 200


@classroom_bp.route('/api/classrooms/search', methods=['POST'])
@jwt_required()
def search_classrooms():
    """Search for classrooms by interests using semantic search"""
    data = request.json
    
    if not data.get('interests'):
        return jsonify({"msg": "Interests are required for search"}), 400
    
    interests = data.get('interests')
    n_results = data.get('n_results', 10)
    
    # Create search query from interests
    search_query = " ".join(interests) if isinstance(interests, list) else str(interests)
    
    try:
        # Search using ChromaDB
        result = chroma_service.query_documents(search_query, n_results)
        
        print(f"ChromaDB result: {result}")  # Debug line
        
        if result['status'] != 'success':
            return jsonify({"msg": "Search failed", "error": result.get('message')}), 500
        
        # Get classroom details from database
        matched_classrooms = []
        if result.get('results'):
            for search_result in result['results']:
                metadata = search_result['metadata']
                classroom_id = metadata['classroom_id']
                classroom = Profile.query.get(classroom_id)
                
                if classroom:
                    matched_classrooms.append({
                        "id": classroom.id,
                        "name": classroom.name,
                        "location": classroom.location,
                        "latitude": classroom.lattitude,
                        "longitude": classroom.longitude,
                        "class_size": classroom.class_size,
                        "interests": classroom.interests,
                        "similarity_score": round(search_result['similarity'], 3)
                    })
        
        return jsonify({
            "matched_classrooms": matched_classrooms,
            "search_query": search_query
        }), 200
        
    except Exception as e:
        print(f"Search exception: {e}")  # Debug line
        return jsonify({"msg": "Search error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms/<int:classroom_id>/connect', methods=['POST'])
@jwt_required()
def connect_classrooms(classroom_id):
    """Add a classroom as a friend (automatic bidirectional connection)"""
    account_id = get_jwt_identity()
    data = request.json
    
    from_classroom_id = data.get('from_classroom_id')
    
    if not from_classroom_id:
        return jsonify({"msg": "from_classroom_id is required"}), 400
    
    from_classroom = Profile.query.get(from_classroom_id)
    if not from_classroom or from_classroom.account_id != int(account_id):
        return jsonify({"msg": "Not authorized to connect from this classroom"}), 403
    
    to_classroom = Profile.query.get(classroom_id)
    if not to_classroom:
        return jsonify({"msg": "Target classroom not found"}), 404
    
    # Check if friendship already exists
    existing_relation = Relation.query.filter_by(
        from_profile_id=from_classroom_id,
        to_profile_id=classroom_id
    ).first()
    
    if existing_relation:
        return jsonify({"msg": "Classrooms are already friends"}), 409
    
    # Create bidirectional friendship
    relation1 = Relation(from_profile_id=from_classroom_id, to_profile_id=classroom_id)
    relation2 = Relation(from_profile_id=classroom_id, to_profile_id=from_classroom_id)
    
    db.session.add(relation1)
    db.session.add(relation2)
    db.session.commit()
    
    return jsonify({"msg": "Classrooms are now friends!"}), 201


@classroom_bp.route('/api/classrooms/<int:classroom_id>/friends', methods=['GET'])
@jwt_required()
def get_classroom_friends(classroom_id):
    """Get all friends for a classroom"""
    classroom = Profile.query.get(classroom_id)
    
    if not classroom:
        return jsonify({"msg": "Classroom not found"}), 404
    
    friends = []
    for relation in classroom.sent_relations:
        friend = relation.to_profile
        friends.append({
            "id": friend.id,
            "name": friend.name,
            "location": friend.location,
            "class_size": friend.class_size,
            "interests": friend.interests,
            "friends_since": relation.created_at.isoformat()
        })
    
    return jsonify({
        "classroom_id": classroom_id,
        "classroom_name": classroom.name,
        "friends": friends,
        "friends_count": len(friends)
    }), 200
