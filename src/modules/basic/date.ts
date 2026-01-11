import { ActionModule } from "../../core/actionModule.js";

/**
 * date 모듈
 * -----------------------------------------
 * 현재 날짜와 시간을 반환하는 모듈.
 *
 * QPlan script 예:
 *   date -> now
 *   date format="iso" -> now
 *   date format="epochMs" -> now
 *   date format="local" -> now
 *   date format="date" -> now
 *   date format="time" -> now
 *   date format="datetime" -> now
 */
export const dateModule: ActionModule = Object.assign(
  (inputs: Record<string, any>) => {
    const now = new Date();
    const format = String(inputs.format ?? "date").toLowerCase();
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
      case "date":
      default: {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
      case "time": {
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        return `${hours}:${minutes}:${seconds}`;
      }
      case "datetime": {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }
      case "object": {
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const monthStr = String(month).padStart(2, "0");
        const dayStr = String(day).padStart(2, "0");
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const hoursStr = String(hours).padStart(2, "0");
        const minutesStr = String(minutes).padStart(2, "0");
        const secondsStr = String(seconds).padStart(2, "0");
        return {
          year,
          month,
          day,
          hour: hours,
          minute: minutes,
          second: seconds,
          date: `${year}-${monthStr}-${dayStr}`,
          time: `${hoursStr}:${minutesStr}:${secondsStr}`,
          datetime: `${year}-${monthStr}-${dayStr} ${hoursStr}:${minutesStr}:${secondsStr}`,
          iso: now.toISOString(),
          epochMs,
          epochSec: Math.floor(epochMs / 1000),
          local: now.toString()
        };
      }
    }
  },
  {
    id: "date",
    description: "현재 날짜와 시간을 다양한 포맷으로 반환하는 모듈.",
    usage: `date -> now (default: "YYYY-MM-DD")
date format="iso|epochMs|epochSec|local|date|time|datetime|object" -> now`,
    inputs: ["format"]
  }
);
