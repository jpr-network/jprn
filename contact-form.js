const form = document.querySelector("#inquiry-form");
const statusMessage = document.querySelector("#form-status");
const submitButton = form.querySelector("button[type='submit']");
const endpoint = document.querySelector("meta[name='jprn-form-endpoint']").content.trim();

const inquiryLabels = {
  collaborator: "コラボレーター希望",
  activity: "活動内容への質問",
  other: "その他"
};

function updateStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `form-status ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  updateStatus("", "");

  if (!form.checkValidity()) {
    form.reportValidity();
    updateStatus("未入力または入力形式に誤りがある項目をご確認ください。", "error");
    return;
  }

  const formData = new FormData(form);
  const inquiryTypes = formData.getAll("inquiryTypes");

  if (inquiryTypes.length === 0) {
    document.querySelector("#topic-collaborator").focus();
    updateStatus("お問い合わせ区分を1つ以上選択してください。", "error");
    return;
  }

  if (!endpoint || !endpoint.startsWith("https://script.google.com/macros/s/")) {
    updateStatus("送信機能は現在準備中です。公開前にメール送信先の設定が必要です。", "error");
    return;
  }

  const payload = {
    name: formData.get("name").trim(),
    affiliation: formData.get("affiliation").trim(),
    email: formData.get("email").trim(),
    inquiryTypes,
    inquiryLabels: inquiryTypes.map((inquiryType) => inquiryLabels[inquiryType]),
    message: formData.get("message").trim(),
    website: formData.get("website").trim(),
    submittedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    policyUrl: new URL("./membership-policy.html", window.location.href).href
  };

  submitButton.disabled = true;
  submitButton.textContent = "送信中…";
  updateStatus("送信しています。画面を閉じずにお待ちください。", "");

  try {
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    form.reset();
    updateStatus("送信されました。入力いただいたメールアドレスへ内容のコピーを送ります。", "success");
  } catch (error) {
    updateStatus("送信できませんでした。通信環境をご確認のうえ、時間をおいて再度お試しください。", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "送信する";
  }
});
