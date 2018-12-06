/////////////////////////////////////////////////////////
// Viewing.Extension.ViewableSelector
// by Philippe Leefsma, November 2017
//
/////////////////////////////////////////////////////////
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import './Viewing.Extension.ViewableSelector.scss'
//import { browserHistory } from 'react-router'
import WidgetContainer from 'WidgetContainer'
import ReactTooltip from 'react-tooltip'
import Image from 'Image'
import Label from 'Label'
import React from 'react'
import {
  getViewableItems,
  loadDocument
} from 'Viewer.Toolkit'

class ViewableSelectorExtension extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor (viewer, options) {

    super (viewer, options)

    this.react = options.react
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get className() {

    return 'viewable-selector'
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get displayName () {
    return 'View Selector'
  }

  /////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.ViewableSelector'
  }

  /////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////
  load () {

    this.react.setState({

      activeItem: null,
      items: []

    }).then (async() => {

      const items = await this.loadItems()

      if (items.length > 1) {

        this.createButton()

        await this.react.setState({
          activeItem: items.filter(item => {
            return item.active || item.guid === this.options.viewId
          })[0],
          items
        })

        if (this.options.showPanel) {
          this.showPanel (true)
        }
      }
    })

    console.log('Viewing.Extension.ViewableSelector loaded')

    return true
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  async loadItems () {
  
    if (this.options.views) {

        return this.options.views
    }

    const urn = this.options.urn
        
    this.doc = await loadDocument(urn)

    return getViewableItems(this.doc)
  }
  
  /////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////
  unload () {

    console.log('Viewing.Extension.ViewableSelector unloaded')

    if (this.button) {
      this.viewer.container.removeChild(this.button)
    }

    this.react.popViewerPanel(this.id)

    super.unload()

    return true
  }

  /////////////////////////////////////////////////////////
  // Load the selected viewable
  //
  /////////////////////////////////////////////////////////
  async onItemSelected (item) {

    const {activeItem} = this.react.getState()

    if (item.guid !== activeItem.guid) {

      if (item.url) {
        return window.location.href = 
          location.origin + item.url
      }

      this.viewer.showLoader(true)

      await this.showPanel (false)

      this.viewer.tearDown()

      if (!item.id) {

        // browserHistory.push(
        //   `/viewer?id=${this.options.modelId}&` +
        //   `db=${this.options.database}&` +
        //   `viewId=${item.guid}`)

        this.options.loadModel(
          this.viewer, {
            db: this.options.database,
            id: this.options.modelId,
            viewId: item.guid
          }, 1500)

      } else {

        const {db, id} = item

        // browserHistory.push(
        //   `/viewer?id=${id}&db=${db}`)
         
        this.options.loadModel(
          this.viewer, item, 1500)
      }
    }
  }

  /////////////////////////////////////////////////////////
  // Create a button to display the panel
  //
  /////////////////////////////////////////////////////////
  createButton () {

    this.button = document.createElement('button')

    this.button.title = 'This model has multiple views ...'

    this.button.className = 'viewable-selector btn'

    this.button.onclick = () => {
      this.showPanel(true)
    }

    const span = document.createElement('span')
    span.className = 'fa fa-list-ul'
    this.button.appendChild(span)

    const label = document.createElement('label')
    this.button.appendChild(label)
    label.innerHTML = 'Views'
    
    this.viewer.container.appendChild(this.button)
  }

  /////////////////////////////////////////////////////////
  // Show/Hide panel
  //
  /////////////////////////////////////////////////////////
  async showPanel (show) {

    if (show) {

      const container = this.viewer.container

      const {items} = this.react.getState()

      this.button.classList.add('active')

      const height = Math.min(
        container.offsetHeight - 110,
        (items.length + 1)  * 78 + 55)

      await this.react.pushViewerPanel(this, {
        maxHeight: height,
        draggable: false,
        maxWidth: 500,
        minWidth: 310,
        width: 310,
        left: 20,
        top: 20,
        height
      })

    } else {

      await this.react.popViewerPanel(this.id)

      this.button.classList.remove('active')
    }
  }

  /////////////////////////////////////////////////////////
  // Render React panel content
  //
  /////////////////////////////////////////////////////////
  renderContent () {

    const {activeItem, items} = this.react.getState()

    const {apiUrl, database, modelId} = this.options

    const domItems = items.map((item) => {

      const active = (item.guid === activeItem.guid)
        ? ' active' : ''

      const query = `size=400` + (!item.id 
        ? `&guid=${item.guid}`
        : '')

      const id = item.id || modelId

      const thumbnail =  
        `${apiUrl}/${database}/${id}/thumbnail?` +
        `${query}`

      return (
        <div key={item.guid} className={"item" + active}
          onClick={() => this.onItemSelected(item)}>
          <div className="image-container"
            data-for={`thumbnail-${item.guid}`}
            data-tip>
            <Image src={thumbnail}/>
          </div>
          <ReactTooltip id={`thumbnail-${item.guid}`}
            className="tooltip-thumbnail"
            delayShow={700}
            effect="solid"
            place="right">
            <div>
              <img src={thumbnail} height="200"/>
            </div>
          </ReactTooltip>
          <Label text={item.name}/>
        </div>
      )
    })

    return (
      <div className="items">
        {domItems}
        <div style={{height: '80px'}}/>
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  // Render title
  //
  /////////////////////////////////////////////////////////
  renderTitle () {

    return (
      <div className="title">
        <label>
          Select View
        </label>
        <div className="viewable-selector-controls">
          <span onClick={() => this.showPanel(false)} 
            className="fa fa-times"
          />
        </div>
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  // Render main
  //
  /////////////////////////////////////////////////////////
  render (opts) {

    return (
      <WidgetContainer
        renderTitle={() => this.renderTitle(opts.docked)}
        showTitle={opts.showTitle}
        className={this.className}>
        {this.renderContent()}
      </WidgetContainer>
    )
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  ViewableSelectorExtension.ExtensionId,
  ViewableSelectorExtension)
