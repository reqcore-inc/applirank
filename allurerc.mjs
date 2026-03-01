import { defineConfig } from "allure";
import * as os from "node:os";

/**
 * Allure Report 3 configuration for Reqcore.
 *
 * @see https://allurereport.org/docs/v3/configure/
 */
export default defineConfig({
  name: "Reqcore E2E Tests",
  output: "./allure-report",
  historyPath: "./allure-history.jsonl",
  plugins: {
    awesome: {
      options: {
        reportLanguage: "en",
        groupBy: ["parentSuite", "suite", "subSuite"],
      },
    },
  },
  variables: {
    os_platform: os.platform(),
    os_release: os.release(),
    node_version: process.version,
  },
});
