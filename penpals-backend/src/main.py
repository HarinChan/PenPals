"""
Main Flask application for PenPals backend.
Handles authentication, basic profile operations, and ChromaDB document management.
Account and classroom management is handled by separate blueprints.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime
import os

from dotenv import load_dotenv
load_dotenv()

from models import db, Account, Profile, Relation, Post, Meeting
from webex_service import WebexService

from account import account_bp
from classroom import classroom_bp

def print_tables():
    with application.app_context():
        print("Registered tables:", [table.name for table in db.metadata.sorted_tables])

from chromadb_service import ChromaDBService

application = Flask(__name__)
CORS(application)
print_tables()

application.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
application.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
application.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

db_uri = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///penpals_db/penpals.db')
if db_uri.startswith('sqlite:///') and not db_uri.startswith('sqlite:////'):
    rel_path = db_uri.replace('sqlite:///', '', 1)
    # Ensure the directory exists
    db_dir = os.path.dirname(rel_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    abs_path = os.path.abspath(rel_path)
    db_uri = f'sqlite:///{abs_path}'
application.config['SQLALCHEMY_DATABASE_URI'] = db_uri
application.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

capital_letters = [chr(i) for i in range(ord('A'), ord('Z')+1)]
lowercase_letters = [chr(i) for i in range(ord('a'), ord('z')+1)]
digits = [str(i) for i in range(10)]

db.init_app(application)
jwt = JWTManager(application)

# Initialize database tables
with application.app_context():
    db.create_all()
    print("Database initialized successfully!")


webex_service = WebexService()

application.register_blueprint(account_bp)
application.register_blueprint(classroom_bp)

chroma_service = ChromaDBService(persist_directory="./chroma_db", collection_name="penpals_documents")

@application.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new account"""
    data = request.json
    
    email = data.get('email')
    password = data.get('password')
    organization = data.get('organization')
    
    if not email or not password:
        return jsonify({"msg": "Missing required fields"}), 400
    
    # Password validation: at least 8 chars, one uppercase, one lowercase, one digit, one special char
    has_upper = any(c in capital_letters for c in password)
    has_lower = any(c in lowercase_letters for c in password)
    has_digit = any(c in digits for c in password)
    has_special = any(
        c not in capital_letters and c not in lowercase_letters and c not in digits
        for c in password
    )
    if not (len(password) >= 8 and has_upper and has_lower and has_digit and has_special):
        return jsonify({
            "msg": "Password must be at least 8 characters and include one uppercase, one lowercase, one digit, and one special character."
        }), 400
    
    # Check if account exists
    if Account.query.filter_by(email=email).first():
        return jsonify({"msg": "Account already exists"}), 409
    
    # Hash password using werkzeug
    password_hash = generate_password_hash(password)
    
    # Create account (no automatic profile creation)
    account = Account(email=email, password_hash=password_hash, organization=organization)
    db.session.add(account)
    db.session.commit()
    
    return jsonify({
        "msg": "Account created successfully",
        "account_id": account.id
    }), 201


@application.route('/api/auth/login', methods=['POST'])
def login():
    """Login and receive JWT token"""
    data = request.json
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"msg": "Missing email or password"}), 400
    
    account = Account.query.filter_by(email=email).first()
    
    if not account or not check_password_hash(account.password_hash, password):
        return jsonify({"msg": "Invalid credentials"}), 401
    
    # Create JWT token with account ID as identity
    access_token = create_access_token(identity=str(account.id))
    
    return jsonify({
        "access_token": access_token,
        "account_id": account.id
    }), 200


@application.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user's info"""
    account_id = get_jwt_identity()
    account = Account.query.get(account_id)
    
    if not account:
        return jsonify({"msg": "Account not found"}), 404
    
    # Get all classrooms for this account
    classrooms = []
    for classroom in account.classrooms:
        classrooms.append({
            "id": classroom.id,
            "name": classroom.name,
            "location": classroom.location,
            "latitude": classroom.lattitude,  # Note: keeping original typo for consistency
            "longitude": classroom.longitude,
            "class_size": classroom.class_size,
            "interests": classroom.interests
        })
    
    return jsonify({
        "account": {
            "id": account.id,
            "email": account.email,
            "organization": account.organization
        },
        "classrooms": classrooms
    }), 200

