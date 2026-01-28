# Investigation & Fix: Lee's Classroom Mapping Issue

## Problem Identified

When trying to schedule a meeting with Lee's classroom, the system was incorrectly mapping it to the user's own classroom instead. This happened because:

1. **Hardcoded Frontend IDs vs Database IDs Conflict**
   - The MapView component had hardcoded dummy classrooms with simple numeric IDs: `1, 2, 3, ...`
   - The actual user classrooms in the database also had numeric IDs generated sequentially
   - If a user's own classroom had database ID = 1, and Lee's Classroom had hardcoded ID = 1, they collided
   - The backend would find the user's own classroom (ID=1) instead of the dummy classroom

2. **No Distinction Between Real and Dummy Data**
   - The system didn't differentiate between real database classrooms and hardcoded demo classrooms
   - When sending `classroom_id: 1`, the backend couldn't tell if it was meant to be a real database ID or a demo ID

## Root Cause

**ID Collision**:

```
User's actual classroom (Database ID: 1)
    ↓
    Matches
    ↓
Lee's Dummy Classroom (Frontend ID: '1')
```

Result: User invites themselves instead of Lee's classroom

## Solution Implemented

### 1. Changed Dummy Classroom IDs (Frontend)

**File**: `src/components/MapView.tsx`

Changed hardcoded classroom IDs from simple numbers to prefixed strings:

```typescript
// Before (collision risk):
{ id: '1', name: "Lee's Classroom", ... }
{ id: '2', name: 'Math Lover House', ... }

// After (no collision):
{ id: 'dummy_lee_1', name: "Lee's Classroom", ... }
{ id: 'dummy_math_2', name: 'Math Lover House', ... }
{ id: 'dummy_book_3', name: 'The Book Nook', ... }
{ id: 'dummy_marie_4', ... }
// ... and so on
```

### 2. Added Dummy ID Detection (Backend)

**File**: `src/main.py` - POST `/api/webex/meeting` endpoint

Added validation to catch attempts to use dummy classrooms:

```python
# Check if it's a dummy classroom ID (for development/testing)
if isinstance(classroom_id, str) and classroom_id.startswith('dummy_'):
    return jsonify({"msg": "Cannot invite dummy classrooms. Please use real classrooms from your network."}), 400

# Convert to int for database lookup
try:
    classroom_id = int(classroom_id)
except (ValueError, TypeError):
    return jsonify({"msg": "Invalid classroom_id format"}), 400
```

## How It Works Now

### Real Classroom Invitation (Works ✅)

1. User selects a real classroom from their network (database-backed)
2. Sends numeric ID to backend (e.g., `classroom_id: 42`)
3. Backend finds the real classroom with ID=42
4. Invitation created correctly

### Dummy Classroom Invitation (Blocked ✅)

1. User selects a dummy classroom from MapView (e.g., Lee's Classroom)
2. Sends dummy ID to backend (e.g., `classroom_id: "dummy_lee_1"`)
3. Backend detects the `dummy_` prefix
4. Returns error: "Cannot invite dummy classrooms. Please use real classrooms from your network."

### Self-Invitation Protection (Still Works ✅)

1. Additional check prevents a user from inviting their own classroom
2. Error: "You cannot invite your own classroom"

## ID Prefixing Scheme

All dummy classrooms now use the prefix `dummy_` followed by a descriptive name:

- `dummy_lee_1` - Lee's Classroom
- `dummy_math_2` - Math Lover House
- `dummy_book_3` - The Book Nook
- `dummy_marie_4` - Marie's Language Lab
- `dummy_sakura_5` - Sakura Study Space
- `dummy_outback_6` - Outback Learning Hub
- `dummy_tech_7` - TechHub Singapore
- `dummy_priya_8` - Priya's Practice Room
- `dummy_samba_9` - Samba Study Circle
- `dummy_alpine_10` - Alpine Academic Circle
- `dummy_knit_11` - The Knit & Wit
- `dummy_seoul_12` - Seoul Study Station

## Files Modified

1. **Frontend**: `penpals-frontend/src/components/MapView.tsx`
   - Changed all hardcoded classroom IDs to `dummy_*` format

2. **Backend**: `penpals-backend/src/main.py`
   - Added dummy ID detection and rejection
   - Added proper type conversion with error handling

## Testing

✅ Can't invite dummy classrooms (error message shown)
✅ Can invite real database classrooms
✅ No more ID collisions between real and dummy data
✅ Self-invitation still blocked correctly

## For Future Development

When real classroom data is ready:

1. Replace the hardcoded MapView classrooms with database queries
2. Remove the dummy ID check from the backend
3. Ensure all real classrooms are discoverable through the API
