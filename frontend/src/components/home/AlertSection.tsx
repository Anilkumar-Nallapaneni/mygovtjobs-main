import { useState } from "react";
import { useTranslation } from "react-i18next";
import AlertBellIcon from "@/components/layout/AlertBellIcon";
import { useAuth } from "@/hooks/useAuth";
import { useWebPushToken } from "@/hooks/useWebPushToken";
import { subscribeWithUser } from "@/lib/alertsApi";

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
  const { user } = useAuth();
  const { token: pushToken, ready: pushReady } = useWebPushToken();
  const [address, setAddress] = useState("");
  const [sub, setSub] = useState(false);
  const [channel, setChannel] = useState<AlertChannel>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");

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
    setError("");
    setLoading(true);
    const result = await subscribeWithUser(
      {
        channel,
        channel_address: channelAddress,
        state_codes: [],
        categories: [],
        qualification_tags: [],
        website: honeypot,
      },
      user?.id
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
              {error && <p className="alert-section__error">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
