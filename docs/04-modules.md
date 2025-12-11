# 04-modules.md

## 모듈 시스템 개요
모든 기능은 ActionModule을 통해 확장된다.

ActionModule 메타데이터:
- id  
- description  
- usage  
- inputs[]  
- execute()

## 기본 모듈
- print
- echo  
- sleep  
- file  
- math  
- future  
- join  

## 확장 모듈
- http  
- html  
- json  
- string  
- ai(OpenAI)

## 모듈 등록
```
registry.register(echoModule)
registry.registerAll([mathModule, fileModule])
```

