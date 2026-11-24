import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "true" && Boolean(process.env.DATABASE_URL);

test("PostgreSQL adapter atomically reserves and restores variant stock", { skip: !enabled }, async t => {
  const [{ prisma, connectPostgres }, { createPrismaModel }, { startPrismaSession }] = await Promise.all([
    import("../lib/prisma.js"), import("../lib/prisma-model.js"), import("../lib/prisma-session.js"),
  ]);
  const Product = createPrismaModel("product");
  await connectPostgres();
  const product = await Product.create({
    name: "PostgreSQL inventory integration fixture",
    description: "Disposable test-only product",
    price: 100000,
    discountPercent: 0,
    category: "test-fixtures",
    stock: null,
    variants: [{ size: "M", color: "Black", stock: 5 }],
  });
  t.after(async () => {
    await prisma.product.deleteMany({ where: { id: product._id } });
    await prisma.$disconnect();
  });

  const session = startPrismaSession();
  await session.withTransaction(async () => {
    const current = await Product.findOne({
      _id: product._id,
      variants: { $elemMatch: { size: "M", color: "Black" } },
    }).session(session).lean();
    assert.ok(current);
    assert.equal(current.variants[0].stock, 5);
    const updated = await Product.updateOne(
      { _id: product._id, variants: { $elemMatch: { size: "M", color: "Black" } } },
      { $inc: { "variants.$.stock": -2 } },
      { session },
    );
    assert.equal(updated.matchedCount, 1);
  });
  await session.endSession();
  const afterReserve = await Product.findById(product._id).lean();
  assert.equal(afterReserve.variants[0].stock, 3);

  const rollbackSession = startPrismaSession();
  await assert.rejects(rollbackSession.withTransaction(async () => {
    await Product.updateOne({ _id: product._id }, { $inc: { "variants.$.stock": 4 } }, { session: rollbackSession });
    throw new Error("force-rollback");
  }), /force-rollback/);
  await rollbackSession.endSession();
  const afterRollback = await Product.findById(product._id).lean();
  assert.equal(afterRollback.variants[0].stock, 3);
});

test("PostgreSQL coupon reservation enforces the finite usage limit", { skip: !enabled }, async t => {
  const [{ prisma, connectPostgres }, { reserveCoupon }, { startPrismaSession }] = await Promise.all([
    import("../lib/prisma.js"), import("../lib/coupons.js"), import("../lib/prisma-session.js"),
  ]);
  await connectPostgres();
  const code = `PG-${randomBytes(5).toString("hex").toUpperCase()}`;
  const coupon = await prisma.coupon.create({ data: {
    code,
    description: "Disposable PostgreSQL integration fixture",
    discountPercentage: 10,
    startsAt: new Date(Date.now() - 60_000),
    expiresAt: new Date(Date.now() + 60 * 60_000),
    minOrderAmount: 0,
    usageLimit: 1,
    usageCount: 0,
    reservedCount: 0,
    isActive: true,
  } });
  t.after(async () => {
    await prisma.coupon.deleteMany({ where: { id: coupon.id } });
    await prisma.$disconnect();
  });

  const first = startPrismaSession();
  let reservation;
  await first.withTransaction(async () => {
    reservation = await reserveCoupon(code, 100000, new Date(), { session: first });
  });
  await first.endSession();
  assert.equal(reservation.error, "");
  assert.equal(reservation.coupon.reservedCount, 1);

  const second = startPrismaSession();
  let secondReservation;
  await second.withTransaction(async () => {
    secondReservation = await reserveCoupon(code, 100000, new Date(), { session: second });
  });
  await second.endSession();
  assert.match(secondReservation.error, /ظرفیت استفاده/);
  const stored = await prisma.coupon.findUnique({ where: { id: coupon.id } });
  assert.equal(stored.reservedCount, 1);
});

