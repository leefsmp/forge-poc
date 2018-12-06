import EventsEmitter from 'EventsEmitter'
import BaseSvc from './BaseSvc'

class ClientSocket extends EventsEmitter {

  constructor (url) {

    super()

    this.ws = new WebSocket (url)

    this.ws.onmessage = this.onMessage
    this.ws.onerror = this.onError
    this.ws.onopen = this.onOpen
  }

  onError = (error) => {
    this.emit('error', error)
  }

  onOpen = () => {
    this.emit('connect')
  }

  onMessage = (wsMsg) => {

    const {msgId, msg} = JSON.parse(wsMsg.data)
    
    this.emit(msgId, msg)
  }

  send (msgId, msg) {
    this.ws.send (JSON.stringify({
      msgId, 
      msg
    }))
  }

  disconnect () {

  }
}

export default class SocketSvc extends BaseSvc {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  constructor (config) {

    super (config)

    this.eventBuffer = []

    this.connections = 0
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get name () {
    return 'SocketSvc'
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getSocketId () {

    return new Promise((resolve) => {

      if (this.socket) {
        return resolve(this.socket.id)
      }

      this.connect().then((socket) => {
        return resolve(socket.id)
      })
    })
  }

  /////////////////////////////////////////////////////////
  // Socket Connection handler
  //
  /////////////////////////////////////////////////////////
  connect () {

    return new Promise((resolve) => {

      ++this.connections

      if (this.socket) {
        return resolve(this.socket)
      }

      if (!navigator.onLine) {
        return resolve()
      }

      const protocol = 
        (global.location.protocol === "https:")
          ? 'wss' : 'ws'

      this.socket = new ClientSocket(
        `${protocol}://${global.location.host}`)  

      this.socket.on('disconnect', () => {  
        console.log('Socket disconnected: ' + this.socket.id)
        this.disconnect()
      })

      this.socket.on('connect', () => {
        this.eventBuffer.forEach((event) => {
          this.socket.on(event.msgId, event.handler)
        })
      })

      this.socket.on('socketId', (id) => {
        console.log('Socket connected: ' + id)
        this.socket.id = id
        resolve(this.socket)
      })
    })
  }

  /////////////////////////////////////////////////////////
  // 
  //
  /////////////////////////////////////////////////////////
  disconnect () {
  
    --this.connections

    if (this.socket && this.connections < 1) {
      this.socket.disconnect()
      this.connections = 0
      this.socket = null
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  on (msgIds, handler) {

    msgIds.split(' ').forEach((msgId) => {

      this.eventBuffer.push({
        handler,
        msgId
      })

      if (this.socket) {
        this.socket.on (msgId, handler)
      }
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  off (msgIds, handler) {

    msgIds.split(' ').forEach((msgId) => {

      this.eventBuffer =
        this.eventBuffer.filter((event) => {
          return (event.msgId !== msgId)
        })

      if (this.socket) {
        this.socket.off (msgId, handler)
      }
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  emit (msgId, msg) {
    if (this.socket) {
      this.socket.send (msgId, msg)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async broadcast (msgId, msg, filter = null) {
    if (this.socket) {
      this.socket.send('broadcast', {
        filter,
        msgId,
        msg
      })
    }
  }
}
