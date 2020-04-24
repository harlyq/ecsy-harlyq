import { Component, System } from 'ecsy';
import { Object3D, Transform } from 'ecsy-three';
import { DataTexture, RGBFormat, TextureLoader, BufferGeometry, RawShaderMaterial, Vector2, Color, Points, Float32BufferAttribute, Matrix4, Texture, NormalBlending, Quaternion, Euler, Vector3 } from 'three';

const RND_BASIS = 0x100000000;

function createPseudoRandom(s) {
  let seed = s || Math.random()*RND_BASIS;

  return () => {
    seed = (1664525*seed + 1013904223) % RND_BASIS;
    return seed/RND_BASIS
  }
}

function randomNumber(rndFn, min, max) {
  if (typeof min === 'undefined') return undefined
  if (typeof max === 'undefined') return min

  return rndFn()*(max - min) + min
}

function randomObject(rndFn, min, max) {
  if (!min) return {}
  if (!max) return min

  const v = {};
  for (let k in min) {
    v[k] = randomNumber(rndFn, min[k], max[k]);
  }
  return v
}

function randomArray(rndFn, min, max) {
  if (!min) return []
  if (!max) return min

  const n = min.length;
  const v = Array(n);
  for (let i = 0; i < n; i++) {
    v[i] = randomNumber(rndFn, min[i], max[i]);
  }
  return v
}

const WHITE_TEXTURE = new DataTexture(new Uint8Array(3).fill(255), 1, 1, RGBFormat);
WHITE_TEXTURE.needsUpdate = true;

const textureLoader = new TextureLoader();

function createParticleMesh(options) {
  options = {
    particleCount: 1000,
    texture: '',
    textureFrame: {x:1, y:1},
    style: 'particle',
    particleSize: 10,
    transparent: false,
    alphaTest: 0,
    depthWrite: true,
    depthTest: true,
    blending: NormalBlending,
    fog: false,
    usePerspective: true,
    useLinearMotion: true,
    useOrbitalMotion: true,
    useAngularMotion: true,
    useRadialMotion: true,
    useFramesOrRotation: true,
    ...options,
  };

  const geometry = new BufferGeometry();

  updateGeometry(geometry, options.particleCount);

  const material = new RawShaderMaterial({
    uniforms: {
      map: { type: 't', value: WHITE_TEXTURE },
      textureFrame: { value: new Vector2(1,1) },
      particleSize: { value: 10 },
      usePerspective: { value: 1 },
      t: { value: 0 },

      fogDensity: { value: 0.00025 },
      fogNear: { value: 1 },
      fogFar: { value: 2000 },
      fogColor: { value: new Color( 0xffffff ) }
    },

    fragmentShader: SIMPLE_PARTICLE_FRAGMENT,
    vertexShader: SIMPLE_PARTICLE_VERTEX,

    defines: {},
  });

  updateMaterial(material, options);

  const mesh = new Points(geometry, material);
  mesh.frustumCulled = false;
  mesh['nextIndex'] = 0;
  mesh['particleCount'] = options.particleCount;

  return mesh
}

