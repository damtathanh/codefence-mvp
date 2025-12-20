import { mockZaloGateway } from "./mockZaloGateway";
// Later: import realZaloGateway when available
// const useMock = import.meta.env.VITE_USE_MOCK_ZALO === "true";
export const zaloGateway = mockZaloGateway;
// Later: use `useMock ? mockZaloGateway : realZaloGateway`
// Re-export simulation functions for backward compatibility
export { simulateCustomerConfirmed, simulateCustomerCancelled, simulateCustomerPaid, } from "./mockZaloGateway";
