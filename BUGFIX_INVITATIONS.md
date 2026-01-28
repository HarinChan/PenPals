# Bug Fix: Meeting Invitation System - Clear Separation of Sent vs Received

## Issue

When a user scheduled a meeting with another classroom, they were seeing the invitation on their own account and could accept their own invitation. The invitation should only appear in the receiver's account.

## Root Cause

The system was only displaying received invitations, but both sender and receiver perspectives were mixed together. No validation prevented a user from inviting themselves.

## Solution Implemented

### Backend Changes

#### 1. Added Self-Invitation Validation

**File:** `penpals-backend/src/main.py` - POST `/api/webex/meeting` endpoint

- Added check to prevent a classroom from inviting itself
- Returns 400 error: "You cannot invite your own classroom"

#### 2. New Endpoint: GET `/api/webex/invitations/sent`

**File:** `penpals-backend/src/main.py`

- Retrieves all pending invitations **sent** by the current user's classroom
- Returns list with: receiver_name, title, times, status
- Allows users to see outgoing invitations they've initiated

### Frontend Changes

#### 1. Updated State Management

**File:** `penpals-frontend/src/components/SidePanel.tsx`

- Split `pendingInvitations` into:
  - `receivedInvitations`: Invitations the user received
  - `sentInvitations`: Invitations the user sent
- Added corresponding state for panel open/closed state

#### 2. Updated Fetch Logic

**File:** `penpals-frontend/src/components/SidePanel.tsx` - `fetchInvitations()`

- Now fetches **both** received and sent invitations
- Makes two separate API calls (one for each type)
- Updates both state arrays

#### 3. Separate UI Widgets

**File:** `penpals-frontend/src/components/SidePanel.tsx`

**"Invitations Received"** (Green)

- Shows invitations where user is the receiver
- Displays sender name
- Has Accept/Decline buttons
- Shows green badge with count

**"Invitations Sent"** (Amber)

- Shows invitations where user is the sender
- Displays receiver name
- Shows "Pending" badge (read-only)
- No action buttons (awaiting receiver response)

## User Experience Flow

### Scenario: You invite Lee's classroom

**Your Account**

- See "Invitations Sent" widget
- Shows: "Meeting with Lee's Classroom" → "To: Lee's Classroom" → "Pending"
- No action buttons, just informational

**Lee's Account**

- See "Invitations Received" widget
- Shows: "Meeting with Your Classroom" → "From: Your Classroom"
- Has Accept/Decline buttons
- When accepted: Meeting created and appears in "Upcoming Meetings"

## Visual Changes

- **Green indicators**: Invitations received (action needed)
- **Amber indicators**: Invitations sent (awaiting response)
- **Badges show count** of pending invitations of each type
- **Collapsible sections** for each invitation type

## Testing Points

✅ Can't invite your own classroom (error message shown)
✅ Sent invitations only appear in sender's "Invitations Sent"
✅ Received invitations only appear in receiver's "Invitations Received"
✅ Sent invitations show receiver name
✅ Received invitations show sender name
✅ Only receivers can accept/decline
✅ Senders see pending status until receiver responds
✅ Invitations disappear when accepted

## Files Modified

1. `penpals-backend/src/main.py` - Added validation and new endpoint
2. `penpals-frontend/src/components/SidePanel.tsx` - Updated state, fetch logic, and UI

## Error Handling

- Self-invitation attempt: "You cannot invite your own classroom"
- Invalid receiver: "Receiver classroom not found"
- Network errors: Standard error toast messages
