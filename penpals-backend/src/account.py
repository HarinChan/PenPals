"""
Account management endpoints for teacher accounts.
Handles account CRUD operations, password updates, and multi-classroom management.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from models import db, Account, Profile

account_bp = Blueprint('account', __name__)

@account_bp.route('/api/account', methods=['GET'])
@jwt_required()
def get_account():
    """Get current account details with all classrooms"""
    account_id = get_jwt_identity()
    account = Account.query.get(account_id)
    
    if not account:
        return jsonify({"msg": "Account not found"}), 404
    
    classrooms = []
    for classroom in account.classrooms:
        classrooms.append({
            "id": classroom.id,
            "name": classroom.name,
            "location": classroom.location,
            "latitude": classroom.lattitude,
            "longitude": classroom.longitude,
            "class_size": classroom.class_size,
            "availability": classroom.availability,
            "interests": classroom.interests
        })
    
    return jsonify({
        "account": {
            "id": account.id,
            "email": account.email,
            "organization": account.organization,
            "created_at": account.created_at.isoformat()
        },
        "classrooms": classrooms
    }), 200


@account_bp.route('/api/account', methods=['PUT'])
@jwt_required()
def update_account():
    """Update account information"""
    account_id = get_jwt_identity()
    account = Account.query.get(account_id)
    
    if not account:
        return jsonify({"msg": "Account not found"}), 404
    
    data = request.json
    
    if 'email' in data:
        # Check if email is already taken by another account
        existing = Account.query.filter_by(email=data['email']).first()
        if existing and existing.id != account.id:
            return jsonify({"msg": "Email already in use"}), 409
        account.email = data['email']
    
    if 'organization' in data:
        account.organization = data['organization']
    
    if 'password' in data:
        password = data['password']
        capital_letters = [chr(i) for i in range(ord('A'), ord('Z')+1)]
        lowercase_letters = [chr(i) for i in range(ord('a'), ord('z')+1)]
        digits = [str(i) for i in range(10)]
        
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
        
        account.password_hash = generate_password_hash(password)
    
    db.session.commit()
    
    return jsonify({"msg": "Account updated successfully"}), 200


@account_bp.route('/api/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Delete account and all associated classrooms"""
    account_id = get_jwt_identity()
    account = Account.query.get(account_id)
    
    if not account:
        return jsonify({"msg": "Account not found"}), 404
    
    db.session.delete(account)
    db.session.commit()
    
    return jsonify({"msg": "Account deleted successfully"}), 200


@account_bp.route('/api/account/classrooms', methods=['GET'])
@jwt_required()
def get_account_classrooms():
    """Get all classrooms for the current account"""
    account_id = get_jwt_identity()
    account = Account.query.get(account_id)
    
    if not account:
        return jsonify({"msg": "Account not found"}), 404
    
    classrooms = []
    for classroom in account.classrooms:
        friends_count = classroom.sent_relations.count()
        
        classrooms.append({
            "id": classroom.id,
            "name": classroom.name,
            "location": classroom.location,
            "latitude": classroom.lattitude,
            "longitude": classroom.longitude,
            "class_size": classroom.class_size,
            "availability": classroom.availability,
            "interests": classroom.interests,
            "friends_count": friends_count
        })
    
    return jsonify({"classrooms": classrooms}), 200