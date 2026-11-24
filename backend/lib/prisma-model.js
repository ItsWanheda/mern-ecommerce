import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { getPasswordPolicyError } from "./password-policy.js";
import { buildNormalizedProductSearchText, buildNormalizedProductSearchTokens } from "./persian-search.js";
import { getProductDiscountedPrice } from "./product-pricing.js";

const hiddenUserFields = new Set([
  "passwordResetTokenHash", "passwordResetExpiresAt", "emailVerificationTokenHash",
  "emailVerificationExpiresAt", "emailChangeTokenHash", "emailChangeExpiresAt", "twoFactorSecret",
]);
const hiddenFieldsByModel = {
  product: new Set(["searchTextNormalized", "searchTokens", "effectivePrice"]),
};
const aliasesByModel = {
  user: {},
  accountSession: { user: "userId" },
  securityNotification: { user: "userId" },
  auditLog: { actor: "actorId" },
  campaign: { createdBy: "createdById" },
  category: {},
  coupon: { createdBy: "createdById" },
  newsletterSubscriber: {},
  order: { user: "userId" },
  productReview: { product: "productId", user: "userId", order: "orderId", moderatedBy: "moderatedById" },
  product: {},
  serviceCase: { user: "userId", order: "orderId", handledBy: "handledById" },
  storeSettings: { updatedBy: "updatedById" },
};
const jsonFieldsByModel = {
  user: new Set(["defaultShippingAddress", "savedShippingAddresses", "cartItems", "permissions", "communicationPreferences"]),
  accountSession: new Set(), securityNotification: new Set(["metadata"]), auditLog: new Set(["metadata"]),
  campaign: new Set(), category: new Set(["name", "description", "attributes"]), coupon: new Set(),
  newsletterSubscriber: new Set(), order: new Set(["products", "shippingAddress", "shipmentEvents"]),
  productReview: new Set(), product: new Set(["attributes", "customSpecifications", "colors", "variants", "fit", "sizeChart"]),
  serviceCase: new Set(["events"]), storeSettings: new Set(),
};
const nullableJsonFieldsByModel = {
  user: new Set(["defaultShippingAddress", "permissions"]),
  order: new Set(["shippingAddress"]),
};
const nullableScalarFieldsByModel = {
  user: new Set([
    "passwordResetTokenHash", "passwordResetExpiresAt", "emailVerificationTokenHash",
    "emailVerificationExpiresAt", "emailChangeTokenHash", "emailChangeExpiresAt",
  ]),
  campaign: new Set(["slug", "createdById"]),
  category: new Set(["parentId"]),
  coupon: new Set(["maxDiscountAmount", "usageLimit", "createdById"]),
  order: new Set([
    "shipmentStatus", "shippedAt", "deliveredAt", "paymentRequestAttemptedAt",
    "reconciliationLastAttemptAt", "reconciliationNextAttemptAt", "zarinpalAuthority",
    "expiresAt", "finalizedAt",
  ]),
  product: new Set(["brand", "brandName", "categoryId", "effectivePrice", "stock"]),
  productReview: new Set(["moderatedById", "moderatedAt"]),
  serviceCase: new Set(["orderId", "handledById"]),
  storeSettings: new Set(["updatedById"]),
};
export const isValidDatabaseId = value => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
const unwrapTransaction = value => value?.transaction || value || null;
const getDelegate = (model, tx) => (unwrapTransaction(tx) || prisma)[model];
const jsonArrayFields = {
  user: new Set(["savedShippingAddresses", "cartItems"]),
  order: new Set(["products", "shipmentEvents"]),
  product: new Set(["colors", "variants", "customSpecifications", "sizeChart"]),
  serviceCase: new Set(["events"]),
};
const filterNeedsPostProcessing = (model, filter = {}) => {
  if (!isPlainObject(filter)) return false;
  return Object.entries(filter).some(([field, condition]) => {
    if (field === "$expr") return true;
    if (["$or", "$and", "$nor"].includes(field)) return condition.some(item => filterNeedsPostProcessing(model, item));
    const root = field.split(".")[0];
    if (field.includes(".") && jsonArrayFields[model]?.has(root)) return true;
    if (isPlainObject(condition)) {
      if ("$elemMatch" in condition || "$size" in condition) return true;
      if (jsonFieldsByModel[model]?.has(root) && ["$all", "$exists", "$regex"].some(operator => operator in condition)) return true;
    }
    return false;
  });
};
const getPath = (object, path) => path.split(".").reduce((value, key) => value == null ? undefined : value[key], object);
const setPath = (object, path, value) => {
  const parts = path.split(".");
  let target = object;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const key = /^\d+$/.test(part) ? Number(part) : part;
    const nextIsIndex = /^\d+$/.test(parts[index + 1]);
    if (target[key] == null) target[key] = nextIsIndex ? [] : {};
    target = target[key];
  }
  const last = parts.at(-1);
  target[/^\d+$/.test(last) ? Number(last) : last] = value;
};
const idField = (model, field) => {
  const [base, ...rest] = field.split(".");
  const mapped = base === "_id" ? "id" : aliasesByModel[model]?.[base] || base;
  return [mapped, ...rest].join(".");
};
const scalarArrayFields = { category: new Set(["ancestors"]), user: new Set(["wishlist"]), product: new Set(["images", "sizes", "searchTokens"]) };
const isPlainObject = value => value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof RegExp);
const regexText = value => value instanceof RegExp ? value.source.replace(/\\([.*+?^${}()|[\]\\])/g, "$1").replace(/^\^|\$$/g, "") : String(value);

function normalizeFieldCondition(model, field, condition) {
  const normalize = value => {
    if (Array.isArray(value)) return value.map(normalize);
    if (isPlainObject(value) && !(value instanceof Date)) return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalize(nested)])
    );
    if (typeof value !== "string") return value;
    if ((model === "user" && field === "email") || (model === "newsletterSubscriber" && field === "email")) return value.trim().toLowerCase();
    if ((model === "campaign" && field === "slug") || (model === "category" && field === "slug")) return value.trim().toLowerCase();
    if (model === "coupon" && field === "code") return value.trim().toUpperCase();
    return value;
  };
  return normalize(condition);
}