@application.route('/api/profiles/get', methods=["GET"])
def get_profile():
    """Get profile by ID"""
    data = request.json

    id = data.get('id')

    if not id:
        return jsonify({"msg": "Profile not found"}), 404
    
    profile = Profile.query.filter_by(id=id).first()

    if not profile:
        return jsonify({"msg": "Profile not found"}), 404
    
    return jsonify({
        "id": profile.id,
        "account_id": profile.account_id,
        "name": profile.name,
        "location": profile.location,
        "lattitude": profile.lattitude,
        "longitude": profile.longitude,
        "class_size": profile.class_size,
        "availability": profile.availability,
        "interests": profile.interests
    }), 200

# Create a new profile from JSON
@application.route('/api/profiles/create', methods=["POST"])
def create_profile():
    """Create a new profile from JSON"""
    data = request.json

    required_fields = ["account_id", "name"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"msg": f"Missing required field: {field}"}), 400

    profile = Profile(
        account_id=data.get("account_id"),
        name=data.get("name"),
        location=data.get("location"),
        lattitude=data.get("lattitude"),
        longitude=data.get("longitude"),
        class_size=data.get("class_size"),
        availability=data.get("availability"),
        interests=data.get("interests")
    )
    db.session.add(profile)
    db.session.commit()

    return jsonify({
        "msg": "Profile created successfully",
        "id": profile.id
    }), 201


@application.route('/api/webex/auth-url', methods=['GET'])
@jwt_required()
def get_webex_auth_url():
    """Get the WebEx OAuth authorization URL"""
    url = webex_service.get_auth_url()
    return jsonify({"url": url}), 200

@application.route('/api/webex/connect', methods=['POST'])
@jwt_required()
def connect_webex():
    """Exchange auth code for tokens and store in account"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
        
    code = request.json.get('code')
    if not code:
        return jsonify({"msg": "Missing auth code"}), 400
        
    try:
        token_data = webex_service.exchange_code(code)
        
        account.webex_access_token = token_data.get('access_token')
        account.webex_refresh_token = token_data.get('refresh_token')
        # Expires in comes in seconds, calculate expiry time
        expires_in = token_data.get('expires_in')
        if expires_in:
            account.webex_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
        db.session.commit()
        return jsonify({"msg": "WebEx connected successfully"}), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@application.route('/api/webex/status', methods=['GET'])
@jwt_required()
def get_webex_status():
    """Check if user has connected WebEx"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
        
    connected = account.webex_access_token is not None
    return jsonify({"connected": connected}), 200

@application.route('/api/webex/disconnect', methods=['POST'])
@jwt_required()
def webex_disconnect():
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
        
    account.webex_access_token = None
    account.webex_refresh_token = None
    account.webex_token_expires_at = None
    
    db.session.commit()
    
    return jsonify({"msg": "Disconnected from WebEx successfully"})

@application.route('/api/webex/meeting', methods=['POST'])
@jwt_required()
def create_webex_meeting():
    """Create a WebEx meeting and save to DB"""
    current_user_id = get_jwt_identity() # Account ID
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
        
    # Check WebEx connection
    if not account.webex_access_token:
        return jsonify({"msg": "WebEx not connected. Please connect your account first."}), 403
    if account.webex_token_expires_at and account.webex_token_expires_at < datetime.utcnow():
        try:
             token_data = webex_service.refresh_access_token(account.webex_refresh_token)
             account.webex_access_token = token_data.get('access_token')
             account.webex_refresh_token = token_data.get('refresh_token', account.webex_refresh_token)
             expires_in = token_data.get('expires_in')
             if expires_in:
                 account.webex_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
             db.session.commit()
        except Exception as e:
            return jsonify({"msg": "Failed to refresh WebEx session. Please reconnect."}), 403
        
    # Assuming the account has one profile/classroom for now, or we pick the first one
    # The frontend should ideally send the profile_id, but for now we default to the first one.
    creator_profile = account.classrooms.first()
    if not creator_profile:
         return jsonify({"msg": "No profile found for account"}), 400
    
    data = request.json
    title = data.get('title', 'Classroom Meeting')
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')
    classroom_id = data.get('classroom_id') # The participant classroom ID (the one we are calling)
    
    if not start_time_str or not end_time_str:
         # Default to instant meeting (now + 1 hour)
         start_time = datetime.utcnow()
         end_time = start_time + timedelta(hours=1)
    else:
        try:
            # Handle potential Z suffix
            if start_time_str.endswith('Z'):
                start_time_str = start_time_str[:-1]
            if end_time_str.endswith('Z'):
                end_time_str = end_time_str[:-1]
                
            start_time = datetime.fromisoformat(start_time_str)
            end_time = datetime.fromisoformat(end_time_str)
        except ValueError:
            return jsonify({"msg": "Invalid date format"}), 400

    # Create meeting via WebEx Service
    try:
        # Pass the user's access token
        webex_meeting = webex_service.create_meeting(account.webex_access_token, title, start_time, end_time)
    except Exception as e:
        return jsonify({"msg": f"Failed to create WebEx meeting: {str(e)}"}), 500
        
    # Save to DB
    new_meeting = Meeting(
        webex_id=webex_meeting.get('id'),
        title=webex_meeting.get('title', title),
        start_time=start_time,
        end_time=end_time,
        web_link=webex_meeting.get('webLink'),
        password=webex_meeting.get('password'),
        creator_id=creator_profile.id
    )
    
    # Add participant if provided
    if classroom_id:
        participant_profile = Profile.query.get(classroom_id)
        if participant_profile:
            new_meeting.participants.append(participant_profile)
            
    db.session.add(new_meeting)
    db.session.commit()
    
    return jsonify({
        "msg": "Meeting created successfully",
        "meeting": {
            "id": new_meeting.id,
            "web_link": new_meeting.web_link,
            "start_time": new_meeting.start_time.isoformat(),
            "title": new_meeting.title,
            "password": new_meeting.password
        }
    }), 201

