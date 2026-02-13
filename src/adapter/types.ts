import { type WaitCondition } from "../config/schema.js";

export type ScreenshotOptions = {
  fullPage?: boolean;
};

export interface AutomationAdapter {
  waitFor(condition: WaitCondition, timeoutMs: number): Promise<void>;
  click(selector: string, options?: { button?: "left" | "right"; clickCount?: number }): Promise<void>;
  input(selector: string, value: string, options?: { clear?: boolean }): Promise<void>;
  key(keys: string[]): Promise<void>;
  screenshot(path: string, options?: ScreenshotOptions): Promise<void>;
  content?(): Promise<string>;
  evaluateCondition?(selector: string): Promise<boolean>;
  close?(): Promise<void>;
}
