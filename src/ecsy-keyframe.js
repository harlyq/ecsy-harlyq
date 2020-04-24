import * as ECSY from "ecsy"

export class Keyframe extends ECSY.Component {
  constructor() {
    super()
    this.reset()
  }

  reset() {
    this.attributes = []
    this.duration = 1
    this.direction = 'ping-pong'
  }
}

export class KeyframeSystem extends ECSY.System {
  execute(deltaTime, time) {
    for (let entity of this.queries.keyframes.results) {
      const keyframe = entity.getComponent(Keyframe)
      const frameTime = time % keyframe.duration

      for (let attr of keyframe.attributes) {
        
      }
    }
  }
}

KeyframeSystem.queries = {
  keyframes: {
    components: [Keyframe],
  }
}