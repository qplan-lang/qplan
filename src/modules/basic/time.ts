import { ActionModule } from "../../core/actionModule.js";

/**
 * time 모듈
 * -----------------------------------------
 * 현재 시간을 반환하는 모듈.
 *
 * QPlan script 예:
 *   time -> now
 *   time format="iso" -> now
 *   time format="epochMs" -> now
 *   time format="local" -> now
 */
export const timeModule: ActionModule = Object.assign(
  (inputs: Record<string, any>) => {
    const now = new Date();
    const format = String(inputs.format ?? "time").toLowerCase();
    const epochMs = now.getTime();

    switch (format) {
      case "iso":
        return now.toISOString();
      case "epochms":
      case "ms":
        return epochMs;
      case "epochsec":
      case "epochs":
      case "sec":
      case "s":
        return Math.floor(epochMs / 1000);
      case "local":
        return now.toString();
      case "time": {
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
      }
      case "time":
      default: {
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
      }
      case "object": {
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const hoursStr = String(hours).padStart(2, "0");
        const minutesStr = String(minutes).padStart(2, "0");
        const secondsStr = String(seconds).padStart(2, "0");
        return {
          hour: hours,
          minute: minutes,
          second: seconds,
          time: `${hoursStr}:${minutesStr}:${secondsStr}`,
          iso: now.toISOString(),
          epochMs,
          epochSec: Math.floor(epochMs / 1000),
          local: now.toString()
        };
      }
    }
  },
  {
    id: "time",
    description: "현재 시간을 다양한 포맷으로 반환하는 모듈.",
    usage: `time -> now (default: "HH:mm:ss")
time format="iso|epochMs|epochSec|local|time|object" -> now`,
    inputs: ["format"]
  }
);