test("all 13 Prisma model families persist and hydrate their API relations", { skip: !enabled }, async t => {
  const [{ prisma, connectPostgres }, { createPrismaModel }] = await Promise.all([
    import("../lib/prisma.js"), import("../lib/prisma-model.js"),
  ]);
  await connectPostgres();
  const models = {
    User: createPrismaModel("user"),
    AccountSession: createPrismaModel("accountSession"),
    SecurityNotification: createPrismaModel("securityNotification"),
    AuditLog: createPrismaModel("auditLog"),
    Campaign: createPrismaModel("campaign"),
    Category: createPrismaModel("category"),
    Coupon: createPrismaModel("coupon"),
    NewsletterSubscriber: createPrismaModel("newsletterSubscriber"),
    Order: createPrismaModel("order"),
    ProductReview: createPrismaModel("productReview"),
    Product: createPrismaModel("product"),
    ServiceCase: createPrismaModel("serviceCase"),
    StoreSettings: createPrismaModel("storeSettings"),
  };
  const suffix = randomBytes(6).toString("hex");
  const email = `prisma-${suffix}@example.test`;
  const slug = `prisma-${suffix}`;
  const created = {};
  t.after(async () => {
    if (created.user?._id) {
      await prisma.productReview.deleteMany({ where: { userId: created.user._id } });
      await prisma.serviceCase.deleteMany({ where: { userId: created.user._id } });
      await prisma.order.deleteMany({ where: { userId: created.user._id } });
      await prisma.accountSession.deleteMany({ where: { userId: created.user._id } });
      await prisma.securityNotification.deleteMany({ where: { userId: created.user._id } });
      await prisma.auditLog.deleteMany({ where: { actorId: created.user._id } });
      await prisma.campaign.deleteMany({ where: { createdById: created.user._id } });
      await prisma.coupon.deleteMany({ where: { createdById: created.user._id } });
      await prisma.user.deleteMany({ where: { id: created.user._id } });
    }
    if (created.coupon?._id) await prisma.coupon.deleteMany({ where: { id: created.coupon._id } });
    await prisma.newsletterSubscriber.deleteMany({ where: { email: `news-${suffix}@example.test` } });
    await prisma.storeSettings.deleteMany({ where: { key: `test-${suffix}` } });
    if (created.product?._id) await prisma.product.deleteMany({ where: { id: created.product._id } });
    if (created.category?._id) await prisma.category.deleteMany({ where: { id: created.category._id } });
    await prisma.$disconnect();
  });

  created.user = await models.User.create({
    name: "PostgreSQL Integration User",
    email: email.toUpperCase(),
    password: "Violet!Harbor92-Slate",
  });
  assert.match(created.user._id, /^[a-f0-9]{24}$/);
  assert.equal(await created.user.comparePassword("Violet!Harbor92-Slate"), true);
  assert.equal((await models.User.findOne({ email }).select("name email").lean()).email, email);

  created.category = await models.Category.create({
    name: { fa: "آزمایش", en: "Integration" }, slug,
    attributes: [{ key: "series", name: { fa: "سری", en: "Series" } }],
  });
  created.product = await models.Product.create({
    name: "PostgreSQL Integration Product", description: "Disposable product fixture",
    price: 125000, discountPercent: 10, category: slug, categoryId: created.category._id,
    stock: 5, variants: [{ size: "M", color: "Black", stock: 5 }],
  });
  created.session = await models.AccountSession.create({
    user: created.user._id, tokenId: `session-${suffix}`, expiresAt: new Date(Date.now() + 60_000),
  });
  created.notification = await models.SecurityNotification.create({
    user: created.user._id, type: "new_login", title: "Test", message: "Test notification",
  });
  created.audit = await models.AuditLog.create({
    actor: created.user._id, action: "integration.test", targetType: "product", summary: "Test audit event",
  });
  created.coupon = await models.Coupon.create({
    code: `PG${suffix.toUpperCase()}`, discountPercentage: 10,
    startsAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 60_000),
  });
  created.newsletter = await models.NewsletterSubscriber.create({
    email: `news-${suffix}@example.test`, consentedAt: new Date(),
  });
  created.order = await models.Order.create({
    user: created.user._id,
    products: [{ product: created.product._id, quantity: 1, price: 125000, productName: created.product.name }],
    totalAmount: 125000, currency: "IRT", paymentProvider: "zarinpal",
  });
  created.review = await models.ProductReview.create({
    product: created.product._id, user: created.user._id, order: created.order._id,
    rating: 5, displayName: "Integration User", status: "pending",
  });
  created.campaign = await models.Campaign.create({
    title: "Integration Campaign", slug, endsAt: new Date(Date.now() + 60_000),
    createdBy: created.user._id, productIds: [created.product._id],
  });
  created.case = await models.ServiceCase.create({
    user: created.user._id, order: created.order._id, handledBy: created.user._id,
    type: "support", subject: "Integration case", message: "A disposable integration fixture.",
  });
  created.settings = await models.StoreSettings.create({ key: `test-${suffix}`, flatRate: 15000 });

  const hydratedOrder = await models.Order.findById(created.order._id)
    .populate("user", "name email")
    .populate("products.product", "name")
    .lean();
  assert.equal(hydratedOrder.user.email, email);
  assert.equal(hydratedOrder.products[0].product.name, created.product.name);
  assert.equal("searchTokens" in hydratedOrder.products[0].product, false);
  assert.equal("effectivePrice" in hydratedOrder.products[0].product, false);

  const hydratedCampaign = await models.Campaign.findById(created.campaign._id)
    .populate("products", "name").lean();
  assert.equal(hydratedCampaign.products[0].name, created.product.name);

  const hydratedReview = await models.ProductReview.findById(created.review._id)
    .populate("product", "name").populate("user", "name").lean();
  assert.equal(hydratedReview.product.name, created.product.name);
  assert.equal(hydratedReview.user.name, created.user.name);

  const hydratedCase = await models.ServiceCase.findById(created.case._id)
    .populate("order", "totalAmount").populate("handledBy", "name").lean();
  assert.equal(Number(hydratedCase.order.totalAmount), 125000);
  assert.equal(hydratedCase.handledBy.name, created.user.name);

  const safeUser = await models.User.findById(created.user._id).select("-password").lean();
  assert.equal("password" in safeUser, false);
  assert.equal(created.session.user, created.user._id);
  assert.equal(created.notification.user, created.user._id);
  assert.equal(created.audit.actor, created.user._id);
  assert.equal(created.newsletter.email, `news-${suffix}@example.test`);
  assert.equal(Number(created.settings.flatRate), 15000);
});


