// @ts-ignore
import {createType as ECSY_createType} from 'ecsy'
export const CustomTypes = {}

CustomTypes.Function = ECSY_createType({
  baseType: Function,
  isSimpleType: true,
  create: defaultValue => {
    return typeof defaultValue === "function" ? defaultValue : undefined
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "function" ? defaultValue : undefined
  },
  clear: (src, key) => {
    src[key] = undefined
  }
})

CustomTypes.VecXY = ECSY_createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === 'object' ? {...defaultValue} : {x:0, y:0}
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === 'object' ? defaultValue : {x:0, y:0}
  },
  clear: (src, key) => {
    src[key] = {x:0, y:0}
  },
  copy: (src, dst, key) => {
    src[key].x = dst[key].x
    src[key].y = dst[key].y
  }
})

CustomTypes.VecXYZ = ECSY_createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === 'object' ? {...defaultValue} : {x:0, y:0, z:0}
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === 'object' ? defaultValue : {x: 0, y:0, z:0}
  },
  clear: (src, key) => {
    src[key] = {x:0, y:0, z:0}
  },
  copy: (src, dst, key) => {
    src[key].x = dst[key].x
    src[key].y = dst[key].y
    src[key].z = dst[key].z
  }
})

CustomTypes.RGB = ECSY_createType({
  baseType: Array,
  create: defaultValue => {
    return typeof defaultValue === 'object' ? {...defaultValue} : {r:1, g:1, b:1}
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === 'object' ? defaultValue : {r:1, g:1, b:1}
  },
  clear: (src, key) => {
    src[key] = {r:1, g:1, b:1}
  },
  copy: (src, dst, key) => {
    src[key].r = dst[key].r
    src[key].g = dst[key].g
    src[key].b = dst[key].b
  }
})

// CustomTypes.ArrayOfObject = ECSY_createType({
//   baseType: Array,
//   create: defaultValue => {
//     return Array.isArray(defaultValue) ? Array.from(defaultValue, v => ({...v})) : []
//   },
//   reset: (src, key, defaultValue) => {
//     if (Array.isArray(defaultValue)) {
//       src[key] = Array.from(defaultValue, v => ({...v}))
//     } else {
//       src[key].length = 0
//     }
//   },
//   clear: (src, key) => {
//     src[key].length = 0
//   },
//   copy: (src, dst, key) => {
//     src[key] = Array.from(dst[key], v => ({...v}))
//   }
// })

// CustomTypes.ArrayOfArray = ECSY_createType({
//   baseType: Array,
//   create: defaultValue => {
//     return typeof Array.isArray(defaultValue) ? Array.from(defaultValue, v => v.slice()) : []
//   },
//   reset: (src, key, defaultValue) => {
//     if (Array.isArray(defaultValue)) {
//       src[key] = Array.from(defaultValue, v => v.slice())
//     } else {
//       src[key].length = 0
//     }
//   },
//   clear: (src, key) => {
//     src[key].length = 0
//   },
//   copy: (src, dst, key) => {
//     src[key] = Array.from(dst[key], v => v.slice())
//   }
// })

CustomTypes.Pointer = ECSY_createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === 'object' ? defaultValue : undefined
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === 'object' ? defaultValue : undefined
  },
  clear: (src, key) => {
    src[key] = undefined
  },
  copy: (src, dst, key) => {
    src[key] = dst[key]
  }
})

