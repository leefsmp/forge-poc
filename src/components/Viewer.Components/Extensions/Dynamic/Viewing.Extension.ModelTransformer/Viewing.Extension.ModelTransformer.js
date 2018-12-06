/////////////////////////////////////////////////////////
// Viewing.Extension.ModelTransformer
// by Philippe Leefsma, April 2017
//
/////////////////////////////////////////////////////////
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import './Viewing.Extension.ModelTransformer.scss'
import TranslateCommand from './Translate.Command'
import WidgetContainer from 'WidgetContainer'
import RotateCommand from './Rotate.Command'
import Tooltip from 'Viewer.Tooltip'
import Stopwatch from 'Stopwatch'
import easing from 'easing-js'
import Switch from 'Switch'
import Label from 'Label'
import Input from 'Input'
import React from 'react'
import {
  selectiveExplode
} from 'Viewer.Toolkit'

class ModelTransformerExtension extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor (viewer, options) {

    super (viewer, options)

    this.onDeactivate = this.onDeactivate.bind(this)

    this.renderTitle = this.renderTitle.bind(this)

    this.tooltip = new Tooltip(viewer, {
      stroke: '#00FF00',
      fill: '#00FF00'
    })

    this.tooltip.setContent(`
      <div id="pickTooltipId" class="pick-tooltip">
        <b>Pick position ...</b>
      </div>`,
      '#pickTooltipId')

    this.transformedFragIdMap = {}

    this.react = options.react
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get className() {

    return 'model-transformer'
  }

