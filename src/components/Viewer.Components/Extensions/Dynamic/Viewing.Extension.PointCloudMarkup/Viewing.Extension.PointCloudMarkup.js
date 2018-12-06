/////////////////////////////////////////////////////////
// Viewing.Extension.PointCloudMarkup
// by Philippe Leefsma, Dec 2017
//
/////////////////////////////////////////////////////////
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import PointCloudMarkupItem from './PointCloudMarkupItem'
import {OverlayTrigger, Popover} from 'react-bootstrap'
import './Viewing.Extension.PointCloudMarkup.scss'
import PointCloudMarkup from './PointCloudMarkup'
import WidgetContainer from 'WidgetContainer'
import { ChromePicker } from 'react-color'
import ViewerTooltip from 'Viewer.Tooltip'
import EventTool from 'Viewer.EventTool'
import 'rc-tooltip/assets/bootstrap.css'
import ServiceManager from 'SvcManager'
import 'rc-slider/assets/index.css'
import Loader from 'Loader'
import Switch from 'Switch'
import React from 'react'

class PointCloudMarkupExtension extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor (viewer, options) {

    super (viewer, options)

    this.onMarkupSettingsChanged = this.onMarkupSettingsChanged.bind(this)
    this.onMarkupSizeChanged = this.onMarkupSizeChanged.bind(this)
    this.onMarkupNameChanged = this.onMarkupNameChanged.bind(this)
    this.onMarkupOcclusion = this.onMarkupOcclusion.bind(this)
    this.onMarkupsUpdated = this.onMarkupsUpdated.bind(this)
    this.onMarkupRemoved = this.onMarkupRemoved.bind(this)
    this.onMarkupClicked = this.onMarkupClicked.bind(this)
    this.onMarkupVisible = this.onMarkupVisible.bind(this)
    this.onClearMarkups = this.onClearMarkups.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onActivate = this.onActivate.bind(this)
    this.animate = this.animate.bind(this)
    this.onClick = this.onClick.bind(this)

    this.tooltip = new ViewerTooltip(this.viewer, {
      stroke: 'orange',
      fill: 'orange'
    })

    this.tooltipMousePos = {
      x: 0, y: 0
    }

    this.tooltip.setContent(`
      <div id="pointcloud-tooltipId" class="pointcloud-tooltip">
          Specify markup position ...
      </div>`, '#pointcloud-tooltipId')

    this.dialogSvc =
      ServiceManager.getService('DialogSvc')

    this.eventTool = new EventTool(
      this.viewer)

    this.react = options.react

    this.removeTooltipIds = {}

    this.runAnimation = false
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get className() {

    return 'pointcloud-markup'
  }

