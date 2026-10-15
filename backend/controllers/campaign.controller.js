import mongoose from "mongoose";
import Campaign from "../models/campaign.model.js";
import Product from "../models/product.model.js";
import { recordAuditEvent } from "../lib/audit-log.js";

const isValidCampaignInput = (body) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const href = typeof body.href === "string" ? body.href.trim() : "";
  const endsAt = new Date(body.endsAt);
  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  return Boolean(
    title &&
    title.length <= 100 &&
    href.startsWith("/") &&
    !href.startsWith("//") &&
    Number.isFinite(startsAt.getTime()) &&
    Number.isFinite(endsAt.getTime()) &&
    endsAt > startsAt &&
    Number.isInteger(Number(body.sortOrder ?? 0)) &&
    Number(body.sortOrder ?? 0) >= 0 &&
    Array.isArray(body.productIds ?? []) &&
    (body.productIds ?? []).length <= 48 &&
    (body.productIds ?? []).every((id) => mongoose.isValidObjectId(id)) &&
    new Set((body.productIds ?? []).map(String)).size === (body.productIds ?? []).length
  );
};

export const getActiveCampaigns = async (req, res) => {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 8;
    const now = new Date();
    const campaigns = await Campaign.find({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gt: now },
    }).sort({ sortOrder: 1, createdAt: -1 }).limit(limit).lean();
    return res.json({ campaigns });
  } catch (error) {
    console.error("Error loading active campaigns", error.message);
    return res.status(500).json({ message: "Unable to load campaigns" });
  }
};

export const getCampaignById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Campaign not found" });
  try {
    const now = new Date();
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      isActive: true,
      endsAt: { $gt: now },
    }).select("title description image href startsAt endsAt productIds").populate({
      path: "productIds",
      match: { isActive: { $ne: false } },
      select: "name description price image images category sizes colors variants fit stock isFeatured isActive createdAt",
    }).lean();
    if (!campaign) return res.status(404).json({ message: "Campaign not found or no longer active" });
    return res.json({ campaign });
  } catch (error) {
    console.error("Error loading campaign detail", error.message);
    return res.status(500).json({ message: "Unable to load campaign" });
  }
};

export const getAllCampaigns = async (_req, res) => {
  try {
    const campaigns = await Campaign.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ campaigns });
  } catch (error) {
    console.error("Error loading campaigns", error.message);
    return res.status(500).json({ message: "Unable to load campaigns" });
  }
};

export const createCampaign = async (req, res) => {
  try {
    if (!isValidCampaignInput(req.body)) {
      return res.status(400).json({ message: "Enter a title, a valid local link, and a future end date" });
    }
    const productIds = (req.body.productIds || []).map(String);
    const validProducts = productIds.length
      ? await Product.find({ _id: { $in: productIds }, isActive: { $ne: false } }).select("_id").lean()
      : [];
    if (validProducts.length !== productIds.length) {
      return res.status(400).json({ message: "One or more selected campaign products are unavailable" });
    }
    const campaign = await Campaign.create({
      title: req.body.title.trim(),
      description: typeof req.body.description === "string" ? req.body.description.trim().slice(0, 300) : "",
      image: typeof req.body.image === "string" ? req.body.image.trim().slice(0, 2048) : "",
      href: req.body.href.trim(),
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : new Date(),
      endsAt: new Date(req.body.endsAt),
      productIds: validProducts.map((product) => product._id),
      isActive: req.body.isActive !== false,
      sortOrder: Number(req.body.sortOrder ?? 0),
      createdBy: req.user._id,
    });
    await recordAuditEvent(req, {
      action: "campaign.created",
      targetType: "campaign",
      targetId: campaign._id,
      summary: "Campaign created: " + campaign.title,
      metadata: {
        after: {
          title: campaign.title,
          description: campaign.description,
          image: campaign.image,
          href: campaign.href,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          isActive: campaign.isActive,
          sortOrder: campaign.sortOrder,
          productIds: campaign.productIds.map(String),
        },
        productCount: campaign.productIds.length,
      },
    });
    return res.status(201).json({ campaign });
  } catch (error) {
    console.error("Error creating campaign", error.message);
    return res.status(500).json({ message: "Unable to create campaign" });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const current = await Campaign.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Campaign not found" });
    const before = {
      title: current.title,
      description: current.description,
      image: current.image,
      href: current.href,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      isActive: current.isActive,
      sortOrder: current.sortOrder,
      productIds: (current.productIds || []).map(String),
    };
    const next = { ...current.toObject(), ...req.body };
    if (!isValidCampaignInput(next)) {
      return res.status(400).json({ message: "Campaign fields are invalid" });
    }
    const productIds = (next.productIds || []).map(String);
    const validProducts = productIds.length
      ? await Product.find({ _id: { $in: productIds }, isActive: { $ne: false } }).select("_id").lean()
      : [];
    if (validProducts.length !== productIds.length) {
      return res.status(400).json({ message: "One or more selected campaign products are unavailable" });
    }
    current.title = next.title.trim();
    current.description = typeof next.description === "string" ? next.description.trim().slice(0, 300) : "";
    current.image = typeof next.image === "string" ? next.image.trim().slice(0, 2048) : "";
    current.href = next.href.trim();
    current.startsAt = new Date(next.startsAt);
    current.endsAt = new Date(next.endsAt);
    current.productIds = validProducts.map((product) => product._id);
    current.isActive = next.isActive !== false;
    current.sortOrder = Number(next.sortOrder ?? 0);
    await current.save();
    await recordAuditEvent(req, {
      action: "campaign.updated",
      targetType: "campaign",
      targetId: current._id,
      summary: "Campaign updated: " + current.title,
      metadata: {
        before,
        after: {
          title: current.title,
          description: current.description,
          image: current.image,
          href: current.href,
          startsAt: current.startsAt,
          endsAt: current.endsAt,
          isActive: current.isActive,
          sortOrder: current.sortOrder,
          productIds: (current.productIds || []).map(String),
        },
        productCount: (current.productIds || []).length,
      },
    });
    return res.json({ campaign: current });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid campaign ID" });
    console.error("Error updating campaign", error.message);
    return res.status(500).json({ message: "Unable to update campaign" });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    const deletedSnapshot = {
      title: campaign.title,
      description: campaign.description,
      image: campaign.image,
      href: campaign.href,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      isActive: campaign.isActive,
      sortOrder: campaign.sortOrder,
      productIds: (campaign.productIds || []).map(String),
    };
    await Campaign.deleteOne({ _id: campaign._id });
    await recordAuditEvent(req, {
      action: "campaign.deleted",
      targetType: "campaign",
      targetId: campaign._id,
      summary: "Campaign deleted: " + campaign.title,
      metadata: { before: deletedSnapshot },
    });
    return res.json({ message: "Campaign deleted" });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid campaign ID" });
    console.error("Error deleting campaign", error.message);
    return res.status(500).json({ message: "Unable to delete campaign" });
  }
};
