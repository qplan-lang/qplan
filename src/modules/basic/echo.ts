import { ActionModule } from "../../core/actionModule.js";

/**
 * echo 모듈
 * -----------------------------------------
 * 입력으로 받은 값을 그대로 반환하는 가장 단순한 디버깅/테스트용 모듈.
 *
 * QPlan script 예:
 *   echo msg="hello" -> out
 *   echo any="값" num=123 -> result
 */
export const echoModule: ActionModule = Object.assign(
  (inputs: Record<string, any>) => {
    return inputs;
  },
  {
    id: "echo",
    description: "입력값을 그대로 반환하는 기본 디버깅 모듈.",
    usage: `echo msg="hello" -> out`,
    inputs: ["msg"]
  }
);
