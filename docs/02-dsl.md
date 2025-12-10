# qplan DSL 문법

## 기본 문법
FETCH <identifier> key=value ... -> output
CALL <identifier> key=value ... -> output
CALC <identifier> input -> output
AI "prompt" USING var1, var2 -> output

## Block
IF condition:
    ...
ELSE:
    ...
END

PARALLEL [options]:
    ...
END

## 조건식
identifier comparator value

comparator:
> < >= <= == != EXISTS NOT_EXISTS
