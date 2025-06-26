declare global {
  var e2eHelpers: {
    api: {
      baseUrl: string;
      timeout: number;
    };
    db: {
      cleanup: () => Promise<void>;
      seed: () => Promise<void>;
    };
    wait: (ms: number) => Promise<void>;
    waitFor: (condition: () => boolean | Promise<boolean>, timeout?: number) => Promise<boolean>;
  };
  var integrationMocks: {
    neo4j: {
      driver: jest.Mock;
      session: jest.Mock;
    };
    graphAPI: {
      getAccessToken: jest.Mock;
      getEmails: jest.Mock;
    };
    externalServices: {
      isAvailable: boolean;
    };
  };
}

export {}; 