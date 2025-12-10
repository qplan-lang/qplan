# Future & Join

Future: 작업 예약 → Promise 저장
Join: 여러 Future 결과를 한 번에 await

## 문법
CALL future task="A" -> f1
CALL future task="B" -> f2

CALL join futures="f1,f2" -> results
