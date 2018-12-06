import ViewerCommand from 'Viewer.Command'

export default class ConfigManagerCommand extends ViewerCommand {

  /////////////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////////////
  constructor (viewer, options = {}) {

    super (viewer, {
      ...options,
      commandId: 'ConfigManager'
    })

    if (options.parentControl) {

      this.control = this.createButtonControl({
        parentControl: options.parentControl,
        caption: 'Configurations',
        icon: 'toolbar-ff fa fa-server',
        id: 'toolbar-config',
        handler: () => {
          this.commandTool.active
            ? this.commandTool.deactivate()
            : this.commandTool.activate()
        }
      })
    }
    
    this.commandTool.on('activate', () => {
      if (this.control) {
        this.control.container.classList.add('active')
      }
      this.emit('activate')
    })

    this.commandTool.on('deactivate', () => {
      if (this.control) {
        this.control.container.classList.remove('active')
      }
      this.emit('deactivate')
    })

    this.commandTool.on('keydown', (event, keyCode) => {

    })
  }
}


