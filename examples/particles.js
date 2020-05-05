import * as THREE from 'three'
import * as ECSY from 'ecsy'
import * as ECSY3 from 'ecsy-three'
import * as ECSYHQ from "../index.js"
import WebXRPolyfill from 'webxr-polyfill'

new WebXRPolyfill()

const DEG2RAD = THREE.MathUtils.DEG2RAD

class Rotating extends ECSY.Component {
  constructor() {
    super()
    this.reset()
  }

  reset() {
    this.x = this.y = this.z = 0
  }
}

class RotatingSystem extends ECSY.System {
  execute(dt) {
    for (let entity of this.queries.rotating.results) {
      const rotating = entity.getComponent(Rotating)
      /** @type {ECSY3.Transform} */
      const transform = entity.getMutableComponent(ECSY3.Transform)
      transform.rotation.x += rotating.x*dt*DEG2RAD
      transform.rotation.y += rotating.y*dt*DEG2RAD
      transform.rotation.z += rotating.z*dt*DEG2RAD
    }
  }
}

RotatingSystem.queries = {
  rotating: {
    components: [Rotating, ECSY3.Transform]
  }
}

class Translating extends ECSY.Component {
  constructor() {
    super()
    this.reset()
  }

  reset() {
    this.x = this.y = this.z = 0
  }
}

class TranslatingSystem extends ECSY.System {
  execute(dt) {
    for (let entity of this.queries.translating.results) {
      const translating = entity.getComponent(Translating)
      /** @type {ECSY3.Transform} */
      const transform = entity.getMutableComponent(ECSY3.Transform)
      transform.position.x += translating.x*.01
      transform.position.y += translating.y*.01
      transform.position.z += translating.z*.01
    }
  }
}

TranslatingSystem.queries = {
  translating: {
    components: [Translating, ECSY3.Transform]
  }
}

const world = new ECSY.World()
  .registerSystem(ECSY3.VRControllerSystem)
  .registerSystem(ECSYHQ.SimpleParticleSystem)
  .registerSystem(RotatingSystem)
  .registerSystem(TranslatingSystem)

const data = ECSY3.initialize(world, {vr: true})

const {scene, renderer, camera} = data.entities

for (let id = 0; id <= 1; id++) {
  world.createEntity()
    .addComponent(ECSY3.VRController, {id})
    .addComponent(ECSY3.Parent, { value: scene })
}

const sharedParticleMesh = ECSYHQ.createParticleMesh({texture: 'assets/spritesheet.png', particleCount: 20000, alphaTest: .3, useBrownianMotion: true, useVelocityScale: true, transparent: true, depthWrite: false})
const scene3D = scene.getComponent(ECSY3.Object3D)["value"]

