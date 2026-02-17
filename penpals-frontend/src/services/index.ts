// Main services export file

export * from './api';
export * from './auth';
export * from './account';
export * from './classroom';
export * from './chromadb';
export * from './chat';
export * from './webex';

// Re-export commonly used types
export type {
  ApiResponse,
  ApiError,
} from './api';

export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  UserWithClassrooms,
  Classroom,
} from './auth';

export type {
  AccountDetails,
  AccountStats,
  UpdateAccountData,
} from './account';

export type {
  CreateClassroomData,
  UpdateClassroomData,
  ClassroomDetails,
  ClassroomFriend,
  SearchClassroomsData,
  SearchResult,
  SearchResponse,
  ConnectClassroomsData,
} from './classroom';

export type {
  ChromaDBUploadResponse,
  ChromaDBQueryResponse,
  PostMetadata,
} from './chromadb';

export type {
  ChatMessage,
  ChatResponse,
} from './chat';

// Service classes
export { ApiClient } from './api';
export { AuthService } from './auth';
export { AccountService } from './account';
export { ClassroomService } from './classroom';