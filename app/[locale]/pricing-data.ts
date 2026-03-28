export interface PricingPlan {
  id: string;
  name: string;
  priceFrontend: string;
  description: string;
  features: string[];
  iotCharge: number;
  iotChargeLabel: string;
  iotPriceId: string;
  priceMonthly: number;
  trialDays: number;
  priceId: string;
  price: number;
  currency: string;
  duration: string;
  interval: string;
  popular: boolean;
  limits: {
    warehouses: number;
    silos: number;
    users: number;
    managers: number;
    technicians: number;
    storage: number;
  };
  link?: string;
}

const pricingData: PricingPlan[] = [
  {
    id: "basic",
    name: "Starter",
    priceFrontend: "Rs. 1,499/mo",
    description: "Perfect for small grain operations with a single warehouse.",
    features: [
      "1 Warehouse",
      "3 Silos",
      "5 Staff (2 Managers + 3 Technicians)",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    iotCharge: 7000,
    iotChargeLabel: "Rs. 7,000 per unit",
    iotPriceId: "price_1TFqSdPNeDUmvgDDVXUqScWH",
    priceMonthly: 1499,
    trialDays: 30,
    priceId: "price_1TFqUZPNeDUmvgDD93NpAUBv",
    price: 1499,
    currency: "PKR",
    duration: "/month",
    interval: "month",
    popular: false,
    limits: {
      warehouses: 1,
      silos: 3,
      users: 5,
      managers: 2,
      technicians: 3,
      storage: 10,
    },
  },
  {
    id: "intermediate",
    name: "Professional",
    priceFrontend: "Rs. 3,899/mo",
    description:
      "Advanced features for growing grain operations with multiple warehouses.",
    features: [
      "2 Warehouses",
      "6 Silos",
      "10 Staff",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    iotCharge: 7000,
    iotChargeLabel: "Rs. 7,000 per unit",
    iotPriceId: "price_1TFqSdPNeDUmvgDDVXUqScWH",
    priceMonthly: 3899,
    trialDays: 30,
    priceId: "price_1TFqTkPNeDUmvgDDN6ccERyz",
    price: 3899,
    currency: "PKR",
    duration: "/month",
    interval: "month",
    popular: true,
    limits: {
      warehouses: 2,
      silos: 6,
      users: 10,
      managers: -1,
      technicians: -1,
      storage: 50,
    },
  },
  {
    id: "pro",
    name: "Enterprise",
    priceFrontend: "Rs. 5,999/mo",
    description:
      "Complete solution for large grain operations with unlimited staff.",
    features: [
      "5 Warehouses",
      "15 Silos",
      "Unlimited Staff",
      "Mobile Panel",
      "Web Panel",
      "AI Predictions",
    ],
    iotCharge: 7000,
    iotChargeLabel: "Rs. 7,000 per unit",
    iotPriceId: "price_1TFqSdPNeDUmvgDDVXUqScWH",
    priceMonthly: 5999,
    trialDays: 30,
    priceId: "price_1TFqTDPNeDUmvgDDkvmDFuH2",
    price: 5999,
    currency: "PKR",
    duration: "/month",
    interval: "month",
    popular: false,
    limits: {
      warehouses: 5,
      silos: 15,
      users: -1,
      managers: -1,
      technicians: -1,
      storage: -1,
    },
  },
  {
    id: "custom",
    name: "Custom Solution",
    priceFrontend: "Contact Us",
    description: "Tailored solution with specialized features for large enterprises.",
    features: [
      "Unlimited Warehouses",
      "Unlimited Silos",
      "Custom IoT Sensors",
      "Dedicated Support",
      "On-premise Deployment",
      "Custom AI Models",
    ],
    iotCharge: 0,
    iotChargeLabel: "Custom Setup",
    iotPriceId: "custom",
    priceMonthly: 0,
    trialDays: 0,
    priceId: "custom",
    price: 0,
    currency: "PKR",
    duration: "",
    interval: "month",
    popular: false,
    limits: {
      warehouses: -1,
      silos: -1,
      users: -1,
      managers: -1,
      technicians: -1,
      storage: -1,
    },
    link: "mailto:support@grainhero.com?subject=Custom%20Solution%20Inquiry",
  },
];

export default pricingData;
