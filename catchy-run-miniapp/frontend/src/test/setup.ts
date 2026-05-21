import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fillStyle: ""
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 16));
vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
