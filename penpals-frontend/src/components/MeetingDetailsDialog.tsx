
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Calendar, Clock, Link as LinkIcon, Lock, Copy, Trash2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { ClassroomService } from '../services/classroom';
import { MeetingsService } from '../services/meetings';

const SCHEDULE_WINDOW_DAYS = 14;
const ALLOWED_DURATIONS = [15, 30, 45, 60];

const formatMeetingDay = (date: Date): string => {
    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    const day = date.toLocaleDateString(undefined, { day: 'numeric' });
    const month = date.toLocaleDateString(undefined, { month: 'short' });
    return `${weekday} ${day} ${month}`;
};

const toYmd = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface MeetingDetailsDialogProps {
    meetingId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMeetingUpdated: () => void;
}

interface MeetingDetails {
    id: number;
    title: string;
    description?: string | null;
    start_time: string;
    end_time: string;
    web_link?: string | null;
    password?: string | null;
    creator_name: string;
    is_creator: boolean;
    is_participant?: boolean;
    visibility?: 'private' | 'public';
    max_participants?: number | null;
    invited_classrooms?: Array<{
        invitation_id?: number;
        receiver_id: number;
        receiver_name: string;
        status: 'pending' | 'accepted';
        can_withdraw?: boolean;
    }>;
}

interface InviteClassroomOption {
    id: number;
    name: string;
    location: string;
}

