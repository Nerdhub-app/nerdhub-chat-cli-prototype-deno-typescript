import os from "node:os";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

export function generateDeviceId() {
  const osType = os.type();
  const osRelease = os.release();
  const osArch = os.arch();

  let machineId = "unknown";
  if (osType === "Linux") {
    try {
      machineId = new TextDecoder("utf-8").decode(
        Deno.readFileSync("/etc/machine-id"),
      ).trim();
    } catch (error) {
      // Handle machine-id not found or other errors
      console.warn("Could not read /etc/machine-id:", (error as Error).message);
    }
  } else if (osType === "Windows_NT") {
    try {
      machineId = execSync("wmic csproduct get UUID").toString().split("\n")[1]
        .trim();
    } catch (error) {
      console.warn(
        "Could not retrieve Windows UUID:",
        (error as Error).message,
      );
    }
  } else if (osType === "Darwin") { // macOS
    try {
      machineId = execSync(
        "ioreg -rd1 -c IOPlatformExpertDevice | grep \"IOPlatformUUID\" | sed 's/.*\"=//' | tr -d '\"'",
      ).toString().trim();
    } catch (error) {
      console.warn("Could not retrieve macOS UUID:", (error as Error).message);
    }
  }

  const combinedString = `${osType}-${osRelease}-${osArch}-${machineId}`;
  const deviceId = crypto.createHash("sha256").update(combinedString).digest(
    "hex",
  );

  return deviceId;
}
