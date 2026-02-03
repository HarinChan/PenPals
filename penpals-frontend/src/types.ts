// Type definitions for the PenPals application

export interface Classroom {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  interests: string[];
  availability: {
    [day: string]: number[];
  };
  size?: number;
  description?: string;
}

export interface RecentCall {
  id: string;
  classroomId: string;
  classroomName: string;
  timestamp: Date;
  duration: number;
  type: 'incoming' | 'outgoing' | 'missed';
}

export interface Friend {
  id: string;
  classroomId: string;
  classroomName: string;
  location: string;
  addedDate: Date;
  lastConnected?: Date;
  friendshipStatus?: 'pending' | 'accepted';
}

export interface FriendRequest {
  id: string;
  fromClassroomId: string;
  fromClassroomName: string;
  toClassroomId: string;
  toClassroomName: string;
  timestamp: Date;
  message?: string;
  classroomId?: string;
  classroomName?: string;
  location?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface Notification {
  id: string;
  type: 'friend-request' | 'call-missed' | 'call-incoming' | 'post-like' | 'post-comment' | 'friend_request_received' | 'friend_request_accepted' | 'post_likes' | 'friend_posted' | 'post_quoted';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  relatedId?: string;
  link?: string;
}

export interface Account {
  id: string;
  classroomName: string;
  location: string;
  size: number;
  description: string;
  interests: string[];
  schedule: { [day: string]: number[] };
  x: number;
  y: number;
  recentCalls?: RecentCall[];
  friends?: Friend[];
  sentFriendRequests?: FriendRequest[];
  receivedFriendRequests?: FriendRequest[];
  notifications?: Notification[];
}
