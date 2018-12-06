/////////////////////////////////////////////////////////
// Viewing.Extension.StateManager.React
// by Philippe Leefsma, March 2017
//
/////////////////////////////////////////////////////////
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import ConfigStorageAPI from './Viewing.Extension.Config.StorageAPI'
import DropdownButton from 'react-bootstrap/lib/DropdownButton'
import ConfigManagerCmd from './ConfigManager.Command'
import ConfigAPI from './Viewing.Extension.Config.API'
import MenuItem from 'react-bootstrap/lib/MenuItem'
import './Viewing.Extension.ConfigManager.scss'
import WidgetContainer from 'WidgetContainer'
import 'react-dragula/dist/dragula.min.css'
import ServiceManager from 'SvcManager'
import Dragula from 'react-dragula'
import sortBy from 'lodash/sortBy'
import DOMPurify from 'dompurify'
import Switch from 'Switch'
import Label from 'Label'
import React from 'react'
import Input from 'Input'

class ConfigManagerExtension extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor (viewer, options) {

    super (viewer, options)

    this.renderTitle = this.renderTitle.bind(this)
    this.toggleItem = this.toggleItem.bind(this)
    this.addItem = this.addItem.bind(this)

    this.restoreFilter = options.restoreFilter || null

    this.playPeriod = this.options.playPeriod || 1800

    this.dialogSvc =
      ServiceManager.getService('DialogSvc')

    this.itemsClass = this.guid()

    this.react = options.react

    this.restoreStates = {}

    this.drake = null

    if (this.options.apiUrl) {

      const {apiUrl, database, modelId} = options

      const url = `${apiUrl}/${database}/${modelId}`

      this.api = new ConfigAPI(url)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get className() {

    return 'config-manager'
  }

  /////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.ConfigManager'
  }

  /////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////
  load () {

    this.viewer.addEventListener(
      Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT, (e) => {
        if (this.options.loader) {
          this.options.loader.show(false)
        }
      })

    this.itemToggling = this.options.itemToggling

    this.react.setState({
      emptyStateNameCaption:
         this.options.emptyStateNameCaption ||
         'State Name ...',
      disabled: this.options.disabled,
      stateSelection: true,
      stateCreation: true,
      newSequenceName: '',
      newStateName: '',
      sequence: null,
      sequences: [],
      play: false,
      loop: true,
      items: []
    }).then (async() => {

      this.options.docked
        ? await this.react.pushRenderExtension(this)
        : await this.react.pushViewerPanel(this)

      if (this.options.readonly) {
        this.configManagerCmd = 
          new ConfigManagerCmd(this.viewer, {
            parentControl: this.options.toolbar
          })

        this.configManagerCmd.on(
          'deactivate', this.onDeactivateCommand)

        this.configManagerCmd.on(
          'activate', this.onActivateCommand)

        this.configManagerCmd.activate()
      }

      if (this.api) {
        this.loadSequences()
      }
    })

    console.log('Viewing.Extension.ConfigManager loaded')

    return true
  }

