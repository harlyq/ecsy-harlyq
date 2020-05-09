import * as THREE from 'three'

const WHITE_TEXTURE = new THREE.DataTexture(new Uint8Array(3).fill(255), 1, 1, THREE.RGBFormat)
WHITE_TEXTURE.needsUpdate = true

const textureLoader = new THREE.TextureLoader()

export function createParticleMesh(options) {
  const config = {
    particleCount: 1000,
    texture: '',
    textureFrame: {cols:1, rows:1},
    style: 'particle',
    particleSize: 10,
    transparent: false,
    alphaTest: 0,
    depthWrite: true,
    depthTest: true,
    blending: THREE.NormalBlending,
    fog: false,
    usePerspective: true,
    useLinearMotion: true,
    useOrbitalMotion: true,
    useAngularMotion: true,
    useRadialMotion: true,
    useWorldMotion: true,
    useBrownianMotion: false,
    useVelocityScale: false,
    useFramesOrOrientation: true,
    onTextureLoaded: undefined,
    onTextureJSONLoaded: undefined,
  }

  Object.defineProperties(config, Object.getOwnPropertyDescriptors(options)) // preserves getters

  const geometry = new THREE.BufferGeometry()

  updateGeometry(geometry, config.particleCount)

  const material = new THREE.RawShaderMaterial({
    uniforms: {
      map: { type: 't', value: WHITE_TEXTURE },
      textureFrame: { value: new THREE.Vector2(1,1) },
      particleSize: { value: 10 },
      t: { value: 0 },

      fogDensity: { value: 0.00025 },
      fogNear: { value: 1 },
      fogFar: { value: 2000 },
      fogColor: { value: new THREE.Color( 0xffffff ) },
      textureAtlas: { value: new Float32Array(2) }
    },

    fragmentShader: THREE_PARTICLE_FRAGMENT,
    vertexShader: THREE_PARTICLE_VERTEX,

    defines: {},
  })

  updateMaterial(material, config)

  const mesh = new THREE.Points(geometry, material)
  mesh.frustumCulled = false
  mesh.userData = mesh.userData || {}
  mesh.userData.nextIndex = 0
  mesh.userData.meshConfig = config

  // const startTime = 0 //performance.now()
  // mesh.onBeforeRender = () => {
  //   material.uniforms.t.value = (performance.now() - startTime)/1000
  // }

  return mesh
}

export function updateGeometry(geometry, particleCount) {
  const NUM_KEYFRAMES = 3

  // Ideally we'd call this "offset", but some threejs function assume at least one attribute called "position" with 3 floats
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(particleCount*3), 3))

  geometry.setAttribute("row1", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4))
  geometry.setAttribute("row2", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4))
  geometry.setAttribute("row3", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4))
  geometry.setAttribute("scales", new THREE.Float32BufferAttribute(new Float32Array(particleCount*NUM_KEYFRAMES), NUM_KEYFRAMES))
  geometry.setAttribute("orientations", new THREE.Float32BufferAttribute(new Float32Array(particleCount*(NUM_KEYFRAMES + 1)), (NUM_KEYFRAMES + 1))) // orientation keyframes + screen up
  geometry.setAttribute("colors", new THREE.Float32BufferAttribute(new Float32Array(particleCount*NUM_KEYFRAMES), NUM_KEYFRAMES)) // rgb is packed into a single float
  geometry.setAttribute("opacities", new THREE.Float32BufferAttribute(new Float32Array(particleCount*NUM_KEYFRAMES).fill(1), NUM_KEYFRAMES))
  geometry.setAttribute("frameinfo", new THREE.Float32BufferAttribute(new Float32Array(particleCount*2), 2))
  geometry.setAttribute("timings", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4))
  geometry.setAttribute("velocity", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4)) // linearVelocity (xyz) + radialVelocity (w)
  geometry.setAttribute("acceleration", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4)) // linearAcceleration (xyz) + radialAcceleration (w)
  geometry.setAttribute("angularvelocity", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4)) // angularVelocity (xyz) + orbitalVelocity (w)
  geometry.setAttribute("angularacceleration", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4)) // angularAcceleration (xyz) + orbitalAcceleration (w)
  geometry.setAttribute("worldacceleration", new THREE.Float32BufferAttribute(new Float32Array(particleCount*4), 4)) // worldAcceleration (xyz) + brownian (w)
  geometry.setAttribute("velocityscale", new THREE.Float32BufferAttribute(new Float32Array(particleCount*3), 3))

  const identity = new THREE.Matrix4()
  for (let i = 0; i < particleCount; i++) {
    setMatrixAt(geometry, i, identity)
  }
}

