import ViewerCommand from 'Viewer.Command'

export default class RotateCommand extends ViewerCommand {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  constructor (viewer, options = {}) {

    super (viewer, {
      ...options,
      commandId: 'Snap'
    })
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