  /////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////
  unload () {

    console.log('Viewing.Extension.ConfigManager unloaded')

    this.react.popViewerPanel(this)

    super.unload ()

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onActivateCommand = () => {

    this.options.docked
        ? this.react.pushRenderExtension(this)
        : this.react.pushViewerPanel(this)
  }

  onDeactivateCommand = () => {
    
    this.options.docked
        ? this.react.popRenderExtension(this)
        : this.react.popViewerPanel(this.id)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  sleep (ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, ms)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async loadSequences () {

    let sequences =
      await this.api.getSequences({
        sortByName: true
      })

    if (this.options.readonly) {
      sequences = sequences.map((s) => {
        return {...s, readonly: true}
      })
    }  

    const sequence = sequences.length ?
      sequences[0] : null

    await this.react.setState({
      sequences
    })

    await this.sleep(2000)

    await this.setActiveSequence (sequence)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onModelActivated (event) {

    this.setModel(event.model)

    this.loadSequences()
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setModel (model) {

    const modelId = model.dbModelId ||
      this.options.modelId

    const database = model.database ||
      this.options.database

    const {apiUrl} = this.options

    const url = `${apiUrl}/${database}/${modelId}`

    this.api = new ConfigAPI(url)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getDefaultName () {

    const date = new Date()

    const {d,M,y,h,m,s} = {
      y: date.getFullYear(),
      s: date.getSeconds(),
      m: date.getMinutes(),
      h: date.getHours(),
      M: date.getMonth(),
      d: date.getDay()
    }

    return `${d}/${M}/${y} - ${h}:${m}:${s}`
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  addSequence () {

    this.react.setState({
      newSequenceName: ''
    })

    const onClose = (result) => {

      if (result === 'OK') {

        const state = this.react.getState()

        const name = !!state.newSequenceName
          ? DOMPurify.sanitize(state.newSequenceName)
          : this.getDefaultName()

        const sequence = {
          id: this.guid(),
          stateIds: [],
          name
        }

        const sequences = sortBy([
          ...state.sequences, sequence
        ], (s) => { return s.name })

        this.react.setState({
          sequences,
          items: []
        })

        this.setActiveSequence (sequence)

        if (this.api) {

          this.api.addSequence(sequence)
        }
      }

      this.dialogSvc.off('dialog.close', onClose)
    }

    this.dialogSvc.on('dialog.close', onClose)

    this.dialogSvc.setState({
      className: 'config-manager-dlg',
      title: 'Add Sequence ...',
      content:
        <div>
          <Input
            onChange={(e) => this.onInputChanged(e, 'newSequenceName')}
            onKeyDown={(e) => this.onKeyDown(e)}
            placeholder="Sequence name ..."
            className="sequence-name-input"
          />
        </div>,
      open: true
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  copySequence (sequenceName) {

    this.react.setState({
      newSequenceName: sequenceName + '-copy'
    })

    const onClose = (result) => {

      if (result === 'OK') {

        const state = this.react.getState()

        const items = state.items.map((item) => {

          return Object.assign({},
            item, {
              id: this.guid(),
              active: false
            })
        })

        const stateIds = items.map((item) => {

          return item.id
        })

        const sequence = Object.assign({},
          state.sequence, {
            name: state.newSequenceName,
            readonly: false,
            id: this.guid(),
            stateIds
        })

        const sequences = sortBy([
          ...state.sequences, sequence
        ], (s) => { return s.name })

        this.react.setState({
          sequences,
          sequence,
          items
        })

        if (this.api) {

          this.api.addSequence (Object.assign({},
            sequence, {
              stateIds: []
            })).then(() => {

            this.api.addState (sequence.id, items)
          })
        }
      }

      this.dialogSvc.off('dialog.close', onClose)
    }

    this.dialogSvc.on('dialog.close', onClose)

    this.dialogSvc.setState({
      className: 'config-manager-dlg',
      title: 'Copy Sequence ...',
      content:
        <div>
          <Input
            onChange={(e) => this.onInputChanged(e, 'newSequenceName')}
            onKeyDown={(e) => this.onKeyDown(e)}
            placeholder="Sequence name ..."
            className="sequence-name-input"
          />
        </div>,
      open: true
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  deleteSequence () {

    const state = this.react.getState()

    const onClose = (result) => {

      if (result === 'OK') {

        clearTimeout(this.playTimeout)

        if (this.api) {

          this.api.deleteSequence(state.sequence.id)
        }

        this.emit('sequence.deleted', state.sequence)

        const sequences = state.sequences.filter(
          (sequence) => {
            return sequence.id !== state.sequence.id
          })

        const sequence = sequences.length ?
          sequences[0] : null

        this.react.setState({
          play: false,
          sequences
        })

        this.setActiveSequence(sequence)
      }

      this.dialogSvc.off('dialog.close', onClose)
    }

    this.dialogSvc.on('dialog.close', onClose)

    const msg = DOMPurify.sanitize(
      `Are you sure you want to delete`
      + ` <b>${state.sequence.name}</b> ?`)

    this.dialogSvc.setState({
      className: 'config-manager-dlg',
      title: 'Delete Sequence ...',
      content:
        <div dangerouslySetInnerHTML={{__html: msg}}>
        </div>,
      open: true
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getStateIds () {

    const domItems = document.getElementsByClassName(
      this.itemsClass)[0]

    const stateIds =
      Array.from(domItems.childNodes).map(
        (childNode) => {

          return childNode.dataset.id
        })

    return stateIds
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async onUpdateSequence () {

    const { sequence, items } = this.react.getState()

    const stateIds = this.getStateIds()

    const newSequence = Object.assign({},
      sequence, {
        stateIds
      })

    const newItems = stateIds.map((id) => {

      for (const item of items) {

        if (item.id === id) {

          return item
        }
      }
    })

    this.react.setState({
      sequence: newSequence,
      items: newItems
    })

    if (this.api) {

      this.api.updateSequence(newSequence)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async addItem () {

    const state = this.react.getState()

    const name = state.newStateName.length
      ? DOMPurify.sanitize(state.newStateName) 
      : this.getDefaultName()

    const viewerState = {
    ...this.viewer.getState(),
      renderOptions: false,
      id: this.guid(),
      name
    }

    if (this.api) {

      this.api.addState(
        state.sequence.id,
        viewerState)
    }

    await this.react.setState({
      items: [...state.items, viewerState],
      newStateName: '',
      play: false
    })

    this.restoreStates[viewerState.id] =
      viewerState

    this.onRestoreState(viewerState, true)

    clearTimeout(this.playTimeout)
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  onRestoreState (
    viewerState, immediate = this.options.restoreImmediate) {

    //this.viewer.getState (viewerState)

    const filteredState = this.filterState(
      viewerState,
      'objectSet',
      'explodeScale')

    this.viewer.restoreState(
      filteredState,
      this.restoreFilter,
      immediate)
  }

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  deleteItem (id) {

    const state = this.react.getState()

    this.react.setState({
      items: state.items.filter((item) => {
        return item.id !== id
      }),
      play: false
    })

    this.emit('state.deleted', id)

    delete this.restoreStates[id]

    if (this.api) {

      this.api.deleteState(state.sequence.id, id)
    }

    clearTimeout(this.playTimeout)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onKeyDown (e) {
    if (e.keyCode === 13) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onInputChanged (e, key) {

    const state = this.react.getState()

    state[key] = e.target.value

    this.react.setState(state)
  }

  /////////////////////////////////////////////////////////
  // Filter a state selections
  //
  /////////////////////////////////////////////////////////
  filterState (srcState, setNames, elementNames) {

    const state = JSON.parse(JSON.stringify(srcState))

    const sets = Array.isArray(setNames)
      ? setNames : [setNames]

    const elements = Array.isArray(elementNames)
      ? elementNames : [elementNames]

    sets.forEach((setName) => {

      if (state[setName]) {

        elements.forEach((elementName) => {

          state[setName].forEach((element) => {

            delete element[elementName]
          })
        })
      }
    })

    return state
  }

  /////////////////////////////////////////////////////////
  // A fix for viewer.restoreState
  // that also restores pivotPoint
  //
  /////////////////////////////////////////////////////////
  restoreStateWithPivot(state, filter=null, immediate=false) {

    const viewer = this.viewer

    function onStateRestored() {

      viewer.removeEventListener(
        Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT,
        onStateRestored);

      const pivot = state.viewport.pivotPoint;

      setTimeout(function () {

        viewer.navigation.setPivotPoint(
          new THREE.Vector3(
            pivot[0], pivot[1], pivot[2]))
      }, 1250)
    }

    viewer.addEventListener(
      Autodesk.Viewing.VIEWER_STATE_RESTORED_EVENT,
      onStateRestored)

    viewer.restoreState(state, filter, immediate)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  activateDrag () {
    
    const domItems =
      document.getElementsByClassName(
        this.itemsClass)[0]

    if (this.drake) {

      this.drake.destroy()
    }

    this.drake = Dragula([domItems])

    this.drake.on('drop', () => {

      this.onUpdateSequence()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async setActiveSequence (sequence) { 

    clearTimeout(this.playTimeout)

    this.restoreStates = {}

    this.playTimeout = null

    this.sequenceIdx = 0

    await this.react.setState({
      play: false,
      items: [],
      sequence
    })

    if (this.drake) {

      this.drake.destroy()
      this.drake = null
    }

    if (sequence) {

      if (!sequence.readonly) {

        this.activateDrag()
      }

      if (this.api) {

        const states =
          await this.api.getStates(
            sequence.id)

        states.forEach((state) => {
          this.restoreStates[state.id] = state
        })

        await this.react.setState({
          items: states
        })
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  playSequence () {

    // sequence is playing -> stopping it
    if (this.playTimeout) {

      clearTimeout(this.playTimeout)

      this.playTimeout = null

      this.sequenceIdx = 0

      this.react.setState({
        play: false
      })

      return
    }

    const stateIds = this.getStateIds()

    const step = (stateId) => {

      const state = this.react.getState()

      this.onRestoreState(this.restoreStates[stateId])

      this.react.setState({
        play: true,
        items: state.items.map((item) => {
          if (item.active) {
            item.active = false
            this.emit('state.toggled', item)
          }
          if (item.id === stateId) {
            item.active = true
            this.emit('state.toggled', item)
          }
          return item
        })
      })

      if ((++this.sequenceIdx) == stateIds.length) {

        const { loop } = this.react.getState()

        if (!loop) {

          this.react.setState({
            play: false
          })

          this.playTimeout = null

          return
        }

        this.sequenceIdx = 0
      }

      setTimeout(() => {
        const {items} = this.react.getState()
        this.react.setState({
          items: items.map((item) => {
            item.active = false
            return item
          })
        })
      }, this.playPeriod * 0.8)

      return setTimeout(() => {

        this.playTimeout = step(stateIds[this.sequenceIdx])

      }, this.playPeriod)
    }

    if (stateIds.length > 0) {

      this.playTimeout = step (stateIds[this.sequenceIdx])
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async setDocking (docked) {

    const id = ConfigManagerExtension.ExtensionId

    const {sequence} = this.react.getState()

    if (docked) {

      await this.react.popRenderExtension(this)

      const panel = await this.react.pushViewerPanel(this, {
          height: 250,
          width: 300
        })

      panel.on('update', () => {
        if (sequence && !sequence.readonly) {
          this.activateDrag ()
        }
        panel.off()
      })

    } else {

      await this.react.popViewerPanel(id)

      await this.react.pushRenderExtension(this)

      this.setActiveSequence (sequence)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  closePanel = () => {

    this.configManagerCmd.deactivate()
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderTitle () {
    return (
      <div className="title">
        <label>
          Configurations Manager
        </label>
        {
          this.options.readonly && 
          !this.options.docked &&
          <div className="controls">
            <button onClick={this.closePanel}
              title="Close">
              <span className="fa fa-times"/>
            </button>
          </div>
        }
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderControls () {

    const state = this.react.getState()

    const sequences = state.sequences || []

    const sequenceItems = sequences.map((sequence) => {

      const id = sequence.id

      return (
        <MenuItem eventKey={id} key={id} onClick={() => {
          this.setActiveSequence(sequence)
        }}>
          { sequence.name }
        </MenuItem>
      )
    })

    const sequence = state.sequence

    const sequenceName = sequence 
      ? sequence.name 
      : ''

    const stateCreationDisabled =
      !sequence ||
      sequence.readonly ||
      !state.stateCreation

    const ctrlClass = this.options.readonly
      ? 'controls readonly'
      : 'controls'

    return (
      <div className={ctrlClass}>

        <div className="row">

          <DropdownButton
            title={"Sequence: " +  sequenceName}
            className="sequence-dropdown"
            disabled={!sequence}
            key="sequence-dropdown"
            id="sequence-dropdown">
           { sequenceItems }
          </DropdownButton>

          {
            !this.options.readonly &&  
            <button onClick={() => this.addSequence()}
              title="Add sequence">
              <span className="fa fa-plus"/>
            </button>
          }
          {
            !this.options.readonly &&
            <button onClick={() => {
                this.copySequence(sequence.name)}
              }
              disabled={!sequence}
              title="Copy sequence">
              <span className="fa fa-copy"/>
            </button>
          }
          {
            !this.options.readonly &&
            <button onClick={() => this.deleteSequence()}
              disabled={!sequence || sequence.readonly}
              title="Delete sequence">
              <span className="fa fa-times"/>
            </button>
          }
        </div>
        {
          !this.options.readonly &&      
          <div className="row">
            {
              stateCreationDisabled &&
              <Input
                onChange={(e) => this.onInputChanged(e, 'newStateName')}
                placeholder={state.emptyStateNameCaption}
                onKeyDown={(e) => this.onKeyDown(e)}
                className="state-name-input"
                value={state.newStateName}
                disabled={true}
              />
            }
            {
              !stateCreationDisabled &&
              <Input
                onChange={(e) => this.onInputChanged(e, 'newStateName')}
                placeholder={state.emptyStateNameCaption}
                onKeyDown={(e) => this.onKeyDown(e)}
                className="state-name-input"
                value={state.newStateName}
              />
            }

            <button disabled={stateCreationDisabled}
              onClick={this.addItem}
              title="Save state">
              <span className="fa fa-database"/>
            </button>

            <button
              title={state.play ? "Pause sequence" : "Play sequence"}
              onClick={() => this.playSequence()}
              disabled={!sequence}>
              <span className={"fa fa-" + (state.play ? "pause" : "play")}/>
            </button>

            <Switch isChecked={true} className="loop" title={"Loop sequence"}
              onChange={(loop) => {
                this.react.setState({
                  loop
                })
              }}/>
          </div>
        }
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  toggleItem (selectedItem) {

    const state = this.react.getState()

    const items = state.items.map((item) => {

      if (item.id === selectedItem.id) {

        item.active = !item.active

        if (item.active) {

          this.onRestoreState(selectedItem)
        }
      }

      return item
    })

    this.emit('state.toggled', selectedItem)

    this.react.setState({
      items
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderItems () {

    const state = this.react.getState()

    const readonly = state.sequence 
      ? state.sequence.readonly
      : true 

    const items = state.items.map((item) => {

      const text = DOMPurify.sanitize(item.name)

      const className = "item" +
        (state.stateSelection ? ' selectable' : '') +
        (this.itemToggling ? ' toggable' : '') +
        (item.active ? ' active' :'')

      return (
        <div data-id={item.id} data-name={text}
          className={className}
          key={item.id}
          onClick={() => {
            if(state.stateSelection) {
              if (this.itemToggling) {
                this.toggleItem(item)
              } else {
                this.onRestoreState (item)
              }
            }
          }}>

          <Label text={text}/>

          {
            !readonly &&
            <button onClick={(e) => {
                this.deleteItem(item.id)
                e.stopPropagation()
                e.preventDefault()
            }}
              title="Delete state">
              <span className="fa fa-times"/>
            </button>
          }

        </div>
      )
    })

    return (
      <div className={`items ${this.itemsClass}`}>
        { items }
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render (opts) {

    const state = this.react.getState()

    return (
      <WidgetContainer
        renderTitle={() => this.renderTitle(opts.docked)}
        showTitle={opts.showTitle}
        className={this.className}>
        {
            state.disabled &&
            <div className="disabled-overlay"/>
        }
        { this.renderControls() }
        { this.renderItems() }

      </WidgetContainer>
    )
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  ConfigManagerExtension.ExtensionId,
  ConfigManagerExtension)
