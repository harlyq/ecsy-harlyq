import * as THREE from 'three'
import * as ParticleMesh from './simple-particle-mesh.js'
import * as RND from "./pseudo-random.js"

const error = console.error
const FRAME_STYLES = ["sequence", "randomsequence", "random"]
const DEG2RAD = THREE.MathUtils.DEG2RAD
const parseValue = (x, self, ...args) => typeof x === "function" ? x(self, ...args) : x

export function createParticleEmitter(options, matrixWorld, model3D = undefined, time = 0) {
  options = {
    particleMesh: null,
    enabled: true,
    count: -1, // use all available particles
    textureFrame: undefined,
    lifeTime: 1, // may also be [min,max]
    repeatTime: 0, // if 0, use the maximum lifeTime
    burst: 0, // if 1 all particles are spawned at once
    seed: undefined, // a number between 0 and 1
    worldUp: false, // particles relative to world UP (they will get rotated if the camera tilts)

    // per particle values
    atlas: 0,
    frames: [],
    colors: [{r:1,g:1,b:1}],
    orientations: [0],
    scales: [1],
    opacities: [1],
    frameStyle: 'sequence',
    offset: {x:0,y:0,z:0},
    velocity: {x:0,y:0,z:0},
    acceleration: {x:0,y:0,z:0},
    radialVelocity: 0,
    radialAcceleration: 0,
    angularVelocity: {x:0,y:0,z:0},
    angularAcceleration: {x:0,y:0,z:0},
    orbitalVelocity: 0,
    orbitalAcceleration: 0,
    worldAcceleration: {x:0,y:0,z:0},
    brownianSpeed: 0,
    brownianScale: 0,
    velocityScale: 0,
    velocityScaleMin: .1,
    velocityScaleMax: 1,
    ...options
  }

  const mesh = options.particleMesh
  const geometry = mesh.geometry
  const startTime = time
  const startIndex = mesh.userData.nextIndex
  const meshParticleCount = mesh.userData.options.particleCount
  const count = parseValue(options.count, options)
  const burst = parseValue(options.burst, options)
  const lifeTime = parseValue(options.lifeTime, options)
  const seed = parseValue(options.seed, options)
  const rndFn = RND.createPseudoRandom( seed )

  let particleRepeatTime = parseValue(options.repeatTime, options)
  let textureFrame = parseValue(options.textureFrame, options)

  const effectRepeatTime = Math.max( particleRepeatTime, Array.isArray(lifeTime) ? Math.max(...lifeTime) : lifeTime )
  textureFrame = options.textureFrame ? options.textureFrame : mesh.userData.options.textureFrame

  if (options.count > 0 && startIndex + options.count > meshParticleCount) {
    error(`run out of particles, increase the particleCount for this SimpleParticleMesh`)
  }

  const numParticles = count >= 0 ? count : meshParticleCount - mesh.userData.nextIndex
  mesh.userData.nextIndex += numParticles

  const endIndex = Math.min(meshParticleCount, startIndex + numParticles)

  const spawnDelta = effectRepeatTime/numParticles*(1 - burst)
  const vertices = model3D && typeof options.offset === "function" && model3D.isMesh ? calcSpawnOffsetsFromGeometry(model3D.geometry) : undefined

  for (let i = startIndex; i < endIndex; i++) {
    const spawnTime = time + (i - startIndex)*spawnDelta
    spawn(geometry, matrixWorld, options, i, spawnTime, lifeTime, particleRepeatTime, vertices, textureFrame, seed, rndFn)
  }

  ParticleMesh.needsUpdate(geometry)

  loadTexturePackerJSON(mesh, options, startIndex, endIndex)

  return {startTime, startIndex, endIndex, mesh}
}

export function setEmitterTime(emitter, time) {
  ParticleMesh.setMaterialTime(emitter.mesh.material, time)
}

// export function setEmitterMatrixWorld(emitter, matrixWorld, time, deltaTime) {
//   const geometry = emitter.mesh.geometry
//   const endIndex = emitter.endIndex
//   const startIndex = emitter.startIndex
//   const timings = geometry.getAttribute("timings")
//   const repeatTime = timings.getZ(startIndex)
//   const startTime = timings.getX(startIndex)