function updateGeometry(geometry, particleCount) {
  const NUM_KEYFRAMES = 3;
  geometry.setAttribute("row1", new Float32BufferAttribute(new Float32Array(particleCount*4), 4));
  geometry.setAttribute("row2", new Float32BufferAttribute(new Float32Array(particleCount*4), 4));
  geometry.setAttribute("row3", new Float32BufferAttribute(new Float32Array(particleCount*4), 4));
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(particleCount*3), 3));
  geometry.setAttribute("scales", new Float32BufferAttribute(new Float32Array(particleCount*NUM_KEYFRAMES), NUM_KEYFRAMES));
  geometry.setAttribute("rotations", new Float32BufferAttribute(new Float32Array(particleCount*NUM_KEYFRAMES), NUM_KEYFRAMES));
  geometry.setAttribute("colors", new Float32BufferAttribute(new Float32Array(particleCount*NUM_KEYFRAMES), NUM_KEYFRAMES)); // rgb is packed into a single float
  geometry.setAttribute("opacities", new Float32BufferAttribute(new Float32Array(particleCount*NUM_KEYFRAMES).fill(1), NUM_KEYFRAMES));
  geometry.setAttribute("frame", new Float32BufferAttribute(new Float32Array(particleCount*2), 2));
  geometry.setAttribute("timings", new Float32BufferAttribute(new Float32Array(particleCount*4), 4));
  geometry.setAttribute("velocity", new Float32BufferAttribute(new Float32Array(particleCount*4), 4)); // linearVelocity (xyz) + radialVelocity
  geometry.setAttribute("acceleration", new Float32BufferAttribute(new Float32Array(particleCount*4), 4)); // linearAcceleration (xyz) + radialAcceleration
  geometry.setAttribute("angularvelocity", new Float32BufferAttribute(new Float32Array(particleCount*4), 4)); // angularVelocity (xyz) + orbitalVelocity
  geometry.setAttribute("angularacceleration", new Float32BufferAttribute(new Float32Array(particleCount*4), 4)); // angularAcceleration (xyz) + orbitalAcceleration

  const identity = new Matrix4();
  for (let i = 0; i < particleCount; i++) {
    setMatrixAt(geometry, i, identity);
  }
}

function updateMaterial(material, options) {
  material.uniforms.particleSize.value = options.particleSize;
  material.uniforms.textureFrame.value.x = options.textureFrame.x;
  material.uniforms.textureFrame.value.y = options.textureFrame.y;
  material.uniforms.usePerspective.value = options.usePerspective ? 1 : 0;

  material.transparent = options.transparent;
  material.alphaTest = options.alphaTest;
  material.blending = options.blending;
  material.fog = options.fog;
  material.depthWrite = options.depthWrite;
  material.depthTest = options.depthTest;

  const defines = {};
  if (options.useAngularMotion) defines.USE_ANGULAR_MOTION = true;
  if (options.useRadialMotion) defines.USE_RADIAL_MOTION = true;
  if (options.useOrbitalMotion) defines.USE_ORBITAL_MOTION = true;
  if (options.useLinearMotion) defines.USE_LINEAR_MOTION = true;
  if (options.useFramesOrRotation) defines.USE_FRAMES_OR_ROTATION = true;
  if (options.fog) defines.USE_FOG = true;

  material.defines = defines;
  material.uniforms.map.value = WHITE_TEXTURE;

  if (options.texture) {
    if (options.texture instanceof Texture) {
      material.uniform.map.value = options.texture;
    } else {
      textureLoader.load(
        options.texture, 
        (texture) => {
          material.uniform.map.value = texture;
        }, 
        undefined, 
        (err) => console.error(err)
      );
    }
  }

  material.needsUpdate = true;
}

function setMatrixAt(geometry, i, mat4) {
  const m = mat4.elements;
  const row1 = geometry.getAttribute("row1");
  const row2 = geometry.getAttribute("row2");
  const row3 = geometry.getAttribute("row3");
  row1.setXYZW(i, m[0], m[4], m[ 8], m[12]);
  row2.setXYZW(i, m[1], m[5], m[ 9], m[13]);
  row3.setXYZW(i, m[2], m[6], m[10], m[14]);
}

function setPositionAt(geometry, i, x, y, z) {
  const position = geometry.getAttribute("position");
  if (Array.isArray(x)) {
    z = x[2];
    y = x[1];
    x = x[0];
  } else if (typeof x === "object") {
    z = x.z;
    y = x.y;
    x = x.x;
  }

  position.setXYZ(i, x, y, z);
}

