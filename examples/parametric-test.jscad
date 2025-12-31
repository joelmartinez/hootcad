const jscad = require('@jscad/modeling')
const { cuboid, sphere, cylinder } = jscad.primitives
const { translate } = jscad.transforms
const { colorize } = jscad.colors

const getParameterDefinitions = () => ([
  // float
  {
    name: 'sphereRadius',
    type: 'float',
    initial: 5,
    min: 1,
    max: 20,
    step: 0.5,
    caption: 'Sphere radius'
  },

  // int
  {
    name: 'cylinderSegments',
    type: 'int',
    initial: 16,
    min: 3,
    max: 64,
    step: 1,
    caption: 'Cylinder segments'
  },

  // bool
  {
    name: 'tallCube',
    type: 'bool',
    initial: false,
    caption: 'Make cube tall'
  },

  // choice
  {
    name: 'cubeSize',
    type: 'choice',
    initial: 'medium',
    caption: 'Cube size',
    values: ['small', 'medium', 'large'],
    captions: ['Small', 'Medium', 'Large']
  },

  // color
  {
    name: 'sphereColor',
    type: 'color',
    initial: '#ff5555',
    caption: 'Sphere color'
  },

  // text
  {
    name: 'label',
    type: 'text',
    initial: 'hello',
    caption: 'Label (controls height)'
  }
])



function main(params) {
  const { sphereRadius, cylinderSegments, tallCube, cubeSize, sphereColor, label } = params

  const cubeSide =
    cubeSize === 'small' ? 6 :
    cubeSize === 'large' ? 14 :
    10

  const cubeHeight = tallCube ? 20 : 10
  const cylinderHeight = Math.max(5, label.length * 2)

  const cubeObj = translate(
    [-25, 0, 0],
    cuboid({ size: [cubeSide, cubeSide, cubeHeight] })
  )

  const sphereObj = translate(
    [0, 0, 0],
    colorize(sphereColor, sphere({ radius: sphereRadius, segments: 24 }))
  )

  const cylinderObj = translate(
    [25, 0, 0],
    cylinder({ height: cylinderHeight, radius: 5, segments: cylinderSegments })
  )

  return [cubeObj, sphereObj, cylinderObj]
}

module.exports = { main, getParameterDefinitions }
