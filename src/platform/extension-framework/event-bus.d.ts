interface EventHistoryEntry {
    eventType: string;
    data: unknown;
    timestamp: Date;
}
export declare class EventBus {
    private subscribers;
    private eventHistory;
    subscribe(eventType: string, handler: Function): void;
    publish(eventType: string, data: unknown): Promise<void>;
    unsubscribe(eventType: string, handler: Function): void;
    getSubscribers(eventType: string): Function[];
    getEventHistory(): EventHistoryEntry[];
}
export {};
//# sourceMappingURL=event-bus.d.ts.map