export default function MeetingDetailsDialog({
    meetingId,
    open,
    onOpenChange,
    onMeetingUpdated,
}: MeetingDetailsDialogProps) {
    const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [newTitle, setNewTitle] = useState<string>('');
    const [newDate, setNewDate] = useState<string>('');
    const [newTime, setNewTime] = useState<string>('');
    const [durationMinutes, setDurationMinutes] = useState<number>(30);
    const [newDescription, setNewDescription] = useState<string>('');
    const [newVisibility, setNewVisibility] = useState<'private' | 'public'>('private');
    const [newMaxParticipants, setNewMaxParticipants] = useState<string>('20');
    const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
    const [withdrawingInvitationId, setWithdrawingInvitationId] = useState<number | null>(null);
    const [availableInvitees, setAvailableInvitees] = useState<InviteClassroomOption[]>([]);
    const [isLoadingInvitees, setIsLoadingInvitees] = useState<boolean>(false);
    const [inviteSearch, setInviteSearch] = useState<string>('');
    const [selectedInviteeIds, setSelectedInviteeIds] = useState<number[]>([]);
    const [isInviting, setIsInviting] = useState<boolean>(false);

    useEffect(() => {
        if (open && meetingId) {
            fetchMeetingDetails(meetingId);
            setIsRescheduling(false);
        }
    }, [open, meetingId]);

    useEffect(() => {
        if (!open || !meeting?.is_creator) return;

        let isCancelled = false;
        const loadClassrooms = async () => {
            setIsLoadingInvitees(true);
            try {
                const response = await ClassroomService.fetchAllClassrooms();
                if (isCancelled) return;

                const parsedClassrooms = response.classrooms
                    .map((item) => ({
                        id: Number.parseInt(String(item.id), 10),
                        name: item.name,
                        location: item.location || '',
                    }))
                    .filter((item) => Number.isFinite(item.id));

                setAvailableInvitees(parsedClassrooms);
            } catch (error) {
                if (!isCancelled) {
                    toast.error('Failed to load classrooms for invitations');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingInvitees(false);
                }
            }
        };

        loadClassrooms();
        return () => {
            isCancelled = true;
        };
    }, [open, meeting?.is_creator]);

    const fetchMeetingDetails = async (id: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('penpals_token');
            if (!token) return;

            const response = await fetch(`http://192.168.1.163:5001/api/webex/meeting/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setMeeting(data);
                // Initialize Reschedule inputs
                const startDate = new Date(data.start_time);
                const endDate = new Date(data.end_time);
                const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                setNewTitle(data.title || '');
                setNewDescription(data.description || '');
                setNewDate(startDate.toISOString().split('T')[0]);
                setNewTime(startDate.toTimeString().slice(0, 5));
                setDurationMinutes(ALLOWED_DURATIONS.includes(duration) ? duration : 30);
                setNewVisibility(data.visibility === 'public' ? 'public' : 'private');
                setNewMaxParticipants(data.max_participants ? String(data.max_participants) : '20');
            } else {
                toast.error("Failed to load meeting details");
                onOpenChange(false);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading meeting details");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const handleCancelMeeting = async () => {
        if (!meeting) return;
        if (!confirm("Are you sure you want to cancel this meeting? This action cannot be undone.")) return;

        try {
            const token = localStorage.getItem('penpals_token');
            const response = await fetch(`http://192.168.1.163:5001/api/webex/meeting/${meeting.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Meeting cancelled successfully");
                onMeetingUpdated();
                onOpenChange(false);
            } else {
                const error = await response.json();
                toast.error(error.msg || "Failed to cancel meeting");
            }
        } catch (error) {
            toast.error("Error cancelling meeting");
        }
    };

    const handleReschedule = async () => {
        if (!meeting || !newDate || !newTime) return;
        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle) {
            toast.error('Meeting title cannot be empty.');
            return;
        }

        try {
            const startDateTime = new Date(`${newDate}T${newTime}`);
            const now = new Date();
            const maxAllowedDate = new Date(now);
            maxAllowedDate.setDate(now.getDate() + SCHEDULE_WINDOW_DAYS);
            if (startDateTime > maxAllowedDate) {
                toast.error('Meetings can be scheduled up to 2 weeks in advance.');
                return;
            }
            if (!ALLOWED_DURATIONS.includes(durationMinutes)) {
                toast.error('Meeting duration must be between 15 and 60 minutes.');
                return;
            }

            let parsedCapacity: number | undefined;
            if (newVisibility === 'public') {
                parsedCapacity = Number.parseInt(newMaxParticipants, 10);
                if (!Number.isFinite(parsedCapacity) || parsedCapacity < 2) {
                    toast.error('Public meetings require a capacity of at least 2.');
                    return;
                }
            }

            const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

            const token = localStorage.getItem('penpals_token');
            const response = await fetch(`http://192.168.1.163:5001/api/webex/meeting/${meeting.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: trimmedTitle,
                    description: newDescription.trim(),
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    visibility: newVisibility,
                    max_participants: newVisibility === 'public' ? parsedCapacity : null,
                })
            });

            if (response.ok) {
                toast.success("Meeting rescheduled successfully");
                onMeetingUpdated();
                // Refresh details
                fetchMeetingDetails(meeting.id);
                setIsRescheduling(false);
            } else {
                const error = await response.json();
                toast.error(error.msg || "Failed to reschedule meeting");
            }
        } catch (error) {
            toast.error("Error rescheduling meeting");
        }
    };

    const handleSaveSettings = async () => {
        if (!meeting) return;

        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle) {
            toast.error('Meeting title cannot be empty.');
            return;
        }

        let parsedCapacity: number | null = null;
        if (newVisibility === 'public') {
            const parsed = Number.parseInt(newMaxParticipants, 10);
            if (!Number.isFinite(parsed) || parsed < 2) {
                toast.error('Public meetings require a capacity of at least 2.');
                return;
            }
            parsedCapacity = parsed;
        }

        try {
            setIsSavingSettings(true);
            const token = localStorage.getItem('penpals_token');
            const response = await fetch(`http://192.168.1.163:5001/api/webex/meeting/${meeting.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: trimmedTitle,
                    description: newDescription.trim(),
                    visibility: newVisibility,
                    max_participants: parsedCapacity,
                })
            });

            if (response.ok) {
                toast.success('Meeting settings updated');
                onMeetingUpdated();
                await fetchMeetingDetails(meeting.id);
                return;
            }

            const error = await response.json();
            toast.error(error.msg || 'Failed to update meeting settings');
        } catch (error) {
            toast.error('Error updating meeting settings');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleJoinMeeting = async () => {
        if (!meeting) return;

        if (meeting.visibility === 'public' && !meeting.is_creator && !meeting.is_participant) {
            try {
                const token = localStorage.getItem('penpals_token');
                const response = await fetch(`http://192.168.1.163:5001/api/meetings/${meeting.id}/join`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    const link = data?.meeting?.web_link;
                    toast.success(data?.msg || 'Joined meeting');
                    onMeetingUpdated();
                    await fetchMeetingDetails(meeting.id);
                    if (link) {
                        window.open(link, '_blank');
                    }
                    return;
                }

                const error = await response.json();
                toast.error(error.msg || 'Failed to join meeting');
                return;
            } catch (error) {
                toast.error('Error joining meeting');
                return;
            }
        }

        if (meeting.web_link) {
            window.open(meeting.web_link, '_blank');
            return;
        }

        toast.error('Meeting link is not available yet');
    };

    const handleInviteClassrooms = async () => {
        if (!meeting || selectedInviteeIds.length === 0) {
            toast.error('Select at least one classroom to invite.');
            return;
        }

        try {
            setIsInviting(true);
            const response = await MeetingsService.inviteToMeeting(meeting.id, selectedInviteeIds);

            if (response.invitations.length > 0) {
                toast.success(`${response.invitations.length} invitation(s) sent`);
            } else {
                toast.error(response.msg || 'No new invitations were created');
            }

            setSelectedInviteeIds([]);
            setInviteSearch('');
            await fetchMeetingDetails(meeting.id);
            onMeetingUpdated();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to send invitations');
        } finally {
            setIsInviting(false);
        }
    };

    const handleWithdrawInvitation = async (invitationId: number) => {
        if (!meeting) return;

        try {
            setWithdrawingInvitationId(invitationId);
            const token = localStorage.getItem('penpals_token');
            const response = await fetch(`http://192.168.1.163:5001/api/webex/invitations/${invitationId}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                toast.error(error.msg || 'Failed to withdraw invitation');
                return;
            }

            toast.success('Invitation withdrawn');
            await fetchMeetingDetails(meeting.id);
            onMeetingUpdated();
        } catch (error) {
            toast.error('Error withdrawing invitation');
        } finally {
            setWithdrawingInvitationId(null);
        }
    };

    if (!open || !meeting) return null; // or loading spinner

    const startDate = new Date(meeting.start_time);
    const endDate = new Date(meeting.end_time);
    const today = new Date();
    const latestDate = new Date();
    latestDate.setDate(today.getDate() + SCHEDULE_WINDOW_DAYS);

    const inviteQuery = inviteSearch.trim().toLowerCase();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Calendar className="text-purple-600" size={24} />
                        {meeting.title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Organized by {meeting.creator_name}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="px-6 pb-6 py-8 text-center text-slate-500">Loading details...</div>
                ) : (
                    <ScrollArea className="max-h-[600px]">
                        <div className="space-y-6 py-4 pr-4">

                        {/* Time Display */}
                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <Clock className="mt-0.5 text-blue-500" size={18} />
                            <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                    {formatMeetingDay(startDate)}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                    {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                    {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        {/* Link & Password */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <LinkIcon size={14} /> Meeting Link
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={meeting.web_link || 'Link will be created when the first participant joins'}
                                        className="bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => meeting.web_link && handleCopy(meeting.web_link, "Link")}
                                        disabled={!meeting.web_link}
                                    >
                                        <Copy size={16} />
                                    </Button>
                                </div>
                            </div>

                            {meeting.password && (
                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Lock size={14} /> Password
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={meeting.password}
                                            className="bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => meeting.password && handleCopy(meeting.password, "Password")}
                                        >
                                            <Copy size={16} />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Currently invited</Label>
                                {meeting.invited_classrooms && meeting.invited_classrooms.length > 0 ? (
                                    <div className="space-y-2">
                                        {meeting.invited_classrooms.map((invitee) => (
                                            <div key={invitee.receiver_id} className="flex items-center justify-between gap-2 rounded border border-slate-200 dark:border-slate-700 px-2 py-1">
                                                <Badge variant="secondary" className="gap-1">
                                                    {invitee.receiver_name} ({invitee.status})
                                                </Badge>
                                                {meeting.is_creator && invitee.can_withdraw && invitee.invitation_id && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 text-xs text-red-600 hover:text-red-700"
                                                        disabled={withdrawingInvitationId === invitee.invitation_id}
                                                        onClick={() => handleWithdrawInvitation(invitee.invitation_id!)}
                                                    >
                                                        {withdrawingInvitationId === invitee.invitation_id ? 'Withdrawing...' : 'Withdraw'}
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">No active invitations yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Actions for Creator */}
                        {meeting.is_creator && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <div className="space-y-2 mb-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <Label className="text-xs">Meeting settings</Label>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Title</Label>
                                        <Input
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Description</Label>
                                        <textarea
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            placeholder="Add meeting details for participants"
                                            className="w-full min-h-[72px] rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={newVisibility === 'public'}
                                            onChange={(e) => setNewVisibility(e.target.checked ? 'public' : 'private')}
                                            className="rounded border-slate-400"
                                        />
                                        Make this meeting public
                                    </label>
                                    {newVisibility === 'public' && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">Maximum participants</Label>
                                            <Input
                                                type="number"
                                                min={2}
                                                value={newMaxParticipants}
                                                onChange={(e) => setNewMaxParticipants(e.target.value)}
                                                className="bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleSaveSettings}
                                            disabled={isSavingSettings}
                                        >
                                            {isSavingSettings ? 'Saving...' : 'Save Settings'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <Label className="text-xs">Invite classrooms</Label>
                                    <Input
                                        value={inviteSearch}
                                        onChange={(e) => setInviteSearch(e.target.value)}
                                        placeholder="Search classrooms by name or location"
                                        className="bg-white dark:bg-slate-900"
                                    />

                                    {selectedInviteeIds.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {selectedInviteeIds.map((id) => {
                                                const invitee = availableInvitees.find((item) => item.id === id);
                                                if (!invitee) return null;
                                                return (
                                                    <Badge
                                                        key={id}
                                                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer"
                                                        onClick={() => setSelectedInviteeIds((prev) => prev.filter((value) => value !== id))}
                                                    >
                                                        {invitee.name} ×
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="max-h-32 overflow-y-auto space-y-1 rounded border border-slate-200 dark:border-slate-700 p-2">
                                        {isLoadingInvitees ? (
                                            <div className="text-xs text-slate-500">Loading classrooms...</div>
                                        ) : !inviteQuery ? (
                                            <div className="text-xs text-slate-500">Start typing to search classrooms.</div>
                                        ) : (
                                            availableInvitees
                                                .filter((item) => {
                                                    if (selectedInviteeIds.includes(item.id)) return false;
                                                    return item.name.toLowerCase().includes(inviteQuery) || item.location.toLowerCase().includes(inviteQuery);
                                                })
                                                .slice(0, 8)
                                                .map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => setSelectedInviteeIds((prev) => [...prev, item.id])}
                                                        className="w-full text-left px-2 py-1 rounded text-xs bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                                                    >
                                                        {item.name}
                                                        {item.location ? ` • ${item.location}` : ''}
                                                    </button>
                                                ))
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleInviteClassrooms}
                                            disabled={isInviting || selectedInviteeIds.length === 0}
                                        >
                                            {isInviting ? 'Sending...' : 'Send Invites'}
                                        </Button>
                                    </div>
                                </div>

                                {isRescheduling ? (
                                    <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <h4 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                            <CalendarClock size={16} /> Reschedule Meeting
                                        </h4>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Title</Label>
                                            <Input
                                                value={newTitle}
                                                onChange={e => setNewTitle(e.target.value)}
                                                className="bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Date</Label>
                                                <Input
                                                    type="date"
                                                    value={newDate}
                                                    min={toYmd(today)}
                                                    max={toYmd(latestDate)}
                                                    onChange={e => setNewDate(e.target.value)}
                                                    className="bg-white dark:bg-slate-900"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Time</Label>
                                                <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="bg-white dark:bg-slate-900" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Duration</Label>
                                            <div className="flex gap-2 flex-wrap">
                                                {ALLOWED_DURATIONS.map((minutes) => (
                                                    <Button
                                                        key={minutes}
                                                        type="button"
                                                        size="sm"
                                                        variant={durationMinutes === minutes ? 'default' : 'outline'}
                                                        onClick={() => setDurationMinutes(minutes)}
                                                    >
                                                        {minutes} min
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                            <Label className="text-xs">Meeting Visibility</Label>
                                            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={newVisibility === 'public'}
                                                    onChange={(e) => setNewVisibility(e.target.checked ? 'public' : 'private')}
                                                    className="rounded border-slate-400"
                                                />
                                                Make this meeting public
                                            </label>
                                            {newVisibility === 'public' && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Maximum participants</Label>
                                                    <Input
                                                        type="number"
                                                        min={2}
                                                        value={newMaxParticipants}
                                                        onChange={(e) => setNewMaxParticipants(e.target.value)}
                                                        className="bg-white dark:bg-slate-900"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => setIsRescheduling(false)}>Cancel</Button>
                                            <Button size="sm" onClick={handleReschedule}>Save Changes</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            variant="destructive"
                                            className="hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
                                            onClick={handleCancelMeeting}
                                        >
                                            <Trash2 size={16} className="mr-2" /> Cancel Meeting
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsRescheduling(true)}
                                        >
                                            <CalendarClock size={16} className="mr-2" /> Reschedule
                                        </Button>
                                        <Button
                                            className="bg-purple-600 hover:bg-purple-700"
                                            onClick={() => {
                                                if (meeting.web_link) {
                                                    window.open(meeting.web_link, '_blank');
                                                } else {
                                                    toast.error('Meeting link is not available yet');
                                                }
                                            }}
                                        >
                                            Join Now
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {!meeting.is_creator && (
                            <Button
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                onClick={handleJoinMeeting}
                            >
                                {meeting.visibility === 'public' && !meeting.is_participant ? 'Join Meeting' : 'Open Meeting'}
                            </Button>
                        )}

                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog >
    );
}