@application.route('/api/webex/meeting/<int:meeting_id>', methods=['GET', 'DELETE', 'PUT'])
@jwt_required()
def manage_meeting(meeting_id):
    """Manage a specific meeting (Get Details, Delete, Update)"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
        
    meeting = Meeting.query.get(meeting_id)
    if not meeting:
        return jsonify({"msg": "Meeting not found"}), 404
        
    # Check authorization (creator or participant)
    profile = account.classrooms.first()
    if not profile:
        return jsonify({"msg": "Profile not found"}), 404
        
    is_creator = meeting.creator_id == profile.id
    is_participant = profile in meeting.participants
    
    if not (is_creator or is_participant):
        return jsonify({"msg": "Unauthorized"}), 403

    # Check WebEx connection
    if not account.webex_access_token:
        return jsonify({"msg": "WebEx not connected. Please connect your account first."}), 403
        
    # Refresh token logic (simplified reuse)
    if account.webex_token_expires_at and account.webex_token_expires_at < datetime.utcnow():
        try:
             token_data = webex_service.refresh_access_token(account.webex_refresh_token)
             account.webex_access_token = token_data.get('access_token')
             account.webex_refresh_token = token_data.get('refresh_token', account.webex_refresh_token)
             expires_in = token_data.get('expires_in')
             if expires_in:
                 account.webex_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
             db.session.commit()
        except Exception as e:
            return jsonify({"msg": "Failed to refresh WebEx session. Please reconnect."}), 403

    if request.method == 'GET':
        return jsonify({
            "id": meeting.id,
            "title": meeting.title,
            "start_time": meeting.start_time.isoformat(),
            "end_time": meeting.end_time.isoformat(),
            "web_link": meeting.web_link,
            "password": meeting.password,
            "creator_name": meeting.creator.name,
            "is_creator": is_creator
        }), 200

    if request.method == 'DELETE':
        if not is_creator:
            return jsonify({"msg": "Only default creator can delete meetings"}), 403
            
        try:
            # Delete from WebEx
            if meeting.webex_id:
                webex_service.delete_meeting(account.webex_access_token, meeting.webex_id)
            
            # Delete from DB
            db.session.delete(meeting)
            db.session.commit()
            return jsonify({"msg": "Meeting deleted successfully"}), 200
        except Exception as e:
            return jsonify({"msg": f"Failed to delete meeting: {str(e)}"}), 500

    if request.method == 'PUT':
        if not is_creator:
            return jsonify({"msg": "Only creator can update meetings"}), 403
            
        data = request.json
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        
        try:
            if start_time_str:
                if start_time_str.endswith('Z'): start_time_str = start_time_str[:-1]
                meeting.start_time = datetime.fromisoformat(start_time_str)
            if end_time_str:
                if end_time_str.endswith('Z'): end_time_str = end_time_str[:-1]
                meeting.end_time = datetime.fromisoformat(end_time_str)
                
            # Update WebEx
            if meeting.webex_id:
                webex_service.update_meeting(
                    account.webex_access_token, 
                    meeting.webex_id,
                    meeting.start_time,
                    meeting.end_time
                )
            
            db.session.commit()
            return jsonify({"msg": "Meeting updated successfully"}), 200
        except ValueError:
             return jsonify({"msg": "Invalid date format"}), 400
        except Exception as e:
            return jsonify({"msg": f"Failed to update meeting: {str(e)}"}), 500

@application.route('/api/meetings', methods=['GET'])
@jwt_required()
def get_upcoming_meetings():
    """Get upcoming meetings for the user"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
        
    profile = account.classrooms.first()
    if not profile:
        return jsonify({"meetings": []}), 200
        
    now = datetime.utcnow()
    
    # Meetings created by me
    created_meetings = Meeting.query.filter(
        Meeting.creator_id == profile.id,
        Meeting.start_time >= now
    ).all()
    
    # Meetings I am participating in
    participating_meetings = [m for m in profile.meetings if m.start_time >= now]
    
    all_meetings = list(set(created_meetings + participating_meetings))
    all_meetings.sort(key=lambda x: x.start_time)
    
    result = []
    for m in all_meetings:
        result.append({
            "id": m.id,
            "title": m.title,
            "start_time": m.start_time.isoformat(),
            "end_time": m.end_time.isoformat(),
            "web_link": m.web_link,
            "password": m.password,
            "creator_name": m.creator.name
        })
        
    return jsonify({"meetings": result}), 200