//   function timeToParticleIndex(searchTime) {
//     searchTime = (searchTime - startTime) % repeatTime + startTime
  
//     for (let i = startIndex; i < endIndex; i++) {
//       const spawnTime = timings.getX(i)
//       if (searchTime <= spawnTime) {
//         return i
//       }
//     }

//     return startIndex
//   }

//   // determine which particles will be "spawned" this frame
//   const firstIndex = time ? timeToParticleIndex(time - deltaTime) : startIndex
//   const secondIndex = time ? timeToParticleIndex(time) : endIndex

//   if (firstIndex < secondIndex) {
//     for (let i = firstIndex; i < secondIndex; i++) {
//       ParticleMesh.setMatrixAt(geometry, i, matrixWorld)
//     }

//   } else if (secondIndex < firstIndex) {
//     for (let i = firstIndex; i < endIndex; i++) {
//       ParticleMesh.setMatrixAt(geometry, i, matrixWorld)
//     }

//     for (let i = startIndex; i < secondIndex; i++) {
//       ParticleMesh.setMatrixAt(geometry, i, matrixWorld)
//     }

//   }

//   ParticleMesh.needsUpdate(geometry, ["row1", "row2", "row3"])
// }

export function setEmitterMatrixWorld(emitter, matrixWorld, time, deltaTime) {
  const geometry = emitter.mesh.geometry
  const endIndex = emitter.endIndex
  const startIndex = emitter.startIndex
  const timings = geometry.getAttribute("timings")
  let isMoved = false

  for (let i = startIndex; i < endIndex; i++) {
    const startTime = timings.getX(i)
    const lifeTime = timings.getY(i)
    const repeatTime = timings.getZ(i)
    const age = (time - startTime) % Math.max(repeatTime, lifeTime)
    if (age > 0 && age < deltaTime) {
      ParticleMesh.setMatrixAt(geometry, i, matrixWorld)
      isMoved = true
    }
  }

  if (isMoved) {
    ParticleMesh.needsUpdate(geometry, ["row1", "row2", "row3"])
  }
}


