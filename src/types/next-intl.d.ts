/**
 * @fileoverview Type-safe next-intl message keys from the English catalog.
 *
 * @module src/types/next-intl
 */

import type en from "../../messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof en;
  }
}
