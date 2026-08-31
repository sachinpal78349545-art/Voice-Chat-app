import { useEffect, useRef } from "react";
import Phaser from "phaser";

export default function CarromGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 400,
      height: 400,
      parent: gameRef.current!,
      backgroundColor: "#c19a6b",
      physics: {
        default: "matter",
        matter: {
          gravity: { x: 0, y: 0 }
        }
      },
      scene: {
        create: function () {
          const striker = this.matter.add.circle(200, 350, 12);
          
          for (let i = 0; i < 5; i++) {
            this.matter.add.circle(180 + i * 10, 200, 8);
          }

          this.input.on("pointerdown", (pointer: any) => {
            let dx = striker.position.x - pointer.x;
            let dy = striker.position.y - pointer.y;

            (striker as any).applyForce({
              x: dx * 0.0005,
              y: dy * 0.0005
            });
          });
        }
      }
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef}></div>;
}