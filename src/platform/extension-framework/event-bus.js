"use strict";
// Event Bus - Platform Framework
// This class enables cross-extension communication through events
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    constructor() {
        this.subscribers = new Map();
        this.eventHistory = [];
    }
    subscribe(eventType, handler) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType).push(handler);
    }
    async publish(eventType, data) {
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
            }
            catch (error) {
                // Silently catch errors to prevent one failure from affecting others
                // TODO: Add proper logging system
            }
        }
    }
    unsubscribe(eventType, handler) {
        const handlers = this.subscribers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    getSubscribers(eventType) {
        return this.subscribers.get(eventType) || [];
    }
    getEventHistory() {
        return [...this.eventHistory]; // Return a copy to prevent mutation
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=event-bus.js.map