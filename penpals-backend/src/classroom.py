"""
Classroom management and matching system.
Handles classroom CRUD operations, semantic interest matching via ChromaDB,
and automatic bidirectional connections between classrooms.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Account, Profile, Relation
from chromadb_service import ChromaDBService
from penpals_helper import PenpalsHelper
import json

classroom_bp = Blueprint('classroom', __name__)

chroma_service = ChromaDBService(persist_directory="./chroma_db", collection_name="classroom_interests")


@classroom_bp.route('/api/classrooms', methods=['POST'])
@jwt_required()
def create_classroom():
    """Create a new classroom for the current account"""
    try:
        account_id = get_jwt_identity()
        account = Account.query.get(account_id)
        
        if not account:
            return jsonify({"msg": "Account not found"}), 404
        
        data = request.json
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        # Validate required fields
        name = data.get('name', '').strip()
        if not name:
            return jsonify({"msg": "Classroom name is required"}), 400
        
        if len(name) > 100:
            return jsonify({"msg": "Classroom name too long (max 100 characters)"}), 400
        
        # Validate coordinates if provided
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        if not PenpalsHelper.validate_coordinates(latitude, longitude):
            return jsonify({"msg": "Invalid coordinates"}), 400
        
        # Validate and sanitize interests
        raw_interests = data.get('interests', [])
        interests = PenpalsHelper.sanitize_interests(raw_interests)
        
        # Validate availability format
        availability = data.get('availability')
        if not PenpalsHelper.validate_availability_format(availability):
            return jsonify({"msg": "Invalid availability format"}), 400
        
        # Validate class size
        class_size = data.get('class_size')
        if class_size is not None:
            try:
                class_size = int(class_size)
                if class_size < 1 or class_size > 100:
                    return jsonify({"msg": "Class size must be between 1 and 100"}), 400
            except (ValueError, TypeError):
                return jsonify({"msg": "Invalid class size"}), 400
        
        classroom = Profile(
            account_id=account.id,
            name=name,
            location=data.get('location', '').strip() or None,
            lattitude=latitude,  # keeping original typo for consistency
            longitude=longitude,
            class_size=class_size,
            availability=availability,
            interests=interests
        )
        
        db.session.add(classroom)
        db.session.flush()
        
        # Store interests in ChromaDB for semantic matching
        if interests:
            interests_text = " ".join(interests)
            chroma_result = chroma_service.add_documents(
                documents=[interests_text],
                metadatas=[{
                    "classroom_id": classroom.id,
                    "classroom_name": classroom.name,
                    "location": classroom.location or ""
                }],
                ids=[f"classroom_{classroom.id}"]
            )
            
            if chroma_result['status'] != 'success':
                print(f"ChromaDB add warning: {chroma_result.get('message')}")
        
        db.session.commit()
        
        classroom_data = PenpalsHelper.format_classroom_response(classroom)
        
        return jsonify({
            "msg": "Classroom created successfully",
            "classroom": classroom_data
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms', methods=['GET'])
@jwt_required()
def get_all_classrooms():
    """Get list of all classrooms (public)"""
    try:
        # Get query parameters
        limit = request.args.get('limit', default=50, type=int)
        
        # Enforce max limit
        limit = min(limit, 100)
        
        # Get all classrooms sorted by creation time (newest first)
        classrooms = Profile.query.order_by(Profile.id.desc()).limit(limit).all()
        
        classrooms_data = [PenpalsHelper.format_classroom_response(c) for c in classrooms]
        
        return jsonify({
            "classrooms": classrooms_data,
            "count": len(classrooms_data)
        }), 200
    
    except Exception as e:
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms/<int:classroom_id>', methods=['GET'])
@jwt_required()
def get_classroom(classroom_id):
    """Get classroom details with friends"""
    try:
        classroom = Profile.query.get(classroom_id)
        
        if not classroom:
            return jsonify({"msg": "Classroom not found"}), 404
        
        classroom_data = PenpalsHelper.format_classroom_response(classroom, include_friends=True)
        
        return jsonify({"classroom": classroom_data}), 200
    
    except Exception as e:
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms/<int:classroom_id>', methods=['PUT'])
@jwt_required()
def update_classroom(classroom_id):
    """Update classroom information (only owner can update)"""
    try:
        account_id = get_jwt_identity()
        classroom = Profile.query.get(classroom_id)
        
        if not classroom:
            return jsonify({"msg": "Classroom not found"}), 404
        
        if classroom.account_id != int(account_id):
            return jsonify({"msg": "Not authorized to update this classroom"}), 403
        
        data = request.json
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        old_interests = classroom.interests or []
        
        # Validate and update fields
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({"msg": "Classroom name cannot be empty"}), 400
            if len(name) > 100:
                return jsonify({"msg": "Classroom name too long (max 100 characters)"}), 400
            classroom.name = name
        
        if 'location' in data:
            location = data['location']
            classroom.location = location.strip() if location else None
        
        if 'latitude' in data or 'longitude' in data:
            new_lat = data.get('latitude', classroom.lattitude)
            new_lng = data.get('longitude', classroom.longitude)
            if not PenpalsHelper.validate_coordinates(new_lat, new_lng):
                return jsonify({"msg": "Invalid coordinates"}), 400
            classroom.lattitude = new_lat
            classroom.longitude = new_lng
        
        if 'class_size' in data:
            class_size = data['class_size']
            if class_size is not None:
                try:
                    class_size = int(class_size)
                    if class_size < 1 or class_size > 100:
                        return jsonify({"msg": "Class size must be between 1 and 100"}), 400
                except (ValueError, TypeError):
                    return jsonify({"msg": "Invalid class size"}), 400
            classroom.class_size = class_size
        
        if 'availability' in data:
            availability = data['availability']
            if not PenpalsHelper.validate_availability_format(availability):
                return jsonify({"msg": "Invalid availability format"}), 400
            classroom.availability = availability
        
        if 'interests' in data:
            raw_interests = data['interests']
            interests = PenpalsHelper.sanitize_interests(raw_interests)
            classroom.interests = interests
        
        # Update ChromaDB if interests changed
        new_interests = classroom.interests or []
        if old_interests != new_interests:
            try:
                # Delete old entry
                chroma_service.delete_documents([f"classroom_{classroom.id}"])
                
                # Add new entry if interests exist
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
        
        classroom_data = PenpalsHelper.format_classroom_response(classroom)
        
        return jsonify({
            "msg": "Classroom updated successfully",
            "classroom": classroom_data
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms/<int:classroom_id>', methods=['DELETE'])
@jwt_required()
def delete_classroom(classroom_id):
    """Delete classroom (only owner can delete)"""
    try:
        account_id = get_jwt_identity()
        classroom = Profile.query.get(classroom_id)
        
        if not classroom:
            return jsonify({"msg": "Classroom not found"}), 404
        
        if classroom.account_id != int(account_id):
            return jsonify({"msg": "Not authorized to delete this classroom"}), 403
        
        # Get connection count for confirmation
        connections_count = classroom.sent_relations.count()
        
        # Remove from ChromaDB
        try:
            chroma_service.delete_documents([f"classroom_{classroom.id}"])
        except Exception as e:
            print(f"ChromaDB delete error: {e}")
        
        db.session.delete(classroom)
        db.session.commit()
        
        return jsonify({
            "msg": "Classroom deleted successfully",
            "deleted_connections": connections_count
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms/search', methods=['POST'])
@jwt_required()
def search_classrooms():
    """Search for classrooms by interests using semantic search"""
    try:
        data = request.json
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        if not data.get('interests'):
            return jsonify({"msg": "Interests are required for search"}), 400
        
        interests = data.get('interests')
        n_results = min(data.get('n_results', 10), 50)  # Limit max results
        
        # Sanitize search interests
        if isinstance(interests, list):
            search_interests = PenpalsHelper.sanitize_interests(interests)
            search_query = " ".join(search_interests)
        else:
            search_query = str(interests).strip()
        
        if not search_query:
            return jsonify({"msg": "No valid interests provided"}), 400
        
        # Search using ChromaDB
        result = chroma_service.query_documents(search_query, n_results)
        
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
                    classroom_data = PenpalsHelper.format_classroom_response(classroom)
                    classroom_data["similarity_score"] = round(search_result['similarity'], 3)
                    
                    # Add manual similarity calculation as well
                    manual_similarity = PenpalsHelper.calculate_interest_similarity(
                        search_interests if isinstance(interests, list) else [search_query],
                        classroom.interests or []
                    )
                    classroom_data["manual_similarity"] = round(manual_similarity, 3)
                    
                    matched_classrooms.append(classroom_data)
        
        return jsonify({
            "matched_classrooms": matched_classrooms,
            "search_query": search_query,
            "total_results": len(matched_classrooms)
        }), 200
        
    except Exception as e:
        return jsonify({"msg": "Search error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms/<int:classroom_id>/connect', methods=['POST'])
@jwt_required()
def connect_classrooms(classroom_id):
    """Add a classroom as a friend (automatic bidirectional connection)"""
    try:
        account_id = get_jwt_identity()
        data = request.json
        
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        from_classroom_id = data.get('from_classroom_id')
        
        if not from_classroom_id:
            return jsonify({"msg": "from_classroom_id is required"}), 400
        
        # Validate from_classroom ownership
        from_classroom = Profile.query.get(from_classroom_id)
        if not from_classroom or from_classroom.account_id != int(account_id):
            return jsonify({"msg": "Not authorized to connect from this classroom"}), 403
        
        # Validate target classroom exists
        to_classroom = Profile.query.get(classroom_id)
        if not to_classroom:
            return jsonify({"msg": "Target classroom not found"}), 404
        
        # Prevent self-connection
        if from_classroom_id == classroom_id:
            return jsonify({"msg": "Cannot connect classroom to itself"}), 400
        
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
        
        return jsonify({
            "msg": "Classrooms are now friends!",
            "connection": {
                "from_classroom": from_classroom.name,
                "to_classroom": to_classroom.name,
                "connected_at": PenpalsHelper.get_current_utc_timestamp().isoformat()
            }
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms/<int:classroom_id>/friends', methods=['GET'])
@jwt_required()
def get_classroom_friends(classroom_id):
    """Get all friends for a classroom"""
    try:
        classroom = Profile.query.get(classroom_id)
        
        if not classroom:
            return jsonify({"msg": "Classroom not found"}), 404
        
        friends = []
        for relation in classroom.sent_relations:
            friend = relation.to_profile
            friend_data = {
                "id": friend.id,
                "name": friend.name,
                "location": friend.location,
                "class_size": friend.class_size,
                "interests": friend.interests,
                "friends_since": relation.created_at.isoformat()
            }
            
            # Calculate interest similarity
            similarity = PenpalsHelper.calculate_interest_similarity(
                classroom.interests or [],
                friend.interests or []
            )
            friend_data["interest_similarity"] = round(similarity, 3)
            
            friends.append(friend_data)
        
        # Sort friends by similarity score (descending)
        friends.sort(key=lambda x: x["interest_similarity"], reverse=True)
        
        return jsonify({
            "classroom_id": classroom_id,
            "classroom_name": classroom.name,
            "friends": friends,
            "friends_count": len(friends)
        }), 200
    
    except Exception as e:
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500


@classroom_bp.route('/api/classrooms/<int:classroom_id>/disconnect', methods=['DELETE'])
@jwt_required()
def disconnect_classrooms(classroom_id):
    """Remove friendship between classrooms"""
    try:
        account_id = get_jwt_identity()
        data = request.json
        
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        from_classroom_id = data.get('from_classroom_id')
        
        if not from_classroom_id:
            return jsonify({"msg": "from_classroom_id is required"}), 400
        
        # Validate from_classroom ownership
        from_classroom = Profile.query.get(from_classroom_id)
        if not from_classroom or from_classroom.account_id != int(account_id):
            return jsonify({"msg": "Not authorized to disconnect from this classroom"}), 403
        
        # Find and delete both directions of the relationship
        relation1 = Relation.query.filter_by(
            from_profile_id=from_classroom_id,
            to_profile_id=classroom_id
        ).first()
        
        relation2 = Relation.query.filter_by(
            from_profile_id=classroom_id,
            to_profile_id=from_classroom_id
        ).first()
        
        if not relation1 and not relation2:
            return jsonify({"msg": "No friendship exists between these classrooms"}), 404
        
        if relation1:
            db.session.delete(relation1)
        if relation2:
            db.session.delete(relation2)
        
        db.session.commit()
        
        return jsonify({"msg": "Classrooms disconnected successfully"}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500
