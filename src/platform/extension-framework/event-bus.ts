// Event Bus - Platform Framework
// This class enables cross-extension communication through events

interface EventHistoryEntry {
  eventType: string;
  data: any;
  timestamp: Date;
}

export class EventBus {
  private subscribers: Map<string, Function[]> = new Map();
  private eventHistory: EventHistoryEntry[] = [];
  
  subscribe(eventType: string, handler: Function): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }
  
  async publish(eventType: string, data: any): Promise<void> {
    // Record the event in history
    this.eventHistory.push({
      eventType,
      data,
      timestamp: new Date()
    });
    
    // Get subscribers for this event type
    const handlers = this.subscribers.get(eventType) || [];
    
    // Call all handlers, catching errors to prevent one failure from affecting others
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        // Silently catch errors to prevent one failure from affecting others
        // TODO: Add proper logging system
      }
    }
  }
  
  unsubscribe(eventType: string, handler: Function): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  getSubscribers(eventType: string): Function[] {
    return this.subscribers.get(eventType) || [];
  }
  
  getEventHistory(): EventHistoryEntry[] {
    return [...this.eventHistory]; // Return a copy to prevent mutation
  }
} 