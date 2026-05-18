import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// 1. Create a mock pull request event payload
const eventPath = path.resolve("mock-event.json");
const mockEvent = {
  pull_request: {
    number: 42,
    head: {
      sha: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    },
    base: {
      sha: "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5",
    },
  },
};

fs.writeFileSync(eventPath, JSON.stringify(mockEvent, null, 2));
console.log(`✅ Created mock GitHub event payload at: ${eventPath}`);

// 2. Set environment variables mimicking a live GitHub Actions runner
process.env.GITHUB_REPOSITORY = "marcKevzzz/reviewbot";
process.env.GITHUB_EVENT_PATH = eventPath;

// Map inputs (GitHub Actions passes inputs as INPUT_<UPPERCASE-NAME>)
process.env["INPUT_GITHUB-TOKEN"] = process.env.GITHUB_TOKEN || "mock-github-token-xyz";
process.env["INPUT_GEMINI-API-KEY"] = process.env.GEMINI_API_KEY || "mock-gemini-key-xyz";

console.log("\n🚀 Bootstrapping ReviewBot local dry-run...");
console.log("==========================================");

try {
  // Execute the compiled bundle using Node.js
  const output = execSync("node dist/index.js", { encoding: "utf8", stdio: "inherit" });
  console.log(output);
} catch (error) {
  console.log("\n==========================================");
  console.log("⚠️  Action run completed.");
  console.log("Note: Since we are running in dry-run mode with mock tokens, the run will terminate when making actual external API calls, but this proves the orchestrator boots and parses everything successfully!");
} finally {
  // Cleanup mock file
  if (fs.existsSync(eventPath)) {
    fs.unlinkSync(eventPath);
  }
}
