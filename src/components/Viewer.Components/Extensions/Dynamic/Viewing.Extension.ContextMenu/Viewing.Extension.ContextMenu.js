/////////////////////////////////////////////////////////////////////
// Viewing.Extension.ContextMenu
// by Philippe Leefsma, September 2016
//
/////////////////////////////////////////////////////////////////////
import ContextMenuHandler from './Viewing.Extension.ContextMenu.Handler'
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import sortBy from 'lodash/sortBy'

class ContextMenuExtension extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////////////
  constructor (viewer, options) {

    super (viewer, options)

    this.selection = null

    this.handlers = []
  }

  /////////////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.ContextMenu'
  }

  /////////////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////////////
  load() {

    this.contextMenuHandler = new ContextMenuHandler(this.viewer)

    this.contextMenuHandler.on('buildMenu', this.onBuildMenu)

    this.viewer.setContextMenu(this.contextMenuHandler)

    console.log('Viewing.Extension.ContextMenu loaded')

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onBuildMenu = (menu) => {

    const dbId = this.selection
      ? this.selection.dbIdArray[0]
      : null

    const model = this.selection
      ? this.selection.model
      : null

    const selection = this.selection

    const menuArgs = {
      selection,
      model,
      dbId,
      menu
    }

    const newMenu = this.emit('buildMenu', menuArgs)

    if (newMenu) {
      return newMenu
    }

    this.handlers.forEach((handler) => {
      menu = handler ({...menuArgs, menu}) || menu
    })

    if (this.options.sort) {
      menu = sortBy(menu, (entry) => {
        return entry[this.options.sort]
      })
    }

    return this.options.buildMenu
      ? this.options.buildMenu(menu, dbId)
      : menu
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  addHandler = (handler) => {
    this.handlers.push (handler)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  removeHandler = (handler) => {
    this.handlers = this.handlers.filter((h) => {
      return h !== handler
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSelection (event) {
    this.selection = event.selections.length
      ? event.selections[0]
      : null
  }

  /////////////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////////////
  unload() {

    const menu =
      new Autodesk.Viewing.Extensions.ViewerObjectContextMenu(
        this.viewer)

    this.viewer.setContextMenu(menu)

    console.log('Viewing.Extension.ContextMenu unloaded')

    return true
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  ContextMenuExtension.ExtensionId,
  ContextMenuExtension)




