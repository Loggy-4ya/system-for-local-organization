#!/usr/bin/env node
/**
 * @fileoverview Stop host ngrok started by npm run dev:tunnel.
 *
 * Run: npm run dev:tunnel:stop
 */

import { stopHostNgrok } from "./ngrokDevLib.mjs";

if (stopHostNgrok()) {
  console.log("Stopped host ngrok.");
} else {
  console.log("No host ngrok pid file (.ngrok.pid) — nothing to stop.");
}