  /////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.ModelTransformer'
  }

  /////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////
  load () {

    const fullTransform = this.options.fullTransform

    this.TxCommand = new TranslateCommand(this.viewer, {
      fullTransform
    })

    this.RxCommand = new RotateCommand(this.viewer, {
      fullTransform
    })

    this.TxCommand.on('selection', this.onTransformSelection)
    this.RxCommand.on('selection', this.onTransformSelection)

    this.TxCommand.on('transform', this.onTransform)
    this.RxCommand.on('transform', this.onTransform)

    this.TxCommand.on('deactivate', this.onDeactivate)
    this.RxCommand.on('deactivate', this.onDeactivate)

    this.react.setState({

      Tx:'', Ty:'', Tz:'',
      Rx:'', Ry:'', Rz:'',
      Sx:'', Sy:'', Sz:'',

      translate: false,
      selection: null,
      fullTransform,
      rotate: false,
      pick: false,
      model: null

    }).then (() => {

      if (!this.options.readonly) {
        this.react.pushRenderExtension(this)
      }
    })

    console.log(
      'Viewing.Extension.ModelTransformer loaded')

    return true
  }

  /////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////
  unload () {

    console.log('Viewing.Extension.ModelTransformer unloaded')

    this.TxCommand.terminate()

    this.RxCommand.terminate()

    super.unload ()

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onModelRootLoaded (event) {

    this.setModel(event.model)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onModelActivated (event) {

    this.setModel(event.model)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onModelUnloaded (event) {

    if (!this.models.length) {

      this.clearModel()
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setModel (model) {

    const {fullTransform} = this.react.getState()

    model.transform = model.transform || {
      translation: {
        x: 0.0, y: 0.0, z: 0.0
      },
      rotation: {
        x: 0.0, y: 0.0, z: 0.0
      },
      scale: {
        x: 1.0, y: 1.0, z: 1.0
      }
    }

    this.tooltip.deactivate()

    this.react.setState({
      model
    })

    if (fullTransform) {

      this.setTransformState(
        model.transform)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  clearModel () {

    this.tooltip.deactivate()

    return this.react.setState({

      Tx:'', Ty:'', Tz:'',
      Rx:'', Ry:'', Rz:'',
      Sx:'', Sy:'', Sz:'',

      translate: false,
      selection: null,
      rotate: false,
      model: null
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  toFixedStr (float, digits = 2) {

    return float.toFixed(digits).toString()
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setTransformState (transform) {

    this.react.setState({

      Rx: this.toFixedStr(transform.rotation.x * 180/Math.PI),
      Ry: this.toFixedStr(transform.rotation.y * 180/Math.PI),
      Rz: this.toFixedStr(transform.rotation.z * 180/Math.PI),

      Tx: this.toFixedStr(transform.translation.x),
      Ty: this.toFixedStr(transform.translation.y),
      Tz: this.toFixedStr(transform.translation.z),

      Sx: this.toFixedStr(transform.scale.x),
      Sy: this.toFixedStr(transform.scale.y),
      Sz: this.toFixedStr(transform.scale.z)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  clearTransformState () {

    this.react.setState({
      Tx:'', Ty:'', Tz:'',
      Rx:'', Ry:'', Rz:'',
      Sx:'', Sy:'', Sz:''
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onTransform = async (data) => {

    const {fullTransform, pick} = this.react.getState()

    if (pick) {

      this.tooltip.deactivate()

      await this.react.setState({
        pick: false
      })
    }

    if (fullTransform) {

      data.model.transform = Object.assign(
        data.model.transform,
        data.transform)

      this.setModel(data.model)

    } else {

      const transform = this.getFragmentTransform (
        data.fragIds[0])

      this.setTransformState (transform)
    }

    data.fragIds.forEach((fragId) => {
      this.transformedFragIdMap[fragId] = true
    })

    this.emit('transform', data)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onDeactivate () {

    this.tooltip.deactivate()

    this.react.setState({
      translate: false,
      rotate: false,
      pick: false
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getFragmentTransform (fragId) {

    const {model} = this.react.getState()

    const fragProxy =
      this.viewer.impl.getFragmentProxy(
        model, fragId)

    fragProxy.getAnimTransform()

    const quaternion = new THREE.Quaternion(
      fragProxy.quaternion._x,
      fragProxy.quaternion._y,
      fragProxy.quaternion._z,
      fragProxy.quaternion._w)

    const euler = new THREE.Euler()

    euler.setFromQuaternion(quaternion, 'XYZ')

    return {
      translation: {
        x: fragProxy.position.x,
        y: fragProxy.position.y,
        z: fragProxy.position.z
      },
      rotation: {
        x: euler.x,
        y: euler.y,
        z: euler.z
      },
      scale:{
        x: fragProxy.scale.x,
        y: fragProxy.scale.y,
        z: fragProxy.scale.z
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSelection (event) {

    const {fullTransform} = this.react.getState()

    const selection = event.selections.length
      ? event.selections[0]
      : null

    this.react.setState({
      selection
    })

    if (!fullTransform) {

      if (selection) {

        const transform = this.getFragmentTransform (
          selection.fragIdsArray[0])

        this.setTransformState (transform)

      } else {

        this.clearTransformState ()
      }
    }

    this.activeCommand && 
    this.activeCommand.setSelection(event)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onTransformSelection = (transformSelection) => {

    this.react.setState({
      transformSelection
    })

    this.emit('transformSelection', transformSelection)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onKeyDownNumeric (e) {

    //backspace, ENTER, ->, <-, delete, '.', '-', ',',
    const allowed = [8, 13, 37, 39, 46, 188, 189, 190]

    if (allowed.indexOf(e.keyCode) > -1 ||
      (e.keyCode > 47 && e.keyCode < 58)) {

      return
    }

    e.stopPropagation()
    e.preventDefault()
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  toFloat (value) {

    const floatValue = parseFloat(value)

    return isNaN(floatValue) ? 0 : floatValue
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async onInputChanged (e, key) {

    const state = this.react.getState()

    state[key] = e.target.value

    const transform = this.getTransform()

    const value = e.target.value

    switch (key) {

      case 'Tx':
        transform.translation.x =
          this.toFloat(value)
        break
      case 'Ty':
        transform.translation.y =
          this.toFloat(value)
        break
      case 'Tz':
        transform.translation.z =
          this.toFloat(value)
        break

      case 'Rx':
        transform.rotation.x =
          this.toFloat(value) * Math.PI/180
        break
      case 'Ry':
        transform.rotation.y =
          this.toFloat(value) * Math.PI/180
        break
      case 'Rz':
        transform.rotation.z =
          this.toFloat(value) * Math.PI/180
        break

      case 'Sx':
        transform.scale.x = this.toFloat(value)
        transform.scale.y = this.toFloat(value)
        transform.scale.z = this.toFloat(value)

        state.Sx = value
        state.Sy = value
        state.Sz = value
        break
      case 'Sy':
        transform.scale.y = this.toFloat(value)
        break
      case 'Sz':
        transform.scale.z = this.toFloat(value)
        break
    }

    await this.react.setState(state)

    this.applyTransform (transform)

    this.activeCommand && 
    this.activeCommand.hideControl()

    this.viewer.impl.sceneUpdated(true)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getTransform () {

    const {fullTransform, model, selection} =
      this.react.getState()

    const fragId = selection.fragIdsArray[0]

    return !fullTransform
      ? this.getFragmentTransform(fragId)
      : model.transform
  }

  /////////////////////////////////////////////////////////
  // Applies transform to specific model
  //
  /////////////////////////////////////////////////////////
  applyTransform (transform, offset = {
      scale: {
        x: 0.0, y: 0.0, z: 0.0
      },
      translation: {
        x: 0.0, y: 0.0, z: 0.0
      },
      rotation: {
        x: 0.0, y: 0.0, z: 0.0
      }
    }) {

    const {fullTransform, model, selection} =
      this.react.getState()

    const euler = new THREE.Euler(
      (transform.rotation.x + offset.rotation.x),
      (transform.rotation.y + offset.rotation.y),
      (transform.rotation.z + offset.rotation.z),
      'XYZ')

    const quaternion = new THREE.Quaternion()

    quaternion.setFromEuler(euler)

    const fragTransform = {
      position: transform.translation,
      scale: transform.scale,
      quaternion
    }

    if (fullTransform) {

      const fragCount = model.getFragmentList().
        fragments.fragId2dbId.length

      //fragIds range from 0 to fragCount-1
      for (var fragId = 0; fragId < fragCount; ++fragId) {

        this.transformFragProxy(
          model, fragId, fragTransform)
      }

    } else {

      selection.fragIdsArray.forEach((fragId) => {

        this.transformFragProxy(
          model, fragId, fragTransform)
      })
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  transformFragProxy (model, fragId, transform) {

    const fragProxy =
      this.viewer.impl.getFragmentProxy(
        model, fragId)

    fragProxy.getAnimTransform()

    if (transform.position) {
      fragProxy.position = transform.position
    }

    if (transform.scale) {
      fragProxy.scale = transform.scale
    }

    if (transform.quaternion) {
      //Not a standard three.js quaternion
      fragProxy.quaternion._x = transform.quaternion.x
      fragProxy.quaternion._y = transform.quaternion.y
      fragProxy.quaternion._z = transform.quaternion.z
      fragProxy.quaternion._w = transform.quaternion.w
    }

    fragProxy.updateAnimTransform()
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  translate () {

    const {translate} = this.react.getState()
  
    if (translate) {
      this.TxCommand.deactivate()
      this.activeCommand = null
    } else {
      this.activeCommand && this.activeCommand.deactivate()
      this.activeCommand = this.TxCommand
      this.TxCommand.activate()
    }

    this.react.setState({
      translate: !translate,
      rotate: false
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  rotate () {

    const {rotate} = this.react.getState()

    if (rotate) {
      this.RxCommand.deactivate()
      this.activeCommand = null
    } else {
      this.activeCommand && this.activeCommand.deactivate()
      this.activeCommand = this.RxCommand
      this.RxCommand.activate()
    }

    this.react.setState({
      translate: false,
      rotate: !rotate
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  pickPosition () {

    this.TxCommand.pickPosition()

    this.tooltip.activate()

    this.react.setState({
      pick: true
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async setDocking (docked) {

    if (docked) {

      await this.react.popRenderExtension(this)

      await this.react.pushViewerPanel(this, {
        className: this.className,
        height: 250,
        width: 300
      })

    } else {

      await this.react.popViewerPanel(this.id)

      this.react.pushRenderExtension(this)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onFullModelTransformChecked (fullTransform) {

    this.viewer.clearSelection()

    this.TxCommand.setFullTransform (fullTransform)
    this.RxCommand.setFullTransform (fullTransform)

    this.react.setState({
      fullTransform
    })
  }

  /////////////////////////////////////////////////////////////////
  //
  //  From viewer.getState:
  //  Allow extensions to inject their state data
  //
  //  for (var extensionName in viewer.loadedExtensions) {
  //    viewer.loadedExtensions[extensionName].getState(
  //      viewerState);
  //  }
  /////////////////////////////////////////////////////////////////
  getState (viewerState) {

    this.currentExplodeScale =
      this.currentExplodeScale ||
      this.viewer.getExplodeScale()

    viewerState.explodeScale = this.currentExplodeScale

    viewerState.transforms = {}

    for (let fragId in this.transformedFragIdMap) {

      const fragProxy = this.viewer.impl.getFragmentProxy(
        this.viewer.model,
        fragId)

      fragProxy.getAnimTransform()

      viewerState.transforms[fragId] = 
        this.getDehydratedTransform(fragProxy)
    }
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  getDehydratedTransform (fragProxy) {

    const quaternion = {}
    const transform = {}
    const position = {}

    const qKeys = ['_x', '_y', '_z']
    const pKeys = ['x', 'y', 'z']

    qKeys.forEach((key) => {
      if (fragProxy.quaternion[key] !== 0){
        quaternion[key] = fragProxy.quaternion[key]
        transform.quaternion = quaternion
      }
    })

    if (fragProxy.quaternion._w !== 1) {
      quaternion._w = fragProxy.quaternion._w
      transform.quaternion = quaternion
    }

    pKeys.forEach((key) => {
      if (fragProxy.position[key] !== 0){
        position[key] = fragProxy.position[key]
        transform.position = position
      }
    })

    return transform
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  getRehydratedTransform (inTransform) {

    const transform = inTransform || {}

    transform.quaternion = transform.quaternion || { 
      _x: 0, _y:0, _z:0, _w:1 
    }

    const qKeys = ['_x', '_y', '_z']
    const pKeys = ['x', 'y', 'z']

    qKeys.forEach((key) => {
      transform.quaternion[key] = transform.quaternion[key] || 0
    })

    transform.quaternion._w = transform.quaternion._w || 1

    transform.position = transform.position || { 
      x: 0, y:0, z:0
    }

    pKeys.forEach((key) => {
      transform.position[key] = transform.position[key] || 0
    })

    return transform
  }

  /////////////////////////////////////////////////////////////////
  //
  //    From viewer.restoreState:
  //    Allow extensions to restore their data
  //
  //    for (var extensionName in viewer.loadedExtensions) {
  //      viewer.loadedExtensions[extensionName].restoreState(
  //        viewerState, immediate);
  //    }
  /////////////////////////////////////////////////////////////////
  restoreState (viewerState, immediate) {

    this.TxCommand.clearSelection()
    this.RxCommand.clearSelection()

    if (viewerState.transforms) {

      //this.restoreTransform(viewerState)

      const period = 1.8

      const easingFunc = (t) => {
        //b: begging value, c: change in value, d: duration
        return easing.easeInOutExpo(t, 0, 1, period * 0.7)
      }

      this.animateTransform(
        viewerState, easingFunc, period).then(() => {

          this.currentExplodeScale =
            viewerState.explodeScale
        })

      this.transformedFragIdMap = {
        ...viewerState.transforms
      }

      this.viewer.impl.sceneUpdated(true)
    }
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  restoreTransform (targetState) {

    const currentFragIds = Object.keys(
      this.transformedFragIdMap)

    const targetFragIds = Object.keys(
      targetState.transforms)

    const fullFragIds = [
      ...currentFragIds,
      ...targetFragIds
    ]

    fullFragIds.forEach((fragId) => {

      const transform = 
        this.getRehydratedTransform(
          targetState.transforms[fragId])

      const fragProxy = 
        this.viewer.impl.getFragmentProxy(
          this.viewer.model, fragId)

      fragProxy.getAnimTransform()

      fragProxy.position.x = transform.position.x
      fragProxy.position.y = transform.position.y
      fragProxy.position.z = transform.position.z

      fragProxy.quaternion._x = transform.quaternion._x
      fragProxy.quaternion._y = transform.quaternion._y
      fragProxy.quaternion._z = transform.quaternion._z
      fragProxy.quaternion._w = transform.quaternion._w

      fragProxy.updateAnimTransform()
    })
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  animateTransform (targetState, easing, period = 2.0) {

    return new Promise (async(resolve, reject) => {

      const currentFragIds = Object.keys(
        this.transformedFragIdMap)

      const targetFragIds = Object.keys(
        targetState.transforms)

      const fullFragIds = [
        ...currentFragIds,
        ...targetFragIds
      ]

      const fragProxyTasks = fullFragIds.map((fragId) => {

        const fragProxy =  
          this.viewer.impl.getFragmentProxy(
            this.viewer.model, fragId)

        fragProxy.getAnimTransform()

        const targetTransform = 
          this.getRehydratedTransform(
            targetState.transforms[fragId])

        fragProxy.step = {

          dx: (targetTransform.position.x - fragProxy.position.x) / period,
          dy: (targetTransform.position.y - fragProxy.position.y) / period,
          dz: (targetTransform.position.z - fragProxy.position.z) / period,

          dQx: (targetTransform.quaternion._x - fragProxy.quaternion._x) / period,
          dQy: (targetTransform.quaternion._y - fragProxy.quaternion._y) / period,
          dQz: (targetTransform.quaternion._z - fragProxy.quaternion._z) / period,
          dQw: (targetTransform.quaternion._w - fragProxy.quaternion._w) / period
        }

        fragProxy.initialTransform = {
          quaternion: {
            _x: fragProxy.quaternion._x,
            _y: fragProxy.quaternion._y,
            _z: fragProxy.quaternion._z,
            _w: fragProxy.quaternion._w
          },
          position: {
            x: fragProxy.position.x,
            y: fragProxy.position.y,
            z: fragProxy.position.z
          }
        }

        fragProxy.targetTransform = targetTransform

        return fragProxy
      })

      const fragProxies = await Promise.all(fragProxyTasks)

      // Create all fragment animation tasks
      const animationTasks = fragProxies.map((fragProxy) => {

        return {

          step: (dt) => {

            //fragProxy.quaternion.slerp(
            //  fragProxy.transform.quaternion,
            //  dt/tStep)

            fragProxy.quaternion._x += fragProxy.step.dQx * dt
            fragProxy.quaternion._y += fragProxy.step.dQy * dt
            fragProxy.quaternion._z += fragProxy.step.dQz * dt
            fragProxy.quaternion._w += fragProxy.step.dQw * dt

            fragProxy.position.x += fragProxy.step.dx * dt
            fragProxy.position.y += fragProxy.step.dy * dt
            fragProxy.position.z += fragProxy.step.dz * dt

            fragProxy.updateAnimTransform()
          },

          ease: (t) => {

            //fragProxy.quaternion.slerp(
            //  fragProxy.transform.quaternion,
            //  dt/tStep)

            const eased = easing(t/period)

            const _targetQuat = fragProxy.targetTransform.quaternion
            const _initQuat = fragProxy.initialTransform.quaternion

            const initQuat = new THREE.Quaternion(
              _initQuat._x,
              _initQuat._y,
              _initQuat._z,
              _initQuat._w)

            const targetQuat = new THREE.Quaternion(
              _targetQuat._x,
              _targetQuat._y,
              _targetQuat._z,
              _targetQuat._w)

            initQuat.slerp(targetQuat, eased)

            fragProxy.quaternion._x = initQuat.x
            fragProxy.quaternion._y = initQuat.y
            fragProxy.quaternion._z = initQuat.z
            fragProxy.quaternion._w = initQuat.w

            //fragProxy.quaternion._x = eased * targetQuat._x + (1 - eased) * initQuat._x
            //fragProxy.quaternion._y = eased * targetQuat._y + (1 - eased) * initQuat._y
            //fragProxy.quaternion._z = eased * targetQuat._z + (1 - eased) * initQuat._z
            //fragProxy.quaternion._w = eased * targetQuat._z + (1 - eased) * initQuat._z

            const targetPos = fragProxy.targetTransform.position
            const initPos = fragProxy.initialTransform.position

            fragProxy.position.x = eased * targetPos.x + (1 - eased) * initPos.x
            fragProxy.position.y = eased * targetPos.y + (1 - eased) * initPos.y
            fragProxy.position.z = eased * targetPos.z + (1 - eased) * initPos.z

            fragProxy.updateAnimTransform()
          },

          finalStep: () => {

            fragProxy.quaternion._x = fragProxy.targetTransform.quaternion._x
            fragProxy.quaternion._y = fragProxy.targetTransform.quaternion._y
            fragProxy.quaternion._z = fragProxy.targetTransform.quaternion._z
            fragProxy.quaternion._w = fragProxy.targetTransform.quaternion._w

            fragProxy.position.copy(fragProxy.targetTransform.position)

            fragProxy.updateAnimTransform()
          }
        }
      })

      // create explode animation task

      let scale = parseFloat(this.currentExplodeScale)

      const targetScale = parseFloat(
        targetState.explodeScale)

      if (targetScale != scale) {

        var scaleStep = (targetScale - scale) / period

        animationTasks.push({

          step: (dt) => {

            scale += scaleStep * dt

            selectiveExplode(
              this.viewer,
              scale,
              fullFragIds)
          },

          ease: (t) => {

            const eased = easing(t/period)

            const easedScale = scale +
              eased * (targetScale - scale)

            selectiveExplode(
              this.viewer,
              easedScale,
              fullFragIds)
          },

          finalStep: () => {

            selectiveExplode(
              this.viewer,
              targetScale,
              fullFragIds)

            this.viewer.explodeSlider.value = targetScale
          }
        })
      }


      let animationId = 0
      let elapsed = 0

      const stopwatch = new Stopwatch()

      const animateTransformStep = () => {

        const dt = stopwatch.getElapsedMs() * 0.001

        elapsed += dt

        if (elapsed < period) {

          animationTasks.forEach((task) => {

            task.ease(elapsed)
          })

          animationId = requestAnimationFrame(
            animateTransformStep)

        } else {

          //end of animation
          animationTasks.forEach((task) => {
            task.finalStep()
          })

          cancelAnimationFrame(animationId)

          this.viewer.autocam.shotParams.duration = 1.0
        }

        this.viewer.impl.sceneUpdated(true)

        resolve()
      }

      this.viewer.autocam.shotParams.duration = period

      animationId = requestAnimationFrame(
        animateTransformStep)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderTitle () {
    return (
      <div className="title">
        <label>
          Model Transforms
        </label>
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderControls () {

    const state = this.react.getState()

    const {model, selection} = state

    const disabled = state.fullTransform
      ? !model
      : !selection

    const pickDisabled =
      !selection ||
      !state.translate ||
      !state.transformSelection ||
      state.transformSelection.type !== 'translate'

    return (
      <div className="controls">
        <div className="row">
          <Label text={'Translation:'}/>
          <Input
            onChange={(e) => this.onInputChanged(e, 'Tx')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-trans"
            disabled={disabled}
            value={state.Tx}
            placeholder="x"
          />
          <Input
            onChange={(e) => this.onInputChanged(e, 'Ty')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-trans"
            disabled={disabled}
            value={state.Ty}
            placeholder="y"
          />
          <Input
            onChange={(e) => this.onInputChanged(e, 'Tz')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-trans"
            disabled={disabled}
            value={state.Tz}
            placeholder="z"
          />
          <button className={state.translate ? 'active':''}
            onClick={() => this.translate()}
            disabled={!model}
            title="Translate">
            <span className="fa fa-arrows-alt"/>
          </button>
        </div>
        <div className="row">
          <Label text={'Rotation:'}/>
          <Input
            onChange={(e) => this.onInputChanged(e, 'Rx')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-rot"
            disabled={disabled}
            value={state.Rx}
            placeholder="rx"
          />
          <Input
            onChange={(e) => this.onInputChanged(e, 'Ry')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-rot"
            disabled={disabled}
            value={state.Ry}
            placeholder="ry"
          />
          <Input
            onChange={(e) => this.onInputChanged(e, 'Rz')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-rot"
            disabled={disabled}
            value={state.Rz}
            placeholder="rz"
          />
          <button className={state.rotate ? 'active':''}
            onClick={() => this.rotate()}
            disabled={!model}
            title="Rotate">
            <span className="fa fa-refresh"/>
          </button>
        </div>
        <div className="row">
          <Label text={'Scale:'}/>
          <Input
            onChange={(e) => this.onInputChanged(e, 'Sx')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-scale"
            disabled={disabled}
            value={state.Sx}
            placeholder="sx"
          />
          <Input
            onChange={(e) => this.onInputChanged(e, 'Sy')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-scale"  
            disabled={disabled}
            value={state.Sy}
            placeholder="sy"
          />
          <Input
            onChange={(e) => this.onInputChanged(e, 'Sz')}
            onKeyDown={(e) => this.onKeyDownNumeric(e)}
            className="input-scale"
            disabled={disabled}
            value={state.Sz}
            placeholder="sz"
          />
          <button className={state.pick ? 'active':''}
            onClick={() => this.pickPosition() }
            disabled={pickDisabled}
            title="Pick position">
            <span className="fa fa-crosshairs"/>
          </button>
        </div>
        {
          this.options.showFullModelTransform &&
          <div className="row">
            <label>
              Full Model Transform:
            </label>
            <Switch onChange={(checked) => {
                this.onFullModelTransformChecked(checked)
              }}
            />
          </div>
        }
        </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render (opts) {
    return (
      <WidgetContainer
        renderTitle={() => this.renderTitle(opts.docked)}
        showTitle={opts.showTitle}
        className={this.className}>
        { this.renderControls() }
      </WidgetContainer>
    )
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  ModelTransformerExtension.ExtensionId,
  ModelTransformerExtension)
