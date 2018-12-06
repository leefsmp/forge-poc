import swRuntime from 'serviceworker-webpack-plugin/lib/runtime'
import ServiceManager from './SvcManager'
import BaseSvc from './BaseSvc'

export default class CacheSvc extends BaseSvc {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  constructor (config) {

    super (config)

    this.registrations = []
    this.activated = false

    if (navigator.serviceWorker) {
      //swRuntime.register()
      const sw = navigator.serviceWorker
      sw.ready.then(() => {
        sw.getRegistrations().then(regs => {
          this.registrations = regs
        })
        this.activated = true
      })  
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get name () {
    return 'CacheSvc'
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  unregister () {

    const tasks = this.registrations.map(reg => {
      return reg.unregister()
    })

    return Promise.all(tasks)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async cacheModel (model) {

    const notifySvc = ServiceManager.getService(
      'NotifySvc')

    const storageSvc = ServiceManager.getService(
      'StorageSvc')

    const modelId = model._id  

    const notification = notifySvc.add({
      title: 'Caching ' + model.name,
      message: 'please wait ...',
      dismissible: false,
      status: 'loading',
      dismissAfter: 0,
      position: 'tl',
      id: modelId
    })

    notification.buttons = [{
      name: 'Dismiss',
      onClick: () => {
        notification.dismissAfter = 1
        notifySvc.update(notification)
      }
    }]

    notifySvc.update(notification)

    try {

      const res = await this.postWorkerMessage ({
        action: 'CACHE_MODEL',
        modelId
      })

      if (res.status === 'ok') {

        const storage = storageSvc.load('cache', {
          cachedModels: []
        })

        storage.cachedModels.push(model)

        storageSvc.save('cache', storage)

        this.emit('model.cached', model)

        notification.title = model.name + ' cached!'
        notification.dismissAfter = 1000
        notification.status = 'success'
        notification.message = ''
    
        notifySvc.update(notification)
      }
    
    } catch (ex) {

      notification.title = 'Error caching ' + model.name
      notification.status = 'error'
      notification.message = ''

      notification.buttons = [{
        name: 'Show error',
        onClick: () => {
          console.log(ex)
          notification.dismissAfter = 1
          notifySvc.update(notification)
        }
      }, {
        name: 'Dismiss',
        onClick: () => {
          notification.dismissAfter = 1
          notifySvc.update(notification)
        }
      }]
  
      notifySvc.update(notification)

      this.emit('error', model)

      this.clearModel (modelId)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  clearModel (modelId) {
    return this.postWorkerMessage ({
      action: 'CLEAR_MODEL',
      modelId
    })
  }
  
  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  postWorkerMessage (data) {

    return new Promise(async(resolve, reject) => {

      const req = await navigator.serviceWorker.ready

      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
            return reject(event.data.error)
        } 
        resolve(event.data)
      }

      req.active.postMessage(data, [channel.port2])
    })
  }
}
