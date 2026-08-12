import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia, and useIsMobile() calls it on mount — any
// component test that renders a responsive component dies without this stub.
// Defaults to desktop (no match); a test wanting mobile can override the impl.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