function translateFieldCondition(model, field, condition) {
  condition = normalizeFieldCondition(model, field, condition);
  const mappedField = idField(model, field);
  const [root, ...path] = mappedField.split(".");
  const json = jsonFieldsByModel[model]?.has(root);

  if (condition instanceof RegExp) {
    if (json && path.length && jsonArrayFields[model]?.has(root)) return {};
    if (json) return { [root]: { path, string_contains: regexText(condition) } };
    const stringFilter = { contains: regexText(condition) };
    if (condition.flags.includes("i")) stringFilter.mode = "insensitive";
    return { [root]: stringFilter };
  }
  if (Array.isArray(condition)) return json
    ? { [root]: { array_contains: condition } }
    : { [root]: { hasSome: condition } };
  if (!isPlainObject(condition)) {
    if (json && path.length && jsonArrayFields[model]?.has(root)) return {};
    if (json && path.length) return { [root]: { path, equals: condition } };
    if (!path.length && scalarArrayFields[model]?.has(root)) return { [root]: { has: condition } };
    return { [mappedField]: condition };
  }

  // Mongo-style operators are translated at this compatibility boundary. All
  // persistence and filtering below this point is performed by Prisma/PostgreSQL.
  const entries = Object.entries(condition);
  if (!entries.some(([key]) => key.startsWith("$"))) {
    if (json && path.length && jsonArrayFields[model]?.has(root)) return {};
    if (json && path.length) return { [root]: { path, equals: condition } };
    return { [mappedField]: condition };
  }
  const clauses = [];
  for (const [operator, value] of entries) {
    if (operator === "$in" || operator === "$nin") {
      const mappedValues = value.map(item => item instanceof RegExp ? regexText(item) : item);
      const nonNullValues = mappedValues.filter(item => item !== null);
      const includesNull = mappedValues.some(item => item === null);
      if (json && path.length && jsonArrayFields[model]?.has(root)) {
        // Evaluated against the JSONB array after the narrowed SQL query.
      } else if (json && path.length) {
        clauses.push({ OR: mappedValues.map(item => ({ [root]: { path, equals: item } })) });
      } else if (!path.length && scalarArrayFields[model]?.has(root)) {
        clauses.push(operator === "$in"
          ? { [root]: { hasSome: mappedValues } }
          : { NOT: { [root]: { hasSome: mappedValues } } });
      } else if (nullableScalarFieldsByModel[model]?.has(root)) {
        if (operator === "$in") {
          const alternatives = [];
          if (nonNullValues.length) alternatives.push({ [mappedField]: { in: nonNullValues } });
          if (includesNull) alternatives.push({ [mappedField]: null });
          if (alternatives.length === 1) clauses.push(alternatives[0]);
          else if (alternatives.length > 1) clauses.push({ OR: alternatives });
          else clauses.push({ [mappedField]: { in: [] } });
        } else if (includesNull) {
          const notNull = { [mappedField]: { not: null } };
          if (nonNullValues.length) clauses.push({ AND: [{ [mappedField]: { notIn: nonNullValues } }, notNull] });
          else clauses.push(notNull);
        } else if (nonNullValues.length) {
          clauses.push({ OR: [{ [mappedField]: { notIn: nonNullValues } }, { [mappedField]: null }] });
        }
      } else if (operator === "$in") {
        // Required PostgreSQL scalar columns cannot contain SQL NULL.
        clauses.push({ [mappedField]: { in: nonNullValues } });
      } else if (nonNullValues.length) {
        clauses.push({ [mappedField]: { notIn: nonNullValues } });
      }
    } else if (operator === "$all") {
      if (!path.length && scalarArrayFields[model]?.has(root)) {
        const exactValues = value.map(item => item instanceof RegExp ? regexText(item).replace(/^\^/, "").replace(/\$$/, "") : item);
        clauses.push({ [root]: { hasEvery: exactValues } });
      } else {
        // Array-of-object and JSON path operators are applied by the post-filter
        // so that PostgreSQL receives only valid Prisma JSON filters.
      }
    } else if (operator === "$ne") {
      if (json && path.length && jsonArrayFields[model]?.has(root)) continue;
      else if (json && path.length) clauses.push({ NOT: { [root]: { path, equals: value } } });
      else clauses.push({ [mappedField]: { not: value } });
    } else if (["$gt", "$gte", "$lt", "$lte"].includes(operator)) {
      const key = ({ $gt: "gt", $gte: "gte", $lt: "lt", $lte: "lte" })[operator];
      if (json && path.length && jsonArrayFields[model]?.has(root)) continue;
      else if (json && path.length) clauses.push({ [root]: { path, [key]: value } });
      else clauses.push({ [mappedField]: { [key]: value } });
    } else if (operator === "$exists") {
      clauses.push({ [mappedField]: value ? { not: null } : null });
    } else if (operator === "$size") {
      if (json) clauses.push({ [root]: { equals: [] } });
      else if (value === 0) clauses.push({ [mappedField]: { isEmpty: true } });
    } else if (operator === "$elemMatch") {
      // Prisma JSON array_contains compares the complete JSON object. Mongo's
      // $elemMatch allows a subset of an array element's fields, so translating
      // it here can incorrectly exclude valid rows (and make writes miss them).
      // Leave this predicate to matchesFilter after a safe SQL candidate query.
    } else if (operator === "$regex") {
      const pattern = regexText(value);
      if (json && path.length && jsonArrayFields[model]?.has(root)) continue;
      if (json && path.length) clauses.push({ [root]: { path, string_contains: pattern } });
      else clauses.push({ [root]: { contains: pattern } });
    }
  }
  if (clauses.length === 0) return {};
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}

export function toPrismaWhere(model, filter = {}) {
  if (!isPlainObject(filter)) return {};
  const clauses = [];
  for (const [field, condition] of Object.entries(filter)) {
    if (field === "$expr") continue;
    if (field === "$or" || field === "$and" || field === "$nor") {
      const translated = condition.map(item => toPrismaWhere(model, item));
      clauses.push(field === "$or" ? { OR: translated } : field === "$nor" ? { NOT: { OR: translated } } : { AND: translated });
    } else {
      clauses.push(translateFieldCondition(model, field, condition));
    }
  }
  const clean = clauses.filter(item => Object.keys(item).length);
  return clean.length === 0 ? {} : clean.length === 1 ? clean[0] : { AND: clean };
}