function setColorsAt(geometry, i, colorArray) {
  function pack3Floats(a, b, c) {
    return ~~(a*255)/256 + ~~(b*255)/65536 + ~~(c*255)/16777216
  }

  const colors = geometry.getAttribute("colors");
  const color0 = colorArray[0], color1 = colorArray[1], color2 = colorArray[2];
  let packedR, packedG, packedB;

  switch (colorArray.length) {
    case 0: 
      packedR = packedG = packedB = pack3Floats(1, 1, 1); // white
      break

    case 1:
      packedR = pack3Floats(color0.r, color0.r, color0.r);
      packedG = pack3Floats(color0.g, color0.g, color0.g);
      packedB = pack3Floats(color0.b, color0.b, color0.b);
      break

    case 2:
      packedR = pack3Floats(color0.r, .5*(color0.r + color1.r), color1.r);
      packedG = pack3Floats(color0.g, .5*(color0.g + color1.g), color1.g);
      packedB = pack3Floats(color0.b, .5*(color0.b + color1.b), color1.b);
      break

    default:
      packedR = pack3Floats(color0.r, color1.r, color2.r);
      packedG = pack3Floats(color0.g, color1.g, color2.g);
      packedB = pack3Floats(color0.b, color1.b, color2.b);
      break
  }

  colors.setXYZ(i, packedR, packedG, packedB);
}

function setOpacitiesAt(geometry, i, opacityArray) {
  const opacities = geometry.getAttribute("opacities");
  setKeyframesAt(opacities, i, opacityArray, 1);
}

function setTimingsAt(geometry, i, spawnTime, lifeTime, loopTime, seed = Math.random() ) {
  const timings = geometry.getAttribute("timings");
  timings.setXYZW(i, spawnTime, lifeTime, loopTime, seed);
}

function setFrameAt(geometry, i, frameStyle, startFrame, endFrame, width = 0, height = 0) {
  width = width || this.data.textureFrame.x;
  height = height || this.data.textureFrame.y;

  const frame = geometry.getAttribute("frame");
  const packA = ~~(width) + .015625*~~(height) + .000003814697265625*~~(startFrame);
  const packB = frameStyle + .000003814697265625*~~(endFrame);
  frame.setXY(i, packA, packB);
}

function setScalesAt(geometry, i, scaleArray) {
  const scales = geometry.getAttribute("scales");
  setKeyframesAt(scales, i, scaleArray, 1);
}

function setRotationsAt(geometry, i, rotationArray) {
  const rotations = geometry.getAttribute("rotations");
  setKeyframesAt(rotations, i, rotationArray, 0);
}

function setVelocityAt(geometry, i, x, y, z, radial = 0) {
  const velocity = geometry.getAttribute("velocity");
  velocity.setXYZW(i, x, y, z, radial);
}

function setAccelerationAt(geometry, i, x, y, z, radial = 0) {
  const acceleration = geometry.getAttribute("acceleration");
  acceleration.setXYZW(i, x, y, z, radial);
}

function setAngularVelocityAt(geometry, i, x, y, z, orbital = 0) {
  const angularvelocity = geometry.getAttribute("angularvelocity");
  angularvelocity.setXYZW(i, x, y, z, orbital);
}

function setAngularAccelerationAt(geometry, i, x, y, z, orbital = 0) {
  const angularacceleration = geometry.getAttribute("angularacceleration");
  angularacceleration.setXYZW(i, x, y, z, orbital);
}

function setKeyframesAt(attribute, i, valueArray, defaultValue) {
  const x = valueArray[0], y = valueArray[1], z = valueArray[2];
  switch (valueArray.length) {
    case 0: attribute.setXYZ(i, defaultValue, defaultValue, defaultValue); break
    case 1: attribute.setXYZ(i, x, x, x); break
    case 2: attribute.setXYZ(i, x, .5*(x+y), y); break
    default: attribute.setXYZ(i, x, y, z); break
  }
}

function needsUpdate(geometry, attrs) {
  attrs = attrs || ["row1", "row2", "row3", "position", "scales", "colors", "opacities", "rotations", "timings", "frame", "velocity", "acceleration"];
  for (let attr of attrs) {
    const attribute = geometry.getAttribute(attr);
    attribute.needsUpdate = true;
  }
}

