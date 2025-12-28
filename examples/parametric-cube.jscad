const { cube } = require('@jscad/modeling').primitives

const getParameterDefinitions = () => {
  return [
    { name: 'size', type: 'number', initial: 10, min: 1, max: 50, step: 1, caption: 'Cube Size' },
    { name: 'center', type: 'checkbox', checked: false, caption: 'Center Cube' },
    { name: 'color', type: 'choice', caption: 'Color', values: ['red', 'green', 'blue'], captions: ['Red', 'Green', 'Blue'], initial: 'blue' }
  ]
}

const main = (params) => {
  const size = params.size || 10
  const center = params.center || false
  return cube({ size, center })
}

module.exports = { main, getParameterDefinitions }
