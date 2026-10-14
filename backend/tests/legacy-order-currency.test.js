import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Order from "../models/order.model.js";
import { formatOrderPrice, formatPrice, getOrderCurrency } from "../../frontend/src/lib/commerce.js";

test("historical Stripe order amounts are displayed as USD", () => {
  const legacyOrder = { stripeSessionId: "cs_legacy_order", totalAmount: 19.9 };
  assert.equal(getOrderCurrency(legacyOrder), "USD");
  assert.equal(formatOrderPrice(legacyOrder.totalAmount, legacyOrder), "$19.90");
});

test("new Iranian orders are displayed in Toman", () => {
  const iranianOrder = { currency: "IRT", paymentProvider: "zarinpal", totalAmount: 125000 };
  assert.equal(getOrderCurrency(iranianOrder), "IRT");
  assert.equal(formatOrderPrice(iranianOrder.totalAmount, iranianOrder), formatPrice(125000));
});

test("an order with no reliable currency marker is not silently labeled Toman", () => {
  assert.equal(getOrderCurrency({ totalAmount: 42 }), null);
  assert.match(formatOrderPrice(42, { totalAmount: 42 }), /واحد پول نامشخص/);
});

test("legacy Stripe records hydrate without inferred payment or currency defaults", () => {
  const legacyOrder = Order.hydrate({
    _id: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    products: [{
      product: new mongoose.Types.ObjectId(),
      quantity: 1,
      price: 19.9,
    }],
    totalAmount: 19.9,
    stripeSessionId: "cs_legacy_order",
  });

  assert.equal(legacyOrder.stripeSessionId, "cs_legacy_order");
  assert.equal(legacyOrder.currency, undefined);
  assert.equal(legacyOrder.paymentProvider, undefined);
  assert.equal(legacyOrder.paymentStatus, undefined);
  assert.equal(legacyOrder.paymentRequestStatus, undefined);
  assert.equal(legacyOrder.status, undefined);
  assert.equal(legacyOrder.shipmentStatus, undefined);
});
