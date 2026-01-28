# WebEx Meeting Invitation System - Implementation Summary

## Overview

Successfully implemented an invitation-based system for scheduling WebEx meetings between classrooms. When a meeting is scheduled, the other classroom receives an invitation that they must accept before the meeting is created on WebEx. The original scheduler remains the meeting creator.

## Changes Made

### Backend Changes

#### 1. Database Model - `models.py`

**File:** [penpals-backend/src/models.py](penpals-backend/src/models.py)

- **Updated `Meeting` model:**
  - Changed `web_link` column from `nullable=False` to `nullable=True` (since it won't exist until invitation is accepted)

- **New `MeetingInvitation` model:**
  - `id` (Primary Key)
  - `sender_profile_id` (ForeignKey to Profile - the classroom initiating the meeting)
  - `receiver_profile_id` (ForeignKey to Profile - the classroom receiving the invitation)
  - `title` (Meeting title)
  - `start_time` (Meeting start time)
  - `end_time` (Meeting end time)
  - `status` (String: pending/accepted/declined)
  - `created_at` (Timestamp)
  - `meeting_id` (ForeignKey to Meeting - links to the created meeting after acceptance)
  - Relationships to Profile (sender, receiver) and Meeting

#### 2. API Endpoints - `main.py`

**File:** [penpals-backend/src/main.py](penpals-backend/src/main.py)

**Modified POST `/api/webex/meeting`**

- **Changed behavior:** No longer creates WebEx meeting immediately
- **New flow:**
  1. Receives meeting request with classroom_id and time details
  2. Creates a `MeetingInvitation` record in database with status 'pending'
  3. Returns invitation details instead of meeting details
  4. No WebEx token check needed at this point

**New GET `/api/webex/invitations`**

- Retrieves all pending invitations for the current user's classroom
- Returns list of pending invitations with:
  - invitation id, title, start_time, end_time
  - sender_name, status, created_at
- Ordered by creation date (most recent first)

**New POST `/api/webex/invitations/<int:invitation_id>/accept`**

- Accepts a pending meeting invitation and creates the actual WebEx meeting
- **Process:**
  1. Validates invitation exists and is pending
  2. Validates invitation is for the current user
  3. Checks sender's WebEx account is connected
  4. Refreshes sender's WebEx token if expired
  5. Creates WebEx meeting using sender's token (sender remains creator)
  6. Creates Meeting record in database with sender as creator_id
  7. Adds accepting classroom as participant
  8. Updates invitation status to 'accepted'
  9. Links invitation to created meeting
- Returns created meeting details with web_link

### Frontend Changes

#### 1. Component Updates - `ClassroomDetailDialog.tsx`

**File:** [penpals-frontend/src/components/ClassroomDetailDialog.tsx](penpals-frontend/src/components/ClassroomDetailDialog.tsx)

**Modified `createMeeting` function:**

- Changed return value from `data.meeting` to `data.invitation`
- Updated to work with invitation response instead of meeting response
- Updated error message context (e.g., "schedule a meeting" instead of "make a call")

**Modified `confirmScheduleCall` function:**

- Updated toast messages:
  - Loading: "Sending meeting invitation..." (instead of "Scheduling meeting...")
  - Success: "Meeting invitation sent to {classroom.name}!" (instead of "Meeting scheduled! Link: ...")
  - Error: "Failed to send meeting invitation" (instead of "Failed to schedule meeting")

#### 2. Side Panel Updates - `SidePanel.tsx`

**File:** [penpals-frontend/src/components/SidePanel.tsx](penpals-frontend/src/components/SidePanel.tsx)

**New State Variables:**

- `pendingInvitationsOpen`: Tracks if invitations panel is expanded
- `pendingInvitations`: Array of pending invitations

**New Functions:**

- `fetchInvitations()`: Fetches pending invitations from backend
- `handleAcceptInvitation(invitationId)`: Accepts an invitation and creates the meeting

**Updated Effects:**

- Modified fetch effect to also fetch invitations every 60 seconds
- Includes error handling for invitation fetching

**New UI Section - "Meeting Invitations":**

- Collapsible widget showing pending invitations
- Blue badge showing count of pending invitations
- Each invitation displays:
  - Title
  - Start time (formatted nicely)
  - Sender name
- Two action buttons per invitation:
  - **Accept**: Green button that accepts the invitation and creates the meeting
  - **Decline**: Outline button (TODO: implement decline functionality)

**Updated Upcoming Meetings:**

- Join button is now disabled and shows disabled styling when web_link is null
- Handles edge case where meeting might not have web_link yet

## User Flow

### Scheduling a Meeting

1. User selects a classroom and clicks "Schedule Call"
2. Selects day and available hours
3. Confirms scheduling
4. Success message: "Meeting invitation sent to {classroom.name}!"
5. Other classroom receives the invitation

### Accepting an Invitation

1. User sees pending invitation in "Meeting Invitations" widget
2. Shows invitation from sender with meeting time
3. Clicks "Accept" button
4. Backend creates WebEx meeting using sender's account
5. Original scheduler is the WebEx meeting creator
6. Accepting classroom is added as participant
7. Success message shows WebEx meeting link
8. Invitation is removed from pending list
9. Meeting appears in "Upcoming Meetings" section

## Key Features

✅ **Invitation-based system**: Meetings don't exist until accepted
✅ **Original creator preserved**: Sender remains meeting creator on WebEx
✅ **Token refresh handling**: Automatically refreshes sender's WebEx token if expired
✅ **Real-time updates**: Invitations refresh every 60 seconds
✅ **User-friendly UI**: Clear distinction between invitations and scheduled meetings
✅ **Error handling**: Comprehensive error messages for all failure scenarios

## Technical Details

- **Database**: Uses SQLAlchemy ORM with proper foreign key relationships
- **API**: RESTful endpoints following existing patterns
- **Frontend**: React components with Sonner toast notifications
- **Token management**: Handles WebEx OAuth token refresh automatically
- **Status tracking**: Invitations have explicit status (pending/accepted/declined)

## Future Enhancements

- Implement decline functionality for invitations
- Add expiration time for pending invitations
- Send notifications when invitation is received
- Add invitation history/archive
- Implement recurring meetings with invitations

## Testing Checklist

- [ ] Schedule meeting creates invitation (not WebEx meeting)
- [ ] Invitation appears in receiver's "Meeting Invitations" widget
- [ ] Accepting invitation creates WebEx meeting
- [ ] Original scheduler is creator on WebEx
- [ ] Accepting classroom is added as participant
- [ ] WebEx meeting link is shown after acceptance
- [ ] Invitation is removed from pending list after acceptance
- [ ] Token refresh works if sender's token is expired
- [ ] Error handling for missing WebEx connection