export function updateMaterial(material, config) {
  material.uniforms.particleSize.value = config.particleSize
  material.uniforms.textureAtlas.value[0] = 0 // 0,0 unpacked uvs
  material.uniforms.textureAtlas.value[1] = 0.50012207031 // 1.,1. unpacked uvs

  material.transparent = config.transparent
  material.blending = config.blending
  material.fog = config.fog
  material.depthWrite = config.depthWrite
  material.depthTest = config.depthTest

  const defines = {}
  if (config.useAngularMotion) defines.USE_ANGULAR_MOTION = true
  if (config.useRadialMotion) defines.USE_RADIAL_MOTION = true
  if (config.useOrbitalMotion) defines.USE_ORBITAL_MOTION = true
  if (config.useLinearMotion) defines.USE_LINEAR_MOTION = true
  if (config.useWorldMotion) defines.USE_WORLD_MOTION = true
  if (config.useBrownianMotion) defines.USE_BROWNIAN_MOTION = true
  if (config.useVelocityScale) defines.USE_VELOCITY_SCALE = true
  if (config.useFramesOrOrientation) defines.USE_FRAMES_OR_ORIENTATION = true
  if (config.usePerspective) defines.USE_PERSPECTIVE = true
  if (config.fog) defines.USE_FOG = true
  if (config.alphaTest) defines.ALPHATEST = config.alphaTest
  defines.ATLAS_SIZE = 1
  
  material.defines = defines
  material.uniforms.map.value = WHITE_TEXTURE

  if (config.texture) {
    if (config.texture instanceof THREE.Texture) {
      material.uniform.map.value = config.texture
    } else {
      textureLoader.load(
        config.texture, 
        (texture) => {
          material.uniforms.map.value = texture
        }, 
        undefined, 
        (err) => console.error(err)
      )
    }
  }

  material.needsUpdate = true
}

export function setMaterialTime(material, time) {
  material.uniforms.t.value = time
}

function packUVs(u,v) {
  // bring u,v into the range (0,0.5) then pack into 12 bits each
  // uvs have a maximum resolution of 1/2048
  // return value must be in the range (0,1]
  return ~~(u*2048)/4096 + ~~(v*2048)/16777216 // 2x12 bits = 24 bits
}

export function setTextureAtlas(material, atlasJSON) {
  if (!atlasJSON) {
    return
  }

  // @ts-ignore
  const parts = Array.isArray(atlasJSON.frames) ? atlasJSON.frames : Object.values(atlasJSON.frames)
  const imageSize = atlasJSON.meta.size
  const PARTS_PER_TEXTURE = 2
  const packedTextureAtlas = new Float32Array(PARTS_PER_TEXTURE*parts.length)

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const j = i*PARTS_PER_TEXTURE
    const frame = part.frame
    packedTextureAtlas[j] = packUVs(frame.x/imageSize.w, frame.y/imageSize.h)
    packedTextureAtlas[j + 1] = packUVs(frame.w/imageSize.w, frame.h/imageSize.h)
  }

  material.uniforms.textureAtlas.value = packedTextureAtlas
  material.defines.ATLAS_SIZE = parts.length
  material.needsUpdate = true
}

export function setMatrixAt(geometry, i, mat4) {
  const m = mat4.elements
  const row1 = geometry.getAttribute("row1")
  const row2 = geometry.getAttribute("row2")
  const row3 = geometry.getAttribute("row3")
  row1.setXYZW(i, m[0], m[4], m[ 8], m[12])
  row2.setXYZW(i, m[1], m[5], m[ 9], m[13])
  row3.setXYZW(i, m[2], m[6], m[10], m[14])
}

export function setPositionAt(geometry, i, x, y, z) {
  const position = geometry.getAttribute("position")
  if (Array.isArray(x)) {
    z = x[2]
    y = x[1]
    x = x[0]
  } else if (typeof x === "object") {
    z = x.z
    y = x.y
    x = x.x
  }

  position.setXYZ(i, x, y, z)
}

