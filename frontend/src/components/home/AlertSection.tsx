import { useState } from "react";
import { useTranslation } from "react-i18next";
import AlertBellIcon from "@/components/layout/AlertBellIcon";
import TurnstileWidget from "@/components/TurnstileWidget";
import { useWebPushToken } from "@/hooks/useWebPushToken";
import { subscribeWithUser } from "@/lib/alertsApi";
import { isTurnstileConfigured } from "@/lib/turnstile";
import { STATES } from "@/data/states";
import { CATS } from "@/data/categories";

const CHANNEL_KEYS = ["email", "whatsapp", "telegram", "push"] as const;
type AlertChannel = (typeof CHANNEL_KEYS)[number];

const CHANNEL_ICONS: Record<AlertChannel, string> = {
  email: "✉️",
  whatsapp: "💬",
  telegram: "✈️",
  push: "🔔",
};

const PLACEHOLDER_KEYS = {
  email: "alert.placeholder",
  whatsapp: "alert.placeholderWhatsApp",
  telegram: "alert.placeholderTelegram",
  push: "alert.placeholderPush",
};

export default function AlertSection() {
  const { t } = useTranslation();
  const { token: pushToken, ready: pushReady } = useWebPushToken();
  const [address, setAddress] = useState("");
  const [sub, setSub] = useState(false);
  const [channel, setChannel] = useState<AlertChannel>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedQualification, setSelectedQualification] = useState("");

  const validateAddress = () => {
    const v = address.trim();
    if (channel === "push" && pushToken) return pushToken.length >= 8;
    if (!v) return false;
    if (channel === "email") return v.includes("@");
    if (channel === "whatsapp") return /^\+?[\d\s-]{10,}$/.test(v);
    if (channel === "telegram") return /^[0-9]{5,}$/.test(v);
    return v.length >= 8;
  };

  const handleSubscribe = async () => {
    if (honeypot.trim()) return;
    const channelAddress = channel === "push" && pushToken ? pushToken : address.trim();
    if (!validateAddress()) {
      setError(
        channel === "telegram"
          ? t("alert.invalidTelegram", {
              defaultValue: "Enter your numeric Telegram chat ID (message @userinfobot after /start).",
            })
          : t("alert.invalidAddress")
      );
      return;
    }
    if (isTurnstileConfigured() && !turnstileToken?.trim()) {
      setError(
        t("alert.turnstileRequired", {
          defaultValue: "Please complete the security check.",
        })
      );
      return;
    }
    setError("");
    setLoading(true);
    const result = await subscribeWithUser(
      {
        channel,
        channel_address: channelAddress,
        state_codes: selectedState ? [selectedState] : [],
        categories: selectedCategory ? [selectedCategory] : [],
        qualification_tags: selectedQualification ? [selectedQualification] : [],
        website: honeypot,
        turnstileToken,
      }
    );
    setLoading(false);
    if (result.ok) {
      setSub(true);
    } else if ("error" in result) {
      const errMsg = result.error;
      setError(
        errMsg.includes("fetch") || errMsg.includes("Network")
          ? t("alert.offlineError")
          : t("alert.error")
      );
    }
  };

  return (
    <div id="alert-section" className="alert-section">
      <div className="alert-section__card">
        <div className="alert-section__glow" aria-hidden />
        <div className="alert-section__body">
          <div className="alert-section__icon" aria-hidden>
            <AlertBellIcon size={64} />
          </div>
          <h2 className="alert-section__title">{t("alert.title")}</h2>
          <p className="alert-section__desc">{t("alert.desc")}</p>

          <fieldset className="alert-section__preferences">
            <legend>
              {t("alert.matchingLegend", { defaultValue: "Match alerts to your preferences (optional)" })}
            </legend>
            <label>
              <span>{t("common.state", { defaultValue: "State" })}</span>
              <select value={selectedState} onChange={(event) => setSelectedState(event.target.value)}>
                <option value="">{t("common.allIndia", { defaultValue: "All India" })}</option>
                {STATES.map((state) => (
                  <option key={state.id} value={state.id}>{state.n}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("common.category", { defaultValue: "Category" })}</span>
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                <option value="">{t("latestNotif.allCategories", { defaultValue: "All categories" })}</option>
                {CATS.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("common.qualification", { defaultValue: "Qualification" })}</span>
              <select value={selectedQualification} onChange={(event) => setSelectedQualification(event.target.value)}>
                <option value="">{t("common.any", { defaultValue: "Any qualification" })}</option>
                <option value="10th">10th</option>
                <option value="12th">12th</option>
                <option value="iti">ITI</option>
                <option value="diploma">Diploma</option>
                <option value="graduate">Graduate</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </label>
          </fieldset>

          <div className="alert-section__channels" role="radiogroup" aria-label={t("alert.title")}>
            {CHANNEL_KEYS.map((key) => {
              const active = channel === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`alert-section__channel${active ? " alert-section__channel--active" : ""}`}
                  onClick={() => {
                    setChannel(key as AlertChannel);
                    setError("");
                    if (key === "push" && pushToken) setAddress(pushToken);
                  }}
                >
                  <span className="alert-section__channel-icon" aria-hidden>
                    {CHANNEL_ICONS[key]}
                  </span>
                  {t(`alert.${key}`)}
                </button>
              );
            })}
          </div>

          {sub ? (
            <p className="alert-section__success">
              ✅ {t("alert.success", { channel: t(`alert.${channel}`) })}
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubscribe();
              }}
            >
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="alert-section__honeypot"
              />
              <div className="alert-section__form-row">
                {channel === "push" && pushReady && pushToken ? (
                  <p className="alert-section__push-ready">
                    {t("alert.pushReady", { defaultValue: "This device is ready for push alerts." })}
                  </p>
                ) : (
                  <input
                    value={channel === "push" && pushToken ? pushToken : address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setError("");
                    }}
                    placeholder={t(PLACEHOLDER_KEYS[channel] || "alert.placeholder")}
                    aria-label={t(PLACEHOLDER_KEYS[channel] || "alert.placeholder")}
                    className="alert-section__input"
                    readOnly={channel === "push" && Boolean(pushToken)}
                  />
                )}
                <button type="submit" disabled={loading || (channel === "push" && !pushReady)} className="alert-section__submit">
                  {loading ? t("alert.subscribing") : t("alert.subscribe")}
                </button>
              </div>
              <TurnstileWidget onToken={setTurnstileToken} className="alert-section__turnstile" />
              {error && <p className="alert-section__error">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
