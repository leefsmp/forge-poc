import { createStore, applyMiddleware, compose } from 'redux'
import { routerMiddleware } from 'connected-react-router'
import {createRootReducer, history} from './reducers'
import thunk from 'redux-thunk'

//Services
import ServiceManager from 'SvcManager'
import StorageSvc from 'StorageSvc'
import DialogSvc from 'DialogSvc'
import SocketSvc from 'SocketSvc'
import ModelSvc from 'ModelSvc'
import EventSvc from 'EventSvc'
import UserSvc from 'UserSvc'

// ======================================================
// Middleware Configuration
// ======================================================
const middleware = [
  thunk,
  routerMiddleware(history)
]

// ======================================================
// Store Enhancers
// ======================================================
const enhancers = []

if (process.env.NODE_ENV === 'development') {
  const devToolsExtension = window.devToolsExtension
  if (typeof devToolsExtension === 'function') {
    enhancers.push(devToolsExtension())
  }
}

// ======================================================
// Store Instantiation and HMR Setup
// ======================================================
const initialState = {}

const store = createStore(
  createRootReducer(),
  initialState,
  compose(
    applyMiddleware(...middleware),
    ...enhancers
  )
)

store.asyncReducers = {}

if (module.hot) {

  module.hot.accept('./reducers', () => {
    const reducers = require('./reducers').default
    store.replaceReducer(reducers(store.asyncReducers))
  })
}

// ========================================================
// Services Initialization
// ========================================================

const storageSvc = new StorageSvc({
  storageKey: 'forge-poc',
  storageVersion: 1.0
})

const socketSvc = new SocketSvc()

const modelSvc = new ModelSvc({
  apiUrl: '/api/models'
})

const dialogSvc = new DialogSvc()

const eventSvc = new EventSvc()

const userSvc = new UserSvc({
  apiUrl: '/api'
})

// ========================================================
// Services Registration
// ========================================================
ServiceManager.registerService(storageSvc)
ServiceManager.registerService(dialogSvc)
ServiceManager.registerService(socketSvc)
ServiceManager.registerService(modelSvc)
ServiceManager.registerService(eventSvc)
ServiceManager.registerService(userSvc)

export default store