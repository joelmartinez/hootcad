const { cylinder, sphere } = require('@jscad/modeling').primitives
const { union } = require('@jscad/modeling').booleans
const { translate } = require('@jscad/modeling').transforms

const main = () => {
  const base = cylinder({ radius: 5, height: 2, segments: 32 })
  const body = translate([0, 0, 8], cylinder({ radius: 3, height: 12, segments: 32 }))
  const head = translate([0, 0, 18], sphere({ radius: 4, segments: 32 }))
  
  return union(base, body, head)
}

module.exports = { main }
