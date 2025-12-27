const { sphere } = require('@jscad/modeling').primitives

const main = () => sphere({ radius: 8, segments: 32 })

module.exports = { main }