const SIMPLE_PARTICLE_VERTEX = `
precision highp float;
precision highp int;

attribute vec4 row1;
attribute vec4 row2;
attribute vec4 row3;
attribute vec3 position;
attribute vec3 scales;
attribute vec3 rotations;
attribute vec3 colors;
attribute vec3 opacities;
attribute vec4 timings;
attribute vec2 frame;
attribute vec4 velocity;
attribute vec4 acceleration;
attribute vec4 angularvelocity;
attribute vec4 angularacceleration;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 textureFrame;
uniform float particleSize;
uniform float usePerspective;
uniform float t;

varying mat3 vUvTransform;
varying vec4 vParticleColor;
varying vec2 vUv;
varying float vFogDepth;

float pseudoRandom( const float seed )
{
return mod( 1664525.*seed + 1013904223., 4294967296. )/4294967296.;
}

vec3 unpackFrame( float pack )
{
float y = fract( pack ) * 64.;
return floor( vec3( pack, y, fract( y ) * 4096. ) );
}

vec3 unpackRGB( float pack )
{
vec3 enc = fract( pack * vec3( 1., 256., 65536. ) );
enc -= enc.yzz * vec3( 1./256., 1./256., 0. );
return enc;
}

float interpolate( const vec3 keys, const float r )
{
float k = r*2.;
return k < 1. ? mix( keys.x, keys.y, k ) : mix( keys.y, keys.z, k - 1. );
}

// assumes euler order is YXZ
vec4 eulerToQuaternion( const vec3 euler )
{
// from https://github.com/mrdoob/three.js/blob/master/src/math/Quaternion.js

vec3 c = cos( euler * .5 );
vec3 s = sin( euler * .5 );

return vec4(
  s.x * c.y * c.z + c.x * s.y * s.z,
  c.x * s.y * c.z - s.x * c.y * s.z,
  c.x * c.y * s.z - s.x * s.y * c.z,
  c.x * c.y * c.z + s.x * s.y * s.z
);
}

// from http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
vec4 axisAngleToQuaternion( const vec3 axis, const float angle ) 
{
return vec4( axis * sin( angle*.5 ), cos( angle*.5 ) );
}

vec3 applyQuaternion( const vec3 v, const vec4 q )
{
return v + 2. * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}

void main()
{
float spawnTime = timings.x;
float lifeTime = timings.y;
float loopTime = timings.z;
float seed = timings.w;
float age = mod( t - spawnTime, loopTime );
float timeRatio = age / lifeTime;

float scale = interpolate( scales, timeRatio );
float rotation = interpolate( rotations, timeRatio );
float opacity = interpolate( opacities, timeRatio );
vec3 color = vec3(
  interpolate( unpackRGB( colors.x ), timeRatio ),
  interpolate( unpackRGB( colors.y ), timeRatio ),
  interpolate( unpackRGB( colors.z ), timeRatio )
);

mat4 particleMatrix = mat4(
  vec4( row1.x, row2.x, row3.x, 0. ),
  vec4( row1.y, row2.y, row3.y, 0. ),
  vec4( row1.z, row2.z, row3.z, 0. ),
  vec4( row1.w, row2.w, row3.w, 1. )
);

float distance = length( position );
vec3 direction = distance == 0. ? position : position / distance;

#if defined(USE_RADIAL_MOTION)
distance += ( .5 * acceleration.w * age + velocity.w ) * age;
#endif

#if defined(USE_ANGULAR_MOTION)
if ( length( angularacceleration.xyz ) > 0. || length( angularvelocity.xyz ) > 0. )
{
  vec3 angularMotion = ( .5 * angularacceleration.xyz * age + angularvelocity.xyz ) * age;
  direction = applyQuaternion( direction, eulerToQuaternion( angularMotion ) );
}
#endif

#if defined(USE_ORBITAL_MOTION)
if ( angularacceleration.w != 0. || angularvelocity.w != 0. ) 
{
  float orbitalMotion = ( .5 * angularacceleration.w * age + angularvelocity.w ) * age;
  vec3 axis;
  axis.x = pseudoRandom(spawnTime + loopTime);
  axis.y = pseudoRandom(axis.x);
  axis.z = pseudoRandom(axis.y);
  normalize(axis);
  direction = applyQuaternion( direction, axisAngleToQuaternion( axis, orbitalMotion ) );
}
#endif

vec3 motion = direction * distance;

#if defined(USE_LINEAR_MOTION)
motion += ( .5 * acceleration.xyz * age + velocity.xyz ) * age;
#endif

vec4 mvPosition = modelViewMatrix * particleMatrix * vec4( motion, 1. );

vParticleColor = vec4( color, opacity );
vUv = vec2( 0. );
vFogDepth = -mvPosition.z;

vUvTransform = mat3( 1. );

#if defined(USE_FRAMES_OR_ROTATION)

vec3 frameInfoA = unpackFrame( frame.x );
vec3 frameInfoB = unpackFrame( frame.y );

float frameWidth = frameInfoA.x;
float frameHeight = frameInfoA.y;
float startFrame = frameInfoA.z;
float endFrame = frameInfoB.z;
float frameStyle = frameInfoB.x;
float invFrameWidth = 1./frameWidth;
float invFrameHeight = 1./frameHeight;
float numFrames = endFrame - startFrame + 1.;
float currentFrame = floor( mix( startFrame, endFrame + .99999, timeRatio ) );

currentFrame = frameStyle == 0. ? currentFrame 
  : frameStyle == 1. ? ( floor( pseudoRandom( currentFrame * 6311. + seed ) * numFrames ) + startFrame  )
  : ( floor( seed * numFrames ) + startFrame );

float tx = mod( currentFrame, frameWidth ) * invFrameWidth;
float ty = 1. - floor( currentFrame * invFrameWidth ) * invFrameHeight;
float sx = invFrameWidth;
float sy = invFrameHeight;
float cx = .5 * sx;
float cy = -.5 * sy;
float c = cos( rotation );
float s = sin( rotation );

mat3 uvrot = mat3( vec3( c, -s, 0. ), vec3( s, c, 0. ), vec3( 0., 0., 1.) );
mat3 uvtrans = mat3( vec3( 1., 0., 0. ), vec3( 0., 1., 0. ), vec3( tx + cx, ty + cy, 1. ) );
mat3 uvscale = mat3( vec3( sx, 0., 0. ), vec3( 0., sy, 0. ), vec3( 0., 0., 1.) );
mat3 uvcenter = mat3( vec3( 1., 0., 0. ), vec3( 0., 1., 0. ), vec3( -cx / sx, cy / sy, 1. ) );  

vUvTransform = uvtrans * uvscale * uvrot * uvcenter;

#endif // USE_FRAMES_OR_ROTATION

#if defined(USE_RIBBON)
#else
gl_PointSize = scale * particleSize * mix( 1., 1. / - mvPosition.z, usePerspective );
#endif // USE_RIBBON

gl_Position = projectionMatrix * mvPosition;

if (scale <= 0. || timeRatio < 0. || timeRatio > 1. )
{
  gl_Position.w = -2.; // don't draw
}

}`;

