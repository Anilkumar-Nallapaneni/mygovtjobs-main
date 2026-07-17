/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import AlertSection from "@/components/home/AlertSection";

describe("AlertSection", () => {
  it("renders alert signup form with channel options", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AlertSection />
      </I18nextProvider>
    );

    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(screen.getAllByRole("radio").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("button", { name: /subscribe|alert/i })).toBeTruthy();
  });
});
