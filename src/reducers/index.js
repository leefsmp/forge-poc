import { connectRouter } from 'connected-react-router'
import { createBrowserHistory } from 'history'
import { combineReducers } from 'redux'

export const history = createBrowserHistory()

export const createRootReducer = (asyncReducers) => {
  return combineReducers({
    router: connectRouter(history),
    ...asyncReducers
  })
}

export const injectReducer = (store, { key, reducer }) => {
  store.asyncReducers[key] = reducer
  store.replaceReducer(createRootReducer(store.asyncReducers))
}