  /////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.PointCloudMarkup'
  }

  /////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////
  load () {

    this.viewer.setProgressiveRendering(false)
    this.viewer.setGhosting(false)

    const {animation, active} = this.options.pointCloudMarkup

    this.react.setState({

      runAnimation: animation,
      activated: active,
      showLoader: true,
      markups: []

    }).then (async() => {

      if (!this.options.readonly) {
        await this.react.pushRenderExtension(this)
      }

      const model = this.viewer.activeModel ||
        this.viewer.model

      if (model) {

        this.onObjectTreeCreated ()
      }
    })

    console.log('Viewing.Extension.PointCloudMarkup loaded')

    return true
  }

  /////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////
  unload () {

    console.log('Viewing.Extension.PointCloudMarkup unloaded')

    this.react.popRenderExtension(this)
    
    this.pointCloudMarkup.destroy()

    this.eventTool.terminate()

    this.tooltip.deactivate()

    super.unload()

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onActivate (activated) {

    if (activated) {

      this.eventTool.off ('mousemove', this.onMouseMove)
      this.eventTool.on ('singleclick', this.onClick)
      this.tooltip.activate()

    } else {

      this.eventTool.on ('mousemove', this.onMouseMove)
      this.eventTool.off ('singleclick', this.onClick)
      this.tooltip.deactivate()
    }

    this.react.setState({
      activated
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  animate (run) {

    run
      ? this.pointCloudMarkup.startAnimation()
      : this.pointCloudMarkup.stopAnimation()

    const loop = (t) => {

      if (this.pointCloudMarkup.runAnimation) {

        window.requestAnimationFrame(loop)

        this.pointCloudMarkup.update(t)
      }
    }

    this.react.setState({
      runAnimation: run
    })

    loop (0.0)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onObjectTreeCreated () {

    const {
      runAnimation,
      activated
    } = this.react.getState()

    this.pointCloudMarkup = new PointCloudMarkup(
      this.viewer, this.options.pointCloudMarkup)

    this.pointCloudMarkup.on(
      'markup.created',
      this.onMarkupsUpdated)

    this.pointCloudMarkup.on(
      'markup.deleted',
      this.onMarkupsUpdated)

    this.react.setState({
      showLoader: false
    })

    this.animate (runAnimation)

    this.onActivate(activated)

    this.eventTool.activate()
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMouseMove (event) {

    const pos = {
      x:  event.clientX,
      y:  event.clientY
    }

    const markups = 
      this.pointCloudMarkup.getSelection(pos)

    if (markups.length) {

      this.tooltipMousePos = pos

      const markup = markups[0]

      if (this.currentPanelId !== markup.id) {

        if (this.removeTooltipIds[markup.id]) {
        
          clearTimeout(this.removeTooltipIds[markup.id])
          this.currentPanelId = markup.id
        
        } else {

          this.react.popViewerPanel(
            this.currentPanelId)
      
          this.currentPanelId = markup.id

          this.displayMarkupTooltip(
            pos, markup) 
        }
      }
    } else {

      const dist = Math.sqrt(
        (this.tooltipMousePos.x - pos.x) * 
        (this.tooltipMousePos.x - pos.x) + 
        (this.tooltipMousePos.y - pos.y) * 
        (this.tooltipMousePos.y - pos.y))

      if (dist > 16) {
        const panelId = this.currentPanelId
        this.currentPanelId = 0
        this.removeTooltipIds[panelId] = setTimeout(() => {
          panelId && this.react.popViewerPanel(panelId)
          delete this.removeTooltipIds[panelId] 
        }, 500)
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getBounds (element) {

    const rect = element.getBoundingClientRect()

    return {
      left: rect.left + window.pageXOffset,
      top: rect.top + window.pageYOffset,
      height: element.offsetHeight,
      width: element.offsetWidth
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  displayMarkupTooltip (pos, markup) {

    const renderable = {
      title: markup.name,
      id: markup.id,
      render: () => {
        return(
          <div className="pointcloud-markup-tooltip">
            <img src={"/resources/img/default.png"}/>
          </div>
        )
      }
    }

    const bounds = this.getBounds (
      this.viewer.container)

    const height = 250
    const width = 250

    const left = Math.min(
      Math.max(1, pos.x - 300),
      bounds.width - width + 50)

    const top = Math.min(
      Math.max(1, pos.y - 300),
      bounds.height - height + 50)
  
    this.react.pushViewerPanel(renderable, {
      displayMode: 'fadeIn',
      resizeable: false,
      draggable: false,
      height,
      width,
      left,
      top
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onClick (event) {

    const hitTest = this.viewer.clientToWorld(
      event.canvasX,
      event.canvasY,
      true)

    if (hitTest) {

      const markupInfo = {
        fragId: hitTest.fragId,
        point: hitTest.point,
        dbId: hitTest.dbId
      }

      this.pointCloudMarkup.addMarkup(
        markupInfo)

      return true
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupsUpdated () {

    this.react.setState({
      markups: this.pointCloudMarkup.markups
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
  getState (state) {

    state.pointCloudMarkup =
      this.pointCloudMarkup.getState()
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
  async restoreState (state, immediate) {

    this.react.setState({
      markups: []
    })

    if (immediate) {

      this.pointCloudMarkup.restoreState(
        state.pointCloudMarkup)

    } else {

      const onCameraTransitionCompleted = () => {

        this.pointCloudMarkup.restoreState(
          state.pointCloudMarkup)

        this.viewer.removeEventListener(
          Autodesk.Viewing.CAMERA_TRANSITION_COMPLETED,
          onCameraTransitionCompleted)
      }

      this.viewer.addEventListener(
        Autodesk.Viewing.CAMERA_TRANSITION_COMPLETED,
        onCameraTransitionCompleted)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupClicked (markupId) {

  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupNameChanged (markupId, name) {

    this.pointCloudMarkup.setMarkupData (
      markupId, {
        name
      })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupSizeChanged (markupId, size) {

    this.pointCloudMarkup.setMarkupSize (
      markupId, size)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupVisible (markupId, visible) {

    this.pointCloudMarkup.setMarkupVisibility (
      markupId, visible)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupOcclusion (markupId, occlusion) {

    this.pointCloudMarkup.setMarkupOcclusion (
      markupId, occlusion)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupRemoved (markupId) {

    this.pointCloudMarkup.removeMarkup(markupId)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupSettingsChanged () {

    this.react.setState({
      markups: this.pointCloudMarkup.markups
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onClearMarkups () {

    this.pointCloudMarkup.clearMarkups()

    this.react.setState({
      markups: []
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onColorPick (markup) {

    const clr = markup.color

    const rgb =  `rgb(${clr.x*255},${clr.y*255},${clr.z*255})`

    this.dialogSvc.setState({
      className: 'color-picker-dlg',
      title: 'Select Color ...',
      showCancel: false,
      content:
        <div>
          <ChromePicker
            onChangeComplete={(c) => this.onColorPicked(markup, c)}
            color={rgb}
          />
        </div>,
      open: true
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onColorPicked (markup, color) {

   const { r, g, b } = color.rgb

    this.pointCloudMarkup.setMarkupColor (
      markup.id,
      new THREE.Vector4(r/255.0, g/255.0, b/255.0, 1))

    this.onMarkupsUpdated()
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onMarkupItemHover (markup, hover) {

    if (this.pointCloudMarkup.runAnimation) {

      const color = hover
        ? new THREE.Vector4(0, 115/255, 1, 1)
        : markup.color

      this.pointCloudMarkup.setMarkupColor (
        markup.id, color, true)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderMarkups () {

    const { markups, runAnimation } = this.react.getState()

    const items = markups.map((markup) => {

      return (
        <PointCloudMarkupItem
          onMouseLeave={() => this.onMarkupItemHover(markup, false)}
          onMouseEnter={() => this.onMarkupItemHover(markup, true)}
          onIconClicked={() => this.onColorPick(markup)}
          onHideSettings={this.onMarkupSettingsChanged}
          onSizeChanged={this.onMarkupSizeChanged}
          onNameChanged={this.onMarkupNameChanged}
          onOcclusion={this.onMarkupOcclusion}
          onVisible={this.onMarkupVisible}
          onRemove={this.onMarkupRemoved}
          onClick={this.onMarkupClicked}
          animation={runAnimation}
          markup={markup}
          key={markup.id}
        />
      )
    })

    return (
      <div className="items">
        { items }
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderSettings (activated, animation) {
    return (
      <Popover
        className="pointcloud-markup settings"
        title="PointCloud Markup Settings"
        id="settings">
        <label>
          Activated:
        </label>
        <Switch onChange={this.onActivate}
          checked={activated}
        />
        <hr/>
        <label>
          Animation:
        </label>
        <Switch onChange={this.animate}
          checked={animation}
        />
        <div className="footer"/>
      </Popover>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderTitle () {

    const {
      runAnimation,
      activated,
      markups
    } = this.react.getState()

    return (
      <div className="title markup-controls">
        <label>
          PointCloud Markups
        </label>
        <OverlayTrigger trigger="click"
          overlay={this.renderSettings(activated, runAnimation)}
          placement="bottom"
          rootClose>
          <button className="settings-btn" title="Settings">
            <span className="fa fa-cog"/>
          </button>
        </OverlayTrigger>
        {
          !!markups.length &&
          <button
            onClick={this.onClearMarkups}
            title="Clear All Markups"
            className="clear-btn">
            <span className="fa fa-times"/>
          </button>
        }
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render (opts = {showTitle: true}) {

    const {showLoader} = this.react.getState()

    return (
      <WidgetContainer renderTitle={this.renderTitle}
        showTitle={opts.showTitle}
        className={this.className}>
        <Loader show={showLoader}/>
        { this.renderMarkups() }
      </WidgetContainer>
    )
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  PointCloudMarkupExtension.ExtensionId,
  PointCloudMarkupExtension)


