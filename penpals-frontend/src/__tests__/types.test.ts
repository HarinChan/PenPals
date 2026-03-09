import { describe, it, expect } from 'vitest';
import type {
  Classroom,
  RecentCall,
  Friend,
  FriendRequest,
  Notification,
  Account,
} from '../types';

describe('types.ts', () => {
  describe('Classroom interface', () => {
    it('should accept valid classroom object with all required fields', () => {
      const classroom: Classroom = {
        id: '1',
        name: 'Test Classroom',
        location: 'New York',
        lat: 40.7128,
        lon: -74.0060,
        interests: ['math', 'science'],
        availability: {
          Mon: [9, 10, 11],
          Wed: [14, 15],
        },
      };

      expect(classroom.id).toBe('1');
      expect(classroom.name).toBe('Test Classroom');
      expect(classroom.lat).toBe(40.7128);
      expect(classroom.lon).toBe(-74.0060);
      expect(classroom.interests).toHaveLength(2);
      expect(classroom.availability.Mon).toEqual([9, 10, 11]);
    });

    it('should accept classroom with optional fields', () => {
      const classroom: Classroom = {
        id: '2',
        name: 'Advanced Classroom',
        location: 'London',
        lat: 51.5074,
        lon: -0.1278,
        interests: ['art'],
        availability: {},
        size: 25,
        description: 'A creative classroom',
        avatar: 'avatar.jpg',
        friends: [],
      };

      expect(classroom.size).toBe(25);
      expect(classroom.description).toBe('A creative classroom');
      expect(classroom.avatar).toBe('avatar.jpg');
      expect(classroom.friends).toEqual([]);
    });

    it('should support empty availability schedule', () => {
      const classroom: Classroom = {
        id: '3',
        name: 'Flexible Classroom',
        location: 'Paris',
        lat: 48.8566,
        lon: 2.3522,
        interests: [],
        availability: {},
      };

      expect(classroom.availability).toEqual({});
      expect(Object.keys(classroom.availability)).toHaveLength(0);
    });
  });

  describe('RecentCall interface', () => {
    it('should accept valid recent call object', () => {
      const call: RecentCall = {
        id: 'call-1',
        classroomId: 'classroom-123',
        classroomName: 'Partner Classroom',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        duration: 1800,
        type: 'outgoing',
      };

      expect(call.id).toBe('call-1');
      expect(call.classroomId).toBe('classroom-123');
      expect(call.duration).toBe(1800);
      expect(call.type).toBe('outgoing');
      expect(call.timestamp).toBeInstanceOf(Date);
    });

    it('should support both incoming and outgoing call types', () => {
      const incomingCall: RecentCall = {
        id: 'call-2',
        classroomId: 'classroom-456',
        classroomName: 'Caller',
        timestamp: new Date(),
        duration: 600,
        type: 'incoming',
      };

      const outgoingCall: RecentCall = {
        id: 'call-3',
        classroomId: 'classroom-789',
        classroomName: 'Recipient',
        timestamp: new Date(),
        duration: 900,
        type: 'outgoing',
      };

      expect(incomingCall.type).toBe('incoming');
      expect(outgoingCall.type).toBe('outgoing');
    });
  });

  describe('Friend interface', () => {
    it('should accept valid friend object with required fields', () => {
      const friend: Friend = {
        id: 'friend-1',
        classroomId: 'classroom-100',
        classroomName: 'Friend Classroom',
        location: 'Tokyo',
        addedDate: new Date('2024-01-01'),
      };

      expect(friend.id).toBe('friend-1');
      expect(friend.classroomId).toBe('classroom-100');
      expect(friend.addedDate).toBeInstanceOf(Date);
    });

    it('should accept friend with optional fields', () => {
      const friend: Friend = {
        id: 'friend-2',
        classroomId: 'classroom-200',
        classroomName: 'Active Friend',
        location: 'Berlin',
        addedDate: new Date('2024-01-01'),
        lastConnected: new Date('2024-02-15'),
        friendshipStatus: 'accepted',
      };

      expect(friend.lastConnected).toBeInstanceOf(Date);
      expect(friend.friendshipStatus).toBe('accepted');
    });

    it('should support pending friendship status', () => {
      const pendingFriend: Friend = {
        id: 'friend-3',
        classroomId: 'classroom-300',
        classroomName: 'Pending Friend',
        location: 'Sydney',
        addedDate: new Date(),
        friendshipStatus: 'pending',
      };

      expect(pendingFriend.friendshipStatus).toBe('pending');
    });
  });

  describe('FriendRequest interface', () => {
    it('should accept valid friend request object', () => {
      const request: FriendRequest = {
        id: 'req-1',
        fromClassroomId: 'classroom-1',
        fromClassroomName: 'Sender',
        toClassroomId: 'classroom-2',
        toClassroomName: 'Receiver',
        timestamp: new Date('2024-03-01'),
      };

      expect(request.id).toBe('req-1');
      expect(request.fromClassroomId).toBe('classroom-1');
      expect(request.toClassroomId).toBe('classroom-2');
      expect(request.timestamp).toBeInstanceOf(Date);
    });

    it('should accept friend request with optional fields', () => {
      const request: FriendRequest = {
        id: 'req-2',
        fromClassroomId: 'classroom-10',
        fromClassroomName: 'Sender Class',
        toClassroomId: 'classroom-20',
        toClassroomName: 'Receiver Class',
        timestamp: new Date(),
        message: 'Would you like to connect?',
        classroomId: 'classroom-10',
        classroomName: 'Sender Class',
        location: 'Boston',
        status: 'pending',
      };

      expect(request.message).toBe('Would you like to connect?');
      expect(request.status).toBe('pending');
      expect(request.location).toBe('Boston');
    });

    it('should support all status types', () => {
      const pendingRequest: FriendRequest = {
        id: 'req-3',
        fromClassroomId: 'c1',
        fromClassroomName: 'Class 1',
        toClassroomId: 'c2',
        toClassroomName: 'Class 2',
        timestamp: new Date(),
        status: 'pending',
      };

      const acceptedRequest: FriendRequest = {
        ...pendingRequest,
        id: 'req-4',
        status: 'accepted',
      };

      const rejectedRequest: FriendRequest = {
        ...pendingRequest,
        id: 'req-5',
        status: 'rejected',
      };

      expect(pendingRequest.status).toBe('pending');
      expect(acceptedRequest.status).toBe('accepted');
      expect(rejectedRequest.status).toBe('rejected');
    });
  });

  describe('Notification interface', () => {
    it('should accept valid notification object with required fields', () => {
      const notification: Notification = {
        id: 'notif-1',
        type: 'friend-request',
        title: 'New Friend Request',
        message: 'You have a new friend request',
        timestamp: new Date('2024-03-09'),
        read: false,
      };

      expect(notification.id).toBe('notif-1');
      expect(notification.type).toBe('friend-request');
      expect(notification.read).toBe(false);
      expect(notification.timestamp).toBeInstanceOf(Date);
    });

    it('should accept notification with optional fields', () => {
      const notification: Notification = {
        id: 'notif-2',
        type: 'post-like',
        title: 'Post Liked',
        message: 'Someone liked your post',
        timestamp: new Date(),
        read: true,
        relatedId: 'post-123',
        link: '/posts/123',
      };

      expect(notification.relatedId).toBe('post-123');
      expect(notification.link).toBe('/posts/123');
      expect(notification.read).toBe(true);
    });

    it('should support all notification types', () => {
      const types: Notification['type'][] = [
        'friend-request',
        'call-missed',
        'call-incoming',
        'post-like',
        'post-comment',
        'friend_request_received',
        'friend_request_accepted',
        'post_likes',
        'friend_posted',
        'post_quoted',
        'info',
        'warning',
        'success',
        'error',
      ];

      types.forEach((type) => {
        const notification: Notification = {
          id: `notif-${type}`,
          type,
          title: `Test ${type}`,
          message: `Testing ${type} notification`,
          timestamp: new Date(),
          read: false,
        };

        expect(notification.type).toBe(type);
      });
    });
  });

  describe('Account interface', () => {
    it('should accept valid account object with all required fields', () => {
      const account: Account = {
        id: 'acc-1',
        classroomName: 'Main Classroom',
        location: 'San Francisco',
        size: 30,
        description: 'A tech-focused classroom',
        interests: ['technology', 'coding'],
        schedule: {
          Mon: [9, 10, 11],
          Tue: [14, 15],
        },
        x: -122.4194,
        y: 37.7749,
      };

      expect(account.id).toBe('acc-1');
      expect(account.classroomName).toBe('Main Classroom');
      expect(account.size).toBe(30);
      expect(account.x).toBe(-122.4194);
      expect(account.y).toBe(37.7749);
      expect(account.interests).toHaveLength(2);
      expect(account.schedule.Mon).toEqual([9, 10, 11]);
    });

    it('should accept account with all optional fields', () => {
      const account: Account = {
        id: 'acc-2',
        classroomName: 'Complete Classroom',
        location: 'Los Angeles',
        size: 25,
        description: 'Fully featured classroom',
        avatar: 'classroom-avatar.png',
        interests: ['art', 'music'],
        schedule: {
          Wed: [13, 14, 15],
        },
        x: -118.2437,
        y: 34.0522,
        recentCalls: [
          {
            id: 'call-1',
            classroomId: 'c1',
            classroomName: 'Caller',
            timestamp: new Date(),
            duration: 600,
            type: 'incoming',
          },
        ],
        friends: [
          {
            id: 'f1',
            classroomId: 'c2',
            classroomName: 'Friend',
            location: 'Seattle',
            addedDate: new Date(),
          },
        ],
        sentFriendRequests: [],
        receivedFriendRequests: [],
        notifications: [],
      };

      expect(account.avatar).toBe('classroom-avatar.png');
      expect(account.recentCalls).toHaveLength(1);
      expect(account.friends).toHaveLength(1);
      expect(account.sentFriendRequests).toEqual([]);
      expect(account.receivedFriendRequests).toEqual([]);
      expect(account.notifications).toEqual([]);
    });

    it('should support empty schedule', () => {
      const account: Account = {
        id: 'acc-3',
        classroomName: 'Flexible Classroom',
        location: 'Remote',
        size: 15,
        description: 'No fixed schedule',
        interests: [],
        schedule: {},
        x: 0,
        y: 0,
      };

      expect(account.schedule).toEqual({});
      expect(Object.keys(account.schedule)).toHaveLength(0);
    });

    it('should support account with complex relationships', () => {
      const account: Account = {
        id: 'acc-4',
        classroomName: 'Connected Classroom',
        location: 'Chicago',
        size: 20,
        description: 'Well connected',
        interests: ['networking'],
        schedule: { Fri: [10, 11] },
        x: -87.6298,
        y: 41.8781,
        recentCalls: [
          {
            id: 'call-1',
            classroomId: 'c1',
            classroomName: 'Class 1',
            timestamp: new Date('2024-03-01'),
            duration: 1200,
            type: 'outgoing',
          },
          {
            id: 'call-2',
            classroomId: 'c2',
            classroomName: 'Class 2',
            timestamp: new Date('2024-03-02'),
            duration: 900,
            type: 'incoming',
          },
        ],
        friends: [
          {
            id: 'f1',
            classroomId: 'c1',
            classroomName: 'Friend 1',
            location: 'Miami',
            addedDate: new Date('2024-01-01'),
            friendshipStatus: 'accepted',
          },
          {
            id: 'f2',
            classroomId: 'c3',
            classroomName: 'Friend 2',
            location: 'Denver',
            addedDate: new Date('2024-02-01'),
            friendshipStatus: 'pending',
          },
        ],
        receivedFriendRequests: [
          {
            id: 'req-1',
            fromClassroomId: 'c4',
            fromClassroomName: 'Requester',
            toClassroomId: 'acc-4',
            toClassroomName: 'Connected Classroom',
            timestamp: new Date(),
            status: 'pending',
          },
        ],
        notifications: [
          {
            id: 'n1',
            type: 'friend-request',
            title: 'New Request',
            message: 'You have a new friend request',
            timestamp: new Date(),
            read: false,
          },
          {
            id: 'n2',
            type: 'post-like',
            title: 'Post Liked',
            message: 'Your post was liked',
            timestamp: new Date(),
            read: true,
            relatedId: 'post-1',
          },
        ],
      };

      expect(account.recentCalls).toHaveLength(2);
      expect(account.friends).toHaveLength(2);
      expect(account.receivedFriendRequests).toHaveLength(1);
      expect(account.notifications).toHaveLength(2);
      expect(account.friends![0].friendshipStatus).toBe('accepted');
      expect(account.friends![1].friendshipStatus).toBe('pending');
      expect(account.notifications![0].read).toBe(false);
      expect(account.notifications![1].read).toBe(true);
    });
  });

  describe('Type compatibility and edge cases', () => {
    it('should handle coordinates at extremes', () => {
      const classroom: Classroom = {
        id: '1',
        name: 'Edge Classroom',
        location: 'Edge Location',
        lat: -90,
        lon: 180,
        interests: [],
        availability: {},
      };

      expect(classroom.lat).toBe(-90);
      expect(classroom.lon).toBe(180);
    });

    it('should handle zero duration calls', () => {
      const call: RecentCall = {
        id: 'call-1',
        classroomId: 'c1',
        classroomName: 'Quick Call',
        timestamp: new Date(),
        duration: 0,
        type: 'outgoing',
      };

      expect(call.duration).toBe(0);
    });

    it('should handle empty arrays in account', () => {
      const account: Account = {
        id: 'acc-1',
        classroomName: 'Empty Account',
        location: 'Nowhere',
        size: 0,
        description: '',
        interests: [],
        schedule: {},
        x: 0,
        y: 0,
        recentCalls: [],
        friends: [],
        sentFriendRequests: [],
        receivedFriendRequests: [],
        notifications: [],
      };

      expect(account.interests).toEqual([]);
      expect(account.recentCalls).toEqual([]);
      expect(account.friends).toEqual([]);
      expect(account.notifications).toEqual([]);
    });

    it('should handle multiple availability slots per day', () => {
      const classroom: Classroom = {
        id: '1',
        name: 'Busy Classroom',
        location: 'Busy City',
        lat: 0,
        lon: 0,
        interests: [],
        availability: {
          Mon: [9, 10, 11, 14, 15, 16],
          Tue: [8, 9, 10, 11, 12, 13, 14, 15, 16],
          Wed: [10],
        },
      };

      expect(classroom.availability.Mon).toHaveLength(6);
      expect(classroom.availability.Tue).toHaveLength(9);
      expect(classroom.availability.Wed).toHaveLength(1);
    });
  });
});
