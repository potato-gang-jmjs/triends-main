# Potato Gang - 시스템 문서

Potato Gang 프로젝트의 핵심 시스템들에 대한 상세한 문서입니다.

## 📚 문서 목록

### 🗣️ [대화 시스템 (Dialogue System)](./dialogue-system.md)
NPC와의 상호작용을 위한 YAML 기반 대화 관리 시스템

- YAML 기반 대화 데이터 관리
- 다중 선택지 및 분기 시스템
- 조건부 선택지 표시
- 타이핑 효과 및 UI 시스템
- 대화 상태 저장 및 복원

### 📊 [스탯 시스템 (Stats System)](./stats-system.md)
플레이어 캐릭터의 능력치 관리 시스템

- 확장 가능한 스탯 구조
- 실시간 자동 저장
- 타입 안전성 보장
- 스탯 검증 및 제한
- 레벨업 및 성장 시스템

### ⚡ [액션 시스템 (Action System)](./action-system.md)
게임 이벤트와 상태 변경을 위한 액션 처리 시스템

- 문자열 기반 액션 정의
- 다중 액션 동시 실행
- 스탯, 아이템, 플래그 조작
- 커스텀 이벤트 트리거
- 확장 가능한 액션 타입

## 🎮 시스템 간 연동

### 대화 → 액션 → 스탯
```yaml
# 대화에서 선택지 선택
choices:
  - text: "체력 포션 구매 (10골드)"
    condition: "gold>=10"           # 스탯 조건 확인
    action: "add_stat:gold:-10;add_item:health_potion:1"  # 액션 실행
```

### 전체 플로우
```
NPC 접근 → 대화 시작 → 선택지 표시 → 조건 확인 → 액션 실행 → 스탯 변경 → 자동 저장
```

## 🔧 시스템 아키텍처

```
Potato Gang 시스템 구조:

├── 🗣️ 대화 시스템
│   ├── DialogueLoader     # YAML 로딩
│   ├── DialogueManager    # 플로우 제어
│   ├── DialogueBox        # UI 표시
│   └── NPCManager         # NPC 관리
│
├── 📊 스탯 시스템
│   ├── PlayerStats        # 스탯 정의
│   ├── Player             # 스탯 조작
│   └── SaveManager        # 저장/로드
│
├── ⚡ 액션 시스템
│   ├── ActionProcessor    # 액션 처리
│   ├── 스탯 액션          # add_stat, set_stat
│   ├── 아이템 액션        # add_item, remove_item
│   ├── 플래그 액션        # set_flag
│   └── 이벤트 액션        # trigger_event
│
└── 💾 저장 시스템
    ├── GameData           # 전체 데이터 구조
    ├── localStorage       # 브라우저 저장
    └── 버전 관리          # 호환성 보장
```

## 🚀 빠른 시작

### 1. 새로운 NPC 추가
```typescript
// GameScene.ts
this.npcManager.addNPC({
  npcId: 'new_npc',
  dialogueId: 'new_npc_dialogue',
  x: 400, y: 300,
  spriteKey: 'npc_sprite'
});
```

### 2. 대화 데이터 생성
```yaml
# public/assets/dialogues/new_npc_dialogue.yaml
npc_id: "new_npc"
conversations:
  introduction:
    text: "안녕하세요!"
    choices:
      - text: "반갑습니다"
        action: "add_stat:experience:5"
```

### 3. 커스텀 액션 추가
```typescript
// ActionProcessor.ts
case 'custom_action':
  this.handleCustomAction(parts);
  break;
```

## 📝 개발 가이드라인

### 네이밍 규칙
- **파일명**: kebab-case (`dialogue-system.md`)
- **클래스명**: PascalCase (`DialogueManager`)
- **메서드명**: camelCase (`startDialogue`)
- **상수명**: SCREAMING_SNAKE_CASE (`DIALOGUE_CONFIG`)

### 코드 스타일
- TypeScript strict mode 사용
- 인터페이스 우선 설계
- 에러 처리 필수
- 콘솔 로깅 활용

### 확장 시 고려사항
1. **타입 안전성**: 새로운 기능도 TypeScript 타입 정의
2. **하위 호환성**: 기존 저장 데이터와 호환성 유지
3. **성능**: 불필요한 연산 최소화
4. **문서화**: 새로운 기능은 문서 업데이트

## 🔍 디버깅 도구

### 콘솔 명령어
- **F1**: 플레이어 스탯 출력
- **F2**: NPC 매니저 정보
- **F3**: 대화 매니저 상태
- **F4**: 저장 데이터 초기화
- **F5**: 골드 +10 (테스트)
- **F6**: 경험치 +5 (테스트)

### 로그 확인
```javascript
// 브라우저 콘솔에서
console.log('=== Player Stats ===');
console.log('=== NPC Manager Debug Info ===');
console.log('=== Dialogue Manager State ===');
```

## 📞 지원

문제가 발생하거나 새로운 기능을 추가하고 싶다면:

1. 해당 시스템 문서 확인
2. 기존 코드의 패턴 따르기
3. 타입 정의 우선 작성
4. 충분한 테스트 진행
5. 문서 업데이트

---

**Potato Gang** - *확장 가능한 RPG 시스템 아키텍처* 