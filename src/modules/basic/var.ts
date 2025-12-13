import { ActionModule } from "../../core/actionModule.js";

/**
 * var 모듈: 리터럴 값을 그대로 반환하여 ctx 변수에 저장한다.
 * Parser가 value에 문자열/숫자/JSON 리터럴을 채워준다.
 */
export const varModule: ActionModule = Object.assign(
  (inputs: Record<string, any>) => {
    if (!("value" in inputs)) {
      throw new Error("var module requires literal value");
    }
    return inputs.value;
  },
  {
    id: "var",
    description:
      "리터럴(숫자/문자열/JSON) 값을 그대로 ctx 변수로 저장. 기존 ctx 변수를 다른 이름으로 복사하는 용도로는 사용할 수 없습니다.",
    usage: `
var 0 -> count
var "hello" -> msg
var [1,2,3] -> items
var {"a":1} -> config
`,
    inputs: ["value"],
  }
);
