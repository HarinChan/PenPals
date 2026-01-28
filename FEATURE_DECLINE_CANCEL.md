# Feature: Decline & Cancel Meeting Invitations

## Overview

Added the ability to decline received meeting invitations and cancel sent invitations. Users can now manage invitation lifecycle with full control.

## Backend Changes

### New Endpoints

#### 1. POST `/api/webex/invitations/<invitation_id>/decline`

- **Purpose**: Decline a received meeting invitation
- **Authorization**: JWT required
- **Who can use**: Only the receiver of the invitation
- **Validation**:
  - Invitation must exist
  - Invitation must be for the current user
  - Invitation status must be 'pending'
- **Response**: 200 OK with success message
- **Status Update**: Sets invitation status to 'declined'

#### 2. POST `/api/webex/invitations/<invitation_id>/cancel`

- **Purpose**: Cancel a sent meeting invitation
- **Authorization**: JWT required
- **Who can use**: Only the sender of the invitation
- **Validation**:
  - Invitation must exist
  - Invitation must be sent by the current user
  - Invitation status must be 'pending'
- **Response**: 200 OK with success message
- **Status Update**: Sets invitation status to 'cancelled'

### Updated Endpoints

#### GET `/api/webex/invitations`

- **Changed**: Now returns all invitations (not just pending)
- **Ordering**: Pending invitations first, then sorted by creation date
- **Includes**: status field showing 'pending', 'accepted', or 'declined'

#### GET `/api/webex/invitations/sent`

- **Changed**: Now returns all sent invitations (not just pending)
- **Ordering**: Pending invitations first, then sorted by creation date
- **Includes**: status field showing 'pending', 'accepted', or 'cancelled'

## Frontend Changes

### New Event Handlers

#### `handleDeclineInvitation(invitationId)`

- Calls POST `/api/webex/invitations/{id}/decline`
- Shows success toast on completion
- Refreshes invitation lists
- Shows error toast on failure

#### `handleCancelInvitation(invitationId)`

- Calls POST `/api/webex/invitations/{id}/cancel`
- Shows success toast on completion
- Refreshes invitation lists
- Shows error toast on failure

### UI Updates

#### "Invitations Received" Section

- **New**: Shows invitation status (pending/accepted/declined)
- **New**: Displays declined invitations with muted styling
- **Enhanced**: Decline button now fully functional (was "coming soon")
- **Behavior**:
  - Pending invitations show Accept/Decline buttons
  - Declined/accepted invitations show status badge only

#### "Invitations Sent" Section

- **New**: Shows invitation status (pending/accepted/cancelled)
- **New**: Displays cancelled invitations with muted styling
- **New**: Cancel button for pending invitations
- **Styling**: Red/outline button to indicate cancellation action
- **Behavior**:
  - Pending invitations show Cancel button
  - Cancelled/accepted invitations show status badge only

### Status Visualization

**Received Invitations**:

- Green background for pending (awaiting action)
- Gray background for decided (declined/accepted)
- Status badge shows capitalized status

**Sent Invitations**:

- Amber background for pending (awaiting response)
- Gray background for completed (cancelled/accepted)
- Status badge shows capitalized status

## Invitation Status Lifecycle

### Received Invitations

```
pending ──Accept──> accepted
   ↓
  Decline
   ↓
 declined
```

### Sent Invitations

```
pending ──Receiver Accepts──> accepted
   ↓
  Cancel
   ↓
 cancelled
```

## Error Handling

### Decline Invitation Errors

- "Invitation not found" (404)
- "This invitation is not for you" (403)
- "Invitation is already {status}" (400)

### Cancel Invitation Errors

- "Invitation not found" (404)
- "You can only cancel invitations you sent" (403)
- "Cannot cancel {status} invitation" (400)

## User Experience

### Declining an Invitation

1. User sees pending invitation in "Invitations Received"
2. Clicks "Decline" button
3. Toast shows "Invitation declined"
4. Invitation moves to history with "declined" status badge

### Cancelling an Invitation

1. User sees pending invitation in "Invitations Sent"
2. Clicks red "Cancel" button
3. Toast shows "Invitation cancelled"
4. Invitation moves to history with "cancelled" status badge

## Testing Points

✅ Decline a pending received invitation
✅ Declined invitation shows "declined" status
✅ Can't decline non-pending invitations
✅ Can't decline invitations not for you
✅ Cancel a pending sent invitation
✅ Cancelled invitation shows "cancelled" status
✅ Can't cancel non-pending invitations
✅ Can't cancel invitations you didn't send
✅ Declined/cancelled invitations appear in history
✅ Appropriate error messages shown for all failure cases

## Files Modified

1. **Backend**: `penpals-backend/src/main.py`
   - Added `/decline` endpoint
   - Added `/cancel` endpoint
   - Updated GET endpoints to show all invitations

2. **Frontend**: `penpals-frontend/src/components/SidePanel.tsx`
   - Added `handleDeclineInvitation()` handler
   - Added `handleCancelInvitation()` handler
   - Updated received invitations UI with working Decline button
   - Updated sent invitations UI with Cancel button
   - Added status badge display for all invitation states

## Future Enhancements

- Add confirmation dialog before declining/cancelling
- Show reason for decline (optional)
- Resend invitation after decline
- Invitation expiration (auto-decline after X days)
- Bulk decline/cancel operations
