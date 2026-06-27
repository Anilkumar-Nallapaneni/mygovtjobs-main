import { useMemo } from "react";
import {
  INDIA_GLANCE,
  INDIA_GLANCE_SECTIONS,
  formatCoastline,
  formatIndiaLandArea,
  type IndiaGlanceFactKey,
} from "@/data/indiaFacts";
import { STATES } from "@/data/states";
import { numberLocale } from "@/utils/formatLocale";
import { useTranslation } from "react-i18next";

export default function IndiaGlancePanel() {
  const { t, i18n } = useTranslation();
  const locale = numberLocale(i18n.language);

  const valueByKey = useMemo<Record<IndiaGlanceFactKey, string>>(
    () => ({
      officialName: INDIA_GLANCE.officialName,
      president: INDIA_GLANCE.president,
      vicePresident: INDIA_GLANCE.vicePresident,
      primeMinister: INDIA_GLANCE.primeMinister,
      governmentType: INDIA_GLANCE.governmentType,
      legislature: INDIA_GLANCE.legislature,
      lokSabhaSeats: INDIA_GLANCE.lokSabhaSeats,
      rajyaSabhaSeats: INDIA_GLANCE.rajyaSabhaSeats,
      judiciary: INDIA_GLANCE.judiciary,
      constitutionAdopted: INDIA_GLANCE.constitutionAdopted,
      capital: INDIA_GLANCE.capital,
      largestCity: INDIA_GLANCE.largestCity,
      statesUts: String(STATES.length),
      statesCount: INDIA_GLANCE.statesCount,
      unionTerritories: INDIA_GLANCE.unionTerritories,
      districts: INDIA_GLANCE.districts,
      landArea: formatIndiaLandArea(INDIA_GLANCE.landAreaSqKm, locale),
      coastline: formatCoastline(INDIA_GLANCE.coastlineKm, locale),
      geographicRegion: INDIA_GLANCE.geographicRegion,
      landBorders: INDIA_GLANCE.landBorders,
      highestPeak: INDIA_GLANCE.highestPeak,
      longestRiver: INDIA_GLANCE.longestRiver,
      majorPorts: INDIA_GLANCE.majorPorts,
      population: INDIA_GLANCE.population,
      literacyRate: INDIA_GLANCE.literacyRate,
      officialLanguages: INDIA_GLANCE.officialLanguages,
      currency: INDIA_GLANCE.currency,
      timeZone: INDIA_GLANCE.timeZone,
      callingCode: INDIA_GLANCE.callingCode,
      nationalAnthem: INDIA_GLANCE.nationalAnthem,
      nationalEmblem: INDIA_GLANCE.nationalEmblem,
      nationalAnimal: INDIA_GLANCE.nationalAnimal,
      nationalBird: INDIA_GLANCE.nationalBird,
      nationalFlower: INDIA_GLANCE.nationalFlower,
      independence: INDIA_GLANCE.independence,
      republicDay: INDIA_GLANCE.republicDay,
    }),
    [locale]
  );

  return (
    <aside
      className="india-glance"
      aria-label={t("home.indiaGlance.aria", { defaultValue: "India at a glance" })}
    >
      <header className="india-glance__head">
        <h2 className="india-glance__title">
          {t("home.indiaGlance.title", { defaultValue: "India at a glance" })}
        </h2>
        <span className="india-glance__year">
          {t("home.indiaGlance.asOf", {
            year: INDIA_GLANCE.asOfYear,
            defaultValue: "As of {{year}}",
          })}
        </span>
      </header>

      {INDIA_GLANCE_SECTIONS.map((section) => (
        <section key={section.id} className="india-glance__section">
          <h3 className="india-glance__section-title">
            {t(`home.indiaGlance.${section.labelKey}`, {
              defaultValue: section.labelKey.replace(/^section/, ""),
            })}
          </h3>
          <dl className="india-glance__grid">
            {section.facts.map((key) => (
              <div key={key} className="india-glance__item">
                <dt className="india-glance__label">
                  {t(`home.indiaGlance.${key}`, {
                    defaultValue: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
                  })}
                </dt>
                <dd className="india-glance__value">{valueByKey[key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="india-glance__note">
        {t("home.indiaGlance.note", {
          defaultValue:
            "Central ministries, state governments, and union territories all run separate recruitment drives — browse by state on the map or by sector below.",
        })}
      </p>
    </aside>
  );
}
