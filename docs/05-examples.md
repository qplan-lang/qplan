# 05-examples.md

## 기본 예제
```
echo msg="hello" -> out
```

## 파일 읽기 + 계산
```
file read path="./nums.txt" -> txt
math op="avg" arr=txt -> avg
echo value=avg -> result
```

## Future + Join
```
future task="A" delay=300 -> f1
future task="B" delay=500 -> f2
join futures="f1,f2" -> out
```

## Parallel
```
parallel concurrency=2 {
  echo msg="A" -> a
  echo msg="B" -> b
  echo msg="C" -> c
} -> done
```

## Each 반복
```
json parse data="[1,2,3]" -> nums
math add a=0 b=0 -> total
each (n, idx) in nums {
  math add a=total b=n -> total
  math add a=idx b=1 -> nextIndex
}
```

## Each + stop/skip
```
json parse data="[1,2,3,4]" -> nums
math add a=0 b=0 -> total
each n in nums {
  if n == 3 {
    stop
  }
  if n == 0 {
    skip
  }
  math add a=total b=n -> total
}
```

## Var 리터럴
```
var 0 -> count
var "hello" -> msg
var [1,2,3] -> items
var {"a":1} -> config
```
