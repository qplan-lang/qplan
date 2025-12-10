# Examples

## 파일 읽고 AI에게 문제 풀기
FETCH file path="examples/math.txt" -> content
AI "문제 풀어줘" USING content -> answer

## CNN HTML → 헤드라인 추출 → 요약
FETCH fetchHttp url="https://edition.cnn.com/" -> html
CALC extractHeadline html -> heads
AI "요약해줘" USING heads -> out

## Future + Join + 병렬
CALL future task="작업A" -> f1
CALL future task="작업B" -> f2
CALL join futures="f1,f2" -> done