scene3D.add(new THREE.AmbientLight(0xffffff));
scene3D.add(sharedParticleMesh)

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'tree.png',
    textureFrame: {cols:2, rows:2},
    count: 50,
    worldUp: true,
    get offset() { return ECSYHQ.randomBoxOffset(.5, .5, 0) },
    get colors() { return ECSYHQ.randomize([{r:1,g:0,b:0}], [{r:1,g:1,b:0}]) },
    get scales() { return ECSYHQ.randomize([10], [5]) },
    frameStyle: "random",
  })
  .addComponent(ECSY3.Transform, { position: {x:0, y:0, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'white2x2.png',
    count: 100,
    lifeTime: 3,
    worldAcceleration: {x:0,y:-.1,z:0},
    velocity: {x:0, y:.2, z:0}, //() => ECSYHQ.randomize({x:-.5,y:.25,z:-.5}, {x:.5,y:.5,z:.5}),
    colors: [{r:0,g:1,b:1}, {r:0,g:0,b:0}],
    scales: [1,.9,0],
    syncTransform: true,
  })
  .addComponent(ECSY3.Transform, { position: {x:-1, y:0, z:-4}, rotation: {x:0, y:0, z:Math.PI/2} })
  .addComponent(ECSY3.Parent, { value: scene })
  .addComponent(Rotating, {x:0,y:0,z:60})
  .addComponent(Translating, {x:.1,y:0,z:0})

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'explosion_sheet.png',
    textureFrame: {cols:5, rows:5},
    count: 20,
    lifeTime: [.3, .8],
    repeatTime: 3.9,
    get offset() { return  ECSYHQ.randomSphereOffset(.03) },
    get scales() { return ECSYHQ.randomize([15], [20]) },
  })
  .addComponent(ECSY3.Transform, { position: {x:1, y:0, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'fireworks_sheet.png',
    textureFrame: {cols:5, rows:5},
    count: 6,
    lifeTime: [1,2],
    repeatTime: 8,
    get offset() { return ECSYHQ.randomCubeOffset(.2) },
    scales: [20],
  })
  .addComponent(ECSY3.Transform, { position: {x:2, y:0, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'blob.png',
    count: 200,
    lifeTime: 5,
    get offset() { return ECSYHQ.randomSphereOffset(.25) },
    colors: [{r:1,g:0,b:0}],
    angularVelocity: {x:160, y:0, z:0},
  })
  .addComponent(ECSY3.Transform, { position: {x:-2, y:0, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'blob.png',
    count: 10,
    lifeTime: 9,
    get offset() { return ECSYHQ.randomSphereOffset(.25) },
    colors: [new THREE.Color("purple")],
    orbitalVelocity: 120,
    scales: [2],
  })
  .addComponent(ECSY3.Transform, { position: {x:-3, y:0, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'blob.png',
    count: 200,
    lifeTime: 2,
    colors: [new THREE.Color("green")],
    radialAcceleration: .3,
    scales: [2,0],
  })
  .addComponent(ECSY3.Transform, { position: {x:-4, y:0, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'blob.png',
    get offset() { return ECSYHQ.randomEllipsoidOffset(.01,.01,0) },
    count: 400,
    lifeTime: [1.5,2],
    repeatTime: 3,
    radialAcceleration: .15,
    scales: [2,0],
    burst: 1,
  })
  .addComponent(ECSY3.Transform, { position: {x:-4, y:1, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'blob.png',
    get offset() { return ECSYHQ.randomCubeOffset(0.5) },
    count: 20,
    lifeTime: 500,
    colors: [new THREE.Color("yellow")],
    burst: 1,
    scales: [2],
    brownianSpeed: .1,
    brownianScale: 1,
  })
  .addComponent(ECSY3.Transform, { position: {x:-3, y:1, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'numbered_8x8_1024x1024.jpg',
    textureFrame: {cols:8, rows:8},
    count: 1,
    lifeTime: 32,
    worldUp: true,
    scales: [20],
    orientations: [40,400],
  })
  .addComponent(ECSY3.Transform, { position: {x:0, y:1, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'numbered_2x2_64x64.jpg',
    textureFrame: {cols:2, rows:2},
    frames: [1,3],
    count: 10,
    lifeTime: 2,
    repeatTime: 20,
    frameStyle: 'random',
    scales: [0,20,0],
    worldUp: true,
  })
  .addComponent(ECSY3.Transform, { position: {x:-1, y:1, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'numbered_2x2_64x64.jpg',
    textureFrame: {cols:2, rows:2},
    count: 20,
    lifeTime: 12,
    scales: [5],
    offset: {x:.25, y:0, z:0},
    angularVelocity: {x:0, y:60, z:0},
    acceleration: {x:0, y:.01, z:0},
  })
  .addComponent(ECSY3.Transform, { position: {x:-2, y:1, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'arrow.png',
    count: 20,
    lifeTime: 6,
    scales: [5],
    get offset() { return ECSYHQ.randomSphereOffset(.25) },
    orbitalVelocity: 120,
    velocityScale: 2,
    velocityScaleMin: .05,
  })
  .addComponent(ECSY3.Transform, { position: {x: 1, y:1, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })


world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'raindash.png',
    count: 200,
    lifeTime: .4,
    repeatTime: 2,
    scales: [2],
    // @ts-ignore
    get offset() { return ECSYHQ.randomBoxOffset(.3, 0, .3) },
    get velocity() { return ECSYHQ.randomize({ x:-.3, y:-2, z:.1 }, { x:-.2, y:-1.5, z:.1 }) },
    velocityScale: 1,
    velocityScaleMax: 3,
    get colors() { return ECSYHQ.randomize([{r:0, g:.1, b:.5}], [{r:0, g:.2, b:.4}]) },
  })
  .addComponent(ECSY3.Transform, { position: {x: 2, y:1.5, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })


world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'white2x2.png',
    count: 200,
    lifeTime: .1,
    repeatTime: 2,
    get offset() { return ECSYHQ.randomBoxOffset(.3, 0, .3) },
    get velocity() { return ECSYHQ.randomize({ x:-1, y:1, z:1 }, { x:1, y:.8, z:-1 }) },
    get colors() { return ECSYHQ.randomize([{r:0, g:.2, b:.6}], [{r:0, g:.1, b:.4}]) },
    worldAcceleration: {x:0,y:-10,z:0},
  })
  .addComponent(ECSY3.Transform, { position: {x: 1.9, y:.7, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.createEntity()
  .addComponent(ECSYHQ.SimpleParticleEmitter, {
    particleMesh: sharedParticleMesh,
    atlas: 'fog.png',
    count: 100,
    lifeTime: 5,
    repeatTime: 10,
    get offset() { return ECSYHQ.randomBoxOffset(.3, .1, .3) },
    get velocity() { return ECSYHQ.randomize({ x:.03, y:.02, z:.03 }, { x:-.03, y:0, z:-.03 }) },
    get colors() { let x = Math.random(); return x > .7 ? [{r:.8, g:.8, b:.8}] : x > .2 ? [{r:.9, g: .9, b: .9}] : [{r: 1, g: 1, b: 1}] },
    opacities: [.5,1,0],
    worldUp: true,
    get scales() { return ECSYHQ.randomize([10],[15]) },
    get orientations() { return [~~(Math.random()*4)*90] },
  })
  .addComponent(ECSY3.Transform, { position: {x: 3, y:1, z:-4}, rotation: {x:0, y:0, z:0} })
  .addComponent(ECSY3.Parent, { value: scene })

world.execute(0,0)

// set the background color, must be after the first execute
// const renderer3D = renderer.getComponent(ECSY3.WebGLRendererContext).value;
// renderer3D.setClearColor(new THREE.Color(0x111111), 1.)