function packRGB(r, g, b) {
  return ~~(r*255)/256 + ~~(g*255)/65536 + ~~(b*255)/16777216 // 3x8 bits = 24 bits
}

export function setColorsAt(geometry, i, colorArray) {
  const colors = geometry.getAttribute("colors")
  const color0 = colorArray[0], color1 = colorArray[1], color2 = colorArray[2]
  let packedR, packedG, packedB

  switch (colorArray.length) {
    case 0: 
      packedR = packedG = packedB = packRGB(1, 1, 1) // white
      break

    case 1:
      packedR = packRGB(color0.r, color0.r, color0.r)
      packedG = packRGB(color0.g, color0.g, color0.g)
      packedB = packRGB(color0.b, color0.b, color0.b)
      break

    case 2:
      packedR = packRGB(color0.r, .5*(color0.r + color1.r), color1.r)
      packedG = packRGB(color0.g, .5*(color0.g + color1.g), color1.g)
      packedB = packRGB(color0.b, .5*(color0.b + color1.b), color1.b)
      break

    default:
      packedR = packRGB(color0.r, color1.r, color2.r)
      packedG = packRGB(color0.g, color1.g, color2.g)
      packedB = packRGB(color0.b, color1.b, color2.b)
      break
  }

  colors.setXYZ(i, packedR, packedG, packedB)
}

export function setOpacitiesAt(geometry, i, opacityArray) {
  const opacities = geometry.getAttribute("opacities")
  setKeyframesAt(opacities, i, opacityArray, 1)
}

export function setTimingsAt(geometry, i, spawnTime, lifeTime, repeatTime, seed = Math.random() ) {
  const timings = geometry.getAttribute("timings")
  timings.setXYZW(i, spawnTime, lifeTime, repeatTime, seed)
}

export function setFrameAt(geometry, i, atlasIndex, frameStyle, startFrame, endFrame, cols, rows) {
  const frameinfo = geometry.getAttribute("frameinfo")
  const packA = ~~(cols) + ~~(rows)/64 + ~~(startFrame)/262144
  const packB = frameStyle + Math.max(0,atlasIndex)/64 + ~~(endFrame)/262144
  frameinfo.setXY(i, packA, packB)
}

export function setAtlasIndexAt(geometry, i, atlasIndex) {
  const frameinfo = geometry.getAttribute("frameinfo")
  const packB = frameinfo.getY(i)
  frameinfo.setY(i, Math.floor(packB) + Math.max(0,atlasIndex)/64 + (packB*262144 % 4096)/262144)
}

export function setScalesAt(geometry, i, scaleArray) {
  const scales = geometry.getAttribute("scales")
  setKeyframesAt(scales, i, scaleArray, 1)
}

export function setOrientationsAt(geometry, i, orientationArray, worldUp = 0) {
  const orientations = geometry.getAttribute("orientations")
  setKeyframesAt(orientations, i, orientationArray, 0)
  orientations.setW(i, worldUp)
}

export function setVelocityAt(geometry, i, x, y, z, radial = 0) {
  const velocity = geometry.getAttribute("velocity")
  velocity.setXYZW(i, x, y, z, radial)
}

export function setAccelerationAt(geometry, i, x, y, z, radial = 0) {
  const acceleration = geometry.getAttribute("acceleration")
  acceleration.setXYZW(i, x, y, z, radial)
}

export function setAngularVelocityAt(geometry, i, x, y, z, orbital = 0) {
  const angularvelocity = geometry.getAttribute("angularvelocity")
  angularvelocity.setXYZW(i, x, y, z, orbital)
}

export function setAngularAccelerationAt(geometry, i, x, y, z, orbital = 0) {
  const angularacceleration = geometry.getAttribute("angularacceleration")
  angularacceleration.setXYZW(i, x, y, z, orbital)
}

export function setWorldAccelerationAt(geometry, i, x, y, z) {
  const worldAcceleration = geometry.getAttribute("worldacceleration")
  worldAcceleration.setXYZ(i, x, y, z)
}

function packBrownain(speed, scale) {
  return ~~(speed*64)/4096 + ~~(scale*64)/16777216
}

