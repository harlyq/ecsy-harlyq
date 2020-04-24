import * as ECSY from 'ecsy'
import * as ECSY3 from 'ecsy-three'
import * as THREE from 'three'
import * as ParticleEmitter from './simple-particle-emitter.js'

class SimpleParticleEmitterState extends ECSY.SystemStateComponent {
  constructor() {
    super()
    this.reset()
  }

  reset() {
    this.emitter3D = undefined
    this.useEntityRotation = true
    this.syncTransform = false
  }
}

export class SimpleParticleEmitter extends ECSY.Component {
  constructor() {
    super()
    this.reset()
  }

  reset() { 
    this.particleMesh = null
    this.enabled = true
    this.count = -1
    this.atlas = ''
    this.textureFrame = undefined
    this.frames = []
    this.lifeTime = 1
    this.repeatTime = 0
    this.spawnVariance = 0
    this.burst = 0
    this.syncTransform = false
    this.useEntityRotation = true
    this.worldUp = false,

    // randomizable values
    this.colors = [{r:1,g:1,b:1}]
    this.orientations = [0]
    this.scales = [1]
    this.opacities = [1]
    this.frameStyle = 'sequence'
    this.offset = {x:0,y:0,z:0}
    this.velocity = {x:0,y:0,z:0}
    this.acceleration = {x:0,y:0,z:0}
    this.radialVelocity = 0
    this.radialAcceleration = 0
    this.angularVelocity = {x:0,y:0,z:0}
    this.angularAcceleration = {x:0,y:0,z:0}
    this.orbitalVelocity = 0
    this.orbitalAcceleration = 0
    this.worldAcceleration = {x:0,y:0,z:0}
    this.brownianSpeed = 0
    this.brownianScale = 0
  }
}

export class SimpleParticleSystem extends ECSY.System {
  execute(deltaTime, time) {
    for (let entity of this.queries.emitters.added) {

      const emitter = entity.getComponent(SimpleParticleEmitter)
      const object3D = entity.getComponent(ECSY3.Object3D)
      const model3D = object3D ? object3D["value"] : undefined

      const matrixWorld = calcMatrixWorld(entity)
      if (!emitter.useEntityRotation) {
        clearMatrixRotation(matrixWorld)
      }

      const emitter3D = ParticleEmitter.createParticleEmitter(emitter, matrixWorld, model3D, time)
      entity.addComponent(SimpleParticleEmitterState, {
        emitter3D,
        useEntityRotation: emitter.useEntityRotation,
        syncTransform: emitter.syncTransform,
      })
    }

    for (let entity of this.queries.emitterStates.results) {
      const emitterState = entity.getComponent(SimpleParticleEmitterState)

      if (emitterState.syncTransform) {
        const matrixWorld = calcMatrixWorld(entity)
        if (!emitterState.useEntityRotation) {
          clearMatrixRotation(matrixWorld)
        }
  
        ParticleEmitter.setEmitterMatrixWorld(emitterState.emitter3D, matrixWorld, time, deltaTime)
      }
      
      ParticleEmitter.setEmitterTime(emitterState.emitter3D, time)
    }

  }
}

SimpleParticleSystem.queries = { 
  emitters: {
    components: [SimpleParticleEmitter],
    listen: {
      added: true,
      removed: true,
    }
  },

  emitterStates: {
    components: [SimpleParticleEmitterState],
  }
}

const clearMatrixRotation = (function() {
  const translation = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const unitQuat = new THREE.Quaternion()

  return function clearMatrixRotation(matrix) {
    matrix.decompose(translation, quaternion, scale)
    return matrix.compose(translation, unitQuat, scale)
  }
})()

const calcMatrixWorld = (function() {
  const scale = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const euler = new THREE.Euler()

  return function calcMatrixWorld(entity, childMatrix = undefined) {
    const object3D = entity.getComponent(ECSY3.Object3D)
    const transform = entity.getComponent(ECSY3.Transform)

    if (object3D) {
      return childMatrix ? childMatrix.multiply( object3D["value"].matrixWorld ) : object3D["value"].matrixWorld
        
    } else if (transform) {
      const transformMatrix = new THREE.Matrix4()

      transformMatrix.compose( 
        transform.position,
        quaternion.setFromEuler( euler.setFromVector3(transform.rotation) ),
        scale.set(1,1,1)
      )

      if (childMatrix) {
        transformMatrix.premultiply(childMatrix)
      }

      const parent = entity.getComponent(ECSY3.Parent)
      return parent ? calcMatrixWorld(parent["value"], transformMatrix) : transformMatrix

    } else {
      
      return new THREE.Matrix4()
    }
  }
})()
