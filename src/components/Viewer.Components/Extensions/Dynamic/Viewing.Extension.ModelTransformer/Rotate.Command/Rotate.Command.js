import RotateControl from './Rotate.Control'
import ViewerCommand from 'Viewer.Command'
import {
  getWorldBoundingBox
} from 'Viewer.Toolkit'

export default class RotateCommand extends ViewerCommand {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  constructor (viewer, options = {}) {

    super (viewer, {
      ...options,
      commandId: 'Rotate'
    })

    this.commandTool.on('buttondown', this.onButtonDown)
    this.commandTool.on('mousemove', this.onMouseMove)
    this.commandTool.on('buttonup', this.onButtonUp)
    this.commandTool.on('keydown', this.onKeyDown)
    this.commandTool.on('keyup', this.onKeyUp)

    this.fullTransform = options.fullTransform
    this.keys = {}
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onDeactivate () {

    this.clearSelection()
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  setFullTransform (fullTransform) {

    this.fullTransform = fullTransform

    this.clearSelection()
  }
  
  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  setSelection (event) {

    if (this.rotateControl && this.rotateControl.engaged) {

      this.rotateControl.engaged = false

      this.viewer.select(this.selection.dbIdArray)

      return
    }

    if (!event.selections.length) {
      return this.clearSelection()
    }

    this.selection = event.selections[0]

    const model = this.selection.model

    if (this.fullTransform) {

      this.selection.fragIdsArray = []

      const fragCount = model.getFragmentList().
        fragments.fragId2dbId.length

      for (let fragId = 0; fragId < fragCount; ++fragId) {

        this.selection.fragIdsArray.push(fragId)
      } 

      const it = model.getData().instanceTree

      this.selection.dbIdArray = [it.getRootId()]
    }

    this.drawControl()

    this.viewer.fitToView(this.selection.dbIdArray)

    this.emit('selection', this.selection)
  }

  ///////////////////////////////////////////////////////////////////////////
  // Selection cleared
  //
  ///////////////////////////////////////////////////////////////////////////
  clearSelection () {

    this.selection = null

    if (this.rotateControl) {

      this.rotateControl.remove()

      this.rotateControl = null

      this.viewer.impl.sceneUpdated(true)
    }

    this.emit('selection', null)

    this.viewer.clearSelection()
  }

  ///////////////////////////////////////////////////////////////////////////
  // Draw rotate control
  //
  ///////////////////////////////////////////////////////////////////////////
  async drawControl () {

    const bbox = await getWorldBoundingBox(
      this.selection.model,
      this.selection.dbIdArray)
 
    this.center = new THREE.Vector3(
      (bbox.min.x + bbox.max.x) / 2,
      (bbox.min.y + bbox.max.y) / 2,
      (bbox.min.z + bbox.max.z) / 2)

    const size = Math.max(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y,
      bbox.max.z - bbox.min.z) * 0.8

    if (this.rotateControl) {

      this.rotateControl.remove()
    }

    this.rotateControl = new RotateControl(
      this.viewer, this.center, size)

    this.rotateControl.on('rotate', (data) => {

      this.rotateFragments(
        this.selection.model,
        this.selection.fragIdsArray,
        data.axis,
        data.angle,
        this.center)

      this.viewer.impl.sceneUpdated(true)
    })
  }

  ///////////////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////////////
  onButtonDown = (event, button) => {

    if (this.rotateControl) {
      if (this.rotateControl.onPointerDown(event)) {
        return true
      }
    }

    if (button === 0 && this.keys.Control) {

      this.dragging = true

      this.mousePos = {
        x: event.clientX,
        y: event.clientY
      }

      return true
    }

    return false
  }

  ///////////////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////////////
  onButtonUp = (event, button) => {

    if (this.rotateControl) {
      this.rotateControl.onPointerUp(event)
    }

    if (button === 0) {
      this.dragging = false
    }

    return false
  }

  ///////////////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////////////
  onMouseMove = (event) => {

    if (this.rotateControl) {
      this.rotateControl.onPointerHover(event)
    }

    if (this.dragging) {

      if (this.selection) {

        const offset = {
          x: this.mousePos.x - event.clientX,
          y: event.clientY - this.mousePos.y
        }

        this.mousePos = {
          x: event.clientX,
          y: event.clientY
        }

        const angle = Math.sqrt(
          offset.x * offset.x +
          offset.y * offset.y)

        const sidewaysDirection = new THREE.Vector3()
        const moveDirection = new THREE.Vector3()
        const eyeDirection = new THREE.Vector3()
        const upDirection = new THREE.Vector3()
        const camera = this.viewer.getCamera()
        const axis = new THREE.Vector3()
        const eye = new THREE.Vector3()

        eye.copy(camera.position).sub(camera.target)

        eyeDirection.copy(eye).normalize()

        upDirection.copy(camera.up).normalize()

        sidewaysDirection.crossVectors(
          upDirection, eyeDirection).normalize()

        upDirection.setLength(offset.y)

        sidewaysDirection.setLength(offset.x)

        moveDirection.copy(
          upDirection.add(
            sidewaysDirection))

        axis.crossVectors(moveDirection, eye).normalize()

        this.rotateFragments(
          this.selection.model,
          this.selection.fragIdsArray,
          axis, angle * Math.PI / 180,
          this.center)

        this.viewer.impl.sceneUpdated(true)
      }

      return true
    }

    return false
  }

  ///////////////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////////////
  onKeyDown = (event, keyCode) => {

    this.keys[event.key] = true

    if (keyCode === 27) { //ESC

      this.deactivate()
    }

    return false
  }

  ///////////////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////////////
  onKeyUp = (event) => {
    this.keys[event.key] = false
    return false
  }

  ///////////////////////////////////////////////////////////////////////////
  // Rotate selected fragments
  //
  ///////////////////////////////////////////////////////////////////////////
  rotateFragments (model, fragIds, axis, angle, center) {

    var quaternion = new THREE.Quaternion()

    quaternion.setFromAxisAngle(axis, angle)

    fragIds.forEach((fragId, idx) => {

      const fragProxy = this.viewer.impl.getFragmentProxy(
        model, fragId)

      fragProxy.getAnimTransform()

      const position = new THREE.Vector3(
        fragProxy.position.x - center.x,
        fragProxy.position.y - center.y,
        fragProxy.position.z - center.z)

      position.applyQuaternion(quaternion)

      position.add(center)

      fragProxy.position = position

      fragProxy.quaternion.multiplyQuaternions(
        quaternion, fragProxy.quaternion)

      if (idx === 0) {

        const euler = new THREE.Euler()

        euler.setFromQuaternion(
          fragProxy.quaternion, 0)

        this.emit('transform', {
          dbIds: this.selection.dbIdArray,
          transform: {
            rotation: euler
          },
          fragIds,
          model
        })
      }

      fragProxy.updateAnimTransform()
    })
  }
}


