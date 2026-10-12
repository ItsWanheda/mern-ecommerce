import Campaign from "../models/campaign.model.js";

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
    Number(body.sortOrder ?? 0) >= 0
  );
};

export const getActiveCampaigns = async (_req, res) => {
  try {
    const now = new Date();
    const campaigns = await Campaign.find({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gt: now },
    }).sort({ sortOrder: 1, createdAt: -1 }).limit(8).lean();
    return res.json({ campaigns });
  } catch (error) {
    console.error("Error loading active campaigns", error.message);
    return res.status(500).json({ message: "Unable to load campaigns" });
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
    const campaign = await Campaign.create({
      title: req.body.title.trim(),
      description: typeof req.body.description === "string" ? req.body.description.trim().slice(0, 300) : "",
      image: typeof req.body.image === "string" ? req.body.image.trim().slice(0, 2048) : "",
      href: req.body.href.trim(),
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : new Date(),
      endsAt: new Date(req.body.endsAt),
      isActive: req.body.isActive !== false,
      sortOrder: Number(req.body.sortOrder ?? 0),
      createdBy: req.user._id,
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
    const next = { ...current.toObject(), ...req.body };
    if (!isValidCampaignInput(next)) {
      return res.status(400).json({ message: "Campaign fields are invalid" });
    }
    current.title = next.title.trim();
    current.description = typeof next.description === "string" ? next.description.trim().slice(0, 300) : "";
    current.image = typeof next.image === "string" ? next.image.trim().slice(0, 2048) : "";
    current.href = next.href.trim();
    current.startsAt = new Date(next.startsAt);
    current.endsAt = new Date(next.endsAt);
    current.isActive = next.isActive !== false;
    current.sortOrder = Number(next.sortOrder ?? 0);
    await current.save();
    return res.json({ campaign: current });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid campaign ID" });
    console.error("Error updating campaign", error.message);
    return res.status(500).json({ message: "Unable to update campaign" });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    return res.json({ message: "Campaign deleted" });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid campaign ID" });
    console.error("Error deleting campaign", error.message);
    return res.status(500).json({ message: "Unable to delete campaign" });
  }
};
