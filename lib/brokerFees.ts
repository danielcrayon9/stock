export type BrokerId =
  | "kiwoom"
  | "kis"
  | "mirae"
  | "nh"
  | "samsung"
  | "kb"
  | "daishin"
  | "custom";

export type BrokerFee = {
  id: BrokerId;
  name: string;
  sellCommissionRate: number;
};

export const BROKER_FEES: BrokerFee[] = [
  { id: "kiwoom", name: "키움증권", sellCommissionRate: 0.00015 },
  { id: "kis", name: "한국투자증권", sellCommissionRate: 0.00014 },
  { id: "mirae", name: "미래에셋증권", sellCommissionRate: 0.00014 },
  { id: "nh", name: "NH투자증권", sellCommissionRate: 0.00015 },
  { id: "samsung", name: "삼성증권", sellCommissionRate: 0.00015 },
  { id: "kb", name: "KB증권", sellCommissionRate: 0.00015 },
  { id: "daishin", name: "대신증권", sellCommissionRate: 0.00015 },
  { id: "custom", name: "직접/기타", sellCommissionRate: 0.00015 },
];

export const DEFAULT_BROKER_ID: BrokerId = "kiwoom";

export function getBrokerFee(brokerId: string | null | undefined): BrokerFee {
  return BROKER_FEES.find((broker) => broker.id === brokerId) ?? BROKER_FEES[0];
}