# ChromaDB Document Endpoints

@application.route('/api/documents/upload', methods=['POST'])
def upload_documents():
    """
    Upload documents to ChromaDB for embedding and storage
    Expected JSON format:
    {
        "documents": ["text1", "text2", ...],
        "metadatas": [{"key": "value"}, ...],  // optional
        "ids": ["id1", "id2", ...]  // optional
    }
    """
    try:
        data = request.json
        
        if not data or 'documents' not in data:
            return jsonify({"status": "error", "message": "Missing 'documents' field"}), 400
        
        documents = data.get('documents')
        metadatas = data.get('metadatas', None)
        ids = data.get('ids', None)
        
        if not isinstance(documents, list) or len(documents) == 0:
            return jsonify({"status": "error", "message": "'documents' must be a non-empty list"}), 400
        
        result = chroma_service.add_documents(documents, metadatas, ids)
        
        if result['status'] == 'success':
            return jsonify(result), 201
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@application.route('/api/documents/query', methods=['POST'])
def query_documents():
    """
    Query ChromaDB for similar documents
    Expected JSON format:
    {
        "query": "search text",
        "n_results": 5,  // optional, defaults to 5
        "where": {"key": "value"}  // optional metadata filter
    }
    """
    try:
        data = request.json
        
        if not data or 'query' not in data:
            return jsonify({"status": "error", "message": "Missing 'query' field"}), 400
        
        query_text = data.get('query')
        n_results = data.get('n_results', 5)
        where = data.get('where', None)
        
        if not isinstance(query_text, str) or len(query_text.strip()) == 0:
            return jsonify({"status": "error", "message": "'query' must be a non-empty string"}), 400
        
        result = chroma_service.query_documents(query_text, n_results, where)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@application.route('/api/documents/delete', methods=['DELETE'])
def delete_documents():
    """
    Delete documents from ChromaDB
    Expected JSON format:
    {
        "ids": ["id1", "id2", ...]
    }
    """
    try:
        data = request.json
        
        if not data or 'ids' not in data:
            return jsonify({"status": "error", "message": "Missing 'ids' field"}), 400
        
        ids = data.get('ids')
        
        if not isinstance(ids, list) or len(ids) == 0:
            return jsonify({"status": "error", "message": "'ids' must be a non-empty list"}), 400
        
        result = chroma_service.delete_documents(ids)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@application.route('/api/documents/info', methods=['GET'])
def get_collection_info():
    """
    Get information about the ChromaDB collection
    """
    try:
        result = chroma_service.get_collection_info()
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@application.route('/api/documents/update', methods=['PUT'])
def update_document():
    """
    Update an existing document in ChromaDB
    Expected JSON format:
    {
        "id": "document_id",
        "document": "new text",
        "metadata": {"key": "value"}  // optional
    }
    """
    try:
        data = request.json
        
        if not data or 'id' not in data or 'document' not in data:
            return jsonify({"status": "error", "message": "Missing 'id' or 'document' field"}), 400
        
        document_id = data.get('id')
        document = data.get('document')
        metadata = data.get('metadata', None)
        
        if not isinstance(document_id, str) or len(document_id.strip()) == 0:
            return jsonify({"status": "error", "message": "'id' must be a non-empty string"}), 400
        
        if not isinstance(document, str) or len(document.strip()) == 0:
            return jsonify({"status": "error", "message": "'document' must be a non-empty string"}), 400
        
        result = chroma_service.update_document(document_id, document, metadata)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5001)