test("PostgreSQL adapter upserts a missing scalar record on first use", { skip: !enabled }, async t => {
  const [{ prisma, connectPostgres }, { createPrismaModel }] = await Promise.all([
    import("../lib/prisma.js"), import("../lib/prisma-model.js"),
  ]);
  await connectPostgres();
  const StoreSettings = createPrismaModel("storeSettings");
  const key = `upsert-${randomBytes(6).toString("hex")}`;
  t.after(async () => {
    await prisma.storeSettings.deleteMany({ where: { key } });
    await prisma.$disconnect();
  });

  const created = await StoreSettings.findOneAndUpdate(
    { key },
    { $set: { flatRate: 17500, freeShippingThreshold: 250000 } },
    { upsert: true, new: true },
  ).lean();

  assert.ok(created);
  assert.equal(created.key, key);
  assert.equal(Number(created.flatRate), 17500);
  assert.equal(Number(created.freeShippingThreshold), 250000);
  assert.equal(await prisma.storeSettings.count({ where: { key } }), 1);
});

test("PostgreSQL adapter updateOne only changes the first JSON-array post-filter match", { skip: !enabled }, async t => {
  const [{ prisma, connectPostgres }, { createPrismaModel }] = await Promise.all([
    import("../lib/prisma.js"), import("../lib/prisma-model.js"),
  ]);
  await connectPostgres();
  const Product = createPrismaModel("product");
  const suffix = randomBytes(6).toString("hex");
  const created = [];
  for (const name of [`post-filter-a-${suffix}`, `post-filter-b-${suffix}`]) {
    created.push(await Product.create({
      name, description: "Disposable JSON post-filter fixture", price: 1000,
      category: "integration-fixtures", variants: [{ size: "M", color: "Black", stock: 2 }],
    }));
  }
  t.after(async () => {
    await prisma.product.deleteMany({ where: { id: { in: created.map(item => item._id) } } });
    await prisma.$disconnect();
  });

  const result = await Product.updateOne(
    { _id: { $in: created.map(item => item._id) }, variants: { $elemMatch: { size: "M", color: "Black" } } },
    { $set: { brandName: `updated-${suffix}` } },
  );
  assert.equal(result.matchedCount, 1);
  const rows = await prisma.product.findMany({ where: { id: { in: created.map(item => item._id) } } });
  assert.equal(rows.filter(row => row.brandName === `updated-${suffix}`).length, 1);
});

test("PostgreSQL adapter deleteOne and deleteMany honor JSON-array post-filters", { skip: !enabled }, async t => {
  const [{ prisma, connectPostgres }, { createPrismaModel }] = await Promise.all([
    import("../lib/prisma.js"), import("../lib/prisma-model.js"),
  ]);
  await connectPostgres();
  const Product = createPrismaModel("product");
  const suffix = randomBytes(6).toString("hex");
  const matching = [];
  const nonMatching = [];
  for (const [name, variants] of [
    [`delete-match-a-${suffix}`, [{ size: "M", color: "Black" }]],
    [`delete-match-b-${suffix}`, [{ size: "M", color: "Black" }]],
    [`delete-keep-${suffix}`, [{ size: "L", color: "Blue" }]],
  ]) {
    const product = await Product.create({
      name, description: "Disposable JSON delete fixture", price: 1000,
      category: "integration-fixtures", variants,
    });
    (name.includes("delete-keep") ? nonMatching : matching).push(product);
  }
  t.after(async () => {
    await prisma.product.deleteMany({
      where: { id: { in: [...matching, ...nonMatching].map(item => item._id) } },
    });
    await prisma.$disconnect();
  });

  const filter = {
    _id: { $in: matching.map(item => item._id) },
    variants: { $elemMatch: { size: "M", color: "Black" } },
  };
  const one = await Product.deleteOne(filter);
  assert.equal(one.deletedCount, 1);
  const remainingMatches = await prisma.product.findMany({
    where: { id: { in: matching.map(item => item._id) } },
  });
  assert.equal(remainingMatches.length, 1);

  const many = await Product.deleteMany(filter);
  assert.equal(many.count, 1);
  const kept = await prisma.product.findUnique({ where: { id: nonMatching[0]._id } });
  assert.ok(kept);
  const deletedMatches = await prisma.product.findMany({
    where: { id: { in: matching.map(item => item._id) } },
  });
  assert.equal(deletedMatches.length, 0);
});
