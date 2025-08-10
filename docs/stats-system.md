# 스탯 시스템 (Stats System)

Potato Gang의 플레이어 스탯 관리 시스템은 확장 가능하고 자동 저장되는 캐릭터 능력치 시스템입니다.

## 📋 목차
- [개요](#개요)
- [스탯 구조](#스탯-구조)
- [시스템 컴포넌트](#시스템-컴포넌트)
- [사용법](#사용법)
- [API 레퍼런스](#api-레퍼런스)
- [확장 방법](#확장-방법)

## 개요

스탯 시스템의 핵심 기능:

- **기본 스탯**: 체력, 골드, 경험치, 레벨
- **확장 가능**: 새로운 스탯 동적 추가
- **자동 저장**: 실시간 localStorage 저장
- **타입 안전성**: TypeScript 타입 지원
- **검증 시스템**: 스탯 값 유효성 검사

## 스탯 구조

### 기본 스탯 정의

```typescript
interface PlayerStats {
  health: number;        // 현재 체력 (연속형)
  maxHealth: number;     // 최대 체력 (연속형)
  gold: number;          // 보유 골드
  experience: number;    // 경험치
  level: number;         // 캐릭터 레벨
  // === 이산형 하트 체력 (1P/2P) ===
  hearts_p1: number;     // 1P 보유 하트 수
  maxHearts_p1: number;  // 1P 최대 하트 수
  hearts_p2: number;     // 2P 보유 하트 수
  maxHearts_p2: number;  // 2P 최대 하트 수
  [key: string]: number; // 확장 가능한 추가 스탯
}
```

### 기본값

```typescript
const defaultStats: PlayerStats = {
  health: 100,
  maxHealth: 100,
  gold: 0,
  experience: 0,
  level: 1,
  // 하트 기반 이산형 체력 기본값
  hearts_p1: 3,
  maxHearts_p1: 3,
  hearts_p2: 3,
  maxHearts_p2: 3
};
```

## 시스템 컴포넌트

### 1. PlayerStats 인터페이스

모든 플레이어 능력치를 정의하는 타입입니다.

```typescript
// types/GameData.ts
export interface PlayerStats {
  health: number;
  maxHealth: number;
  gold: number;
  experience: number;
  level: number;
  [key: string]: number; // 동적 스탯 추가 지원
}
```

### 2. Player 클래스

플레이어 엔티티에 스탯 관리 기능을 제공합니다.

```typescript
// entities/Player.ts
export class Player {
  public stats: PlayerStats;
  
  // 스탯 업데이트
  updateStats(newStats: Partial<PlayerStats>): void
  
  // 특정 스탯 추가
  addStat(statName: keyof PlayerStats, amount: number): void
  
  // 특정 스탯 설정
  setStat(statName: keyof PlayerStats, value: number): void
  
  // 스탯 정보 조회
  getStats(): PlayerStats

  // === 하트 전용 헬퍼 ===
  addHeartsP1(amount: number): void
  setHeartsP1(value: number): void
  setMaxHeartsP1(value: number): void
}
```

### 3. SaveManager 클래스

스탯 데이터의 저장과 로드를 담당합니다.

```typescript
// systems/SaveManager.ts
export class SaveManager {
  // 플레이어 스탯 업데이트
  static updatePlayerStats(stats: Partial<PlayerStats>): void
  
  // 게임 데이터 저장
  static saveGame(data: Partial<GameData>): void
  
  // 게임 데이터 로드
  static loadGame(): GameData
}
```

## 사용법

### 1. 기본 스탯 조작

```typescript
// 플레이어 인스턴스 접근
const player = this.player;

// 골드 추가
player.addStat('gold', 50);

// 체력 회복
player.addStat('health', 20);

// 레벨 설정
player.setStat('level', 5);

// 2P 하트 감소/증가
player.addStat('hearts_p2' as keyof PlayerStats, -1);
player.addStat('hearts_p2' as keyof PlayerStats, +1);

// 경험치 확인
const currentExp = player.stats.experience;
```

### 2. 스탯 업데이트

```typescript
// 여러 스탯 동시 업데이트
player.updateStats({
  health: 80,
  gold: 150,
  experience: 250,
  hearts_p1: 2
});

// 레벨업 처리
if (player.stats.experience >= 100) {
  player.setStat('level', player.stats.level + 1);
  player.setStat('maxHealth', player.stats.maxHealth + 10);
  player.setStat('health', player.stats.maxHealth); // 풀 힐
}
```

### 3. 조건부 스탯 확인

```typescript
// 구매 가능 여부 확인
if (player.stats.gold >= itemPrice) {
  player.addStat('gold', -itemPrice);
  // 아이템 지급
}

// 레벨 제한 확인
if (player.stats.level >= 5) {
  // 고급 콘텐츠 해금
}

// 체력 상태 확인
const healthPercentage = (player.stats.health / player.stats.maxHealth) * 100;
if (healthPercentage < 25) {
  // 위험 상태 알림
}
```

### 4. 커스텀 스탯 추가

```typescript
// 새로운 스탯 추가 (동적)
player.stats['mana'] = 50;
player.stats['strength'] = 10;
player.stats['intelligence'] = 8;

// 커스텀 스탯 조작
player.addStat('mana' as keyof PlayerStats, 10);
player.setStat('strength' as keyof PlayerStats, 15);
```

## API 레퍼런스

### Player 클래스 메서드

#### `updateStats(newStats: Partial<PlayerStats>): void`

여러 스탯을 동시에 업데이트합니다.

```typescript
player.updateStats({
  health: 100,
  gold: 200
});
```

#### `addStat(statName: keyof PlayerStats, amount: number): void`

특정 스탯에 값을 추가합니다.

```typescript
player.addStat('gold', 50);     // 골드 +50
player.addStat('health', -10);  // 체력 -10
```

**특별 규칙:**
- `health`는 `maxHealth`를 초과할 수 없음
- `hearts_p1`은 `0..maxHearts_p1` 범위를 벗어나지 않음
- `hearts_p2`는 `0..maxHearts_p2` 범위를 벗어나지 않음
- 음수 값으로 스탯 감소 가능

#### `setStat(statName: keyof PlayerStats, value: number): void`

특정 스탯을 지정된 값으로 설정합니다.

```typescript
player.setStat('level', 10);    // 레벨을 10으로 설정
player.setStat('health', 100);  // 체력을 100으로 설정
```

#### `getStats(): PlayerStats`

현재 스탯의 복사본을 반환합니다.

```typescript
const currentStats = player.getStats();
console.log(currentStats.gold); // 현재 골드 출력
```

#### `debugStats(): void`

콘솔에 현재 스탯 정보를 출력합니다.

```typescript
player.debugStats();
// 출력:
// === Player Stats ===
// 체력: 80/100
// 골드: 150
// 경험치: 75
// 레벨: 3
```

### SaveManager 클래스 메서드

#### `updatePlayerStats(stats: Partial<PlayerStats>): void`

플레이어 스탯을 저장소에 업데이트합니다.

```typescript
SaveManager.updatePlayerStats({
  gold: 100,
  experience: 50
});
```

#### `loadGame(): GameData`

저장된 게임 데이터를 로드합니다.

```typescript
const gameData = SaveManager.loadGame();
const playerStats = gameData.player.stats;
```

## 확장 방법

### 1. 새로운 기본 스탯 추가

```typescript
// types/GameData.ts 수정
export interface PlayerStats {
  health: number;
  maxHealth: number;
  gold: number;
  experience: number;
  level: number;
  mana: number;        // 새 스탯 추가
  maxMana: number;     // 새 스탯 추가
  [key: string]: number;
}

// SaveManager.ts의 기본값 수정
private static getDefaultGameData(): GameData {
  return {
    player: {
      stats: {
        health: 100,
        maxHealth: 100,
        gold: 0,
        experience: 0,
        level: 1,
        mana: 50,        // 기본값 추가
        maxMana: 50      // 기본값 추가
      },
      // ...
    },
    // ...
  };
}
```

### 2. 스탯 계산 로직 추가

```typescript
// Player.ts에 메서드 추가
public calculateTotalPower(): number {
  return this.stats.level * 10 + 
         this.stats.strength + 
         this.stats.intelligence;
}

public getHealthPercentage(): number {
  return (this.stats.health / this.stats.maxHealth) * 100;
}

public canLevelUp(): boolean {
  const requiredExp = this.stats.level * 100;
  return this.stats.experience >= requiredExp;
}
```

### 3. 스탯 이벤트 시스템

```typescript
// Player.ts에 이벤트 추가
public onStatChanged?: (statName: string, oldValue: number, newValue: number) => void;

public addStat(statName: keyof PlayerStats, amount: number): void {
  const oldValue = this.stats[statName];
  
  if (typeof this.stats[statName] === 'number') {
    this.stats[statName] += amount;
    
    // 이벤트 발생
    this.onStatChanged?.(statName as string, oldValue, this.stats[statName]);
    
    // 자동 레벨업 체크
    if (statName === 'experience') {
      this.checkAutoLevelUp();
    }
  }
}

private checkAutoLevelUp(): void {
  const requiredExp = this.stats.level * 100;
  if (this.stats.experience >= requiredExp) {
    this.levelUp();
  }
}
```

### 4. 스탯 제한 및 검증

```typescript
// Player.ts에 검증 로직 추가
private validateStatValue(statName: string, value: number): number {
  switch (statName) {
    case 'health':
      return Math.max(0, Math.min(value, this.stats.maxHealth));
    case 'mana':
      return Math.max(0, Math.min(value, this.stats.maxMana));
    case 'gold':
      return Math.max(0, value); // 골드는 음수 불가
    case 'level':
      return Math.max(1, value); // 레벨은 1 이상
    default:
      return Math.max(0, value); // 기본적으로 음수 불가
  }
}

public setStat(statName: keyof PlayerStats, value: number): void {
  if (typeof this.stats[statName] === 'number') {
    const validatedValue = this.validateStatValue(statName as string, value);
    this.stats[statName] = validatedValue;
    SaveManager.updatePlayerStats(this.stats);
  }
}
```

## 🎮 게임 내 사용 예시

### 대화 시스템과의 연동

```yaml
# merchant.yaml
choices:
  - text: "체력 포션 구매 (10골드)"
    condition: "gold>=10"
    action: "add_stat:gold:-10;add_stat:health:50"
    
  - text: "경험치 구매 (20골드)"
    condition: "gold>=20&&level<10"
    action: "add_stat:gold:-20;add_stat:experience:25"
```

### 액션 시스템과의 연동

```typescript
// ActionProcessor.ts에서
case 'add_stat':
  const statName = parts[1] as keyof PlayerStats;
  const amount = parseInt(parts[2]);
  this.player.addStat(statName, amount);
  break;
```

## 🔧 디버그 기능

- **F1**: 플레이어 스탯 출력
- **F5**: 골드 +10 (테스트용)
- **F6**: 경험치 +5 (테스트용)
- **F10**: P1 하트 -1
- **F11**: P1 하트 +1
- **F12**: P2 하트 -1

## 💾 저장 시스템

스탯은 다음과 같이 자동 저장됩니다:

1. **실시간 저장**: 스탯 변경 시 즉시 localStorage에 저장
2. **위치 저장**: 1초마다 플레이어 위치 저장
3. **버전 관리**: 저장 데이터 버전 호환성 검사
4. **에러 처리**: 저장/로드 실패 시 기본값 사용

### 멀티 슬롯 저장/불러오기/삭제

- **슬롯 수**: 최대 3개 (1, 2, 3)
- **저장 키**: `potato-gang-save-<slot>` (예: `potato-gang-save-1`)
- **메타 키**: `potato-gang-save-meta` (마지막 저장 시각, 미리보기 정보)
- **활성 슬롯 키**: `potato-gang-active-slot`

```typescript
// SaveManager 주요 API
type SaveSlotId = 1 | 2 | 3;

SaveManager.setActiveSlot(1);               // 활성 슬롯 지정
const data = SaveManager.loadGame();        // 활성 슬롯에서 로드
SaveManager.saveGame({ player: { ... } });  // 활성 슬롯으로 저장
SaveManager.clearSave(2);                   // 슬롯 2 삭제
SaveManager.listSlots();                    // 슬롯 목록/미리보기 조회
SaveManager.initializeSlot(1);              // 새 게임 데이터로 슬롯 초기화
// 하트 변경은 부분 업데이트 권장
SaveManager.updatePlayerStats({ hearts_p1: 2 });
```

### 미리보기(Preview) 정보
- 레벨, 체력/최대체력, 좌표, 진행도(progress)를 메타에 함께 저장하여 메인 메뉴에서 표시

### HUD / 하트 표시
- 좌상단에 하트 HUD 표시: P1, P2 각각 ♥(채움)/♡(빈 칸)로 현재/최대 하트 시각화
- 갱신 주기: 약 4회/초
- 위치: 화면 좌상단 고정(`setScrollFactor(0)`)

### 진행 상황(Progress) 확장 설계
- 진행 요약은 `gameState.customData.progress`에 문자열 또는 숫자 형태로 저장
- 예: `"start"`, `"chapter1"`, `2` 등 프로젝트 요구에 맞춰 자유롭게 확장

```typescript
// 기본 데이터 (SaveManager.createNewGameData)
gameState: {
  currentScene: 'GameScene',
  flags: {},
  customData: {
    progress: 'start' // 확장 포인트
  }
}
```

### 메인 메뉴와의 연동
- 메인 메뉴에는 다음 액션 제공:
  - 새 게임: 슬롯 선택 → 빈 슬롯은 즉시 시작, 점유 슬롯은 덮어쓰기 확인 후 초기화 저장
  - 불러오기: 존재하는 슬롯만 선택 가능. 각 슬롯의 미리보기와 마지막 저장 시각 표시, 삭제 버튼 제공

## 📝 모범 사례

1. **스탯 명명**: 명확하고 일관된 이름 사용
2. **범위 제한**: 적절한 최솟값/최댓값 설정
3. **타입 안전성**: TypeScript 타입 활용
4. **이벤트 활용**: 스탯 변경 시 적절한 피드백 제공
5. **성능 고려**: 불필요한 저장 작업 최소화 