function normalizeEmbeddedDefaults(model, source = {}) {
  const normalized = { ...(source || {}) };
  if (model === "category" && Array.isArray(normalized.attributes)) {
    normalized.attributes = normalized.attributes.map(attribute => ({
      type: "select", options: [], required: false, filterable: true,
      searchable: true, inherited: true, showInProductDetails: true, sortOrder: 0,
      ...attribute,
    }));
  }
  if (model === "serviceCase" && Array.isArray(normalized.events)) {
    normalized.events = normalized.events.map(event => ({
      note: "", actor: null, createdAt: new Date(), ...event,
    }));
  }
  return normalized;
}

function toPrismaData(model, source = {}, { includeId = false } = {}) {
  const output = {};
  source = normalizeEmbeddedDefaults(model, source);
  for (const [key, value] of Object.entries(source || {})) {
    if (key === "_id" || key === "id") {
      if (includeId && key === "_id" && value != null) {
        const id = String(value);
        if (!isValidDatabaseId(id)) throw new Error("Database ID must be a 24-character hexadecimal string");
        output.id = id;
      }
      continue;
    }
    if (key === "__v" || key === "save" || key === "deleteOne" || key === "comparePassword" || key.startsWith("$")) continue;
    if (key === "productIds" && model === "campaign") {
      if (Array.isArray(value)) output.products = { set: value.map(id => ({ id: String(id) })) };
      continue;
    }
    const mapped = aliasesByModel[model]?.[key] || key;
    if (mapped.includes(".")) {
      setPath(output, mapped, value);
      continue;
    }
    if (value === undefined) {
      if (nullableJsonFieldsByModel[model]?.has(mapped)) output[mapped] = Prisma.DbNull;
      else if (nullableScalarFieldsByModel[model]?.has(mapped)) output[mapped] = null;
      continue;
    }
    if (value === null && jsonFieldsByModel[model]?.has(mapped)) {
      output[mapped] = nullableJsonFieldsByModel[model]?.has(mapped) ? Prisma.DbNull : Prisma.JsonNull;
      continue;
    }
    if (model === "user" && key === "permissions" && value === undefined) continue;
    let normalizedValue = value;
    if ((model === "user" && (key === "email" || key === "pendingEmail")) || (model === "newsletterSubscriber" && key === "email")) normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : value;
    if ((model === "campaign" || model === "category") && key === "slug") normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : value;
    if (model === "coupon" && key === "code") normalizedValue = typeof value === "string" ? value.trim().toUpperCase() : value;
    if (["price", "effectivePrice", "totalAmount", "shippingFee", "subtotalAmount", "productDiscountAmount", "couponDiscountAmount", "minOrderAmount", "maxDiscountAmount", "flatRate", "freeShippingThreshold", "refundAmount"].includes(mapped) && normalizedValue !== null) {
      output[mapped] = Number(normalizedValue);
    } else {
      output[mapped] = normalizedValue;
    }
  }
  return output;
}

export function decimalToNumber(value) {
  // Use Prisma.Decimal's stable type guard instead of relying on constructor.name.
  if (Prisma.Decimal.isDecimal(value)) return Number(value.toString());
  if (Array.isArray(value)) return value.map(decimalToNumber);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, decimalToNumber(nested)]));
  }
  return value;
}
function fromPrisma(model, row) {
  if (row == null) return row;
  const output = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") output._id = value;
    else if (key === "products" && model === "campaign" && Array.isArray(value)) output.productIds = value.map(item => item.id);
    else output[key] = decimalToNumber(value);
  }
  for (const [alias, field] of Object.entries(aliasesByModel[model] || {})) output[alias] = row[field];
  if (model === "campaign" && !output.productIds) output.productIds = [];
  if (model === "user" && output.permissions === null) output.permissions = undefined;
  if (model === "user") {
    output.comparePassword = async password => bcrypt.compare(password, output.password || "");
  }
  return output;
}

function projectResult(model, value, projection) {
  if (value == null) return value;
  if (!projection && model !== "user" && !hiddenFieldsByModel[model]) return value;
  const tokens = (projection || "").trim().split(/\s+/).filter(Boolean);
  const include = tokens.filter(t => !t.startsWith("-") && !t.startsWith("+")).map(t => t.replace(/^\+/, ""));
  const exclude = tokens.filter(t => t.startsWith("-")).map(t => t.slice(1));
  const forced = tokens.filter(t => t.startsWith("+")).map(t => t.slice(1));
  const apply = row => {
    if (!row) return row;
    const result = {};
    if (include.length) {
      result._id = row._id;
      for (const field of include) {
        const v = getPath(row, field);
        if (v !== undefined) setPath(result, field, v);
      }
    } else {
      Object.assign(result, row);
      for (const field of exclude) {
        const parts = field.split(".");
        let cursor = result;
        for (const part of parts.slice(0, -1)) cursor = cursor?.[part];
        if (cursor) delete cursor[parts.at(-1)];
      }
    }
    for (const field of forced) {
      const v = getPath(row, field);
      if (v !== undefined) setPath(result, field, v);
    }
    return result;
  };
  const projected = Array.isArray(value) ? value.map(apply) : apply(value);
  const hidden = model === "user" ? hiddenUserFields : hiddenFieldsByModel[model];
  if (hidden) {
    const strip = row => { if (row) for (const field of hidden) if (!forced.includes(field)) delete row[field]; return row; };
    return Array.isArray(projected) ? projected.map(strip) : strip(projected);
  }
  return projected;
}

