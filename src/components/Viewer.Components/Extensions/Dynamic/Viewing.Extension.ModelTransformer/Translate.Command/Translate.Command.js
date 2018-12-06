import ViewerCommand from 'Viewer.Command'

export default class TranslateCommand extends ViewerCommand {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  constructor (viewer, options = {}) {

    super (viewer, {
      ...options,
      commandId: 'Translate'
    })

    this.commandTool.on('buttondown', this.onButtonDown)
    this.commandTool.on('mousemove', this.onMouseMove)
    this.commandTool.on('buttonup', this.onButtonUp)
    this.commandTool.on('keydown', this.onKeyDown)

    this.fullTransform = options.fullTransform
    this.hitPoint = new THREE.Vector3()
    this.selectedFragments = []
    this.selection = null
    this.dragging = null
  }

  /////////////////////////////////////////////////////////
  // Creates a dummy mesh to attach control to
  //
  /////////////////////////////////////////////////////////
  createTransformMesh() {

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.0001, 5))

    mesh.position.set(0, 0, 0)

    return mesh
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onActivate() {
  
    const bbox = this.viewer.model.getBoundingBox()

    this.viewer.impl.createOverlayScene(
      'TranslateToolOverlay')

    this.TxControl = new THREE.TransformControls(
      this.viewer.impl.camera,
      this.viewer.impl.canvas,
      "translate")

    this.TxControl.setSize(
      bbox.getBoundingSphere().radius * 5)

    this.TxControl.visible = false

    this.viewer.impl.addOverlay(
      'TranslateToolOverlay',
      this.TxControl)

    this.TxMesh = this.createTransformMesh()

    this.TxControl.attach(
      this.TxMesh)
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onDeactivate() {
  
    this.clearSelection () 
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onCameraChanged = () => {
    if (this.TxControl) {
      this.TxControl.update()
    }
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onButtonDown = (event) => {

    this.dragging = true

    this.pointerDown = this.TxControl.onPointerDown(event)

    if (this.pointerDown && this.selection)
      return true

    const hitTest = this.viewer.clientToWorld(
      event.canvasX,
      event.canvasY,
      true)

    if (hitTest) {
      this.hitPoint.copy(hitTest.intersectPoint)
    }

    return false
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onButtonUp = (event) => {

    this.dragging = false

    if (this.TxControl.onPointerUp(event))
      return true

    return false
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onMouseMove = (event) => {

    const handled = this.dragging 
      ? this.TxControl.onPointerMove(event)
      : this.TxControl.onPointerHover(event)
    
    if (handled) {
      this.viewer.impl.sceneUpdated(true)
    }

    return handled
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onKeyDown = (event, keyCode) => {

    if (keyCode === 27) { //ESC
      this.deactivate()
    }
    return false
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  onTxChange = () => {

    if (this.dragging && this.TxControl.visible) {

      const model = this.selection.model

      const pos = this.TxMesh.position

      const translation = new THREE.Vector3(
        pos.x - model.offset.x,
        pos.y - model.offset.y,
        pos.z - model.offset.z)

      const fragIds = 
        this.selectedFragments.map((fragment) => {

          fragment.position = new THREE.Vector3(
            pos.x - fragment.offset.x,
            pos.y - fragment.offset.y,
            pos.z - fragment.offset.z)

          fragment.updateAnimTransform()

          return fragment.fragId
      })

      this.viewer.impl.sceneUpdated(true)

      this.emit('transform', {
        transform: {
          translation
        },
        fragIds,
        model
      })
    }
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  async setSelection (event) {

    if (!event.selections.length) {
      return this.clearSelection()
    }

    this.selection = event.selections[0]

    this.selectedFragments = []

    const model = this.selection.model

    const modelTransform = model.transform || { 
      translation: { x:0, y:0, z:0 } 
    }

    model.offset = {
      x: this.hitPoint.x - modelTransform.translation.x,
      y: this.hitPoint.y - modelTransform.translation.y,
      z: this.hitPoint.z - modelTransform.translation.z
    }

    this.TxControl.visible = true

    this.TxControl.setPosition(
      this.hitPoint)

    this.TxControl.addEventListener(
      'change', this.onTxChange)

    this.viewer.addEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      this.onCameraChanged)

    if (this.fullTransform) {

      const it = model.getData().instanceTree

      this.selection.fragIdsArray = []

      this.selection.dbIdArray = [
        it.getRootId()
      ]
    }

    const fragIds = !this.selection.fragIdsArray.length
      ? await getFragIds(model, this.selection.dbIdArray)
      : this.selection.fragIdsArray

    this.selectedFragments = fragIds.map((fragId) => {

      const fragment = this.viewer.impl.getFragmentProxy(
        model, fragId)

      fragment.getAnimTransform()

      fragment.offset = {
        x: this.hitPoint.x - fragment.position.x,
        y: this.hitPoint.y - fragment.position.y,
        z: this.hitPoint.z - fragment.position.z
      }

      return fragment
    })

    this.viewer.impl.sceneUpdated(true)
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  clearSelection () {
   
    this.viewer.removeEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      this.onCameraChanged)

    if (this.TxControl) {

      this.TxControl.removeEventListener(
        'change', this.onTxChange)
  
      this.TxControl.visible = false
  
      this.selectedFragments = []

      this.viewer.impl.sceneUpdated(true)
    }
    
    this.selection = null

    this.emit('selection', null)

    this.viewer.clearSelection()
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  pickPosition () {

  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  setFullTransform (fullTransform) {

    this.fullTransform = fullTransform

    this.clearSelection()
  }
}


