/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import CategoryGrid from "@/components/jobs/CategoryGrid";

describe("CategoryGrid", () => {
  it("selects a category on card click", () => {
    const onSelectCategory = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <CategoryGrid activeCat={null} onSelectCategory={onSelectCategory} counts={{ ssc: 12 }} />
      </I18nextProvider>
    );

    const sscBtn = screen.getAllByRole("button").find((b) => /SSC/i.test(b.textContent || ""));
    expect(sscBtn).toBeTruthy();
    fireEvent.click(sscBtn!);
    expect(onSelectCategory).toHaveBeenCalledWith("ssc");
  });

  it("clear filter passes null instead of toggling active category", () => {
    const onSelectCategory = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <CategoryGrid activeCat="ssc" onSelectCategory={onSelectCategory} counts={{ ssc: 12 }} />
      </I18nextProvider>
    );

    const clearBtn = screen.getAllByRole("button").find((b) => /clear/i.test(b.textContent || ""));
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn!);
    expect(onSelectCategory).toHaveBeenCalledWith(null);
  });
});
