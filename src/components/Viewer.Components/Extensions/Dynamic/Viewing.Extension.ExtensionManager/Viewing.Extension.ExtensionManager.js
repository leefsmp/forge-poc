/////////////////////////////////////////////////////////
// Viewing.Extension.ExtensionManager
// by Philippe Leefsma, April 2016
//
/////////////////////////////////////////////////////////
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import './Viewing.Extension.ExtensionManager.scss'
import ExtensionPane from './ExtensionPane'
import ServiceManager from 'SvcManager'
import PaneManager from 'PaneManager'
import sortBy from 'lodash/sortBy'
import Loader from 'Loader'
import React from 'react'

class ExtensionManager extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor(viewer, options) {

    super (viewer, options)

    this.storageSvc = ServiceManager.getService(
      'StorageSvc')

    this.renderTitle = this.renderTitle.bind(this)

    this.render = this.render.bind(this)

    this.reactOpts = {
      pushRenderExtension: (extension) => {

        return new Promise(async(resolve) => {

          const {renderExtensions} = this.react.getState()

          const extIds = renderExtensions.map(ext => ext.id)

          if (extIds.includes(extension.id)) {  
            return resolve()
          }

          if (!renderExtensions.length) {
            this.react.pushRenderExtension(this)
          }

          this.react.setState({
            renderExtensions: [
              ...renderExtensions, 
              extension
            ]
          }).then(async() => {

            resolve()

            await this.react.forceUpdate()

            this.onStopResize()
          })
        })
      },
      popRenderExtension: (extension) => {

        const state = this.react.getState()

        const renderExtensions =
          state.renderExtensions.filter((ext) => {
            return ext.id !== extension.id
          })
          
        return new Promise((resolve) => {

          this.react.setState({
            renderExtensions
          }).then(async() => {

            resolve()

            if (!renderExtensions.length) {
              await this.react.popRenderExtension(this)
            }

            await this.react.forceUpdate()

            this.onStopResize()
          })
        })
      }
    }

    this.loadedExtensions = []

    this.react = options.react

    this.layout = this.options.layout || {
      flex: 0.35
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get className() {

    return 'extension-manager'
  }

  /////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.ExtensionManager'
  }

