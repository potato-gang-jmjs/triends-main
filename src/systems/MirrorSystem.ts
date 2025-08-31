import Phaser from 'phaser';
import { Player } from '../entities/Player';

/**
 * MirrorSystem (P1 전용)
 * - Right Ctrl(우Ctrl) 또는 Right Command(우⌘) 누르면 거울 장착/해제 토글
 * - 장착 중 Numpad0 또는 Digit0(상단 0) 누르면 현재 방향으로 'astronaut_mirroring' 포즈가 잠깐 표시
 * - 필요한 에셋이 미로딩이면 여기서 자동 로드
 */
export class MirrorSystem {
    private scene: Phaser.Scene;
    private player: Player;

    private equipped = false;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;

        // 에셋 로드 보장 후 애니메이션 등록
        this.ensureTexturesLoaded(() => {
        this.registerAnimations();
        });

        // 원시 키 이벤트(KeyboardEvent.code)로 우Ctrl·키패드0 구분
        this.scene.input.keyboard?.on('keydown', (evt: KeyboardEvent) => {
        if (evt.code === 'ControlRight' || evt.code === 'MetaRight') {
            if ((evt as any).repeat) return;
            this.setEquipped(!this.equipped);
        } else if (evt.code === 'Numpad0' || evt.code === 'Digit0') {
            if (!this.equipped) return;
            if ((evt as any).repeat) return;
            this.playMirroringPose();
        }
        });
    }

    public isEquipped(): boolean {
        return this.equipped;
    }

    public update(_deltaMs: number): void {
        // 현재 버전은 별도 타이밍 로직 없음 (확장 여지)
    }

    private setEquipped(on: boolean): void {
        this.equipped = on;
        this.player.setMirrorEquipped(on);

        // 시각적으로 곧바로 미러 시트의 idle 프레임로 스냅
        const dir = this.player.getLastDirection();
        if (on) {
        const key = 'player-mirror-walk-' + dir;
        if (this.scene.anims.exists(key)) {
            this.player.sprite.anims.play(key, true);
            this.player.sprite.anims.stop();
            const anim = this.scene.anims.get(key);
            if (anim && anim.frames[0]) {
            this.player.sprite.anims.setCurrentFrame(anim.frames[0]);
            }
        }
        } else {
        this.player.haltMovementAndIdle();
        }
    }

        private playMirroringPose(): void {
        // 플레이어 쪽에서 애니메이션을 전면 대체하는 포즈를 시작한다.
        // 기본 지속시간은 200ms (필요시 여기서 숫자만 조정)
            this.player.startMirroringPose(100);
        }


    private ensureTexturesLoaded(onComplete: () => void): void {
        const load = this.scene.load;
        let needsStart = false;

        if (!this.scene.textures.exists('player_walking_mirror')) {
        load.spritesheet('player_walking_mirror', 'assets/characters/astronaut_walking_mirror.png', { frameWidth: 64, frameHeight: 64 });
        needsStart = true;
        }
        if (!this.scene.textures.exists('player_mirroring')) {
        load.spritesheet('player_mirroring', 'assets/characters/astronaut_mirroring.png', { frameWidth: 64, frameHeight: 64 });
        needsStart = true;
        }

        if (needsStart) {
        load.once(Phaser.Loader.Events.COMPLETE, () => onComplete());
        load.start();
        } else {
        onComplete();
        }
    }

    private registerAnimations(): void {
        const a = this.scene.anims;
        const ensure = (key: string, tex: string, start: number, end: number, rate = 8, rep = -1) => {
        if (!a.exists(key)) {
            a.create({ key, frames: a.generateFrameNumbers(tex, { start, end }), frameRate: rate, repeat: rep });
        }
        };

        // 걷기(거울 장착 시 사용): 4×4 그리드
        ensure('player-mirror-walk-down',  'player_walking_mirror',  0,  3);
        ensure('player-mirror-walk-left',  'player_walking_mirror',  4,  7);
        ensure('player-mirror-walk-right', 'player_walking_mirror',  8, 11);
        ensure('player-mirror-walk-up',    'player_walking_mirror', 12, 15);

        // 포즈(1프레임·미사용 가능하지만 호환 위해 생성)
        ensure('player-mirroring-down',  'player_mirroring', 0, 0, 1, 0);
        ensure('player-mirroring-left',  'player_mirroring', 1, 1, 1, 0);
        ensure('player-mirroring-right', 'player_mirroring', 2, 2, 1, 0);
        ensure('player-mirroring-up',    'player_mirroring', 3, 3, 1, 0);
    }
}
