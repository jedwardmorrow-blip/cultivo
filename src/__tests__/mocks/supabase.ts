import { vi } from 'vitest';

export const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockNeq = vi.fn().mockReturnThis();
  const mockGt = vi.fn().mockReturnThis();
  const mockLt = vi.fn().mockReturnThis();
  const mockGte = vi.fn().mockReturnThis();
  const mockLte = vi.fn().mockReturnThis();
  const mockIn = vi.fn().mockReturnThis();
  const mockIs = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockRange = vi.fn().mockReturnThis();

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    neq: mockNeq,
    gt: mockGt,
    lt: mockLt,
    gte: mockGte,
    lte: mockLte,
    in: mockIn,
    is: mockIs,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    range: mockRange,
  }));

  const mockRpc = vi.fn();
  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      getPublicUrl: vi.fn(),
      createSignedUrl: vi.fn(),
    })),
  };

  const mockAuth = {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
  };

  return {
    from: mockFrom,
    rpc: mockRpc,
    storage: mockStorage,
    auth: mockAuth,
    mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      neq: mockNeq,
      gt: mockGt,
      lt: mockLt,
      gte: mockGte,
      lte: mockLte,
      in: mockIn,
      is: mockIs,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      range: mockRange,
      rpc: mockRpc,
      storage: mockStorage,
      auth: mockAuth,
    },
  };
};

export const mockSupabaseSuccess = (data: any) => ({
  data,
  error: null,
});

export const mockSupabaseError = (message: string, code?: string) => ({
  data: null,
  error: {
    message,
    code: code || 'PGRST000',
    details: '',
    hint: '',
  },
});

export const mockAuthSuccess = (user: any, session: any = null) => ({
  data: {
    user,
    session: session || {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user,
    },
  },
  error: null,
});

export const mockAuthError = (message: string) => ({
  data: {
    user: null,
    session: null,
  },
  error: {
    message,
    status: 400,
  },
});