const SIMPLE_PARTICLE_FRAGMENT = `
precision highp float;
precision highp int;

uniform sampler2D map;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

varying mat3 vUvTransform;
varying vec4 vParticleColor;
varying vec2 vUv;
varying float vFogDepth;

void main()
{

#if defined(USE_RIBBON)
vec2 uv = ( vUvTransform * vec3( vUv, 1. ) ).xy;
#else
vec2 uv = ( vUvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1. ) ).xy;
#endif // USE_RIBBON

vec4 diffuseColor = vParticleColor;

vec4 mapTexel = texture2D( map, uv );
// diffuseColor *= mapTexelToLinear( mapTexel );
diffuseColor *= mapTexel;

#if defined(ALPHATEST)
if ( diffuseColor.a < ALPHATEST ) {
  discard;
}
#endif // ALPHATEST

gl_FragColor = diffuseColor;

#if defined(USE_FOG)
float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );

gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif // USE_FOG
}`;

//import { CustomTypes } from './custom-types.js'

const error = console.error;

// export const SimpleParticleEmitter = ECSY.createComponentClass({
//   particleMesh: {default: null, type: CustomTypes.Pointer},
//   enabled: {default: true},
//   count: {default: -1},
//   textureFrame: {default: {x:1, y:1}, type: CustomTypes.VecXY},
//   lifeTime: {default: [1]},
//   loopTime: {default: 0},
//   colors: {default: [[{r:1,g:1,b:1}]]},
//   rotations: {default: [[0]]},
//   scales: {default: [[1]]},
//   opacities: {default: [[1]]},
//   frames: {default: [[0]]},
//   frameStyle: {default: 'sequence'},
//   velocity: {default: [{x:0,y:0,z:0}]},
//   acceleration: {default: [{x:0,y:0,z:0}]},
//   radialVelocity: {default: [0]},
//   radialAcceleration: {default: [0]},
//   angularVelocity: {default: [{x:0,y:0,z:0}]},
//   angularAcceleration: {default: [{x:0,y:0,z:0}]},
//   orbitalVelocity: {default: [0]},
//   orbitalAcceleration: {default: [0]},
//   spawnGeometryFn: {default: null, type: CustomTypes.Function},
//   seed: {default: 0},
// }, "SimpleParticleEmitter")