function compareValue(actual, condition) {
  if (condition instanceof RegExp) return condition.test(String(actual ?? ""));
  if (!isPlainObject(condition) || !Object.keys(condition).some(k => k.startsWith("$"))) {
    return Array.isArray(actual) ? actual.some(item => item && typeof item === "object" ? JSON.stringify(item) === JSON.stringify(condition) : item === condition) : actual === condition;
  }
  return Object.entries(condition).every(([op, expected]) => {
    if (op === "$gt") return actual > expected;
    if (op === "$gte") return actual >= expected;
    if (op === "$lt") return actual < expected;
    if (op === "$lte") return actual <= expected;
    if (op === "$ne") return actual !== expected;
    if (op === "$in") return expected.some(v => Array.isArray(actual) ? actual.includes(v) : actual === v);
    if (op === "$nin") return expected.every(v => Array.isArray(actual) ? !actual.includes(v) : actual !== v);
    if (op === "$exists") return expected ? actual !== undefined : actual === undefined;
    if (op === "$size") return Array.isArray(actual) && actual.length === expected;
    if (op === "$all") return Array.isArray(actual) && expected.every(value => actual.some(item => value instanceof RegExp ? value.test(String(item)) : item === value));
    if (op === "$elemMatch") return Array.isArray(actual) && actual.some(item => matchesFilter(item, expected));
    if (op === "$regex") return new RegExp(expected, condition.$options || "").test(String(actual ?? ""));
    return true;
  });
}
function evaluateExpression(expression, row, variables = {}) {
  if (typeof expression === "string" && expression.startsWith("$$")) return getPath(variables, expression.slice(2));
  if (typeof expression === "string" && expression.startsWith("$")) return getPath(row, expression.slice(1));
  if (Array.isArray(expression)) return expression.map(item => evaluateExpression(item, row, variables));
  if (!isPlainObject(expression)) return expression;
  if ("$ifNull" in expression) { const value = evaluateExpression(expression.$ifNull[0], row, variables); return value == null ? evaluateExpression(expression.$ifNull[1], row, variables) : value; }
  if ("$size" in expression) return (evaluateExpression(expression.$size, row, variables) || []).length;
  if ("$gt" in expression) { const [a,b] = evaluateExpression(expression.$gt, row, variables); return a > b; }
  if ("$gte" in expression) { const [a,b] = evaluateExpression(expression.$gte, row, variables); return a >= b; }
  if ("$lt" in expression) { const [a,b] = evaluateExpression(expression.$lt, row, variables); return a < b; }
  if ("$lte" in expression) { const [a,b] = evaluateExpression(expression.$lte, row, variables); return a <= b; }
  if ("$eq" in expression) { const [a,b] = evaluateExpression(expression.$eq, row, variables); return a === b; }
  if ("$add" in expression) return evaluateExpression(expression.$add, row, variables).reduce((sum, value) => sum + Number(value || 0), 0);
  if ("$and" in expression) return expression.$and.every(item => evaluateExpression(item, row, variables));
  if ("$or" in expression) return expression.$or.some(item => evaluateExpression(item, row, variables));
  if ("$filter" in expression) {
    const config = expression.$filter;
    const input = evaluateExpression(config.input, row, variables) || [];
    return input.filter(item => evaluateExpression(config.cond, row, { ...variables, [config.as || "this"]: item }));
  }
  return expression;
}
function matchesFilter(row, filter = {}) {
  return Object.entries(filter).every(([field, condition]) => {
    if (field === "$or") return condition.some(item => matchesFilter(row, item));
    if (field === "$and") return condition.every(item => matchesFilter(row, item));
    if (field === "$nor") return !condition.some(item => matchesFilter(row, item));
    if (field === "$expr") return Boolean(evaluateExpression(condition, row));
    const actual = getPath(row, field === "_id" ? "_id" : field);
    if (field.includes(".") && actual === undefined) {
      const [root, ...path] = field.split(".");
      const rootValue = row[root];
      if (Array.isArray(rootValue)) return rootValue.some(item => compareValue(getPath(item, path.join(".")), condition));
    }
    return compareValue(actual, condition);
  });
}

function sortRows(rows, sort) {
  if (!sort || !Object.keys(sort).length) return rows;
  const entries = Object.entries(sort);
  return rows.sort((a, b) => {
    for (const [field, direction] of entries) {
      const av = getPath(a, field === "_id" ? "_id" : field);
      const bv = getPath(b, field === "_id" ? "_id" : field);
      if (av == null && bv != null) return -1 * direction;
      if (av != null && bv == null) return 1 * direction;
      if (av < bv) return -1 * direction;
      if (av > bv) return 1 * direction;
    }
    return 0;
  });
}

function fromPrismaRelated(model, row) {
  const related = fromPrisma(model, row);
  // Prisma selects all scalar fields by default, while the legacy Product
  // schema marked its search index and computed price as select:false.
  return model === "product" ? projectResult("product", related, null) : related;
}

async function populateRows(model, rows, populates, tx) {
  if (!populates.length || !rows.length) return rows;
  for (const spec of populates) {
    const path = typeof spec === "string" ? spec : spec.path;
    if (!path) continue;
    const match = typeof spec === "object" ? spec.match : null;
    const select = typeof spec === "object" ? spec.select : undefined;
    const segments = path.split(".");
    if (model === "user" && segments[0] === "wishlist") {
      const ids = [...new Set(rows.flatMap(row => row.wishlist || []).map(String))];
      const products = ids.length ? await (tx || prisma).product.findMany({ where: { id: { in: ids } } }) : [];
      const map = new Map(products.map(product => [product.id, fromPrismaRelated("product", product)]));
      for (const row of rows) row.wishlist = (row.wishlist || []).map(id => map.get(String(id))).filter(Boolean).filter(item => !match || matchesFilter(item, match));
    } else if (model === "order" && segments[0] === "products" && segments[1] === "product") {
      const ids = [...new Set(rows.flatMap(row => row.products || []).map(item => String(item.product)).filter(Boolean))];
      const products = ids.length ? await (tx || prisma).product.findMany({ where: { id: { in: ids } } }) : [];
      const map = new Map(products.map(product => [product.id, fromPrismaRelated("product", product)]));
      for (const row of rows) row.products = (row.products || []).map(item => ({ ...item, product: map.get(String(item.product)) || item.product }));
    } else {
      const relationMap = {
        "order.user": ["user", "userId"],
        "auditLog.actor": ["user", "actorId"],
        "productReview.product": ["product", "productId"],
        "productReview.user": ["user", "userId"],
        "campaign.products": ["product", "productIds"],
        "campaign.productIds": ["product", "productIds"],
        "serviceCase.user": ["user", "userId"],
        "serviceCase.order": ["order", "orderId"],
        "serviceCase.handledBy": ["user", "handledById"],
      };
      const config = relationMap[`${model}.${path}`];
      if (!config) continue;
      const [delegate, key] = config;
      const ids = [...new Set(rows.flatMap(row => Array.isArray(row[key]) ? row[key] : [row[key]]).filter(Boolean).map(String))];
      const related = ids.length ? await (tx || prisma)[delegate].findMany({ where: { id: { in: ids } } }) : [];
      const map = new Map(related.map(item => [item.id, fromPrismaRelated(delegate, item)]));
      for (const row of rows) {
        const val = row[key];
        if (model === "campaign" && (path === "products" || path === "productIds")) {
          const products = (row.productIds || []).map(item => map.get(String(item)) || item).filter(Boolean).filter(item => !match || matchesFilter(item, match));
          row.productIds = products;
          if (path === "products") row.products = products;
        }
        else if (model === "auditLog" && path === "actor") row.actor = map.get(String(val)) || null;
        else if (model === "serviceCase" && path === "handledBy") row.handledBy = map.get(String(val)) || null;
        else if (Array.isArray(val)) row[key] = val.map(item => map.get(String(item?.id || item)) || item);
        else row[path] = map.get(String(val)) || null;
      }
    }
    if (select) {
      const fields = String(select).split(/\s+/).filter(Boolean).filter(field => !field.startsWith("-"));
      for (const row of rows) {
        const related = path === "products.product" ? row.products?.map(item => item.product) : row[path];
        const project = item => item && typeof item === "object" ? Object.fromEntries(["_id", ...fields].map(field => [field, item[field]]).filter(([, value]) => value !== undefined)) : item;
        if (path === "products.product") row.products = row.products.map(item => ({ ...item, product: project(item.product) }));
        else if (Array.isArray(related)) row[path] = related.map(project);
        else row[path] = project(related);
      }
    }
  }
  return rows;
}

