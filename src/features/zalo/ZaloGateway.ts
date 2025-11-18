import type { Order } from "../../types/supabase";

export interface ZaloGateway {
  sendConfirmation(order: Order): Promise<void>;
  sendQrPayment?(order: Order): Promise<void>;
}

