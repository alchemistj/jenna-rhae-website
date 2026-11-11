import { describe, expect, it } from "vitest";
import { activateDeferredBox, startDeferredIframes } from "../src/lib/deferredEmbed";
import { BOOKING_FRAME_ID, FORM_EMBED_URL, QUIZ_URL } from "../src/lib/site";

type Listener = { fn: () => void; once: boolean };

type FakeNode = {
  tagName: string;
  id: string;
  src: string;
  title: string;
  async: boolean;
  dataset: Record<string, string>;
  attrs: Record<string, string>;
  children: FakeNode[];
  parent: FakeNode | FakeShadow | null;
  shadow: FakeShadow | null;
  setAttribute(name: string, value: string): void;
  appendChild(child: FakeNode): FakeNode;
  attachShadow(): FakeShadow;
  addEventListener(type: string, fn: () => void): void;
  fire(type: string): void;
};

type FakeShadow = {
  children: FakeNode[];
  append(...nodes: FakeNode[]): void;
  appendChild(child: FakeNode): FakeNode;
};

function createElement(tag: string): FakeNode {
  const listeners = new Map<string, Array<() => void>>();
  const el: FakeNode = {
    tagName: tag.toUpperCase(),
    id: "",
    src: "",
    title: "",
    async: false,
    dataset: {},
    attrs: {},
    children: [],
    parent: null,
    shadow: null,
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    appendChild(child) {
      this.children.push(child);
      child.parent = this;
      return child;
    },
    attachShadow() {
      const shadow: FakeShadow = {
        children: [],
        append(...nodes) {
          for (const node of nodes) this.appendChild(node);
        },
        appendChild(child) {
          this.children.push(child);
          child.parent = shadow;
          return child;
        },
      };
      this.shadow = shadow;
      return shadow;
    },
    addEventListener(type, fn) {
      const list = listeners.get(type) ?? [];
      list.push(fn);
      listeners.set(type, list);
    },
    fire(type) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn();
    },
  };
  return el;
}

function findTag(node: FakeNode | FakeShadow, tag: string): FakeNode | null {
  const children = "children" in node ? node.children : [];
  for (const child of children) {
    if (child.tagName === tag) return child;
    const nested = findTag(child, tag);
    if (nested) return nested;
    if (child.shadow) {
      const inShadow = findTag(child.shadow, tag);
      if (inShadow) return inShadow;
    }
  }
  return null;
}

function makePage(kinds: Array<"booking" | "quiz">) {
  const boxes = kinds.map((kind) => {
    const box = createElement("div");
    box.dataset.deferredIframe = "";
    box.dataset.title = kind;
    if (kind === "booking") {
      box.dataset.src = "https://link.springboardcrm.com/widget/booking/5JgMZbYOgzpSpNXbNZCA";
      box.dataset.autosize = "true";
      box.dataset.frameId = BOOKING_FRAME_ID;
    } else {
      box.dataset.src = QUIZ_URL;
    }
    return box;
  });
  const head = createElement("head");
  const listeners = new Map<string, Listener[]>();
  const win = {
    addEventListener(name: string, fn: () => void, options?: { once?: boolean }) {
      const list = listeners.get(name) ?? [];
      list.push({ fn, once: options?.once === true });
      listeners.set(name, list);
    },
    removeEventListener(name: string, fn: () => void) {
      listeners.set(name, (listeners.get(name) ?? []).filter((entry) => entry.fn !== fn));
    },
    fire(name: string) {
      for (const entry of [...(listeners.get(name) ?? [])]) {
        if (entry.once) this.removeEventListener(name, entry.fn);
        entry.fn();
      }
    },
  };
  const doc = {
    head,
    querySelector(selector: string) {
      if (selector === "script[data-form-embed]") {
        return head.children.find((child) => child.tagName === "SCRIPT" && "data-form-embed" in child.attrs) ?? null;
      }
      if (selector === "[data-deferred-iframe][data-autosize='true']") {
        return boxes.find((box) => box.dataset.autosize === "true") ?? null;
      }
      return null;
    },
    querySelectorAll(selector: string) {
      if (selector === "[data-deferred-iframe]") return boxes;
      return [];
    },
    createElement,
  };
  return { boxes, head, win, doc };
}

