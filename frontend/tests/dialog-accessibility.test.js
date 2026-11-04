import test from "node:test";
import assert from "node:assert/strict";
import { trapDialogTabKey } from "../src/lib/dialog-accessibility.js";

const makeElement = () => ({
  disabled: false,
  focused: false,
  focus() { this.focused = true; },
  getAttribute() { return null; },
});

const makeDialog = (elements) => ({
  focused: false,
  querySelectorAll() { return elements; },
  contains(element) { return elements.includes(element); },
  focus() { this.focused = true; },
});

const makeEvent = (shiftKey = false) => ({
  key: "Tab",
  shiftKey,
  prevented: false,
  preventDefault() { this.prevented = true; },
});

test("Tab wraps from the last focusable element to the first", () => {
  const first = makeElement();
  const last = makeElement();
  const dialog = makeDialog([first, last]);
  const event = makeEvent();

  assert.equal(trapDialogTabKey(event, dialog, last), true);
  assert.equal(event.prevented, true);
  assert.equal(first.focused, true);
});

test("Shift+Tab wraps from the first focusable element to the last", () => {
  const first = makeElement();
  const last = makeElement();
  const dialog = makeDialog([first, last]);
  const event = makeEvent(true);

  assert.equal(trapDialogTabKey(event, dialog, first), true);
  assert.equal(event.prevented, true);
  assert.equal(last.focused, true);
});

test("focus is returned inside the dialog when it is outside the focus order", () => {
  const first = makeElement();
  const dialog = makeDialog([first]);
  const event = makeEvent();

  assert.equal(trapDialogTabKey(event, dialog, makeElement()), true);
  assert.equal(first.focused, true);
});

test("a dialog with no focusable controls keeps focus on the dialog", () => {
  const dialog = makeDialog([]);
  const event = makeEvent();

  assert.equal(trapDialogTabKey(event, dialog, null), true);
  assert.equal(event.prevented, true);
  assert.equal(dialog.focused, true);
});

test("non-Tab keys are left untouched", () => {
  const dialog = makeDialog([makeElement()]);
  const event = { ...makeEvent(), key: "Escape" };

  assert.equal(trapDialogTabKey(event, dialog, null), false);
  assert.equal(event.prevented, false);
});
