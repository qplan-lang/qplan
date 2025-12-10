# PARALLEL

형식:
PARALLEL [ignoreErrors=true] [concurrency=N]:
    statement...
END

## ignoreErrors
true: 내부 오류 무시
false: 하나라도 실패하면 전체 실패

## concurrency
동시에 실행 가능한 최대 작업 수 제한
기본은 무제한