function spawn(geometry, matrixWorld, options, index, spawnTime, lifeTime, repeatTime, vertices, textureFrame, seed, rndFn) {
  const offset = parseValue(options.offset, options, vertices)
  const velocity = parseValue(options.velocity, options)
  const acceleration = parseValue(options.acceleration, options)
  const radialVelocity = parseValue(options.radialVelocity, options)
  const radialAcceleration = parseValue(options.radialAcceleration, options)
  const angularVelocity = parseValue(options.angularVelocity, options)
  const angularAcceleration = parseValue(options.angularAcceleration, options)
  const orbitalVelocity = parseValue(options.orbitalVelocity, options)
  const orbitalAcceleration = parseValue(options.orbitalAcceleration, options)
  const worldAcceleration = parseValue(options.worldAcceleration, options)

  const particleLifeTime = Array.isArray(lifeTime) ? rndFn()*(lifeTime[1] - lifeTime[0]) + lifeTime[0] : lifeTime
  const scales = parseValue(options.scales, options)
  const orientations = parseValue(options.orientations, options).map(o => o*DEG2RAD)
  const colors = parseValue(options.colors, options)
  const opacities = parseValue(options.opacities, options)
  const frames = parseValue(options.frames, options)
  const atlas = parseValue(options.atlas, options)
  const brownianSpeed = parseValue(options.brownianSpeed, options)
  const brownianScale = parseValue(options.brownianScale, options)
  const worldUp = parseValue(options.worldUp, options) ? 1 : 0
  const velocityScale = parseValue(options.velocityScale, options)
  const velocityScaleMin = parseValue(options.velocityScaleMin, options)
  const velocityScaleMax = parseValue(options.velocityScaleMax, options)

  const startFrame = frames.length > 0 ? frames[0] : 0
  const endFrame = frames.length > 1 ? frames[1] : frames.length > 0 ? frames[0] : textureFrame.cols*textureFrame.rows - 1
  const frameStyleIndex = FRAME_STYLES.indexOf(options.frameStyle) >= 0 ? FRAME_STYLES.indexOf(options.frameStyle) : 0
  const atlasIndex = typeof atlas === 'number' ? atlas : 0

  ParticleMesh.setMatrixAt(geometry, index, matrixWorld)
  ParticleMesh.setPositionAt(geometry, index, offset)
  ParticleMesh.setScalesAt(geometry, index, scales)
  ParticleMesh.setColorsAt(geometry, index, colors)
  ParticleMesh.setOrientationsAt(geometry, index, orientations, worldUp)
  ParticleMesh.setOpacitiesAt(geometry, index, opacities)
  ParticleMesh.setFrameAt(geometry, index, atlasIndex, frameStyleIndex, startFrame, endFrame, textureFrame.cols, textureFrame.rows)

  ParticleMesh.setTimingsAt(geometry, index, spawnTime, particleLifeTime, repeatTime, seed)
  ParticleMesh.setVelocityAt(geometry, index, velocity.x, velocity.y, velocity.z, radialVelocity)
  ParticleMesh.setAccelerationAt(geometry, index, acceleration.x, acceleration.y, acceleration.z, radialAcceleration)
  ParticleMesh.setAngularVelocityAt(geometry, index, angularVelocity.x*DEG2RAD, angularVelocity.y*DEG2RAD, angularVelocity.z*DEG2RAD, orbitalVelocity*DEG2RAD)
  ParticleMesh.setAngularAccelerationAt(geometry, index, angularAcceleration.x*DEG2RAD, angularAcceleration.y*DEG2RAD, angularAcceleration.z*DEG2RAD, orbitalAcceleration*DEG2RAD)
  ParticleMesh.setWorldAccelerationAt(geometry, index, worldAcceleration.x, worldAcceleration.y, worldAcceleration.z)
  ParticleMesh.setBrownianAt(geometry, index, brownianSpeed, brownianScale)
  ParticleMesh.setVelocityScaleAt(geometry, index, velocityScale, velocityScaleMin, velocityScaleMax)
}

function calcSpawnOffsetsFromGeometry(geometry) {
  if (!geometry || !geometry.object3D) {
    return undefined
  }

  let worldPositions = []
  const pos = new THREE.Vector3()
  const inverseObjectMatrix = new THREE.Matrix4()
  const mat4 = new THREE.Matrix4()

  geometry.object3D.updateMatrixWorld()
  inverseObjectMatrix.getInverse(geometry.object3D.matrixWorld)

  geometry.object3D.traverse(node => {
    if (!node.geometry || !node.geometry.getAttribute) {
      return
    }

    const position = node.geometry.getAttribute("position")
    if (!position || position.itemSize !== 3) {
      return
    }

    for (let i = 0; i < position.count; i++) {
      mat4.copy(node.matrixWorld).multiply(inverseObjectMatrix)
      pos.fromBufferAttribute(position, i).applyMatrix4(mat4)
      worldPositions.push(pos.x, pos.y, pos.z)
    }
  })

  return Float32Array.from(worldPositions)
}

function loadTexturePackerJSON(mesh, options, startIndex, endIndex) {
  const jsonFilename = mesh.userData.options.texture.replace(/\.[^\.]+$/, ".json")
  fetch(jsonFilename)
    .then((response) => {
      return response.json()
    })
    .then((atlasJSON) => {
      ParticleMesh.setTextureAtlas(mesh.material, atlasJSON)

      if (typeof options.atlas === 'string') {
        const atlasIndex = Array.isArray(atlasJSON.frames)
          ? atlasJSON.frames.findIndex(frame => frame.filename === options.atlas)
          : Object.keys(atlasJSON.frames).findIndex(filename => filename === options.atlas)

        if (atlasIndex < 0) {
          error(`unable to find atlas entry '${options.atlas}'`)
        }

        for (let i = startIndex; i < endIndex; i++) {
          ParticleMesh.setAtlasIndexAt(mesh.geometry, i, atlasIndex)
        }

        ParticleMesh.needsUpdate(mesh.geometry, ["frameinfo"])
      }
    })
}