function updatePayload(model, update, row) {
  const data = {};
  const operators = Object.keys(update || {}).some(key => key.startsWith("$"));
  if (!operators) Object.assign(data, toPrismaData(model, update));
  else {
    for (const [operator, fields] of Object.entries(update)) {
      if (operator === "$set") {
        Object.assign(data, toPrismaData(model, Object.fromEntries(Object.entries(fields).filter(([field]) => !field.includes(".")))));
        for (const [field, value] of Object.entries(fields)) {
          if (!field.includes(".")) continue;
          const [root, ...path] = idField(model, field).split(".");
          if (!jsonFieldsByModel[model]?.has(root)) continue;
          const document = structuredClone(row?.[root] ?? (jsonArrayFields[model]?.has(root) ? [] : {}));
          let cursor = document;
          let remainingPath = path;
          if (path.includes("$")) {
            const positionalIndex = path.indexOf("$");
            const selector = row?.__matchedElement || {};
            const index = Array.isArray(document) ? document.findIndex(item => Object.entries(selector).every(([key, expected]) => compareValue(item?.[key], expected))) : -1;
            if (index < 0) continue;
            cursor = document[index];
            remainingPath = path.slice(positionalIndex + 1);
          }
          for (let index = 0; index < remainingPath.length - 1; index += 1) {
            const segment = remainingPath[index];
            const key = /^\d+$/.test(segment) ? Number(segment) : segment;
            const nextIsIndex = /^\d+$/.test(remainingPath[index + 1]);
            if (cursor[key] == null) cursor[key] = nextIsIndex ? [] : {};
            cursor = cursor[key];
          }
          const last = remainingPath.at(-1);
          if (remainingPath.length) cursor[/^\d+$/.test(last) ? Number(last) : last] = value;
          data[root] = document;
        }
      }
      if (operator === "$inc") for (const [field, value] of Object.entries(fields)) { if (!field.includes(".$.")) data[idField(model, field)] = { increment: Number(value) }; }
      if (operator === "$unset") for (const field of Object.keys(fields)) {
        const mapped = idField(model, field);
        if (jsonFieldsByModel[model]?.has(mapped)) data[mapped] = nullableJsonFieldsByModel[model]?.has(mapped) ? Prisma.DbNull : Prisma.JsonNull;
        else data[mapped] = null;
      }
      if (operator === "$push" || operator === "$addToSet" || operator === "$pull") {
        for (const [field, rawValue] of Object.entries(fields)) {
          const mapped = idField(model, field);
          const current = getPath(row || {}, field) || [];
          const values = rawValue && rawValue.$each ? rawValue.$each : [rawValue];
          let next = [...current];
          if (operator === "$push") next.push(...values);
          if (operator === "$addToSet") for (const value of values) if (!next.some(item => JSON.stringify(item) === JSON.stringify(value))) next.push(value);
          if (operator === "$pull") next = next.filter(item => !compareValue(item, rawValue));
          setPath(data, mapped, next);
        }
      }
    }
  }
  // Mongoose's positional array modifier is applied to the JSON document that
  // was read under the same PostgreSQL transaction.
  for (const [field, value] of Object.entries(update?.$inc || {})) {
    const positional = field.match(/^([^.]+)\.\$\.([^.]+)$/);
    if (positional && row) {
      const array = [...(row[positional[1]] || [])];
      const expected = row.__matchedElement || {};
      const index = array.findIndex(item => Object.entries(expected).every(([key, expectedValue]) => compareValue(item[key], expectedValue)));
      if (index >= 0) array[index] = { ...array[index], [positional[2]]: Number(array[index][positional[2]] || 0) + Number(value) };
      data[positional[1]] = array;
    }
  }
  return data;
}

class PrismaUtilityQuery {
  constructor(model, filter, mode) { this.model = model; this.filter = filter; this.mode = mode; this.transaction = null; }
  session(value) { this.transaction = unwrapTransaction(value); return this; }
  maxTimeMS() { return this; }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  catch(reject) { return this.execute().catch(reject); }
  async execute() {
    const delegate = getDelegate(this.model, this.transaction);
    const where = toPrismaWhere(this.model, this.filter);
    if (this.mode === "count") {
      if (filterNeedsPostProcessing(this.model, this.filter)) {
        const rows = await delegate.findMany({ where });
        return rows.map(row => fromPrisma(this.model, row)).filter(row => matchesFilter(row, this.filter)).length;
      }
      return delegate.count({ where });
    }
    if (filterNeedsPostProcessing(this.model, this.filter)) {
      const rows = await delegate.findMany({ where });
      const row = rows.map(item => fromPrisma(this.model, item)).find(item => matchesFilter(item, this.filter));
      return row ? { _id: row._id } : null;
    }
    const row = await delegate.findFirst({ where, select: { id: true } });
    return row ? { _id: row.id } : null;
  }
}

