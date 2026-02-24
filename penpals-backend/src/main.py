"""
Main Flask application for PenPals backend.
Handles authentication, basic profile operations, and ChromaDB document management.
Account and classroom management is handled by separate blueprints.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta, datetime
import os
import bcrypt
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BACKEND_ROOT / '.env')
load_dotenv(dotenv_path=SRC_ROOT / '.env')

from sqlalchemy import desc
from models import db, Account, Profile, Relation, Post, Meeting, FriendRequest, Notification, RecentCall, MeetingInvitation
from webex_service import WebexService

from account import account_bp
from classroom import classroom_bp

MEETING_MIN_DURATION_MINUTES = 15
MEETING_MAX_DURATION_MINUTES = 60
MEETING_MAX_ADVANCE_DAYS = 14


def validate_meeting_schedule(start_time: datetime, end_time: datetime):
    if end_time <= start_time:
        return "end_time must be after start_time"

    duration_minutes = (end_time - start_time).total_seconds() / 60
    if duration_minutes < MEETING_MIN_DURATION_MINUTES or duration_minutes > MEETING_MAX_DURATION_MINUTES:
        return f"Meeting duration must be between {MEETING_MIN_DURATION_MINUTES} and {MEETING_MAX_DURATION_MINUTES} minutes"

    max_allowed_start = datetime.utcnow() + timedelta(days=MEETING_MAX_ADVANCE_DAYS)
    if start_time > max_allowed_start:
        return f"Meetings can be scheduled up to {MEETING_MAX_ADVANCE_DAYS} days in advance"

    return None

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

default_db_uri = f"sqlite:///{(BACKEND_ROOT / 'penpals_db' / 'penpals.db').resolve()}"
db_uri = os.getenv('SQLALCHEMY_DATABASE_URI', default_db_uri)
if db_uri.startswith('sqlite:///'):
    sqlite_path = db_uri.replace('sqlite:///', '', 1)
    if sqlite_path != ':memory:':
        abs_path = Path(sqlite_path) if sqlite_path.startswith('/') else (BACKEND_ROOT / sqlite_path)
        abs_path = abs_path.resolve()
        abs_path.parent.mkdir(parents=True, exist_ok=True)
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
    
    # Check if account exists
    if Account.query.filter_by(email=email).first():
        return jsonify({"msg": "Account already exists"}), 409

    # Password is a client-side SHA-256 hash; bcrypt it for storage
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(10)).decode()
    
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
    
    # Password is a client-side SHA-256 hash; bcrypt it and compare
    if not account or not bcrypt.checkpw(password.encode(), account.password_hash.encode()):
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
    """Get current authenticated user's info, including classrooms and friends"""
    account_id = get_jwt_identity()
    account = Account.query.get(account_id)
    
    if not account:
        return jsonify({"msg": "Account not found"}), 404
    
    # Get all classrooms for this account with friend data
    classrooms = []
    
    # Collect notifications
    notifications = []
    for notif in account.notifications.order_by(desc(Notification.created_at)).all():
        notifications.append({
            "id": str(notif.id),
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "read": notif.read,
            "timestamp": notif.created_at.isoformat()
        })

    for classroom in account.classrooms:
        # Fetch friends (relations)
        # We look for accepted relations where this classroom is either sender or receiver
        friends = []
        
        # Sent accepted requests (my friends)
        sent_relations = Relation.query.filter_by(from_profile_id=classroom.id, status='accepted').all()
        for rel in sent_relations:
            friend_profile = Profile.query.get(rel.to_profile_id)
            if friend_profile:
                friends.append({
                    "id": str(friend_profile.id),
                    "classroomId": str(friend_profile.id),
                    "classroomName": friend_profile.name,
                    "location": friend_profile.location,
                    "addedDate": rel.created_at.isoformat() if rel.created_at else None,
                    "friendshipStatus": "accepted"
                })
        
        # Received accepted requests (also my friends)
        received_relations = Relation.query.filter_by(to_profile_id=classroom.id, status='accepted').all()
        for rel in received_relations:
            friend_profile = Profile.query.get(rel.from_profile_id)
            if friend_profile:
                friends.append({
                    "id": str(friend_profile.id),
                    "classroomId": str(friend_profile.id),
                    "classroomName": friend_profile.name,
                    "location": friend_profile.location,
                    "addedDate": rel.created_at.isoformat() if rel.created_at else None,
                    "friendshipStatus": "accepted"
                })
        
        # Received Pending Friend Requests
        received_friend_requests = []
        for req in classroom.received_requests:
            if req.status == 'pending':
                received_friend_requests.append({
                    "id": str(req.id),
                    "senderId": str(req.sender.id),
                    "senderName": req.sender.name,
                    "location": req.sender.location,
                    "sentDate": req.created_at.isoformat()
                })

        # Recent Calls
        recent_calls = []
        # Calls made by this classroom
        for call in classroom.call_history:
            recent_calls.append({
                "id": str(call.id),
                "classroomId": call.target_classroom_id,
                "classroomName": call.target_classroom_name,
                "timestamp": call.timestamp.isoformat(),
                "duration": call.duration_seconds,
                "type": call.call_type
            })

        classrooms.append({
            "id": classroom.id,
            "name": classroom.name,
            "location": classroom.location,
            "latitude": classroom.lattitude,
            "longitude": classroom.longitude,
            "class_size": classroom.class_size,
            "interests": classroom.interests,
            "availability": classroom.availability, 
            "friends": friends,
            "receivedFriendRequests": received_friend_requests,
            "recent_calls": recent_calls
        })
    
    return jsonify({
        "account": {
            "id": account.id,
            "email": account.email,
            "organization": account.organization,
            "notifications": notifications,
            "friends": classrooms[0]["friends"] if classrooms else [], # flatten for convenience if needed by frontend
            "recentCalls": classrooms[0]["recent_calls"] if classrooms else [] # flatten
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
    
    if not classroom_id:
        return jsonify({"msg": "classroom_id is required"}), 400
    
    # Check if it's a dummy classroom ID (for development/testing)
    if isinstance(classroom_id, str) and classroom_id.startswith('dummy_'):
        return jsonify({"msg": "Cannot invite dummy classrooms. Please use real classrooms from your network."}), 400
    
    # Convert to int if it's a numeric string
    try:
        classroom_id = int(classroom_id)
    except (ValueError, TypeError):
        return jsonify({"msg": "Invalid classroom_id format"}), 400
    
    receiver_profile = Profile.query.get(classroom_id)
    if not receiver_profile:
        return jsonify({"msg": "Receiver classroom not found"}), 404
    
    # Prevent inviting yourself
    if creator_profile.id == receiver_profile.id:
        return jsonify({"msg": "You cannot invite your own classroom"}), 400
    
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

    schedule_error = validate_meeting_schedule(start_time, end_time)
    if schedule_error:
        return jsonify({"msg": schedule_error}), 400

    # Create invitation instead of meeting
    new_invitation = MeetingInvitation(
        sender_profile_id=creator_profile.id,
        receiver_profile_id=receiver_profile.id,
        title=title,
        start_time=start_time,
        end_time=end_time,
        status='pending'
    )
    
    db.session.add(new_invitation)
    db.session.commit()
    
    return jsonify({
        "msg": "Meeting invitation sent successfully",
        "invitation": {
            "id": new_invitation.id,
            "title": new_invitation.title,
            "start_time": new_invitation.start_time.isoformat(),
            "end_time": new_invitation.end_time.isoformat(),
            "status": new_invitation.status
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

    # Relaxed WebEx check: Only strict for modifying/deleting. GET is allowed for participants without WebEx.
    
    # Refresh token logic (only if connected)
    if account.webex_access_token and account.webex_token_expires_at and account.webex_token_expires_at < datetime.utcnow():
        try:
             token_data = webex_service.refresh_access_token(account.webex_refresh_token)
             account.webex_access_token = token_data.get('access_token')
             account.webex_refresh_token = token_data.get('refresh_token', account.webex_refresh_token)
             expires_in = token_data.get('expires_in')
             if expires_in:
                 account.webex_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
             db.session.commit()
        except Exception as e:
            # If refresh fails, we might still allow GET if it doesn't need fresh WebEx access
            print(f"Failed to refresh WebEx session: {e}")
            # If we were strictly needing it, we'd fail later or in specific methods.


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
            
        if not account.webex_access_token:
             return jsonify({"msg": "WebEx not connected. Cannot delete meeting."}), 403
            
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
            
        if not account.webex_access_token:
             return jsonify({"msg": "WebEx not connected. Cannot update meeting."}), 403
            
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

            schedule_error = validate_meeting_schedule(meeting.start_time, meeting.end_time)
            if schedule_error:
                return jsonify({"msg": schedule_error}), 400
                
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


@application.route('/api/webex/invitations', methods=['GET'])
@jwt_required()
def get_pending_invitations():
    """Get invitations received by the current user's classroom"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
    
    receiver_profile = account.classrooms.first()
    if not receiver_profile:
        return jsonify({"msg": "No profile found for account"}), 400
    
    # Get only pending invitations (accepted ones are already shown in meetings)
    invitations = MeetingInvitation.query.filter_by(
        receiver_profile_id=receiver_profile.id,
        status='pending'
    ).order_by(MeetingInvitation.created_at.desc()).all()
    
    result = []
    for inv in invitations:
        result.append({
            "id": inv.id,
            "title": inv.title,
            "start_time": inv.start_time.isoformat(),
            "end_time": inv.end_time.isoformat(),
            "sender_name": inv.sender.name,
            "status": inv.status,
            "created_at": inv.created_at.isoformat()
        })
    
    return jsonify({"invitations": result}), 200


@application.route('/api/webex/invitations/sent', methods=['GET'])
@jwt_required()
def get_sent_invitations():
    """Get invitations sent by the current user's classroom"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
    
    sender_profile = account.classrooms.first()
    if not sender_profile:
        return jsonify({"msg": "No profile found for account"}), 400
    
    # Get only pending invitations (accepted ones are already shown in meetings)
    invitations = MeetingInvitation.query.filter_by(
        sender_profile_id=sender_profile.id,
        status='pending'
    ).order_by(MeetingInvitation.created_at.desc()).all()
    
    result = []
    for inv in invitations:
        result.append({
            "id": inv.id,
            "title": inv.title,
            "start_time": inv.start_time.isoformat(),
            "end_time": inv.end_time.isoformat(),
            "receiver_name": inv.receiver.name,
            "status": inv.status,
            "created_at": inv.created_at.isoformat()
        })
    
    return jsonify({"sent_invitations": result}), 200


@application.route('/api/webex/invitations/<int:invitation_id>/accept', methods=['POST'])
@jwt_required()
def accept_invitation(invitation_id):
    """Accept a meeting invitation and create the WebEx meeting"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
    
    receiver_profile = account.classrooms.first()
    if not receiver_profile:
        return jsonify({"msg": "No profile found for account"}), 400
    
    invitation = MeetingInvitation.query.get(invitation_id)
    if not invitation:
        return jsonify({"msg": "Invitation not found"}), 404
    
    # Verify the invitation is for this user
    if invitation.receiver_profile_id != receiver_profile.id:
        return jsonify({"msg": "This invitation is not for you"}), 403
    
    if invitation.status != 'pending':
        return jsonify({"msg": f"Invitation is already {invitation.status}"}), 400
    
    # Check if the sender has WebEx connected
    sender_account = invitation.sender.account
    if not sender_account.webex_access_token:
        return jsonify({"msg": "The meeting organizer's WebEx account is not connected"}), 403
    
    # Refresh WebEx token if expired
    if sender_account.webex_token_expires_at and sender_account.webex_token_expires_at < datetime.utcnow():
        try:
            token_data = webex_service.refresh_access_token(sender_account.webex_refresh_token)
            sender_account.webex_access_token = token_data.get('access_token')
            sender_account.webex_refresh_token = token_data.get('refresh_token', sender_account.webex_refresh_token)
            expires_in = token_data.get('expires_in')
            if expires_in:
                sender_account.webex_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            db.session.commit()
        except Exception as e:
            return jsonify({"msg": "Failed to refresh organizer's WebEx session. Please try again later."}), 403
    
    # Create meeting via WebEx using the sender's token
    try:
        webex_meeting = webex_service.create_meeting(
            sender_account.webex_access_token,
            invitation.title,
            invitation.start_time,
            invitation.end_time
        )
    except Exception as e:
        return jsonify({"msg": f"Failed to create WebEx meeting: {str(e)}"}), 500
    
    # Create meeting in database with sender as creator
    new_meeting = Meeting(
        webex_id=webex_meeting.get('id'),
        title=webex_meeting.get('title', invitation.title),
        start_time=invitation.start_time,
        end_time=invitation.end_time,
        web_link=webex_meeting.get('webLink'),
        password=webex_meeting.get('password'),
        creator_id=invitation.sender_profile_id
    )
    
    # Add the accepting classroom as a participant
    new_meeting.participants.append(receiver_profile)
    
    db.session.add(new_meeting)
    
    # Update invitation status
    invitation.status = 'accepted'
    invitation.meeting_id = new_meeting.id
    
    db.session.commit()
    
    return jsonify({
        "msg": "Invitation accepted. Meeting created successfully!",
        "meeting": {
            "id": new_meeting.id,
            "title": new_meeting.title,
            "web_link": new_meeting.web_link,
            "start_time": new_meeting.start_time.isoformat(),
            "end_time": new_meeting.end_time.isoformat(),
            "password": new_meeting.password
        }
    }), 201


@application.route('/api/webex/invitations/<int:invitation_id>/decline', methods=['POST'])
@jwt_required()
def decline_invitation(invitation_id):
    """Decline a meeting invitation"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
    
    receiver_profile = account.classrooms.first()
    if not receiver_profile:
        return jsonify({"msg": "No profile found for account"}), 400
    
    invitation = MeetingInvitation.query.get(invitation_id)
    if not invitation:
        return jsonify({"msg": "Invitation not found"}), 404
    
    # Verify the invitation is for this user
    if invitation.receiver_profile_id != receiver_profile.id:
        return jsonify({"msg": "This invitation is not for you"}), 403
    
    if invitation.status != 'pending':
        return jsonify({"msg": f"Invitation is already {invitation.status}"}), 400
    
    # Update invitation status to declined
    invitation.status = 'declined'
    db.session.commit()
    
    return jsonify({
        "msg": "Invitation declined successfully"
    }), 200


@application.route('/api/webex/invitations/<int:invitation_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_invitation(invitation_id):
    """Cancel a sent meeting invitation (only sender can cancel)"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
    
    sender_profile = account.classrooms.first()
    if not sender_profile:
        return jsonify({"msg": "No profile found for account"}), 400
    
    invitation = MeetingInvitation.query.get(invitation_id)
    if not invitation:
        return jsonify({"msg": "Invitation not found"}), 404
    
    # Verify the invitation was sent by this user
    if invitation.sender_profile_id != sender_profile.id:
        return jsonify({"msg": "You can only cancel invitations you sent"}), 403
    
    if invitation.status != 'pending':
        return jsonify({"msg": f"Cannot cancel {invitation.status} invitation"}), 400
    
    # Update invitation status to cancelled
    invitation.status = 'cancelled'
    db.session.commit()
    
    return jsonify({
        "msg": "Invitation cancelled successfully"
    }), 200


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


@application.route('/api/posts', methods=['GET'])
@jwt_required(optional=True)
def get_posts():
    """Get all posts, ordered by newest"""
    current_user_id = get_jwt_identity()
    current_account = None
    if current_user_id:
        current_account = Account.query.get(current_user_id)
        
    posts = Post.query.order_by(desc(Post.created_at)).all()
    
    result = []
    for post in posts:
        is_liked = False
        if current_account and current_account in post.liked_by:
            is_liked = True
            
        post_data = {
            "id": str(post.id),
            "authorId": str(post.profile_id),
            "authorName": post.profile.name,
            "content": post.content,
            "imageUrl": post.image_url,
            "timestamp": post.created_at.isoformat(),
            "likes": post.likes,
            "comments": post.comments_count,
            "isLiked": is_liked
        }
        
        # Include quoted post if it exists
        if post.quoted_post:
            post_data["quotedPost"] = {
                "id": str(post.quoted_post.id),
                "authorName": post.quoted_post.profile.name,
                "content": post.quoted_post.content,
                "imageUrl": post.quoted_post.image_url
            }
            
        result.append(post_data)
        
    return jsonify({"posts": result}), 200


@application.route('/api/posts', methods=['POST'])
@jwt_required()
def create_post():
    """Create a new post"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    if not account:
        return jsonify({"msg": "User not found"}), 404
        
    # Use the first profile for posting (simplification)
    profile = account.classrooms.first()
    if not profile:
        return jsonify({"msg": "Profile not found. Create a profile first."}), 400
        
    data = request.json
    content = data.get('content')
    image_url = data.get('imageUrl')
    quoted_post_id = data.get('quotedPostId')
    
    if not content:
        return jsonify({"msg": "Content is required"}), 400
        
    post = Post(
        profile_id=profile.id, 
        content=content,
        image_url=image_url,
        quoted_post_id=quoted_post_id
    )
    
    db.session.add(post)
    db.session.commit()
    
    # Return the created post in the format frontend expects
    response_data = {
        "id": str(post.id),
        "authorId": str(profile.id),
        "authorName": profile.name,
        "content": post.content,
        "imageUrl": post.image_url,
        "timestamp": post.created_at.isoformat(),
        "likes": post.likes,
        "comments": post.comments_count
    }
    
    if post.quoted_post:
        response_data["quotedPost"] = {
            "id": str(post.quoted_post.id),
            "authorName": post.quoted_post.profile.name,
            "content": post.quoted_post.content,
            "imageUrl": post.quoted_post.image_url
        }
    
    return jsonify({
        "msg": "Post created successfully",
        "post": response_data
    }), 201


@application.route('/api/posts/<int:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    """Like a post"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    if not account:
        return jsonify({"msg": "User not found"}), 404

    post = Post.query.get(post_id)
    if not post:
        return jsonify({"msg": "Post not found"}), 404
        
    # Check if already liked
    if account in post.liked_by:
        return jsonify({"msg": "Already liked", "likes": post.likes}), 200
        
    post.liked_by.append(account)
    post.likes += 1
    db.session.commit()
    
    return jsonify({"msg": "Post liked", "likes": post.likes}), 200


@application.route('/api/posts/<int:post_id>/unlike', methods=['POST'])
@jwt_required()
def unlike_post(post_id):
    """Unlike a post"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    if not account:
        return jsonify({"msg": "User not found"}), 404

    post = Post.query.get(post_id)
    if not post:
        return jsonify({"msg": "Post not found"}), 404
        
    # Check if liked
    if account not in post.liked_by:
        return jsonify({"msg": "Not liked yet", "likes": post.likes}), 200
        
    post.liked_by.remove(account)
    if post.likes > 0:
        post.likes -= 1
    db.session.commit()
    
    return jsonify({"msg": "Post unliked", "likes": post.likes}), 200


@application.route('/api/classrooms', methods=['GET'])
def get_classrooms():
    """Get all classrooms (profiles with locations)"""
    # Filter only profiles that have geospatial data to be safe, or just return all
    profiles = Profile.query.filter(Profile.lattitude.isnot(None), Profile.longitude.isnot(None)).all()
    
    result = []
    for p in profiles:
        availability = p.availability if p.availability else {}
        interests = p.interests if p.interests else []
        
        try:
            lat = float(p.lattitude)
            lon = float(p.longitude)
        except (ValueError, TypeError):
             continue # Skip invalid coordinates

        result.append({
            "id": str(p.id),
            "name": p.name,
            "location": p.location,
            "lat": lat,
            "lon": lon,
            "interests": interests,
            "availability": availability,
            "size": p.class_size
        })
        
    return jsonify({"classrooms": result}), 200



@application.route('/api/friends/request', methods=['POST'])
@jwt_required()
def send_friend_request():
    """Send a friend request to another classroom"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    if not account:
        return jsonify({"msg": "User not found"}), 404

    sender_profile = account.classrooms.first()
    if not sender_profile:
        return jsonify({"msg": "Profile not found"}), 404

    data = request.json
    target_classroom_id = data.get('classroomId')
    
    if not target_classroom_id:
        return jsonify({"msg": "Target classroom ID is required"}), 400

    target_profile = Profile.query.get(target_classroom_id)
    if not target_profile:
        return jsonify({"msg": "Target classroom not found"}), 404
        
    if sender_profile.id == target_profile.id:
        return jsonify({"msg": "Cannot add yourself as a friend"}), 400

    # Check if already friends
    existing_relation = Relation.query.filter(
        ((Relation.from_profile_id == sender_profile.id) & (Relation.to_profile_id == target_profile.id)) |
        ((Relation.from_profile_id == target_profile.id) & (Relation.to_profile_id == sender_profile.id))
    ).first()
    
    if existing_relation:
        return jsonify({"msg": "Already friends"}), 400

    # Check if request already exists
    existing_request = FriendRequest.query.filter_by(
        sender_profile_id=sender_profile.id,
        receiver_profile_id=target_profile.id,
        status='pending'
    ).first()
    
    if existing_request:
        return jsonify({"msg": "Friend request already sent"}), 400
        
    # Check if they sent us a request (if so, auto-accept?)
    reverse_request = FriendRequest.query.filter_by(
        sender_profile_id=target_profile.id,
        receiver_profile_id=sender_profile.id,
        status='pending'
    ).first()
    
    if reverse_request:
        # Auto-accept since both want to be friends
        reverse_request.status = 'accepted'
        
        # Create relations (two-way)
        rel1 = Relation(from_profile_id=target_profile.id, to_profile_id=sender_profile.id)
        rel2 = Relation(from_profile_id=sender_profile.id, to_profile_id=target_profile.id)
        
        # Notify original sender (who is now becoming a friend)
        notif = Notification(
            account_id=target_profile.account_id,
            title="Friend Request Accepted",
            message=f"{sender_profile.name} accepted your friend request!",
            type="success",
            related_id=str(sender_profile.id)
        )
        
        db.session.add_all([rel1, rel2, notif])
        db.session.commit()
        
        return jsonify({"msg": "Friend request accepted (mutual)", "status": "accepted"}), 200

    # Create new request
    new_request = FriendRequest(
        sender_profile_id=sender_profile.id,
        receiver_profile_id=target_profile.id,
        status='pending'
    )
    
    # Notify receiver
    notif = Notification(
        account_id=target_profile.account_id,
        title="New Friend Request",
        message=f"{sender_profile.name} sent you a friend request!",
        type="friend_request_received",
        related_id=str(sender_profile.id)
    )
    
    db.session.add_all([new_request, notif])
    db.session.commit()
    
    return jsonify({"msg": "Friend request sent", "status": "pending"}), 201


@application.route('/api/friends/accept', methods=['POST'])
@jwt_required()
def accept_friend_request():
    """Accept a pending friend request"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    if not account:
        return jsonify({"msg": "User not found"}), 404

    receiver_profile = account.classrooms.first()
    if not receiver_profile:
        return jsonify({"msg": "Profile not found"}), 404

    data = request.json
    request_id = data.get('requestId')
    sender_profile_id = data.get('senderId') # Optional, if request_id not provided
    
    friend_request = None
    if request_id:
        friend_request = FriendRequest.query.get(request_id)
    elif sender_profile_id:
         friend_request = FriendRequest.query.filter_by(
            sender_profile_id=sender_profile_id,
            receiver_profile_id=receiver_profile.id,
            status='pending'
        ).first()
        
    if not friend_request:
        return jsonify({"msg": "Friend request not found"}), 404
        
    if friend_request.receiver_profile_id != receiver_profile.id:
        return jsonify({"msg": "Unauthorized"}), 403
        
    friend_request.status = 'accepted'
    
    # Create two-way relation
    rel1 = Relation(from_profile_id=friend_request.sender_profile_id, to_profile_id=friend_request.receiver_profile_id)
    rel2 = Relation(from_profile_id=friend_request.receiver_profile_id, to_profile_id=friend_request.sender_profile_id)
    
    # Notify sender
    notif = Notification(
        account_id=friend_request.sender.account_id,
        title="Friend Request Accepted",
        message=f"{receiver_profile.name} accepted your friend request!",
        type="friend_request_accepted",
        related_id=str(receiver_profile.id)
    )
    
    db.session.add_all([rel1, rel2, notif])
    db.session.commit()
    
    return jsonify({"msg": "Friend request accepted"}), 200


@application.route('/api/friends/reject', methods=['POST'])
@jwt_required()
def reject_friend_request():
    """Reject a pending friend request"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    if not account:
        return jsonify({"msg": "User not found"}), 404

    receiver_profile = account.classrooms.first()
    data = request.json
    request_id = data.get('requestId')
    sender_profile_id = data.get('senderId')
    
    friend_request = None
    if request_id:
        friend_request = FriendRequest.query.get(request_id)
    elif sender_profile_id:
         friend_request = FriendRequest.query.filter_by(
            sender_profile_id=sender_profile_id,
            receiver_profile_id=receiver_profile.id,
            status='pending'
        ).first()
        
    if not friend_request:
        return jsonify({"msg": "Friend request not found"}), 404
        
    if friend_request.receiver_profile_id != receiver_profile.id:
        return jsonify({"msg": "Unauthorized"}), 403
        
    friend_request.status = 'rejected'
    db.session.commit()
    
    return jsonify({"msg": "Friend request rejected"}), 200
    

@application.route('/api/friends/<string:friend_id>', methods=['DELETE'])
@jwt_required()
def remove_friend(friend_id):
    """Remove a friend connection"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    if not account:
        return jsonify({"msg": "User not found"}), 404

    my_profile = account.classrooms.first()
    
    # Check both directions
    relations_to_delete = Relation.query.filter(
        ((Relation.from_profile_id == my_profile.id) & (Relation.to_profile_id == friend_id)) |
        ((Relation.from_profile_id == friend_id) & (Relation.to_profile_id == my_profile.id))
    ).all()
    
    if not relations_to_delete:
        return jsonify({"msg": "Friendship not found"}), 404
        
    for rel in relations_to_delete:
        db.session.delete(rel)
        
    db.session.commit()
    
    return jsonify({"msg": "Friend removed"}), 200


@application.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    notif = Notification.query.get(notification_id)
    if not notif or not account or notif.account_id != account.id:
        return jsonify({"msg": "Notification not found"}), 404
        
    notif.read = True
    db.session.commit()
    return jsonify({"msg": "Marked as read"}), 200


@application.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """Delete a notification"""
    current_user_id = get_jwt_identity()
    account = Account.query.get(current_user_id)
    
    notif = Notification.query.get(notification_id)
    if not notif or not account or notif.account_id != account.id:
        return jsonify({"msg": "Notification not found"}), 404
        
    # We can either soft delete or hard delete. Hard delete for now.
    db.session.delete(notif)
    db.session.commit()
    return jsonify({"msg": "Deleted"}), 200


# Migration endpoint - convert old meetings to invitations
@application.route('/api/admin/migrate-meetings', methods=['POST'])
def migrate_meetings_to_invitations():
    """
    ADMIN ONLY: Migrate old Meeting records to MeetingInvitation records.
    This is needed for meetings created before the invitation system existed.
    """
    try:
        migration_count = 0
        
        # Find all meetings that don't have a corresponding invitation yet
        meetings_without_invitations = db.session.query(Meeting).outerjoin(
            MeetingInvitation, Meeting.id == MeetingInvitation.meeting_id
        ).filter(MeetingInvitation.id == None).all()
        
        for meeting in meetings_without_invitations:
            # Skip if meeting has no creator or participants
            if not meeting.creator or len(meeting.participants) == 0:
                continue
            
            # Find receiver (a participant who is not the creator)
            receiver = None
            for participant in meeting.participants:
                if participant.id != meeting.creator_id:
                    receiver = participant
                    break
            
            if not receiver:
                continue
            
            # Create invitation for this meeting
            invitation = MeetingInvitation(
                sender_profile_id=meeting.creator_id,
                receiver_profile_id=receiver.id,
                title=meeting.title,
                start_time=meeting.start_time,
                end_time=meeting.end_time,
                status='pending',
                meeting_id=meeting.id
            )
            
            db.session.add(invitation)
            migration_count += 1
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": f"Migrated {migration_count} old meetings to invitations"
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": f"Migration failed: {str(e)}"
        }), 500


if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5001, debug=True)
