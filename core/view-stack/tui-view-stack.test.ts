import { assertEquals, assertInstanceOf } from "@std/assert";
import { stub } from "@std/testing/mock";
import { ConcreteTuiViewStack, createTuiViewStack } from "./tui-view-stack.ts";
import type { TuiView, TuiViewAction } from "./view-stack.core.d.ts";

/**
 * Mock view for testing
 */
class MockView implements TuiView {
  #name: string;
  #actions: TuiViewAction[];
  #renderCount = 0;

  constructor(name: string, actions: TuiViewAction[] = []) {
    this.#name = name;
    this.#actions = actions;
  }

  get name(): string {
    return this.#name;
  }

  get renderCount(): number {
    return this.#renderCount;
  }

  render(): Promise<TuiViewAction> {
    const action = this.#actions[this.#renderCount] || { type: "exit" };
    this.#renderCount++;
    return Promise.resolve(action);
  }
}

Deno.test("TuiViewStack - Initialization", async (t) => {
  const initialView = new MockView("Main");
  const stack = new ConcreteTuiViewStack({ initialView });

  await t.step("should initialize with the provided initial view", () => {
    assertEquals(stack.stack.length, 1);
    assertEquals(stack.stack[0], initialView);
    assertEquals(stack.current, initialView);
  });

  await t.step("should have default max depth if not specified", () => {
    assertEquals(stack.maxDepth, 10);
  });
});

Deno.test("TuiViewStack - run and Breadcrumbs", async (t) => {
  const consoleClearStub = stub(console, "clear", () => {});
  const consoleLogStub = stub(console, "log", () => {});

  try {
    const initialView = new MockView("Main", [{ type: "exit" }]);
    const stack = new ConcreteTuiViewStack({ initialView });

    await t.step(
      "should show breadcrumbs and render current view",
      async () => {
        await stack.run();

        // Verify breadcrumb was shown
        const breadcrumbCall = consoleLogStub.calls.find((call) =>
          typeof call.args[0] === "string" && call.args[0].includes("Main")
        );
        assertInstanceOf(breadcrumbCall, Object);
        assertEquals(initialView.renderCount, 1);
      },
    );
  } finally {
    consoleClearStub.restore();
    consoleLogStub.restore();
  }
});

Deno.test("TuiViewStack - Actions", async (t) => {
  const consoleClearStub = stub(console, "clear", () => {});
  const consoleLogStub = stub(console, "log", () => {});

  try {
    await t.step("push: should add a new view to the stack", async () => {
      const detailView = new MockView("Detail", [{ type: "exit" }]);
      const mainView = new MockView("Main", [{
        type: "push",
        view: detailView,
      }]);
      const stack = new ConcreteTuiViewStack({ initialView: mainView });

      await stack.run();

      assertEquals(mainView.renderCount, 1);
      assertEquals(detailView.renderCount, 1);
    });

    await t.step(
      "pop: should remove the top view and return to previous",
      async () => {
        const detailView = new MockView("Detail", [{ type: "pop" }]);
        const mainView = new MockView("Main", [
          { type: "push", view: detailView },
          { type: "exit" },
        ]);
        const stack = new ConcreteTuiViewStack({ initialView: mainView });

        await stack.run();

        assertEquals(mainView.renderCount, 2);
        assertEquals(detailView.renderCount, 1);
      },
    );

    await t.step("replace: should replace the current view", async () => {
      const otherView = new MockView("Other", [{ type: "exit" }]);
      const mainView = new MockView("Main", [{
        type: "replace",
        view: otherView,
      }]);
      const stack = new ConcreteTuiViewStack({ initialView: mainView });

      await stack.run();

      assertEquals(mainView.renderCount, 1);
      assertEquals(otherView.renderCount, 1);
      assertEquals(stack.stack.length, 1);
    });

    await t.step(
      "popTo: should pop multiple views back to target depth",
      async () => {
        const v3 = new MockView("V3", [{ type: "popTo", depth: 1 }]);
        const v2 = new MockView("V2", [{ type: "push", view: v3 }]);
        const v1 = new MockView("V1", [
          { type: "push", view: v2 },
          { type: "exit" },
        ]);
        const stack = new ConcreteTuiViewStack({ initialView: v1 });

        await stack.run();

        assertEquals(v1.renderCount, 2);
        assertEquals(v2.renderCount, 1);
        assertEquals(v3.renderCount, 1);
      },
    );
  } finally {
    consoleClearStub.restore();
    consoleLogStub.restore();
  }
});

Deno.test("TuiViewStack - Max Depth", async (t) => {
  const consoleClearStub = stub(console, "clear", () => {});
  const consoleLogStub = stub(console, "log", () => {});
  const stdinReadStub = stub(Deno.stdin, "readSync", () => 0);

  try {
    await t.step("should prevent pushing beyond max depth", async () => {
      const v2 = new MockView("V2");
      const v1 = new MockView("V1", [
        { type: "push", view: v2 },
        { type: "exit" },
      ]);
      const stack = new ConcreteTuiViewStack({ initialView: v1, maxDepth: 1 });

      await stack.run();

      // V1 should be rendered twice because it tried to push V2, failed, and then we exit on the second cycle
      // Wait, V1's second action will be "exit" because we didn't provide a second action in the array.
      assertEquals(v1.renderCount, 2);
      assertEquals(v2.renderCount, 0);

      const warningCall = consoleLogStub.calls.find((call) =>
        typeof call.args[0] === "string" && call.args[0].includes("Max depth")
      );
      assertInstanceOf(warningCall, Object);
    });
  } finally {
    consoleClearStub.restore();
    consoleLogStub.restore();
    stdinReadStub.restore();
  }
});

Deno.test("createTuiViewStack factory", () => {
  const initialView = new MockView("Main");
  const stack = createTuiViewStack({ initialView });
  assertInstanceOf(stack, ConcreteTuiViewStack);
});