describe("deferred embeds", () => {
  it("does not insert an iframe or the resizer until the visitor interacts", () => {
    const { boxes, head, win, doc } = makePage(["booking"]);
    startDeferredIframes(doc as unknown as Document, win as unknown as Window);
    expect(findTag(boxes[0]!, "IFRAME")).toBeNull();
    expect(head.children).toHaveLength(0);
    win.fire("pointerdown");
    const frame = findTag(boxes[0]!, "IFRAME");
    expect(frame?.id).toBe(BOOKING_FRAME_ID);
    expect(frame?.attrs.scrolling).toBe("no");
    expect(frame?.attrs.style).toBe("width:100%;border:none;overflow:hidden;");
    expect(frame?.parent).toBe(boxes[0]);
    expect(head.children).toHaveLength(1);
    expect(head.children[0]?.src).toBe(FORM_EMBED_URL);
    expect(head.children[0]?.async).toBe(true);
  });

  it("loads the resizer once, and only beside an autosized iframe", () => {
    const { boxes, head, win, doc } = makePage(["booking", "booking"]);
    startDeferredIframes(doc as unknown as Document, win as unknown as Window);
    win.fire("scroll");
    win.fire("keydown");
    expect(head.children).toHaveLength(1);
    expect(findTag(boxes[0]!, "IFRAME")).not.toBeNull();
    expect(findTag(boxes[1]!, "IFRAME")).not.toBeNull();
  });

  it("leaves a quiz embed in the light DOM and does not load the resizer", () => {
    const { boxes, head, win, doc } = makePage(["quiz"]);
    startDeferredIframes(doc as unknown as Document, win as unknown as Window);
    win.fire("wheel");
    const frame = findTag(boxes[0]!, "IFRAME");
    expect(frame?.src).toBe(QUIZ_URL);
    expect(frame?.parent).toBe(boxes[0]);
    expect(boxes[0]?.shadow).toBeNull();
    expect(frame?.attrs.scrolling).toBeUndefined();
    expect(head.children).toHaveLength(0);
  });

  it("keeps a quiz iframe out of the resizer scan when the page also has the calendar", async () => {
    const { boxes, head, win, doc } = makePage(["quiz", "booking"]);
    startDeferredIframes(doc as unknown as Document, win as unknown as Window);
    win.fire("touchstart");
    const booking = boxes.find((box) => box.dataset.autosize === "true")!;
    const quiz = boxes.find((box) => box.dataset.autosize !== "true")!;
    const bookingFrame = findTag(booking, "IFRAME");
    expect(bookingFrame?.parent).toBe(booking);
    expect(head.children).toHaveLength(1);
    expect(findTag(quiz, "IFRAME")).toBeNull();
    expect(quiz.dataset.pending).toBe("true");
    head.children[0]?.fire("load");
    await Promise.resolve();
    const quizFrame = findTag(quiz, "IFRAME");
    const slot = quiz.children.find((child) => child.shadow);
    expect(quizFrame).not.toBeNull();
    expect(quizFrame?.parent).toBe(slot?.shadow);
    expect(slot?.attrs["data-embed-slot"]).toBe("");
    expect(slot?.shadow?.children.some((child) => child.tagName === "IFRAME")).toBe(true);
    expect(quiz.dataset.pending).toBeUndefined();
    expect(head.children).toHaveLength(1);
  });

  it("mounts only the box that enters the viewport", () => {
    const seen: unknown[] = [];
    class FakeObserver {
      constructor(private readonly callback: (entries: Array<{ isIntersecting: boolean; target: unknown }>) => void) {}
      observe(target: unknown) {
        seen.push(target);
      }
      unobserve() {}
      disconnect() {}
      trigger(target: unknown) {
        this.callback([{ isIntersecting: true, target }]);
      }
    }
    const { boxes, head, win, doc } = makePage(["quiz", "booking"]);
    const observers: FakeObserver[] = [];
    const Orig = FakeObserver;
    const Tracked = class extends Orig {
      constructor(callback: (entries: Array<{ isIntersecting: boolean; target: unknown }>) => void) {
        super(callback);
        observers.push(this);
      }
    };
    (win as { IntersectionObserver?: unknown }).IntersectionObserver = Tracked;
    startDeferredIframes(doc as unknown as Document, win as unknown as Window);
    expect(seen).toHaveLength(2);
    expect(head.children).toHaveLength(0);
    observers[0]!.trigger(boxes[1]);
    expect(findTag(boxes[1]!, "IFRAME")?.id).toBe(BOOKING_FRAME_ID);
    expect(findTag(boxes[0]!, "IFRAME")).toBeNull();
    expect(head.children[0]?.src).toBe(FORM_EMBED_URL);
  });

  it("does not mount a box twice", () => {
    const { boxes, doc } = makePage(["booking"]);
    activateDeferredBox(boxes[0] as unknown as HTMLElement, doc as unknown as Document);
    activateDeferredBox(boxes[0] as unknown as HTMLElement, doc as unknown as Document);
    expect(boxes[0]!.children.filter((child) => child.tagName === "IFRAME")).toHaveLength(1);
  });
});
