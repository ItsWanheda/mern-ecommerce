import NewsletterSubscriber from "../models/newsletter-subscriber.model.js";

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";

const isValidEmail = (email) =>
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const subscribeToNewsletter = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "نشانی ایمیل معتبر وارد کنید." });
  }
  if (req.body?.consent !== true) {
    return res.status(400).json({ message: "برای ثبت درخواست، رضایت خود را تأیید کنید." });
  }

  try {
    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      {
        $set: { isSubscribed: true, consentedAt: new Date(), unsubscribedAt: null },
        $setOnInsert: { email },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({
      message: "درخواست شما ثبت شد. ارسال خبرنامه پس از اتصال سرویس ایمیل فعال خواهد شد.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({
        message: "درخواست شما ثبت شد. ارسال خبرنامه پس از اتصال سرویس ایمیل فعال خواهد شد.",
      });
    }
    console.error("Error saving newsletter subscription", error.message);
    return res.status(500).json({ message: "ثبت درخواست خبرنامه انجام نشد. بعداً دوباره تلاش کنید." });
  }
};

export const unsubscribeFromNewsletter = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "نشانی ایمیل معتبر وارد کنید." });
  }

  try {
    await NewsletterSubscriber.updateOne(
      { email },
      { $set: { isSubscribed: false, unsubscribedAt: new Date() } }
    );
    // Use the same response whether an email existed or not.
    return res.status(200).json({ message: "درخواست لغو عضویت ثبت شد." });
  } catch (error) {
    console.error("Error saving newsletter opt-out", error.message);
    return res.status(500).json({ message: "لغو عضویت انجام نشد. بعداً دوباره تلاش کنید." });
  }
};