export function setBrownianAt(geometry, i, brownianSpeed, brownianScale) {
  console.assert(brownianSpeed >= 0 && brownianSpeed < 64)
  console.assert(brownianScale >= 0 && brownianScale < 64)
  const worldAcceleration = geometry.getAttribute("worldacceleration")
  worldAcceleration.setW(i, packBrownain(brownianSpeed, brownianScale) )
}

export function setVelocityScaleAt(geometry, i, velocityScale, velocityMin, velocityMax) {
  const vs = geometry.getAttribute("velocityscale")
  vs.setXYZ(i, velocityScale, velocityMin, velocityMax)
}

export function setKeyframesAt(attribute, i, valueArray, defaultValue) {
  const x = valueArray[0], y = valueArray[1], z = valueArray[2]
  switch (valueArray.length) {
    case 0: attribute.setXYZ(i, defaultValue, defaultValue, defaultValue); break
    case 1: attribute.setXYZ(i, x, x, x); break
    case 2: attribute.setXYZ(i, x, .5*(x+y), y); break
    default: attribute.setXYZ(i, x, y, z); break
  }
}

export function needsUpdate(geometry, attrs) {
  attrs = attrs || ["row1", "row2", "row3", "position", "scales", "colors", "opacities", "orientations", "timings", "frameinfo", "velocity", "acceleration", "worldacceleration"]
  for (let attr of attrs) {
    const attribute = geometry.getAttribute(attr)
    attribute.needsUpdate = true
  }
}

