/**
 * TUI view stack manager.
 */
export interface TuiViewStack {
  /**
   * Get the view stack.
   */
  get stack(): readonly TuiView[];

  /**
   * Get the maximum depth of the view stack.
   */
  get maxDepth(): number;

  /**
   * Get the current view.
   */
  get current(): TuiView;

  /**
   * Run the view stack.
   */
  run(): Promise<void>;
}

/**
 * TUI view action.
 */
type TuiViewAction =
  | { type: "push"; view: TuiView }
  | { type: "pop" }
  | { type: "replace"; view: TuiView }
  | { type: "popTo"; depth: number }
  | { type: "exit" };

/**
 * TUI view.
 */
export interface TuiView {
  /**
   * View name.
   */
  get name(): string;

  /**
   * Render the view.
   */
  render(): Promise<TuiViewAction>;
}
