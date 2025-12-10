# Module System

qplan에서 **모듈(Module)** 은 실제 로직을 실행하는 최소 단위다.  
DSL은 "무엇을 할지"만 표현하고, 모듈은 "어떻게 실행할지"를 담당한다.

execute(inputs, ctx) → 결과 반환

## 기본 모듈
FETCH: 가져오기
CALL: 가공/연산
CALC: 흐름 제어(유틸리티)
AI: AI에게 물어보기

1) FETCH — 데이터 가져오기
외부/내부에서 무언가를 불러오는 모듈.
예: HTTP 요청, 파일 읽기, DB 조회, API 호출.
“데이터 소스에서 값을 가져오는 역할 전담”.

2) CALC — 계산/가공
입력 데이터를 연산하거나 변환하는 모듈.
예: MA 계산, 수치 변환, HTML 파싱, 요약 전처리.
“데이터 → 새로운 데이터” 만드는 역할.

3) CALL — 부수효과 / 유틸리티 / 제어
도구성 기능을 수행하는 모듈.
예: timeout, future, join, notify, sleep 등.
계산/조회 아닌 “작업 흐름 제어”의 중심.

4) AI — LLM 호출
OpenAI 같은 모델에게 질문하고 텍스트 결과 받음.
데이터 분석/요약/문제풀이 등 “AI 처리” 전담.
CALC와 달리 지능적 판단이 필요한 작업에 사용.

## 확장 모듈
- FETCH_http: HTTP GET 수행
- FETCH_file: 파일 읽기
- CALC_extractHeadline: HTML 헤드라인 추출
- CALL_timeout: 시간 제한
- CALL_future: 비동기 예약(future)
- CALL_join: future 합류(join)
