// Extends Vitest's expect with jest-dom matchers (toBeInTheDocument, etc.).
// Loaded via vite.config.ts `test.setupFiles`.
import '@testing-library/jest-dom/vitest'

// jsdom lacks the pointer-capture / scroll APIs Radix primitives call on interaction.
// Shim them so Tabs/Accordion behave in tests as they do in the browser.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}
