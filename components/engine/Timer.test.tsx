import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Timer } from "./Timer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Timer", () => {
  it("counts up in practice mode", () => {
    render(<Timer initialElapsedSec={0} countdownSec={null} onTick={() => {}} onExpire={() => {}} onPause={() => {}} />);
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByText("01:01")).toBeInTheDocument();
  });
  it("counts down and fires onExpire in mock mode", () => {
    const onExpire = vi.fn();
    render(<Timer initialElapsedSec={0} countdownSec={3} onTick={() => {}} onExpire={onExpire} onPause={() => {}} />);
    act(() => vi.advanceTimersByTime(4_000));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
  it("fires onPause when the document becomes hidden", () => {
    const onPause = vi.fn();
    render(<Timer initialElapsedSec={0} countdownSec={100} onTick={() => {}} onExpire={() => {}} onPause={onPause} />);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(onPause).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });
});