class PrismaQuery {
  constructor(model, operation, filter = {}, options = {}) {
    this.model = model;
    this.operation = operation;
    this.filter = filter || {};
    this.options = options || {};
    this.projection = null;
    this.populates = [];
    this.sortSpec = null;
    this.skipCount = 0;
    this.takeCount = null;
    this.transaction = null;
    this.asLean = false;
    this.cached = null;
  }
  select(value) { this.projection = value; return this; }
  populate(value) { this.populates.push(value); return this; }
  sort(value) { this.sortSpec = value; return this; }
  skip(value) { this.skipCount = Math.max(0, Number(value) || 0); return this; }
  limit(value) { this.takeCount = Math.max(0, Number(value) || 0); return this; }
  maxTimeMS() { return this; }
  lean() { this.asLean = true; return this; }
  option() { return this; }
  session(value) { this.transaction = unwrapTransaction(value); return this; }
  async exec() {
    if (this.cached) return this.cached;
    this.cached = this.execute();
    return this.cached;
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
  finally(callback) { return this.exec().finally(callback); }
  async execute() {
    const delegate = getDelegate(this.model, this.transaction);
    const where = toPrismaWhere(this.model, this.filter);
    const needsPostFilter = filterNeedsPostProcessing(this.model, this.filter);
    const common = { where };
    let rows;
    const relationInclude = this.model === "campaign" ? { products: { select: { id: true } } } : undefined;
    const scalarSort = this.sortSpec && Object.keys(this.sortSpec).every(field => !field.includes("."));
    const orderBy = scalarSort
      ? Object.entries(this.sortSpec).map(([field, direction]) => ({
          [idField(this.model, field)]: direction === -1 ? "desc" : "asc",
        }))
      : undefined;
    if (this.operation === "findUnique") {
      rows = await delegate.findUnique({ where: { id: String(this.filter._id || this.filter.id) }, include: relationInclude });
      rows = rows ? [rows] : [];
    } else if (this.operation === "findFirst" && !needsPostFilter) {
      rows = [await delegate.findFirst({ ...common, orderBy, include: relationInclude })].filter(Boolean);
    } else {
      rows = await delegate.findMany({ ...common, orderBy: needsPostFilter ? undefined : (scalarSort ? orderBy : undefined), skip: needsPostFilter ? undefined : this.skipCount || undefined, take: needsPostFilter || this.takeCount === null ? undefined : this.takeCount, include: relationInclude });
    }
    rows = rows.map(row => fromPrisma(this.model, row));
    if (needsPostFilter) rows = rows.filter(row => matchesFilter(row, this.filter));
    await populateRows(this.model, rows, this.populates, this.transaction);
    if (this.sortSpec && (!scalarSort || needsPostFilter)) sortRows(rows, this.sortSpec);
    if (needsPostFilter && this.skipCount) rows = rows.slice(this.skipCount);
    if (needsPostFilter && this.takeCount !== null) rows = rows.slice(0, this.takeCount);
    rows = projectResult(this.model, rows, this.projection);
    if (!this.asLean) rows = Array.isArray(rows) ? rows.map(row => attachDocumentMethods(this.model, row)) : attachDocumentMethods(this.model, rows);
    if (this.operation === "findFirst" || this.operation === "findUnique") return rows[0] || null;
    return rows;
  }
}

function attachDocumentMethods(model, row) {
  if (!row || Array.isArray(row)) return row;
  if (!Object.prototype.hasOwnProperty.call(row, "save")) Object.defineProperty(row, "save", { enumerable: false, configurable: true, value: async function (options = {}) {
    const tx = unwrapTransaction(options?.session);
    const delegate = getDelegate(model, tx);
    const data = toPrismaData(model, this);
    if (model === "user" && data.password) {
      const current = await delegate.findUnique({ where: { id: this._id }, select: { password: true } });
      if (current?.password !== data.password) {
        const policyError = getPasswordPolicyError(data.password);
        if (policyError) throw new Error(policyError);
        data.password = await bcrypt.hash(data.password, 10);
      }
    }
    if (model === "product") {
      // Preserve required catalog pricing when a compatibility query or partial
      // document leaves price out of the save payload.
      if (data.price == null || !Number.isFinite(Number(data.price))) {
        const persistedProduct = await delegate.findUnique({
          where: { id: this._id },
          select: { price: true, discountPercent: true },
        });
        if (!persistedProduct) throw new Error("Product no longer exists");
        data.price = Number(persistedProduct.price.toString());
        if (data.discountPercent === undefined) {
          data.discountPercent = persistedProduct.discountPercent;
        }
      }
      Object.assign(data, deriveProductFields({ ...this, ...data, price: data.price }));
    }
    const saved = await delegate.update({ where: { id: this._id }, data, ...(model === "campaign" ? { include: { products: { select: { id: true } } } } : {}) });
    const mapped = fromPrisma(model, saved);
    for (const key of Object.keys(this)) delete this[key];
    Object.assign(this, mapped);
    return this;
  }});
  if (!Object.prototype.hasOwnProperty.call(row, "deleteOne")) Object.defineProperty(row, "deleteOne", { enumerable: false, configurable: true, value: async function (options = {}) {
    await getDelegate(model, options?.session).delete({ where: { id: this._id } });
    return this;
  }});
  return row;
}

function mapPersistenceError(error) {
  if (error?.code === "P2002") {
    const mapped = new Error(error.message || "A record with this value already exists", { cause: error });
    mapped.name = "DuplicateKeyError";
    mapped.code = 11000;
    mapped.meta = error.meta;
    return mapped;
  }
  return error;
}

function deriveProductFields(product) {
  const searchableProduct = {
    name: product.name, description: product.description, category: product.category,
    sizes: product.sizes, colors: product.colors, variants: product.variants, fit: product.fit,
    attributes: product.attributes, customSpecifications: product.customSpecifications,
    brand: product.brand, brandName: product.brandName,
  };
  return {
    searchTextNormalized: buildNormalizedProductSearchText(searchableProduct),
    searchTokens: buildNormalizedProductSearchTokens(searchableProduct),
    effectivePrice: getProductDiscountedPrice(product),
  };
}

function isAtomicScalarUpdate(model, update) {
  const entries = Object.entries(update || {});
  if (!entries.length) return false;
  const operators = entries.some(([key]) => key.startsWith("$"));
  const safeField = (field) => {
    if (field.includes(".")) return false;
    const mapped = idField(model, field);
    if (jsonFieldsByModel[model]?.has(mapped) || mapped === "products" || mapped === "productIds") return false;
    return true;
  };
  if (!operators) return entries.every(([field]) => safeField(field));
  return entries.every(([operator, fields]) => {
    if (!["$set", "$inc", "$unset"].includes(operator) || !isPlainObject(fields)) return false;
    return Object.keys(fields).every(safeField);
  });
}

async function executeAtomicScalarUpdate(model, filter, update, options, returnDocument) {
  const tx = unwrapTransaction(options.session);
  const delegate = getDelegate(model, tx);
  const where = toPrismaWhere(model, filter);
  const data = updatePayload(model, update, {});
  const include = model === "campaign" ? { products: { select: { id: true } } } : undefined;

  if (options.many) {
    const result = await delegate.updateMany({ where, data });
    return { acknowledged: true, matchedCount: result.count, modifiedCount: result.count, n: result.count, nModified: result.count };
  }

  // Resolve one candidate ID, then repeat the complete predicate in UPDATE.
  // This preserves findOneAndUpdate's conditional-write semantics and prevents
  // concurrent payment/coupon/session operations from overwriting each other.
  let beforeRaw = await delegate.findFirst({ where, include });
  if (!beforeRaw && options.upsert) {
    const equalityFilter = Object.fromEntries(
      Object.entries(filter || {}).filter(([key, value]) =>
        !key.startsWith("$") && (value === null || typeof value !== "object" || value instanceof Date)
      )
    );
    const insertFields = {
      ...equalityFilter,
      ...(update?.$setOnInsert || {}),
      ...(update?.$set || (Object.keys(update || {}).some(key => key.startsWith("$")) ? {} : update || {})),
    };
    const createData = toPrismaData(model, insertFields, { includeId: true });
    if (model === "campaign" && createData.products?.set) {
      createData.products = { connect: createData.products.set };
    }
    try {
      const created = await delegate.create({
        data: createData,
        ...(include ? { include } : {}),
      });
      const mapped = attachDocumentMethods(model, fromPrisma(model, created));
      return returnDocument
        ? mapped
        : { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: created.id, n: 1, nModified: 0 };
    } catch (error) {
      // A concurrent upsert may win the unique-key race. Re-read the matching
      // row and apply this update instead of returning a false "not found".
      if (error?.code !== "P2002") throw error;
      beforeRaw = await delegate.findFirst({ where, include });
      if (!beforeRaw) throw error;
    }
  }
  if (!beforeRaw) {
    return returnDocument ? null : { acknowledged: true, matchedCount: 0, modifiedCount: 0, n: 0, nModified: 0 };
  }
  const before = fromPrisma(model, beforeRaw);
  const guardedWhere = Object.keys(where).length
    ? { AND: [where, { id: beforeRaw.id }] }
    : { id: beforeRaw.id };
  const result = await delegate.updateMany({ where: guardedWhere, data });
  if (!result.count) {
    return returnDocument ? null : { acknowledged: true, matchedCount: 0, modifiedCount: 0, n: 0, nModified: 0 };
  }
  if (!returnDocument) return { acknowledged: true, matchedCount: 1, modifiedCount: 1, n: 1, nModified: 1 };
  if (options.new === false) return attachDocumentMethods(model, before);
  const afterRaw = await delegate.findUnique({ where: { id: beforeRaw.id }, include });
  return attachDocumentMethods(model, fromPrisma(model, afterRaw));
}

async function executeUpdate(model, filter, update, options = {}, returnDocument = false) {
  // Filters containing Mongo-only expression or JSON-array predicates must be
  // evaluated before the write. Skipping this guard could bypass coupon-capacity
  // or inventory conditions when translating the filter to SQL.
  if (isAtomicScalarUpdate(model, update) && !filterNeedsPostProcessing(model, filter)) {
    return executeAtomicScalarUpdate(model, filter, update, options, returnDocument);
  }
  const tx = unwrapTransaction(options.session);
  const delegate = getDelegate(model, tx);
  const where = toPrismaWhere(model, filter);
  let rowsRaw = await delegate.findMany({ where, ...(model === "campaign" ? { include: { products: { select: { id: true } } } } : {}) });
  if (filterNeedsPostProcessing(model, filter)) rowsRaw = rowsRaw.filter(row => matchesFilter(fromPrisma(model, row), filter));
  // updateOne/findOneAndUpdate must never fan out across every post-filtered row.
  // updateMany is the only compatibility operation allowed to modify all matches.
  if (!options.many && rowsRaw.length > 1) rowsRaw = rowsRaw.slice(0, 1);
  if (!rowsRaw.length) {
    if (options.upsert) {
      const equalityFilter = Object.fromEntries(Object.entries(filter || {}).filter(([key, value]) => !key.startsWith("$") && (value === null || typeof value !== "object" || value instanceof Date)));
      const insertFields = { ...equalityFilter, ...(update?.$setOnInsert || {}), ...(update?.$set || {}) };
      const created = await getDelegate(model, tx).create({
        data: (() => { const data = toPrismaData(model, insertFields, { includeId: true }); if (model === "campaign" && data.products?.set) data.products = { connect: data.products.set }; return data; })(),
        ...(model === "campaign" ? { include: { products: { select: { id: true } } } } : {}),
      });
      return returnDocument ? attachDocumentMethods(model, fromPrisma(model, created)) : { acknowledged: true, matchedCount: 0, modifiedCount: 1, upsertedId: created.id, n: 1, nModified: 0 };
    }
    return returnDocument ? null : { acknowledged: true, matchedCount: 0, modifiedCount: 0, n: 0, nModified: 0 };
  }
  const before = fromPrisma(model, rowsRaw[0]);
  const updatedRows = [];
  for (const raw of rowsRaw) {
    const current = fromPrisma(model, raw);
    current.__matchedElement = (() => {
      const elem = filter?.variants?.$elemMatch;
      return elem || {};
    })();
    const data = updatePayload(model, update, current);
    if (model === "user" && data.password) data.password = await bcrypt.hash(data.password, 10);
    if (model === "product" && ("price" in data || "discountPercent" in data || "name" in data || "description" in data || "category" in data)) Object.assign(data, deriveProductFields({ ...current, ...data }));
    if (Object.keys(data).length) updatedRows.push(await delegate.update({ where: { id: current._id }, data, ...(model === "campaign" ? { include: { products: { select: { id: true } } } } : {}) }));
  }
  const result = { acknowledged: true, matchedCount: rowsRaw.length, modifiedCount: updatedRows.length, n: rowsRaw.length, nModified: updatedRows.length };
  if (!returnDocument) return result;
  const selected = options.new === false ? before : fromPrisma(model, updatedRows[0] || rowsRaw[0]);
  return attachDocumentMethods(model, selected);
}

class PrismaUpdateQuery {
  constructor(model, filter, update, options = {}, returnDocument = true) {
    this.model = model;
    this.filter = filter;
    this.update = update;
    this.options = { ...options };
    this.returnDocument = returnDocument;
    this.projection = null;
    this.populates = [];
    this.asLean = false;
    this.cached = null;
  }
  select(value) { this.projection = value; return this; }
  populate(value) { this.populates.push(value); return this; }
  lean() { this.asLean = true; return this; }
  session(value) { this.options.session = value; return this; }
  maxTimeMS() { return this; }
  exec() {
    if (!this.cached) this.cached = this.execute();
    return this.cached;
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
  finally(callback) { return this.exec().finally(callback); }
  async execute() {
    let result;
    try {
      result = await executeUpdate(this.model, this.filter, this.update, this.options, this.returnDocument);
    } catch (error) {
      throw mapPersistenceError(error);
    }
    if (!this.returnDocument || result == null) return result;
    const rows = [result];
    await populateRows(this.model, rows, this.populates, this.options.session);
    result = projectResult(this.model, rows[0], this.projection);
    return this.asLean ? result : attachDocumentMethods(this.model, result);
  }
}

export function createPrismaModel(model) {
  const delegate = model;
  return {
    find(filter = {}) { return new PrismaQuery(delegate, "findMany", filter); },
    findOne(filter = {}) { return new PrismaQuery(delegate, "findFirst", filter); },
    findById(id) { return new PrismaQuery(delegate, "findUnique", { _id: id }); },
    findByIdAndUpdate(id, update, options = {}) { return new PrismaUpdateQuery(delegate, { _id: id }, update, options, true); },
    findOneAndUpdate(filter, update, options = {}) { return new PrismaUpdateQuery(delegate, filter, update, options, true); },
    async findByIdAndDelete(id, options = {}) { const row = await getDelegate(delegate, options.session).delete({ where: { id: String(id) } }).catch(error => error.code === "P2025" ? null : Promise.reject(error)); return fromPrisma(delegate, row); },
    async create(input, options = {}) {
      if (Array.isArray(input)) return Promise.all(input.map(item => this.create(item, options)));
      const data = toPrismaData(delegate, input, { includeId: true });
      if (delegate === "user" && input.communicationPreferences === undefined) {
        data.communicationPreferences = {
          orderUpdates: true,
          securityAlerts: true,
          productNews: false,
          promotionalEmails: false,
        };
      }
      if (delegate === "user" && data.password) {
        const policyError = getPasswordPolicyError(data.password);
        if (policyError) { const error = new Error(policyError); error.name = "ValidationError"; throw error; }
        data.password = await bcrypt.hash(data.password, 10);
      }
      if (delegate === "product") Object.assign(data, deriveProductFields({ ...input, ...data }));
      if (delegate === "campaign" && data.products?.set) data.products = { connect: data.products.set };
      let created;
      try {
        created = await getDelegate(delegate, options.session).create({ data, ...(delegate === "campaign" ? { include: { products: { select: { id: true } } } } : {}) });
      } catch (error) {
        throw mapPersistenceError(error);
      }
      return attachDocumentMethods(delegate, fromPrisma(delegate, created));
    },
    countDocuments(filter = {}) { return new PrismaUtilityQuery(delegate, filter, "count"); },
    exists(filter = {}) { return new PrismaUtilityQuery(delegate, filter, "exists"); },
    async distinct(field, filter = {}) {
      const rows = await this.find(filter).lean();
      const values = new Set();
      for (const row of rows) {
        const value = getPath(row, field);
        if (Array.isArray(value)) value.forEach(item => values.add(item));
        else if (value !== undefined) values.add(value);
      }
      return [...values];
    },
    async updateOne(filter, update, options = {}) { return executeUpdate(delegate, filter, update, options, false); },
    async updateMany(filter, update, options = {}) { return executeUpdate(delegate, filter, update, { ...options, many: true }, false); },
    async deleteOne(filter = {}, options = {}) {
      const tx = unwrapTransaction(options.session);
      const modelDelegate = getDelegate(delegate, tx);
      const where = toPrismaWhere(delegate, filter);
      let row;
      if (filterNeedsPostProcessing(delegate, filter)) {
        const candidates = await modelDelegate.findMany({ where });
        row = candidates.find(candidate => matchesFilter(fromPrisma(delegate, candidate), filter));
        if (row) row = { id: row.id };
      } else {
        row = await modelDelegate.findFirst({ where, select: { id: true } });
      }
      if (!row) return { acknowledged: true, deletedCount: 0 };
      await modelDelegate.delete({ where: { id: row.id } });
      return { acknowledged: true, deletedCount: 1 };
    },
    async deleteMany(filter = {}, options = {}) {
      const tx = unwrapTransaction(options.session);
      const modelDelegate = getDelegate(delegate, tx);
      const where = toPrismaWhere(delegate, filter);
      if (!filterNeedsPostProcessing(delegate, filter)) {
        return modelDelegate.deleteMany({ where });
      }
      // Never pass a lossy Mongo-to-Prisma translation directly to DELETE.
      // Evaluate the complete predicate in JavaScript, then delete only the
      // explicitly matched primary keys. An empty match set is a no-op.
      const candidates = await modelDelegate.findMany({ where });
      const ids = candidates
        .filter(candidate => matchesFilter(fromPrisma(delegate, candidate), filter))
        .map(candidate => candidate.id);
      if (!ids.length) return { count: 0 };
      return modelDelegate.deleteMany({ where: { id: { in: ids } } });
    },
  };
}
