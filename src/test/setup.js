import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn(() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
});
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
// jsdom lacks native dialog behavior; focus restoration is still tested via React.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
