
import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Calendar, Clock, Link as LinkIcon, Lock, Copy, Trash2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

interface MeetingDetailsDialogProps {
    meetingId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMeetingUpdated: () => void;
}

interface MeetingDetails {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    web_link: string;
    password?: string;
    creator_name: string;
    is_creator: boolean;
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
    const [newDate, setNewDate] = useState<string>('');
    const [newTime, setNewTime] = useState<string>('');

    useEffect(() => {
        if (open && meetingId) {
            fetchMeetingDetails(meetingId);
            setIsRescheduling(false);
        }
    }, [open, meetingId]);

    const fetchMeetingDetails = async (id: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('penpals_token');
            if (!token) return;

            const response = await fetch(`http://127.0.0.1:5001/api/webex/meeting/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setMeeting(data);
                // Initialize Reschedule inputs
                const startDate = new Date(data.start_time);
                setNewDate(startDate.toISOString().split('T')[0]);
                setNewTime(startDate.toTimeString().slice(0, 5));
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
            const response = await fetch(`http://127.0.0.1:5001/api/webex/meeting/${meeting.id}`, {
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

        try {
            const startDateTime = new Date(`${newDate}T${newTime}`);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Assume 1 hour default duration

            const token = localStorage.getItem('penpals_token');
            const response = await fetch(`http://127.0.0.1:5001/api/webex/meeting/${meeting.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString()
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

    if (!open || !meeting) return null; // or loading spinner

    const startDate = new Date(meeting.start_time);
    const endDate = new Date(meeting.end_time);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
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
                    <div className="py-8 text-center text-slate-500">Loading details...</div>
                ) : (
                    <div className="space-y-6 py-4">

                        {/* Time Display */}
                        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <Clock className="mt-0.5 text-blue-500" size={18} />
                            <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                    {startDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
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
                                        value={meeting.web_link}
                                        className="bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleCopy(meeting.web_link, "Link")}
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
                        </div>

                        {/* Actions for Creator */}
                        {meeting.is_creator && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                {isRescheduling ? (
                                    <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <h4 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                            <CalendarClock size={16} /> Reschedule Meeting
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Date</Label>
                                                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="bg-white dark:bg-slate-900" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Time</Label>
                                                <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="bg-white dark:bg-slate-900" />
                                            </div>
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
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
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
                                            onClick={() => window.open(meeting.web_link, '_blank')}
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
                                onClick={() => window.open(meeting.web_link, '_blank')}
                            >
                                Join Meeting
                            </Button>
                        )}

                    </div>
                )}
            </DialogContent>
        </Dialog >
    );
}
