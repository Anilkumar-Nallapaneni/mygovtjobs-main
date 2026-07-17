/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";

describe("RouteErrorBoundary", () => {
  it("shows fallback and retries after error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRetry = vi.fn();
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) throw new Error("Test route crash");
      return <p>Recovered content</p>;
    }

    render(
      <RouteErrorBoundary label="Test route" onRetry={onRetry}>
        <MaybeThrow />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText("Recovered content")).toBeTruthy();

    consoleSpy.mockRestore();
  });

  it("renders children when no error", () => {
    render(
      <RouteErrorBoundary>
        <p>Healthy route</p>
      </RouteErrorBoundary>
    );
    expect(screen.getByText("Healthy route")).toBeTruthy();
  });
});
