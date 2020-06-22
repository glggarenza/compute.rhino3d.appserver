const express = require('express')
const router = express.Router()
const compute = require('compute-rhino3d')

// Return information related to the definitions on the server
router.get('/',  function(req, res, next) {
  let definitions = []
  req.app.get('definitions').forEach( def => {
    let data = {name: def.name, inputs: def.inputs, outputs: def.outputs}
    definitions.push(data)
  })

  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(definitions))
})



// Return information related to a specific definition
router.get('/:name', function(req, res, next){
  let definition = req.app.get('definitions').find(o => o.name === req.params.name)

  if(definition === undefined)
    throw new Error('Definition not found on server.') 

  let data = {name: definition.name}

  if(!Object.prototype.hasOwnProperty.call(definition, 'inputs') && !Object.prototype.hasOwnProperty.call(definition, 'outputs')){
    //call compute /io

    compute.url = req.app.get('computeUrl')
    compute.authToken = process.env.COMPUTE_TOKEN

    let fullUrl = req.protocol + '://' + req.get('host')
    let definitionPath = `${fullUrl}/definition/${definition.id}`
    
    compute.computeFetch('io', {'requestedFile':definitionPath}).then(result => {

      let inputs = result.Inputs === undefined ? result.InputNames : result.Inputs
      let outputs = result.Outputs === undefined ? result.OutputNames: result.Outputs

      req.app.get('definitions').find(o => o.name === req.params.name).inputs = inputs
      req.app.get('definitions').find(o => o.name === req.params.name).outputs = outputs
      data.inputs = inputs
      data.outputs = outputs

      res.setHeader('Content-Type', 'application/json')
      res.send(JSON.stringify(data))

    }).catch( (error) => console.log(error))


  } else {
    data.inputs = definition.inputs
    data.outputs = definition.outputs

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(data))
  }

  

})



// Solve GH definition
router.post('/:name', function(req, res, next) {

  let definition = req.app.get('definitions').find(o => o.name === req.params.name)
  
  if(definition === undefined)
    throw new Error('Definition not found on server.') 

  // set parameters
  let trees = []

  if(req.body.inputs !== undefined) { // handle no inputs
    for (let [key, value] of Object.entries(req.body.inputs)) {
      let param = new compute.Grasshopper.DataTree(key)
      param.append([0], [value])
      trees.push(param)
    }
  }
  
  compute.url = req.app.get('computeUrl')
  compute.authToken = process.env.COMPUTE_TOKEN

  let fullUrl = req.protocol + '://' + req.get('host')
  let definitionPath = `${fullUrl}/definition/${definition.id}`
  
  compute.Grasshopper.evaluateDefinition(definitionPath, trees).then(result => {
    
    res.setHeader('Content-Type', 'application/json')
    res.send(result)

  }).catch( (error) => { 
    console.log(error)
    res.send('error in solve')
  })
    
})

module.exports = router
