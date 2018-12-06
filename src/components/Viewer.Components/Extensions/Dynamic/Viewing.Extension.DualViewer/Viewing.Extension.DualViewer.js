/////////////////////////////////////////////////////////
// Viewing.Extension.DualViewer
// by Philippe Leefsma, April 2016
//
/////////////////////////////////////////////////////////
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import DropdownButton from 'react-bootstrap/lib/DropdownButton'
import MenuItem from 'react-bootstrap/lib/MenuItem'
import WidgetContainer from 'WidgetContainer'
import './Viewing.Extension.DualViewer.scss'
import throttle from 'lodash/throttle'
import Loader from 'Loader'
import Viewer from 'Viewer'
import React from 'react'
import {
  getViewableItems,
  loadDocument
} from 'Viewer.Toolkit'

class DualViewerExtension extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor(viewer, options) {

    super (viewer, options)

    this.onResize = throttle(
      this.onResize, 100)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get className() {

    return 'dual-viewer'
  }

  /////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.DualViewer'
  }

  /////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////
  load () {

    this.pathIndex = this.options.defaultPathIndex || 0

    console.log('Viewing.Extension.DualViewer loaded')

    this.react.setState({
      disabled: true,
      activeView: '',
      items: []
    }).then (() => {
      this.react.pushRenderExtension(this)
    })

    return true
  }

  /////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////
  unload () {

    console.log('Viewing.Extension.DualViewer unloaded')

    if (this.dualViewer.model){
      this.dualViewer.impl.unloadModel(
        this.dualViewer.model)
    }

    this.dualViewer.tearDown()

    this.react.popRenderExtension(this)

    super.unload()

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async getItems () {

    if (this.options.items) {
      return this.options.items
    }

    const model =
      this.viewer.activeModel ||
      this.viewer.model

    const urn = 
      this.options.urn ||
      model.urn

    this.viewerDocument =
      this.options.viewerDocument ||
      await loadDocument(urn)

    return getViewableItems(
      this.viewerDocument, '2d')
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async onViewerCreated (viewer) {

    try {

      this.dualViewer = viewer

      this.viewerModel = null

      this.dualViewer.start()

      const items = await this.getItems()

      if (items.length) {

        await this.react.setState({
          disabled: false,
          items
        })

        this.setActiveView (items[this.pathIndex])

        $('#viewer-dropdown').parent().find('ul').css({
          height: Math.min(
            $('.dual-viewer').height() - 42,
            items.length * 26)
        })

        this.dualViewer.addEventListener(
          Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
          this.onDualViewerSelection)
      }

    } catch(ex) {

      console.log('Viewer Initialization Error:')
      console.log(ex)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSelection (e) {

    const dbIdArray = e.selections.length
      ? e.selections[0].dbIdArray
      : []

    const model = this.dualViewer.model

    if (!this.selection1Locked && model && model.selector) {

      this.selection2Locked = true

      model.selector.setSelection(dbIdArray)

      this.selection2Locked = false
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onDualViewerSelection = (e) => {

    const dbIdArray = e.selections.length
      ? e.selections[0].dbIdArray
      : []

    const model =
      this.viewer.activeModel ||
      this.viewer.model

    if (!this.selection2Locked && model.selector) {

      this.selection1Locked = true

      model.selector.setSelection(dbIdArray)

      this.selection1Locked = false
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderTitle = () => {

    const state = this.react.getState()

    const menuItems = state.items.map((item, idx) => {
      return (
        <MenuItem eventKey={idx} key={idx} onClick={() => {

          this.setActiveView (item)

          this.pathIndex = idx
        }}>
          { item.name }
        </MenuItem>
      )
    })

    return (
      <div className="title">
        <label>
        {this.options.title || '2D View'}
        </label>

        <DropdownButton
          title={"View: " + state.activeView }
          disabled={state.disabled}
          key={"viewer-dropdown"}
          id="viewer-dropdown">
         { menuItems }
        </DropdownButton>
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async setActiveView (item) {

    this.dualViewer.showLoader(true)

    await this.react.setState({
      activeView: item.name,
      disabled: true
    })

    const path = item.path
      || this.viewerDocument.getViewablePath(item)

    if (this.viewerModel) {
      this.dualViewer.impl.unloadModel(
        this.viewerModel)
    }

    const options = {
      sharedPropertyDbPath: this.viewerDocument
        ? this.viewerDocument.getPropertyDbPath()
        : null
    }

    this.dualViewer.loadModel(path, options, (model) => {

      this.dualViewer.fitToView()

      this.dualViewer.showLoader(false)

      this.viewerModel = model

      this.react.setState({
        disabled: false
      })

    }, () => {

      this.dualViewer.showLoader(false)

      this.viewerModel = null

      this.react.setState({
        disabled: false
      })
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onStopResize = () => {

    const state = this.react.getState()

    $('#viewer-dropdown').parent().find('ul').css({
      height: Math.min(
        $('.dual-viewer').height() - 42,
        state.items.length * 26 + 16)
    })

    if (this.dualViewer && this.dualViewer.impl) {

      this.dualViewer.resize()

      this.dualViewer.fitToView()
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onResize () {
    if (this.dualViewer && this.dualViewer.impl) {
      this.dualViewer.resize()
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render (opts = {showTitle: true}) {

    return (
      <WidgetContainer renderTitle={this.renderTitle}
        showTitle={opts.showTitle}
        className={this.className}>

        <Viewer flex={0.40}
          onViewerCreated={
            (viewer) => {
              clearTimeout(this.timeoutId)
              this.timeoutId = setTimeout(
                () => this.onViewerCreated(viewer),
                250)
            }
          }
          className={this.className}
        />

      </WidgetContainer>
    )
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  DualViewerExtension.ExtensionId,
  DualViewerExtension)