// eulerToQuaternion() from https://github.com/mrdoob/three.js/blob/master/src/math/Quaternion.js
// axisAngleToQuaternion() from http://www.euclideanspace.com/maths/geometry/orientations/conversions/angleToQuaternion/index.htm
// fbm3() from https://github.com/yiwenl/glsl-fbm
// instead of rand3() should we generate a random point on a sphere?
const THREE_PARTICLE_VERTEX = `
precision highp float;
precision highp int;

attribute vec4 row1;
attribute vec4 row2;
attribute vec4 row3;
attribute vec3 position;
attribute vec3 scales;
attribute vec4 orientations;
attribute vec3 colors;
attribute vec3 opacities;
attribute vec4 timings;
attribute vec4 velocity;
attribute vec4 acceleration;
attribute vec4 angularvelocity;
attribute vec4 angularacceleration;
attribute vec4 worldacceleration;
attribute vec4 velocityscale;
attribute vec2 frameinfo;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float particleSize;
uniform float t;
uniform vec2 textureAtlas[ATLAS_SIZE];

varying mat3 vUvTransform;
varying vec4 vParticleColor;
varying vec2 vUv;
varying float vFogDepth;

float rand( vec2 co )
{
  return fract( sin( dot( co.xy ,vec2(12.9898,78.233) ) ) * 43758.5453);
}
  
vec3 rand3( vec2 co )
{
  float v0 = rand(co);
  float v1 = rand(vec2(co.y, v0));
  float v2 = rand(vec2(co.x, v1));
  return vec3(v0, v1, v2);
}

#if defined(USE_BROWNIAN_MOTION)
#define NUM_OCTAVES 5

float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise3(vec3 p)
{
  vec3 a = floor(p);
  vec3 d = p - a;
  d = d * d * (3.0 - 2.0 * d);

  vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
  vec4 k1 = perm(b.xyxy);
  vec4 k2 = perm(k1.xyxy + b.zzww);

  vec4 c = k2 + a.zzzz;
  vec4 k3 = perm(c);
  vec4 k4 = perm(c + 1.0);

  vec4 o1 = fract(k3 * (1.0 / 41.0));
  vec4 o2 = fract(k4 * (1.0 / 41.0));

  vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
  vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

  return o4.y * d.y + o4.x * (1.0 - d.y);
}

float fbm3(vec3 x)
{
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100);
  for (int i = 0; i < NUM_OCTAVES; ++i) {
    v += a * noise3(x);
    x = x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
#endif // USE_BROWNIAN_MOTION

vec3 unpackFrame( float pack )
{
  float y = fract( pack ) * 64.;
  return floor( vec3( pack, y, fract( y ) * 4096. ) );
}

vec2 unpackUVs( float pack )
{
  float x = pack * 4096.;
  return floor( vec2( x, fract( x ) * 4096. ) ) / 2048.;
}

vec3 unpackRGB( float pack )
{
  vec3 enc = fract( pack * vec3( 1., 256., 65536. ) );
  enc -= enc.yzz * vec3( 1./256., 1./256., 0. );
  return enc;
}

vec2 unpackBrownian( float pack ) {
  float a = pack*4096.;
  return floor( vec2( a, fract( a )*4096. ) ) / 64.;
}

float interpolate( const vec3 keys, const float r )
{
  float k = r*2.;
  return k < 1. ? mix( keys.x, keys.y, k ) : mix( keys.y, keys.z, k - 1. );
}

// assumes euler order is YXZ
vec4 eulerToQuaternion( const vec3 euler )
{
  vec3 c = cos( euler * .5 );
  vec3 s = sin( euler * .5 );

  return vec4(
    s.x * c.y * c.z + c.x * s.y * s.z,
    c.x * s.y * c.z - s.x * c.y * s.z,
    c.x * c.y * s.z - s.x * s.y * c.z,
    c.x * c.y * c.z + s.x * s.y * s.z
  );
}

vec4 axisAngleToQuaternion( const vec3 axis, const float angle ) 
{
  return vec4( axis * sin( angle*.5 ), cos( angle*.5 ) );
}

vec3 applyQuaternion( const vec3 v, const vec4 q )
{
  return v + 2. * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}

vec4 calcGlobalMotion( const mat4 particleMatrix, float distance, vec3 direction, const float age, const float spawnTime, const vec2 brownian, const vec3 orbitalAxis )
{
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

    vec3 axis = normalize( cross( direction, orbitalAxis ) );
    direction = applyQuaternion( direction, axisAngleToQuaternion( axis, orbitalMotion ) );
  }
#endif

  vec3 localMotion = direction * distance;

#if defined(USE_LINEAR_MOTION)
  localMotion += ( .5 * acceleration.xyz * age + velocity.xyz ) * age;
#endif

  vec4 globalMotion = particleMatrix * vec4( localMotion, 1. );

#if defined(USE_WORLD_MOTION)
  globalMotion.xyz += .5 * worldacceleration.xyz * age * age;
#endif

#if defined(USE_BROWNIAN_MOTION)
  float r = age*brownian.x;
  float nx = fbm3( globalMotion.xyz - rand( vec2(localMotion.x, spawnTime) )*r ) - .5;
  float ny = fbm3( globalMotion.yzx + rand( vec2(localMotion.y, spawnTime) )*r ) - .5;
  float nz = fbm3( globalMotion.zxy - rand( vec2(localMotion.z, spawnTime) )*r ) - .5;
  globalMotion.xyz += vec3(nx, ny, nz)*brownian.y;
#endif

  return globalMotion;
}

void main()
{
  float spawnTime = timings.x;
  float lifeTime = timings.y;
  float repeatTime = timings.z;
  float seed = timings.w;
  float age = mod( t - spawnTime, max( repeatTime, lifeTime ) );
  float timeRatio = age / lifeTime;

  float scale = interpolate( scales, timeRatio );
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
  vec3 direction = distance == 0. ? normalize( rand3( vec2(spawnTime, seed) )*2. - .5 ) : position / distance;

#if defined(USE_BROWNIAN_MOTION)
  vec2 brownian = unpackBrownian(worldacceleration.w);
#else
  vec2 brownian = vec2(0.);
#endif

#if defined(USE_ORBITAL_MOTION)
  vec3 orbitalAxis = normalize( rand3( vec2(spawnTime, seed) )*2. - .5 );
#else
  vec3 orbitalAxis = vec3(0.);
#endif

  vec4 globalMotion = calcGlobalMotion( particleMatrix, distance, direction, age, spawnTime, brownian, orbitalAxis );
  vec4 mvPosition = modelViewMatrix * globalMotion;
  vec4 screenPosition = projectionMatrix * mvPosition;

  vParticleColor = vec4( color, opacity );
  vFogDepth = -mvPosition.z;

  vUv = vec2(0.);
  vUvTransform = mat3( 1. );

#if defined(USE_FRAMES_OR_ORIENTATION) || defined(USE_VELOCITY_SCALE)

  float orientation = interpolate( orientations.xyz, timeRatio );

#if defined(USE_VELOCITY_SCALE)
  vec4 futureMotion = calcGlobalMotion( particleMatrix, distance, direction, age + .01, spawnTime, brownian, orbitalAxis );
  vec4 screenFuture = projectionMatrix * modelViewMatrix * futureMotion;
  vec2 delta = screenFuture.xy / screenFuture.z - screenPosition.xy / screenPosition.z;

  float lenDelta = length( delta );
  float velocityOrientation = atan( delta.x, delta.y );

  if (velocityscale.x > 0.) {
    orientation -= velocityOrientation;
    scale *= clamp(velocityscale.x*100.*lenDelta*screenFuture.z, velocityscale.y, velocityscale.z );
  }
#endif // USE_VELOCITY_SCALE

  vec4 upView = modelViewMatrix * vec4(0., 1., 0., 1.) - modelViewMatrix * vec4(0., 0., 0., 1.);
  float viewOrientation = atan( upView.x, upView.y );
  orientation -= viewOrientation * orientations.w;

  vec3 frameInfoA = unpackFrame( frameinfo.x );
  vec3 frameInfoB = unpackFrame( frameinfo.y );

  float frameCols = frameInfoA.x;
  float frameRows = frameInfoA.y;
  float startFrame = frameInfoA.z;
  float endFrame = frameInfoB.z;

  int atlasIndex = int( frameInfoB.y );
  vec2 atlasUV = unpackUVs( textureAtlas[atlasIndex].x );
  vec2 atlasSize = unpackUVs( textureAtlas[atlasIndex].y );
  vec2 frameUV = atlasSize/frameInfoA.xy;

  float frameStyle = frameInfoB.x;
  float numFrames = endFrame - startFrame + 1.;
  float currentFrame = floor( mix( startFrame, endFrame + .99999, timeRatio ) );

  currentFrame = frameStyle == 0. ? currentFrame 
    : frameStyle == 1. ? ( floor( rand( vec2(currentFrame * 6311., seed) ) * numFrames ) + startFrame  )
    : ( floor( seed * numFrames ) + startFrame );

  float tx = mod( currentFrame, frameCols ) * frameUV.x + atlasUV.x;
  float ty = 1. - floor( currentFrame / frameCols ) * frameUV.y - atlasUV.y;
  float sx = frameUV.x;
  float sy = frameUV.y;
  float cx = .5 * sx;
  float cy = -.5 * sy;
  float c = cos( orientation );
  float s = sin( orientation );

  mat3 uvrot = mat3( vec3( c, -s, 0. ), vec3( s, c, 0. ), vec3( 0., 0., 1.) );
  mat3 uvtrans = mat3( vec3( 1., 0., 0. ), vec3( 0., 1., 0. ), vec3( tx + cx, ty + cy, 1. ) );
  mat3 uvscale = mat3( vec3( sx, 0., 0. ), vec3( 0., sy, 0. ), vec3( 0., 0., 1.) );
  mat3 uvcenter = mat3( vec3( 1., 0., 0. ), vec3( 0., 1., 0. ), vec3( -cx / sx, cy / sy, 1. ) );  

  vUvTransform = uvtrans * uvscale * uvrot * uvcenter;

#endif // USE_FRAMES_OR_ORIENTATION || VELOCITY_SCALE

#if defined(USE_PERSPECTIVE)
  float perspective = 1. / -mvPosition.z;
#else
  float perspective = 1.;
#endif

#if defined(USE_RIBBON)
#else
  gl_PointSize = scale * particleSize * perspective;
#endif

  gl_Position = screenPosition;

  if (scale <= 0. || timeRatio < 0. || timeRatio > 1. )
  {
    gl_Position.w = -2.; // don't draw
  }
}`

const THREE_PARTICLE_FRAGMENT = `
precision highp float;
precision highp int;

uniform sampler2D map;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

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
#endif

  vec4 diffuseColor = vParticleColor;
  vec4 mapTexel = texture2D( map, uv );
  diffuseColor *= mapTexel;

#if defined(ALPHATEST)
  if ( diffuseColor.a < ALPHATEST ) {
    discard;
  }
#endif

  gl_FragColor = diffuseColor;

#if defined(USE_FOG)
  float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );

  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
}`

