import {ReflexContainer, ReflexElement, ReflexSplitter} from 'react-reflex'
import {transformModel, sleep} from 'Viewer.Toolkit'
import React, {PureComponent} from 'react'
import EventsEmitter from 'EventsEmitter'
import ServiceManager from 'SvcManager'
import {findDOMNode} from 'react-dom'
import Stopwatch from 'Stopwatch'
import merge from 'lodash/merge'
import find from 'lodash/find'
import easing from 'easing-js'
import Viewer from 'Viewer'
import Loader from 'Loader'
import './ViewerView.scss'
import Panel from 'Panel'

class ViewerView extends PureComponent {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  constructor (props, context) {

    super (props, context) 

    this.modelSvc = ServiceManager.getService(
      'ModelSvc')

    this.userSvc = ServiceManager.getService(
      'UserSvc')

    this.eventSink = new EventsEmitter()

    this.state = {
      viewerPanels: [],
      viewerFlex: 1.0,
      resizing: false,
      modelType: ''
    }

    this.viewerFlex = 1.0
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setStateAsync (state) {
    return new Promise((resolve) => {
      this.setState(state, () => {
        resolve()
      })  
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async componentDidMount () {

    //const { id, embed, linkId } = this.props.location

    const {search} = this.props.location
    const id = search.split('=')[1]

    this.props.setNavbarState({
      visible: id || !(embed && linkId),
      links: {
        home: !!id,
        gallery: !!id,
        login: !!id,
        about: true
      }
    })

    window.addEventListener(
      'resize', this.onStopResize)

    window.addEventListener(
      'resize', this.onResize)

    if (!this.props.appState.viewerEnv) {

      await this.initialize({
        env: 'AutodeskProduction',
        useConsolidation: true
      })

      this.props.setViewerEnv('AutodeskProduction')
 
      Autodesk.Viewing.Private.memoryOptimizedSvfLoading = true

      //Autodesk.Viewing.Private.logger.setLevel(0)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  componentWillUnmount () {

    window.removeEventListener(
      'resize', this.onStopResize)

    window.removeEventListener(
      'resize', this.onResize)
  }

   /////////////////////////////////////////////////////////
   // Initialize viewer environment
   //
   /////////////////////////////////////////////////////////
   initialize (options) {
      return new Promise((resolve, reject) => {
        Autodesk.Viewing.Initializer (options, () => {
          resolve ()
        }, (error) => {
          reject (error)
        })
      })
   }

   /////////////////////////////////////////////////////////
   // Load a document from URN
   //
   /////////////////////////////////////////////////////////
   loadDocument (urn) {
      return new Promise((resolve, reject) => {
        const paramUrn = !urn.startsWith('urn:')
          ? 'urn:' + urn
          : urn
        Autodesk.Viewing.Document.load(paramUrn, (doc) => {
          resolve (doc)
        }, (error) => {
          reject (error)
        })
      })
   }

   /////////////////////////////////////////////////////////
   // Return viewable item: first 3d or 2d item by default
   //
   /////////////////////////////////////////////////////////
   getViewableItem (doc, {roles, guid}) {

      const rootItem = doc.getRootItem()

      const roleArray = [...roles]

      let items = []

      roleArray.forEach((role) => {

        items = [ 
          ...items,
          ...Autodesk.Viewing.Document.getSubItemsWithProperties(
            rootItem, { type: 'geometry', role }, true) 
          ]
      })

      if (!items.length) {
        return null
      }

      if (guid) {
        for (let item of items) {
          if (item.guid === guid) {
            return item
          }
        }
      }

      return items[0]
   }

   /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  createToolbar (viewer) {

    const toolbarContainer = document.createElement('div')

    toolbarContainer.className = 'ff-toolbar'

    viewer.container.appendChild(toolbarContainer)

    const toolbar = new Autodesk.Viewing.UI.ToolBar (true)

    const ctrlGroup =
      new Autodesk.Viewing.UI.ControlGroup('FF')

    toolbar.addControl(ctrlGroup)

    toolbarContainer.appendChild(
      toolbar.container)

    return ctrlGroup
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  buildDefaultOptions (viewer, id) {

    return {
      toolbar: this.toolbar,
      apiUrl: '/api',
      react: {
        pushRenderExtension:
          this.pushRenderExtension,

        pushViewerPanel:
          this.pushViewerPanel(viewer),

        popRenderExtension:
          this.popRenderExtension,

        popViewerPanel:
          this.popViewerPanel,

        forceUpdate: () => {
          return new Promise ((resolve) => {
            this.forceUpdate(() => {
              resolve()
            })
          })
        },
        getAppState: () => {
          return this.props.appState
        },
        getState: () => {
          return this.state[id] || {}
        },
        setRootState: (state) => {
          return this.setStateAsync(state)
        },
        setState: (state, {doMerge} = {}) => {

          return new Promise ((resolve) => {

            const extState = this.state[id] || {}

            const newExtState = {
              [id]: doMerge
                ? merge({}, extState, state)
                : {...extState, ...state}
            }

            this.setStateAsync(newExtState).then(() => {
              resolve (newExtState)
            })
          })
        },
        props: this.props
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setDefaultSettings (viewer) {

    viewer.setGroundShadowColor(new THREE.Color(0xb9b5b1))
    viewer.prefs.tag('ignore-producer')
    viewer.setGroundReflection(true)
    viewer.setTheme('light-theme')
    viewer.setGroundShadow(true)
    viewer.setGhosting(true)
    viewer.setLightPreset(0)

    const bgClr = [
      160, 204, 224,
      250, 250, 250
    ]

    viewer.setBackgroundColor(
      bgClr[0], bgClr[1], bgClr[2],
      bgClr[3], bgClr[4], bgClr[5])
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  configureProxy ({db, id, linkId}) {

    const endpoint = window.location.origin + 
      '/lmv-proxy-2legged'

    if (Autodesk.Viewing.endpoint) {

      if (linkId) {
        
        Autodesk.Viewing.endpoint.setEndpointAndApi(
          `${endpoint}/gallery/share/${linkId}`, 
          'derivativeV2')

      } else if (id) {

        Autodesk.Viewing.endpoint.setEndpointAndApi(
          `${endpoint}/${db}/model/${id}`, 
          'derivativeV2')
      }
    }
  }

  /////////////////////////////////////////////////////////
  // viewer div and component created
  //
  /////////////////////////////////////////////////////////
  loadModel = async (viewer, 
    {db, id, extIds, urn, path, viewId, linkId}, delay) => {

    try {

      this.configureProxy({db, id, linkId})

      let extensions = (extIds || []).map((id) => {
        id
      }) 

      let sharedPropertyDbPath = null

      let placementTransform = null

      let permissionsOnModel = []

      let dbModel = null

      let item = null

      let doc = null  

      if (id) {

        dbModel = 
          await this.modelSvc.getModel(db, id)

        permissionsOnModel = 
          await this.userSvc.getPermissionsOnModel(
            db, id)

      } else if (linkId) {

        dbModel = 
          await this.modelSvc.getModelByLink(
            db || 'gallery', linkId)
      }

      if (dbModel) {

        if (dbModel.model.sharedPropertyDbPath)  {
          sharedPropertyDbPath = location.origin + '/' + 
            dbModel.model.sharedPropertyDbPath
        }
        
        if (dbModel.extensions) {
          extensions = [
            ...extensions, 
            ...dbModel.extensions
          ]  
        }
      
        if (dbModel.model.placementTransform) {
          placementTransform = 
            this.buildMatrixTransform(
              dbModel.model.placementTransform)
        }

        if (dbModel.model.urn) {

          doc =  await this.loadDocument (dbModel.model.urn) 

          item = this.getViewableItem (doc, {
            roles: ['3d', '2d'],
            guid: viewId
          })

          sharedPropertyDbPath = doc.getPropertyDbPath()

          path = doc.getViewablePath(item)

          urn = dbModel.model.urn

          viewId = item.guid
        }

        if (dbModel.model.path) {

          path = dbModel.model.path
        }

        viewer.stateInit = dbModel.stateInit

      } else if (urn) {

        doc =  await this.loadDocument (dbModel.model.urn)

        item = this.getViewableItem (doc, {
          roles: ['2d', '3d'],
          guid: viewId
        })

        path = doc.getViewablePath(item)

        viewId = item.guid

      } else if (!path) {

        const error = 'Invalid query parameter: ' +
          'use id OR linkId OR urn OR path in url'

        throw new Error(error)
      }

      viewer.start()

      this.toolbar = this.toolbar || 
        this.createToolbar (viewer)

      viewer.addEventListener(
        Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT,
        this.onModelRootLoaded)

      viewer.addEventListener(
        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
        this.onGeometryLoaded)

      if (delay) await sleep(delay)

      const tasks = extensions.map((extension) => {

        const extId = extension.id

        const options = {
          setDefaultSettings: this.setDefaultSettings,
          ...this.buildDefaultOptions (viewer, extId),
          appContainer: findDOMNode(this),
          loadModel: this.loadModel,
          database: db || 'gallery',
          eventSink: this.eventSink,
          modelName: dbModel.name,
          ...extension.options,
          modelId: dbModel._id,
          permissionsOnModel,
          viewId,
          urn
        }

        return viewer.loadDynamicExtension(
            extension.id, options)
      })

      await Promise.all(tasks)

      const loadOptions = {
        sharedPropertyDbPath,
        placementTransform
      }

      viewer.loadModel(path, loadOptions, (model) => {
        
        model.transform = dbModel && dbModel.model.transform
        model.modelId = dbModel._id
        viewer.activeModel = model
        model.name = dbModel.name
        model.guid = viewId

        this.eventSink.emit('model.activated', {
          source: 'model.loaded',
          model
        })   

        this.eventSink.emit('model.loaded', {
          model
        })      
      })

      //pdf support
      //viewer.loadDocumentNode(doc, item)

    } catch (ex) {

      this.handleError(ex)
    }
  }

  /////////////////////////////////////////////////////////
  // viewer div and component created
  //
  /////////////////////////////////////////////////////////
  onViewerCreated (viewer) {

    viewer.addEventListener(
      Autodesk.Viewing.EXTENSION_LOADED_EVENT,
      this.onExtensionLoaded)

    const {search} = this.props.location
    const id = search.split('=')[1]  

    this.loadModel(viewer, {id})
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  handleError = (error) => {

    console.log('Viewer Initialization Error: ', error)

    switch (error.status) {
      case 404: 
      break;
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onStopResize = (e) => {

    const keys = ['rightPane', 'leftPane', 'topPane']

    keys.forEach((key) => {
      if (this.state[key]) {
        if (this.state[key].onStopResize) {
          this.state[key].onStopResize()
        }
      }
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onResize = (event) => {

    const keys = ['rightPane', 'leftPane', 'topPane']

    keys.forEach((key) => {
      if (this.state[key]) {
        if (this.state[key].onResize) {
          this.state[key].onResize()
        }
      }
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onViewerStartResize = (e) => {

    this.setState({
      resizing: true
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onViewerStopResize = (e) => {

    this.viewerFlex = e.component.props.flex

    const keys = ['rightPane', 'leftPane', 'topPane']

    keys.forEach((key) => {
      if (this.state[key]) {
        if (this.state[key].onStopResize) {
          this.state[key].onStopResize()
        }
      }
    })

    this.setState({
      resizing: false
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onPaneStopResize (flexKey, e) {

    this[flexKey] = e.component.props.flex
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  pushRenderExtension = async(extension) => {

    const layout = extension.layout

    const location = 
      layout.location || 'rightPane'

    this[`${location}Flex`] = layout.flex

    if (['leftPane', 'rightPane'].includes(location)) {

      this.viewerFlex = layout
        ? 1.0 - layout.flex
        : 1.0

      const paneExtStyle = { 
        display: 'block' 
      }

      await this.setStateAsync({
        [`${location}Flex`]: layout.flex,
        paneExtStyle
      })
      
      await this.runAnimation (
        1.0, this.viewerFlex, 1.0)
    }
  
    await sleep(250)

    await this.setStateAsync({
      [location]: extension
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  popRenderExtension = async(extension) => {

    const layout = extension.layout

    const location = 
      layout.location || 'rightPane'

    this[`${location}Flex`] = 1.0

    await this.setStateAsync({
      [location]: null
    })

    await sleep(250)

    if (['leftPane', 'rightPane'].includes(location)) {

      await this.runAnimation(
        this.viewerFlex, 1.0, 1.0)

      const paneExtStyle = { 
        display: 'none' 
      }

      await this.setStateAsync({
        [`${location}Flex`]: 1.0,
        paneExtStyle
      })  
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  pushViewerPanel = (viewer) => {

    return async(renderable, opts = {}) => {

      const {viewerPanels} = this.state

      const panelIds = viewerPanels.map(p => p.id)

      if (panelIds.includes(renderable.id)) {
        return viewerPanels.filter(p => {
          p.id === renderable.id
        })[0]
      }

      const nbPanels = viewerPanels.length

      const panelId = renderable.id

      const props = Object.assign({
          left: 10 + 50 * nbPanels,
          top: 10 + 55 * nbPanels
        }, opts, {
        container: viewer.container,
        id: panelId,
        renderable,
        react: {
          setState: (state) => {

            return new Promise((resolve) => {

              const panelState = this.state[panelId] || {}

              const newPanelState = {
                [panelId]: Object.assign({},
                  panelState, state)
              }

              this.setStateAsync(newPanelState).then(() => {
                resolve(newPanelState)
              })
            })
          },
          getState: () => {
            return this.state[panelId] || {}
          }
        }
      })

      const panel = new Panel (props)

      await this.setStateAsync({
        viewerPanels: [
          ...viewerPanels,
          panel
        ]
      })

      return panel
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  popViewerPanel = (panelId) => {

    return new Promise ((resolve) => {

      const targetPanel = find(this.state.viewerPanels, {
        id: panelId
      })

      targetPanel
        ? targetPanel.destroy().then(() => {

        const viewerPanels =
          this.state.viewerPanels.filter((panel) => {
            return (panel.id !== panelId)
          })

          this.setStateAsync({
            viewerPanels
          })
          resolve ()
        })
       : resolve ()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  buildMatrixTransform (params = {}) {

    const matrix = new THREE.Matrix4()

    const position = new THREE.Vector3()

    position.fromArray(params.position || [0,0,0])

    const euler = new THREE.Euler(
      0,0,0, 'XYZ')

    euler.fromArray(params.euler || [0,0,0])

    const quaternion = new THREE.Quaternion()

    quaternion.setFromEuler(euler)

    const scale = new THREE.Vector3()

    scale.fromArray(params.scale || [1,1,1])

    matrix.compose(
      position,
      quaternion,
      scale)

    return matrix
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  buildFragmentTransform (params = {}) {

    const position = new THREE.Vector3()

    position.fromArray(params.position || [0,0,0])

    const euler = new THREE.Euler(
      0,0,0, 'XYZ')

    euler.fromArray(params.euler || [0,0,0])

    const quaternion = new THREE.Quaternion()

    quaternion.setFromEuler(euler)

    const scale = new THREE.Vector3()

    scale.fromArray(params.scale || [1,1,1])

    return {
      quaternion,
      position,
      scale
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onModelRootLoaded = (event) => {

    const viewer = event.target

    this.setDefaultSettings(viewer)

    viewer.removeEventListener(
      Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT,
      this.onModelRootLoaded)

    if (viewer.model.is2d()) {
      viewer.showLoader(false)
      this.setStateAsync({
        modelType: 'model2d'
      })
    }

    if (viewer.model.is3d()) {
      viewer.showLoader(viewer.stateInit)
      this.setStateAsync({
        modelType: 'model3d'
      })
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onExtensionLoaded = (event) => { 
    const viewer = event.target
    
    switch (event.extensionId) {

      case "Autodesk.Measure":

        const ctrl = $('#toolbar-measurementSubmenuTool')
        
        const clone = ctrl.clone()

        $('#settingsTools').append(clone)

        clone.on('click', () => {
          ctrl.click()
        })
        
        break
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onGeometryLoaded = (event)  => {

    const viewer = event.target

    viewer.removeEventListener(
      Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
      this.onGeometryLoaded)

    if (viewer.model.is3d()) {

      const nav = viewer.navigation

      if (viewer.stateInit) {
        viewer.restoreState(
          viewer.stateInit, null, true)
      } else {
          nav.toPerspective()
      }  
  
      viewer.autocam.setHomeViewFrom(
        nav.getCamera())

      if (viewer.model.transform) {
        transformModel(
          viewer, viewer.model,
          viewer.model.transform)
      }
    }

    setTimeout(() => {
      if (viewer.viewCubeUi) {
        viewer.showViewCubeTriad(true)
      }
    }, 2000)    
    
    viewer.showLoader(false)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  animate (period, easing, update) {

    return new Promise((resolve) => {

      const stopwatch = new Stopwatch()

      let elapsed = 0

      const stepFn = () => {

        const dt = stopwatch.getElapsedMs() * 0.001

        elapsed += dt

        if (elapsed < period) {

          const eased = easing(elapsed/period)

          update (eased).then(() => {

            window.requestAnimationFrame(stepFn)
          })

        } else {

          update(1.0)

          resolve()
        }
      }

      stepFn ()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  runAnimation (start, end, animPeriod) {

    const easingFn = (t) => {
      //b: begging value, c: change in value, d: duration
      return easing.easeInOutExpo(t, 0, 1.0, animPeriod * 0.9)
    }

    const update = (eased) => {

      const viewerFlex =
        (1.0 - eased) * start + eased * end

      return new Promise((resolve) => {

        this.setStateAsync({
          viewerFlex
        }).then(() => resolve())
      })
    }

    return this.animate (
      animPeriod, easingFn, update)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderModel () {

    const {resizing, viewerPanels, modelType} = this.state

    const viewerStyle = {
      pointerEvents: resizing
        ? 'none'
        : 'all'
    }

    return (
      <Viewer className={modelType} 
        onViewerCreated={(viewer) => {
          this.onViewerCreated(viewer)
        }}
        panels= {viewerPanels}
        style={viewerStyle}
      />
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderExtension (extension) {

    const renderOptions = {
      showTitle: true,
      docked: true
    }

    return (
      <div className="data-pane">
        <Loader show={!extension}/>
        {
          extension && 
          extension.render(renderOptions)
        }
      </div>
    )
  }

   /////////////////////////////////////////////////////////
   //
   //
   /////////////////////////////////////////////////////////
   render () {

    const navbar = this.props.appState.navbar.visible
      ? 'with-navbar'
      : ''

    const mobile = this.props.appState.isMobile

    const { 
      rightPaneFlex,
      leftPaneFlex,
      paneExtStyle, 
      viewerFlex, 
      rightPane, 
      leftPane,
      topPane
    } = this.state

    return (
      <div className={`viewer-view ${navbar} ${mobile? 'mobile':''}`}>
        {
          topPane && 
          <div {...topPane.layout.style}>
            {this.renderExtension(topPane)}
          </div>
        }
        <ReflexContainer orientation='horizontal' key="viewer">
          <ReflexElement>
            <ReflexContainer orientation='vertical'>
              {
                leftPaneFlex &&
                <ReflexSplitter
                  onStopResize={() => this.forceUpdate()}
                  style={paneExtStyle}
                />
              }
              {
                leftPane &&
                <ReflexElement 
                  onStopResize={
                    (e) => this.onPaneStopResize('leftPaneFlex', e)
                  }
                  style={paneExtStyle}>
                  {this.renderExtension(leftPane)}
                </ReflexElement>
              }
              <ReflexElement
                onStartResize={this.onViewerStartResize}
                onStopResize={this.onViewerStopResize}
                propagateDimensions={true}
                onResize={this.onResize}
                className="viewer"
                flex={viewerFlex}>
                {this.renderModel()}
              </ReflexElement>
              {
                rightPaneFlex &&
                <ReflexSplitter
                  onStopResize={() => this.forceUpdate()}
                  style={paneExtStyle}
                />
              }
              {
                rightPaneFlex &&
                <ReflexElement
                  onStopResize={
                    (e) => this.onPaneStopResize('righPaneFlex', e)
                  }
                  style={paneExtStyle}>
                  {this.renderExtension(rightPane)}
                </ReflexElement>
              }
            </ReflexContainer>
          </ReflexElement>
        </ReflexContainer>
      </div>
    )
   }
}

// class ViewerView extends PureComponent {

//   render () {
//     return (
//       <div> viewer bro </div>
//     )
//   }
// }

export default ViewerView


