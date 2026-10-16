import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

const paidOrderMatch = (startDate, endDate) => ({
  currency: "IRT",
  paymentProvider: "zarinpal",
  paymentStatus: "paid",
  createdAt: { $gte: startDate, $lte: endDate },
});

export const getAnalyticsData = async (startDate, endDate) => {
  const [users, products, salesData] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments({ isActive: { $ne: false } }),
    Order.aggregate([
      { $match: paidOrderMatch(startDate, endDate) },
      { $group: { _id: null, totalSales: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } },
    ]),
  ]);
  const { totalSales, totalRevenue } = salesData[0] || { totalSales: 0, totalRevenue: 0 };
  return { users, products, totalSales, totalRevenue, revenueBasis: "gross-paid-orders" };
};

export const getDailySalesData = async (startDate, endDate) => {
  const dailySalesData = await Order.aggregate([
    { $match: paidOrderMatch(startDate, endDate) },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Tehran" } },
        sales: { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const byDate = new Map(dailySalesData.map((item) => [item._id, item]));
  return getDatesInRange(startDate, endDate).map((date) => {
    const item = byDate.get(date);
    return { date, sales: item?.sales || 0, revenue: item?.revenue || 0 };
  });
};

function getDatesInRange(startDate, endDate) {
  const calendarDate = (date) => {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
      timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
  };
  const start = calendarDate(startDate);
  const end = calendarDate(endDate);
  let cursor = Date.UTC(start.year, start.month - 1, start.day);
  const last = Date.UTC(end.year, end.month - 1, end.day);
  const dates = [];
  while (cursor <= last) {
    const date = new Date(cursor);
    dates.push(String(date.getUTCFullYear()).padStart(4, "0") + "-" +
      String(date.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(date.getUTCDate()).padStart(2, "0"));
    cursor += 24 * 60 * 60 * 1000;
  }
  return dates;
}
