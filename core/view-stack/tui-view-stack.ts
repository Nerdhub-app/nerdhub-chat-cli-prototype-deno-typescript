import { colors } from "@cliffy/ansi/colors";
import { DEFAULT_MAX_DEPTH } from "./view-stack.core.const.ts";
import type {
  TuiView,
  TuiViewAction,
  TuiViewStack,
} from "./view-stack.core.d.ts";

/**
 * TUI view stack options.
 */
export type TuiViewStackOptions = {
  /**
   * Maximum depth of the view stack.
   */
  maxDepth?: number;
  /**
   * Initial view.
   */
  initialView: TuiView;
};

export class ConcreteTuiViewStack implements TuiViewStack {
  #stack: TuiView[] = [];
  get stack(): readonly TuiView[] {
    return Object.freeze([...this.#stack]);
  }

  #maxDepth!: number;
  get maxDepth(): number {
    return this.#maxDepth;
  }

  get current(): TuiView {
    return this.#stack[this.#stack.length - 1];
  }

  constructor(options: TuiViewStackOptions) {
    this.#maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.#stack.push(options.initialView);
  }

  /**
   * Show the breadcrumb of the view stack.
   */
  private showBreadcrumb() {
    const path = this.stack.map((v) => v.name).join(" > ");
    console.log(colors.dim(`📍 ${path}`));
    console.log(
      colors.dim(`   Stack depth: ${this.stack.length}/${this.maxDepth}\n`),
    );
  }

  /**
   * Handle the action.
   * @param action The action to handle.
   * @returns True if the action was handled, false otherwise.
   */
  private handleAction(action: TuiViewAction): boolean {
    switch (action.type) {
      case "push":
        if (this.#stack.length >= this.#maxDepth) {
          console.log(
            colors.yellow(
              `\n⚠️  Max depth (${this.#maxDepth}) reached. Cannot go deeper.`,
            ),
          );
          Deno.stdin.readSync(new Uint8Array(1)); // Wait for keypress
          return true;
        }
        this.#stack.push(action.view);
        break;

      case "pop":
        if (this.#stack.length > 1) {
          this.#stack.pop();
        }
        break;

      case "replace":
        this.#stack.pop();
        this.#stack.push(action.view);
        break;

      case "popTo":
        while (this.#stack.length > action.depth && this.#stack.length > 1) {
          this.#stack.pop();
        }
        break;

      case "exit":
        return false;
    }
    return true;
  }

  async run(): Promise<void> {
    while (this.#stack.length > 0) {
      console.clear();
      this.showBreadcrumb();

      const action = await this.current.render();

      if (!this.handleAction(action)) {
        break; // Exit requested
      }
    }
    console.log(colors.green("\nGoodbye! 👋"));
  }
}

/**
 * Create a TUI view stack.
 * @param options The options for the view stack.
 * @returns The view stack.
 */
export function createTuiViewStack(options: TuiViewStackOptions): TuiViewStack {
  return new ConcreteTuiViewStack(options);
}

export default ConcreteTuiViewStack;