  /////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////
  load () {

    const extensions = sortBy(
      this.options.extensions || [], (ext) => {
        return ext.loadPriority
      })

    this.react.setState({
      visible: this.options.visible,
      renderExtensions: [],
      extensions
    })

    if (this.options.visible) {
      this.createButton()
    }

    console.log('Viewing.Extension.ExtensionManager loaded')

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async loadDependencies () {

    const {extensions} = this.react.getState()

    const storage = this.storageSvc.load(
      'extension-manager')

    const loadExts = extensions.filter ((extension) => {
      if (this.options.useStorage) {
        const storageExtensions = storage.extensions || []
        extension.enabled = extension.enabled ||
          storageExtensions.includes(extension.id)
      }
      return extension.enabled
    })

    this.contextMenuExt = 
      await this.viewer.loadDynamicExtension(
        'Viewing.Extension.ContextMenu', {
          controlledSelection: true,
          sort: 'title'
        }) 

    this.extMngOpts = {
      contextMenu: {
        removeHandler: this.contextMenuExt.removeHandler,
        addHandler: this.contextMenuExt.addHandler
      }
    }

    const tasks = loadExts.map ((extension) => {
      return this.loadDynamicExtension(extension)
    })

    return Promise.all(tasks)
  }

  /////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////
  unload () {

    console.log('Viewing.Extension.ExtensionManager unloaded')

    if (this.button) {
      this.viewer.container.removeChild(this.button)
    }

    super.unload()

    return true
  }

  /////////////////////////////////////////////////////////
  // Create a button to display the panel
  //
  /////////////////////////////////////////////////////////
  createButton () {

    this.button = document.createElement('button')

    this.button.title = 'Manage extensions'

    this.button.className = 'extension-manager btn'

    this.button.onclick = () => {
      this.showPanel(!this.panelActive)
    }

    const span = document.createElement('span')
    span.className = 'fa fa-cogs'
    this.button.appendChild(span)

    this.viewer.container.appendChild(this.button)
  }

  /////////////////////////////////////////////////////////
  // Show/Hide panel
  //
  /////////////////////////////////////////////////////////
  async showPanel (show) {

    this.panelActive = show

    if (show) {

      const container = this.viewer.container

      this.button.classList.add('active')

      const height = Math.min(
        container.offsetHeight - 110,
        (this.options.extensions.length + 1) * 30 + 55)

      const renderable = {
        ...this,
        render: this.renderExtensionManager
      }  

      await this.react.pushViewerPanel(
        renderable, {
          maxHeight: height,
          draggable: true,
          maxWidth: 500,
          minWidth: 310,
          width: 310,
          top: 30,
          height
        })

    } else {

      await this.react.popViewerPanel(this.id)

      this.button.classList.remove('active')
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onExtensionLoaded (e) {

    const { extensions } = this.react.getState()

    for (let extension of extensions) {

      if (e.extensionId === extension.id) {

        extension.enabled = true

        this.react.setState({
          extensions
        })

        return
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async loadDynamicExtension (extension) {

    try {

      const { extensions } = this.react.getState()

      extension.loading = true

      this.react.setState({
        extensions
      })

      const setState = (state, opts) => {

        const mngState = this.react.getState()

        const extState = mngState[extension.id] || {}

        return this.react.setState({
          [extension.id] : {
            ...extState,
            ...state
          }
        }, opts)
      }

      const getState = () => {
        const state = this.react.getState()
        return state[extension.id] || {}
      }

      const options = { 
        controlledSelection: true,
        ...this.options,
        ...extension.options,
        react: {
          ...this.react,
          ...this.reactOpts,
          getState,
          setState
        },
        extensions: null,
        ...this.extMngOpts
      }

      const loaderFn = !extension.native
        ? this.viewer.loadDynamicExtension 
        : this.viewer.loadExtension
     
      const extInstance = await loaderFn(
        extension.id, options)

      extension.loading = false
      extension.enabled = true

      this.react.setState({
        extensions
      })

      this.loadedExtensions.push(
        extInstance)

      return extInstance

    } catch (ex) {
      extension.loading = false
      throw new Error(ex)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async onExtensionItemClicked (extension) {

    if (extension.loading) {
      return
    }

    if (extension.enabled) {

      await this.react.popViewerPanel(extension.id)

      this.viewer.unloadExtension(extension.id)

      const { extensions, renderExtensions } =
        this.react.getState()

      extension.enabled = false

      const renderExts =
        renderExtensions.filter((ext) => {
          return ext.id !== extension.id
        })

      this.loadedExtensions = 
        this.loadedExtensions.filter((ext) => {
          return ext.id !== extension.id
        })

      await this.react.setState({
        renderExtensions: renderExts,
        extensions
      })

      this.react.forceUpdate()

      if (this.options.useStorage) {

        this.storageSvc.save(
          'extension-manager', {
            extensions: extensions.filter((ext) => {
              return ext.enabled
            }).map((ext) => {
              return ext.id
            })
          })
      }

    } else {

      const { extensions } = this.react.getState()

      const extInstance =
        await this.loadDynamicExtension (extension)

      this.loadedExtensions.push(extInstance)

      if (this.options.useStorage) {

        this.storageSvc.save(
          'extension-manager', {
            extensions: extensions.filter((ext) => {
              return ext.enabled
            }).map((ext) => {
              return ext.id
            })
          })
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onStopResize () {
    const { renderExtensions } = this.react.getState()
    renderExtensions.forEach((extension) => {
      if (extension.onStopResize) {
        extension.onStopResize()
      }
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onResize () {
    const { renderExtensions } = this.react.getState()
    renderExtensions.forEach((extension) => {
      if (extension.onResize) {
        extension.onResize()
      }
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSelection (event) { 
  
    try {

      if (!this.selectionPending) {
      
        this.selectionPending = true
  
        const selectionEvent = event.controlled 
          ? event
          : this.loadedExtensions.reduce(
            (total, current) => {
              return current.onSelectionOverride
                ? current.onSelectionOverride(event) 
                : total
            }, event)
   
        this.contextMenuExt.onSelection(selectionEvent)
  
        this.loadedExtensions.forEach((ext) => {
          ext.onSelection(selectionEvent)
        })
  
        this.selectionPending = false
      }
      
    }  catch (ex)  {
      this.selectionPending = false
      console.error(ex)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderTitle () {
    return (
      <div className="title">
        <label>
          Manage Extensions
        </label>
        <div className="extension-manager controls">
          <button onClick={() => this.showPanel(false)} >
            <span className="fa fa-times"/>
          </button>
        </div>
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderExtensions () {

    const { extensions } = this.react.getState()

    const sortedExtensions = sortBy(extensions, 
      (ext) => ext.displayName)
     
    return sortedExtensions.map((extension) => {

      const className = 'item' +
        (extension.enabled ? ' enabled' : '') +
        (extension.loading ? ' loading' : '')

      return (
        extension.visible ?
        <div key={extension.id} className={className}
           onClick={() => {
            this.onExtensionItemClicked(extension)
          }}>
          <label>
            {extension.displayName}
          </label>
        </div>
        : false
      )
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderExtensionManager = () => {
    return (
      <ExtensionPane renderTitle={this.renderTitle}
        key={ExtensionManager.ExtensionId}
        className="extension-manager">
        <div className="extension-list">
          { this.renderExtensions() }
        </div>
      </ExtensionPane>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderExtTitle (extension) {
    return extension.renderTitle
      ? extension.renderTitle() 
      : extension.title || false
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render () {

    const state = this.react.getState()

    const renderExtensions = sortBy(
      state.renderExtensions, (ext) => {
        return ext.options.displayIndex || 0
      })

    const nbExt = renderExtensions.length 

    const extensionPanes = renderExtensions.map (
      (extension) => {

        const flexProp = nbExt > 1 && extension.options.flex
          ? {flex: extension.options.flex }
          : {}

        return (
          <ExtensionPane
            renderTitle={() => this.renderExtTitle(extension)}
            onStopResize={(e) => this.onStopResize()}
            onResize={(e) => this.onResize()}
            className={extension.className}
            key={extension.id}
            {...flexProp}>
            {
              extension.render({
                showTitle: false,
                docked: true
              })
            }
          </ExtensionPane>
        )
      })

    return (
      <div className="extension-manager">
         <Loader show={!extensionPanes.length}/>
         <PaneManager  
          showControls={this.options.showControls}
          orientation="horizontal">
          { extensionPanes }
        </PaneManager>
      </div>
    )
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  ExtensionManager.ExtensionId,
  ExtensionManager)
















