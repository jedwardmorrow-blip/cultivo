import type { Order, OrderItem, Product, WorkflowSummary, OrderExpansionState } from '../types';

export interface OrdersState {
  orders: Order[];
  orderDetails: Map<string, OrderItem[]>;
  workflowSummaries: Map<string, WorkflowSummary>;
  products: Product[];
  expansion: OrderExpansionState;
  loading: {
    orders: boolean;
    products: boolean;
    orderDetails: Set<string>;
  };
  error: {
    orders: Error | null;
    products: Error | null;
    orderDetails: Map<string, Error>;
  };
}

export type OrdersAction =
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_ORDERS_LOADING'; payload: boolean }
  | { type: 'SET_ORDERS_ERROR'; payload: Error | null }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_PRODUCTS_LOADING'; payload: boolean }
  | { type: 'SET_PRODUCTS_ERROR'; payload: Error | null }
  | { type: 'SET_ORDER_DETAILS'; payload: { orderId: string; items: OrderItem[]; workflowSummary: WorkflowSummary | null } }
  | { type: 'SET_ORDER_DETAILS_LOADING'; payload: { orderId: string; loading: boolean } }
  | { type: 'SET_ORDER_DETAILS_ERROR'; payload: { orderId: string; error: Error | null } }
  | { type: 'INVALIDATE_ORDER_DETAILS'; payload: string }
  | { type: 'TOGGLE_MONTH'; payload: string }
  | { type: 'TOGGLE_STATUS'; payload: string }
  | { type: 'TOGGLE_ORDER'; payload: string }
  | { type: 'SET_EXPANDED_ORDERS'; payload: Set<string> }
  | { type: 'CLEAR_ALL_EXPANSION' };

export const initialState: OrdersState = {
  orders: [],
  orderDetails: new Map(),
  workflowSummaries: new Map(),
  products: [],
  expansion: {
    expandedMonths: new Set(),
    expandedStatuses: new Set(),
    expandedOrders: new Set(),
  },
  loading: {
    orders: true,
    products: true,
    orderDetails: new Set(),
  },
  error: {
    orders: null,
    products: null,
    orderDetails: new Map(),
  },
};

export function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
        loading: { ...state.loading, orders: false },
        error: { ...state.error, orders: null },
      };

    case 'SET_ORDERS_LOADING':
      return {
        ...state,
        loading: { ...state.loading, orders: action.payload },
      };

    case 'SET_ORDERS_ERROR':
      return {
        ...state,
        error: { ...state.error, orders: action.payload },
        loading: { ...state.loading, orders: false },
      };

    case 'SET_PRODUCTS':
      return {
        ...state,
        products: action.payload,
        loading: { ...state.loading, products: false },
        error: { ...state.error, products: null },
      };

    case 'SET_PRODUCTS_LOADING':
      return {
        ...state,
        loading: { ...state.loading, products: action.payload },
      };

    case 'SET_PRODUCTS_ERROR':
      return {
        ...state,
        error: { ...state.error, products: action.payload },
        loading: { ...state.loading, products: false },
      };

    case 'SET_ORDER_DETAILS': {
      const newDetails = new Map(state.orderDetails);
      newDetails.set(action.payload.orderId, action.payload.items);

      const newWorkflow = new Map(state.workflowSummaries);
      if (action.payload.workflowSummary) {
        newWorkflow.set(action.payload.orderId, action.payload.workflowSummary);
      }

      const newLoading = new Set(state.loading.orderDetails);
      newLoading.delete(action.payload.orderId);

      const newErrors = new Map(state.error.orderDetails);
      newErrors.delete(action.payload.orderId);

      return {
        ...state,
        orderDetails: newDetails,
        workflowSummaries: newWorkflow,
        loading: { ...state.loading, orderDetails: newLoading },
        error: { ...state.error, orderDetails: newErrors },
      };
    }

    case 'SET_ORDER_DETAILS_LOADING': {
      const newLoading = new Set(state.loading.orderDetails);
      if (action.payload.loading) {
        newLoading.add(action.payload.orderId);
      } else {
        newLoading.delete(action.payload.orderId);
      }
      return {
        ...state,
        loading: { ...state.loading, orderDetails: newLoading },
      };
    }

    case 'SET_ORDER_DETAILS_ERROR': {
      const newErrors = new Map(state.error.orderDetails);
      if (action.payload.error) {
        newErrors.set(action.payload.orderId, action.payload.error);
      } else {
        newErrors.delete(action.payload.orderId);
      }

      const newLoading = new Set(state.loading.orderDetails);
      newLoading.delete(action.payload.orderId);

      return {
        ...state,
        loading: { ...state.loading, orderDetails: newLoading },
        error: { ...state.error, orderDetails: newErrors },
      };
    }

    case 'INVALIDATE_ORDER_DETAILS': {
      const newDetails = new Map(state.orderDetails);
      newDetails.delete(action.payload);

      const newWorkflow = new Map(state.workflowSummaries);
      newWorkflow.delete(action.payload);

      return {
        ...state,
        orderDetails: newDetails,
        workflowSummaries: newWorkflow,
      };
    }

    case 'TOGGLE_MONTH': {
      const newMonths = new Set(state.expansion.expandedMonths);
      if (newMonths.has(action.payload)) {
        newMonths.delete(action.payload);
      } else {
        newMonths.add(action.payload);
      }
      return {
        ...state,
        expansion: { ...state.expansion, expandedMonths: newMonths },
      };
    }

    case 'TOGGLE_STATUS': {
      const newStatuses = new Set(state.expansion.expandedStatuses);
      if (newStatuses.has(action.payload)) {
        newStatuses.delete(action.payload);
      } else {
        newStatuses.add(action.payload);
      }
      return {
        ...state,
        expansion: { ...state.expansion, expandedStatuses: newStatuses },
      };
    }

    case 'TOGGLE_ORDER': {
      const newOrders = new Set(state.expansion.expandedOrders);
      if (newOrders.has(action.payload)) {
        newOrders.delete(action.payload);
      } else {
        newOrders.add(action.payload);
      }
      return {
        ...state,
        expansion: { ...state.expansion, expandedOrders: newOrders },
      };
    }

    case 'SET_EXPANDED_ORDERS':
      return {
        ...state,
        expansion: { ...state.expansion, expandedOrders: action.payload },
      };

    case 'CLEAR_ALL_EXPANSION':
      return {
        ...state,
        expansion: {
          expandedMonths: new Set(),
          expandedStatuses: new Set(),
          expandedOrders: new Set(),
        },
      };

    default:
      return state;
  }
}
