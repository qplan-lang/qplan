# Timeout

CALL timeout ms=3000 value="OK" -> out

3초 이내에 value 반환
초과 시 Timeout exceeded 발생

병렬/미래 작업과 조합 가능
