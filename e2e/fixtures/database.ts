/**
 * Database Fixtures
 * 
 * Provides utilities for seeding test data into the database.
 * Used to create consistent test scenarios across different test suites.
 */

import { nanoid } from 'nanoid';

export interface TestChannel {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_by: string;
}

export interface TestMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
}

export interface TestGroup {
  id: string;
  name: string;
  description?: string;
}

/**
 * Generate a unique test channel name
 */
export function generateChannelName(prefix: string = 'test-channel'): string {
  return `${prefix}-${nanoid(8)}`;
}

/**
 * Generate a unique test group name
 */
export function generateGroupName(prefix: string = 'test-group'): string {
  return `${prefix}-${nanoid(8)}`;
}

/**
 * Test data generator for channels
 */
export function createTestChannel(overrides?: Partial<TestChannel>): TestChannel {
  return {
    id: nanoid(),
    name: generateChannelName(),
    description: 'Test channel for E2E testing',
    is_public: true,
    created_by: 'test-user-id',
    ...overrides,
  };
}

/**
 * Test data generator for messages
 */
export function createTestMessage(overrides?: Partial<TestMessage>): TestMessage {
  return {
    id: nanoid(),
    channel_id: 'test-channel-id',
    user_id: 'test-user-id',
    content: 'Test message content',
    ...overrides,
  };
}

/**
 * Test data generator for groups
 */
export function createTestGroup(overrides?: Partial<TestGroup>): TestGroup {
  return {
    id: nanoid(),
    name: generateGroupName(),
    description: 'Test group for E2E testing',
    ...overrides,
  };
}

/**
 * Mock data for typical test scenarios
 */
export const MOCK_DATA = {
  // Sample channels
  channels: {
    general: {
      id: 'channel-general',
      name: 'general',
      description: 'General discussion channel',
      is_public: true,
    },
    random: {
      id: 'channel-random',
      name: 'random',
      description: 'Random chat',
      is_public: true,
    },
    private: {
      id: 'channel-private',
      name: 'private-channel',
      description: 'Private channel for team',
      is_public: false,
    },
  },
  
  // Sample messages
  messages: {
    simple: 'Hello, this is a test message!',
    withMention: '@user1 please check this out',
    withChannelRef: 'Discussed in #general',
    withGitHubMention: 'See @github/owner/repo#123 for details',
    withGitLabMention: 'Check @gitlab/project#456',
    withUrl: 'Check this PR: https://github.com/owner/repo/pull/123',
  },
  
  // Sample groups
  groups: {
    developers: {
      id: 'group-developers',
      name: 'developers',
      description: 'All developers',
    },
    admins: {
      id: 'group-admins',
      name: 'admins',
      description: 'Admin users',
    },
  },
};

/**
 * Helper to create a message with a thread
 */
export function createThreadedMessages(channelId: string, userId: string) {
  const parentMessage = createTestMessage({
    channel_id: channelId,
    user_id: userId,
    content: 'Parent message for thread',
  });
  
  const replies = [
    createTestMessage({
      channel_id: channelId,
      user_id: userId,
      content: 'First reply',
      parent_id: parentMessage.id,
    }),
    createTestMessage({
      channel_id: channelId,
      user_id: userId,
      content: 'Second reply',
      parent_id: parentMessage.id,
    }),
  ];
  
  return { parentMessage, replies };
}

/**
 * Database cleanup utility
 * Note: In practice, you might want to wrap tests in transactions
 * or use database snapshots for faster cleanup
 */
export async function cleanupTestData() {
  // This would connect to the test database and clean up
  // For now, it's a placeholder - actual implementation depends on your DB setup
  console.log('Cleaning up test data...');
}

/**
 * Wait for database operation to complete
 * Useful for ensuring data is persisted before assertions
 */
export async function waitForDbSync(ms: number = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}