class SimpleParticleEmitter extends Component {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.particleMesh = null;
    this.enabled = true;
    this.count = -1;
    this.textureFrame = {x:1, y:1};
    this.lifeTime = [1];
    this.loopTime = 0;
    this.colors = [[{r:1,g:1,b:1}]];
    this.rotations = [[0]];
    this.scales = [[1]];
    this.opacities = [[1]];
    this.frames = [[0]];
    this.frameStyle = 'sequence';
    this.velocity = [{x:0,y:0,z:0}];
    this.acceleration = [{x:0,y:0,z:0}];
    this.radialVelocity = [0];
    this.radialAcceleration = [0];
    this.angularVelocity = [{x:0,y:0,z:0}];
    this.angularAcceleration = [{x:0,y:0,z:0}];
    this.orbitalVelocity = [0];
    this.orbitalAcceleration = [0];
    this.spawnGeometryFn = null;
    this.seed = 0;
  }
}

class SimpleParticleSystem extends System {
  execute(_, time) {
    // @ts-ignore
    this.queries.emitters.added.forEach(entity => {
      const emitter = entity.getComponent(SimpleParticleEmitter);
      const mesh = emitter.particleMesh;
      const geometry = mesh.geometry;

      time = time || 0;

      const startIndex = mesh.nextIndex;
      if (startIndex >= mesh.particleCount) {
        error(`all particles in this SimpleParticleMesh used by other SimpleParticleEmitters`);
        return
      }

      const count = emitter.count >= 0 ? emitter.count : mesh.particleCount - mesh.nextIndex;
      mesh.nextIndex += count;

      const object3D = entity.getComponent(Object3D);
      const obj3D = object3D ? object3D.value : undefined;
      const endIndex = Math.min(mesh.particleCount, startIndex + count);
      const rndFn = createPseudoRandom(emitter.seed);
      const loopTime = Math.max( emitter.loopTime, Math.max(...emitter.lifeTime) );
      const spawnDelta = loopTime/count;
      const spawnOffsets = typeof emitter.spawnGeometryFn === "function" && obj3D && obj3D.isMesh ? calcSpawnOffsetsFromGeometry(obj3D.geometry) : undefined;
      const matrixWorld = new Matrix4();

      const transform = entity.getComponent(Transform);
      if (transform) {
        matrixWorld.compose(
          transform.position,
          new Quaternion().setFromEuler(new Euler(transform.rotation.x, transform.rotation.y, transform.rotation.z)),
          new Vector3(1,1,1)
        );
      }
    
      for (let i = startIndex; i < endIndex; i++) {
        spawn(geometry, matrixWorld, emitter, i, time + i*spawnDelta, loopTime, spawnOffsets, rndFn);
      }
    
      needsUpdate(geometry);
    });

    // @ts-ignore
    this.queries.emitters.results.forEach(entity => {
      const emitter = entity.getComponent(SimpleParticleEmitter);
      if (emitter.particleMesh && emitter.particleMesh.material && time) {
        emitter.particleMesh.material.uniforms.t.value = time;
      }
    });
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
};


function spawn(geometry, matrixWorld, emitter, index, time, loopTime, spawnOffsets, rndFn) {
  const scales = randomArray(rndFn, ...emitter.scales);
  const rotations = randomArray(rndFn, ...emitter.rotations);
  const colors = randomArray(rndFn, ...emitter.colors);
  const opacities = randomArray(rndFn, ...emitter.opacities);
  const frames = randomArray(rndFn, ...emitter.frames);
  const lifeTime = randomNumber(rndFn, ...emitter.lifeTime);
  const velocity = randomObject(rndFn, ...emitter.velocity);
  const acceleration = randomObject(rndFn, ...emitter.acceleration);
  const radialVelocity = randomNumber(rndFn, ...emitter.radialVelocity);
  const radialAcceleration = randomNumber(rndFn, ...emitter.radialAcceleration);
  const angularVelocity = randomObject(rndFn, ...emitter.angularVelocity);
  const angularAcceleration = randomObject(rndFn, ...emitter.angularAcceleration);
  const orbitalVelocity = randomNumber(rndFn, ...emitter.orbitalVelocity);
  const orbitalAcceleration = randomNumber(rndFn, ...emitter.orbitalAcceleration);
  const offset = {x:0, y:0, z:0};

  if (typeof emitter.spawnGeometryFn === "function" && spawnOffsets) {
    emitter.spawnGeometryFn(spawnOffsets, offset);
  }

  setMatrixAt(geometry, index, matrixWorld);
  setPositionAt(geometry, index, offset.x, offset.y, offset.z);
  setScalesAt(geometry, index, scales);
  setColorsAt(geometry, index, colors);
  setRotationsAt(geometry, index, rotations);
  setOpacitiesAt(geometry, index, opacities);

  const startFrame = frames.length > 0 ? frames[0] : 0;
  const endFrame = frames.length > 1 ? frames[1] : startFrame;
  setFrameAt(geometry, index, emitter.frameStyle, startFrame, endFrame, emitter.textureFrame.x, emitter.textureFrame.y);

  setTimingsAt(geometry, index, time, lifeTime, loopTime);
  setVelocityAt(geometry, index, velocity.x, velocity.y, velocity.z, radialVelocity);
  setAccelerationAt(geometry, index, acceleration.x, acceleration.y, acceleration.z, radialAcceleration);
  setAngularVelocityAt(geometry, index, angularVelocity.x, angularVelocity.y, angularVelocity.z, orbitalVelocity);
  setAngularAccelerationAt(geometry, index, angularAcceleration.x, angularAcceleration.y, angularAcceleration.z, orbitalAcceleration);
}


function calcSpawnOffsetsFromGeometry(geometry) {
  if (!geometry || !geometry.object3D) {
    return undefined
  }

  let worldPositions = [];
  const pos = new Vector3();
  const inverseObjectMatrix = new Matrix4();
  const mat4 = new Matrix4();

  geometry.object3D.updateMatrixWorld();
  inverseObjectMatrix.getInverse(geometry.object3D.matrixWorld);

  geometry.object3D.traverse(node => {
    if (!node.geometry || !node.geometry.getAttribute) {
      return
    }

    const position = node.geometry.getAttribute("position");
    if (!position || position.itemSize !== 3) {
      return
    }

    for (let i = 0; i < position.count; i++) {
      mat4.copy(node.matrixWorld).multiply(inverseObjectMatrix);
      pos.fromBufferAttribute(position, i).applyMatrix4(mat4);
      worldPositions.push(pos.x, pos.y, pos.z);
    }
  });

  return Float32Array.from(worldPositions)
}

export { SimpleParticleEmitter, SimpleParticleSystem, createParticleMesh };
