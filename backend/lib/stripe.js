import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

let stripeClient;

export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required when Stripe is the selected payment provider");
  }
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};
