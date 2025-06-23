// Platform Event Bus Tests
// These tests drive the development of cross-extension communication

describe('EventBus', () => {
  describe('Event Subscription', () => {
    it('should subscribe to events successfully', () => {
      // Arrange
      const eventBus = new EventBus();
      const mockHandler = jest.fn();

      // Act
      eventBus.subscribe('DealCreated', mockHandler);

      // Assert
      expect(eventBus.getSubscribers('DealCreated')).toContain(mockHandler);
    });

    it('should allow multiple subscribers for the same event', () => {
      // Arrange
      const eventBus = new EventBus();
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      // Act
      eventBus.subscribe('ContactUpdated', handler1);
      eventBus.subscribe('ContactUpdated', handler2);

      // Assert
      const subscribers = eventBus.getSubscribers('ContactUpdated');
      expect(subscribers).toContain(handler1);
      expect(subscribers).toContain(handler2);
      expect(subscribers).toHaveLength(2);
    });

    it('should return empty array for non-existent event subscribers', () => {
      // Arrange
      const eventBus = new EventBus();

      // Act
      const subscribers = eventBus.getSubscribers('NonExistentEvent');

      // Assert
      expect(subscribers).toEqual([]);
    });
  });

  describe('Event Publishing', () => {
    it('should publish events to subscribers', async () => {
      // Arrange
      const eventBus = new EventBus();
      const mockHandler = jest.fn();
      const eventData = { dealId: '123', amount: 50000 };

      eventBus.subscribe('DealCreated', mockHandler);

      // Act
      await eventBus.publish('DealCreated', eventData);

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(eventData);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should publish to all subscribers', async () => {
      // Arrange
      const eventBus = new EventBus();
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const eventData = { contactId: '456' };

      eventBus.subscribe('ContactCreated', handler1);
      eventBus.subscribe('ContactCreated', handler2);

      // Act
      await eventBus.publish('ContactCreated', eventData);

      // Assert
      expect(handler1).toHaveBeenCalledWith(eventData);
      expect(handler2).toHaveBeenCalledWith(eventData);
    });

    it('should handle publishing to events with no subscribers', async () => {
      // Arrange
      const eventBus = new EventBus();

      // Act & Assert - should not throw
      await expect(eventBus.publish('UnsubscribedEvent', {})).resolves.not.toThrow();
    });
  });

  describe('Event Unsubscription', () => {
    it('should unsubscribe handlers from events', () => {
      // Arrange
      const eventBus = new EventBus();
      const handler = jest.fn();

      eventBus.subscribe('TaskCompleted', handler);
      expect(eventBus.getSubscribers('TaskCompleted')).toContain(handler);

      // Act
      eventBus.unsubscribe('TaskCompleted', handler);

      // Assert
      expect(eventBus.getSubscribers('TaskCompleted')).not.toContain(handler);
    });

    it('should handle unsubscribing non-existent handlers gracefully', () => {
      // Arrange
      const eventBus = new EventBus();
      const handler = jest.fn();

      // Act & Assert - should not throw
      expect(() => {
        eventBus.unsubscribe('TaskCompleted', handler);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event handlers gracefully', async () => {
      // Arrange
      const eventBus = new EventBus();
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = jest.fn();

      eventBus.subscribe('ErrorTest', errorHandler);
      eventBus.subscribe('ErrorTest', goodHandler);

      // Act & Assert - should not throw and should call good handler
      await expect(eventBus.publish('ErrorTest', {})).resolves.not.toThrow();
      expect(goodHandler).toHaveBeenCalled();
    });
  });

  describe('Event History', () => {
    it('should track published events', async () => {
      // Arrange
      const eventBus = new EventBus();
      const eventData = { id: '123' };

      // Act
      await eventBus.publish('TestEvent', eventData);

      // Assert
      const history = eventBus.getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        eventType: 'TestEvent',
        data: eventData,
        timestamp: expect.any(Date)
      });
    });
  });
});

// Import statements (these will fail initially)
import { EventBus } from '@platform/extension-framework/event-bus'; 