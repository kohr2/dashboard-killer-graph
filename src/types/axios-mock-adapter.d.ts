declare module 'axios-mock-adapter' {
  import { AxiosInstance } from 'axios';

  class AxiosMockAdapter {
    constructor(instance?: AxiosInstance, options?: any);
    onGet(...args: any[]): this;
    onPost(...args: any[]): this;
    onAny(): this;
    reply(status: number, data?: any, headers?: any): this;
    reset(): void;
    restore(): void;
  }

  export default AxiosMockAdapter;
} 