import { runQplan } from "../dist/index.js";

/**
 * 예제: each 반복문 패턴 모음
 */
const script = `
json parse data="[1,2,3,4]" -> nums

# 기본 each — 모든 값 합산
math add a=0 b=0 -> basicTotal
each value in nums {
  math add a=basicTotal b=value -> basicTotal
  print value
}

print "------------"

# item / index 구분
math add a=0 b=0 -> indexTotal
each (value, idx) in nums {
  math add a=indexTotal b=idx -> indexTotal
  print "value:" value ", idx:" idx
}

print "------------"

# skip 사용 (3은 건너뛰기)
math add a=0 b=0 -> skipTotal
each value in nums {
  if value == 3 {
    skip
  }
  print "value:" value "skip no"
  math add a=skipTotal b=value -> skipTotal
}

print "------------"

# stop 사용 (3 이후 즉시 종료)
math add a=0 b=0 -> stopTotal
each value in nums {
  if value == 3 {
    print "value:" value "stop yes"
    stop
  }
  print "value:" value "stop no"
  math add a=stopTotal b=value -> stopTotal
}

print "- END of each state"
`;

const ctx = await runQplan(script);
console.log(ctx.toJSON());
