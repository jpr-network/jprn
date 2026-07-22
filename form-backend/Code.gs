const ADMIN_EMAIL = "yamasho1113x1987@gmail.com";
const ALLOWED_INQUIRY_TYPES = Object.freeze({
  collaborator: "コラボレーター希望",
  activity: "活動内容への質問",
  other: "その他"
});

function doGet() {
  return createResponse({ ok: true, service: "JPRN inquiry mail relay" });
}

function doPost(event) {
  try {
    if (!event || !event.postData || !event.postData.contents) {
      throw new Error("Invalid request");
    }

    const data = JSON.parse(event.postData.contents);

    if (String(data.website || "").trim()) {
      return createResponse({ ok: true });
    }

    const name = requireText(data.name, 100);
    const affiliation = requireText(data.affiliation, 200);
    const email = requireEmail(data.email);
    const inquiryTypes = requireInquiryTypes(data.inquiryTypes);
    const message = requireText(data.message, 5000);

    enforceRateLimit(email);

    const inquiryLabel = inquiryTypes
      .map((inquiryType) => ALLOWED_INQUIRY_TYPES[inquiryType])
      .join("・");
    const receivedAt = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy年M月d日 HH:mm");
    const subject = `[JPRN] お問い合わせを受け付けました（${inquiryLabel}）`;
    const body = [
      "送信されました。内容のコピーを送ります。",
      "",
      `氏名: ${name}`,
      `所属: ${affiliation}`,
      `メールアドレス: ${email}`,
      `お問い合わせ区分: ${inquiryLabel}`,
      `受付日時: ${receivedAt}（日本時間）`,
      "",
      "お問い合わせ内容:",
      message,
      "",
      "JPRN | Japan Pulmonary Research Network"
    ].join("\n");

    [email, ADMIN_EMAIL].forEach((recipient) => {
      MailApp.sendEmail({
        to: recipient,
        subject,
        body,
        name: "JPRN | Japan Pulmonary Research Network"
      });
    });

    return createResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return createResponse({ ok: false, message: "Unable to process the request" });
  }
}

function requireText(value, maxLength) {
  const text = String(value || "").trim();

  if (!text || text.length > maxLength) {
    throw new Error("Invalid text field");
  }

  return text;
}

function requireEmail(value) {
  const email = String(value || "").trim().toLowerCase();

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address");
  }

  return email;
}

function requireInquiryTypes(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 3) {
    throw new Error("Invalid inquiry types");
  }

  const inquiryTypes = value
    .map((inquiryType) => String(inquiryType))
    .filter((inquiryType, index, values) => values.indexOf(inquiryType) === index);

  if (inquiryTypes.some((inquiryType) => !Object.prototype.hasOwnProperty.call(ALLOWED_INQUIRY_TYPES, inquiryType))) {
    throw new Error("Invalid inquiry types");
  }

  return inquiryTypes;
}

function enforceRateLimit(email) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email);
  const key = Utilities.base64EncodeWebSafe(digest).slice(0, 40);
  const cache = CacheService.getScriptCache();

  if (cache.get(key)) {
    throw new Error("Rate limit exceeded");
  }

  cache.put(key, "1", 60);
}

function createResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
