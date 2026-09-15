const { BadRequestException, NotFoundException } = require('@nestjs/common');
const { ConversationsGateway } = require('../dist/conversations/conversations.gateway');

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

describe('ConversationsGateway realtime safety', () => {
  function createGateway() {
    const jwt = { verifyAsync: jest.fn() };
    const prisma = { user: { findUnique: jest.fn() } };
    const conversations = {
      get: jest.fn(),
      send: jest.fn(),
    };
    const gateway = new ConversationsGateway(jwt, prisma, conversations);
    gateway.server = { to: jest.fn(() => ({ emit: jest.fn() })) };
    return { gateway, conversations };
  }

  function socket() {
    return {
      data: { userId: '22222222-2222-4222-8222-222222222222' },
      join: jest.fn(async () => undefined),
    };
  }

  test('rejects malformed conversation ids without querying the database', async () => {
    const { gateway, conversations } = createGateway();
    const result = await gateway.join(socket(), { conversationId: 'not-a-uuid' });

    expect(result).toEqual({ ok: false, message: 'CONVERSATION_ID_INVALID' });
    expect(conversations.get).not.toHaveBeenCalled();
  });

  test('returns an acknowledgement instead of hanging when authorization fails', async () => {
    const { gateway, conversations } = createGateway();
    conversations.get.mockRejectedValue(new NotFoundException('CONVERSATION_NOT_FOUND'));

    const result = await gateway.join(socket(), { conversationId: CONVERSATION_ID });
    expect(result).toEqual({ ok: false, message: 'CONVERSATION_NOT_FOUND' });
  });

  test('rejects oversized message payloads before the service call', async () => {
    const { gateway, conversations } = createGateway();
    const result = await gateway.send(socket(), {
      conversationId: CONVERSATION_ID,
      body: 'x'.repeat(3001),
    });

    expect(result).toEqual({ ok: false, message: 'MESSAGE_INVALID' });
    expect(conversations.send).not.toHaveBeenCalled();
  });

  test('maps service rate-limit errors to a deterministic acknowledgement', async () => {
    const { gateway, conversations } = createGateway();
    conversations.send.mockRejectedValue(new BadRequestException('MESSAGE_RATE_LIMIT'));

    const result = await gateway.send(socket(), {
      conversationId: CONVERSATION_ID,
      body: 'Xin chào',
    });

    expect(result).toEqual({ ok: false, message: 'MESSAGE_RATE_LIMIT' });
  });
});
